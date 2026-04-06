import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { EndpointFilterPanel } from "@/components/api/EndpointFilterPanel";
import { useSession } from "@/components/api/SessionContext";
import { useSearchParamFilterDraft } from "@/components/api/useSearchParamFilterDraft";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import { FilterBadgeRow } from "@/components/ui/FilterBadgeRow";
import { ResourceBreakdownPanel } from "@/components/ui/ResourceBreakdownPanel";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { TAX_EXPENSE, TAX_EXPENSE_BRACKET_ROWS, TAX_EXPENSE_NATION } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import { bulkQueryOptions } from "@/lib/queries";
import type { TaxExpenseBracket } from "@/lib/apitypes";
import LoginPickerPage from "@/pages/login_picker";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";

import { TaxExpenseValueStrip } from "./TaxExpenseValueStrip";
import {
  TAX_EXPENSE_SUMMARY_DEFAULT_FILTERS,
  TAX_EXPENSE_TOTAL_TAX_ID,
  buildSummaryBracketArgs,
  buildSummaryEndpointArgs,
  buildSummaryFilterBadges,
  buildSummaryFilterSignature,
  buildSummaryNationArgs,
  formatAllianceBadge,
  formatBracketMeta,
  formatBracketTitle,
  formatCountLabel,
  formatResourceAmount,
  formatTaxExpenseTimestamp,
  getResourceBreakdownRows,
  parseTaxExpenseSummaryFilters,
  subtractResourceArrays,
  writeTaxExpenseSummaryFilters,
  type TaxExpenseSummaryFilters,
} from "./taxExpensesState";

type SummarySection = {
  taxId: number;
  bracket?: TaxExpenseBracket["bracket"];
  nationCount: number;
  incomeValue: number;
  expenseValue: number;
  netValue: number;
  income: number[];
  expense: number[];
};

const SUMMARY_FILTER_FIELDS = [
  "start",
  "end",
  "nationList",
  "dontRequireGrant",
  "dontRequireTagged",
  "dontRequireExpiry",
  "includeDeposits",
] as const satisfies readonly (keyof TaxExpenseSummaryFilters)[];

const BRACKET_ROW_COLUMNS: ConfigColumns[] = [
  {
    title: "Nation",
    index: 0,
    sortable: true,
    editable: false,
    draggable: false,
    width: 120,
    render: {
      display: (value) => `#${Number(value ?? 0).toLocaleString()}`,
    },
  },
  {
    title: "Current Tax",
    index: 1,
    sortable: true,
    editable: false,
    draggable: false,
    width: 120,
    render: {
      display: (value) => typeof value === "number" ? `#${value}` : "-",
    },
  },
  {
    title: "Net",
    index: 2,
    sortable: true,
    editable: false,
    draggable: false,
    width: 120,
    render: {
      display: (value) => formatResourceAmount(Number(value ?? 0)),
    },
  },
];

const TRANSACTION_TABLE_COLUMNS: ConfigColumns[] = [
  {
    title: "Time",
    index: 0,
    sortable: true,
    editable: false,
    draggable: false,
    width: 150,
    render: {
      display: (value) => formatTaxExpenseTimestamp(Number(value ?? 0)),
    },
  },
  {
    title: "Route",
    index: 1,
    sortable: true,
    editable: false,
    draggable: false,
    width: 260,
    cellClassName: "whitespace-pre-wrap",
  },
  {
    title: "Note",
    index: 2,
    sortable: true,
    editable: false,
    draggable: false,
    width: 220,
    cellClassName: "whitespace-pre-wrap",
  },
  {
    index: 3,
    title: "Resources",
    sortable: false,
    editable: false,
    draggable: false,
    width: 360,
    cellClassName: "whitespace-pre-wrap",
  },
];

function formatTransactionResources(resources: readonly number[]): string {
  const rows = getResourceBreakdownRows(resources);
  if (rows.length === 0) {
    return "0";
  }
  return rows.map((row) => `${row.label} ${row.displayValue}`).join(", ");
}

function formatTransactionRoute(transaction: {
  senderName: string;
  receiverName: string;
  bankerNationName?: string | null;
}): string {
  const route = `${transaction.senderName} -> ${transaction.receiverName}`;
  if (!transaction.bankerNationName) {
    return route;
  }
  return `${route}\nBanker ${transaction.bankerNationName}`;
}

function NationSelectCell({
  nationId,
  isSelected,
  onSelect,
}: {
  nationId: number;
  isSelected: boolean;
  onSelect: (nationId: number) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(nationId);
  }, [nationId, onSelect]);

  return (
    <Button
      type="button"
      size="sm"
      variant={isSelected ? "default" : "outline"}
      className="h-5 px-1.5 text-[10px]"
      onClick={handleClick}
      disabled={nationId <= 0}
      aria-pressed={isSelected}
    >
      Inspect
    </Button>
  );
}

function NationTable({ datasetId, taxId, nationCount }: { datasetId: number; taxId: number; nationCount: number }) {
  const [selectedNationId, setSelectedNationId] = useState<number | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const rowsQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_BRACKET_ROWS.endpoint, buildSummaryBracketArgs(datasetId, taxId)),
    enabled: nationCount > 0,
  });

  const rows = useMemo(() => rowsQuery.data?.data?.rows ?? [], [rowsQuery.data?.data?.rows]);
  const tableData = useMemo<JSONValue[][]>(() => rows.map((row) => [
    row.nationId,
    row.currentTaxId ?? null,
    row.netValue,
  ]), [rows]);

  useEffect(() => {
    setSelectedNationId(null);
  }, [datasetId, taxId]);

  useEffect(() => {
    if (selectedNationId === null) {
      return;
    }
    detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedNationId]);

  const renderIndexCell = useCallback(({ rowIdx }: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => {
    const nationId = rows[rowIdx]?.nationId ?? 0;
    return (
      <NationSelectCell
        nationId={nationId}
        isSelected={nationId > 0 && nationId === selectedNationId}
        onSelect={setSelectedNationId}
      />
    );
  }, [rows, selectedNationId]);

  if (rowsQuery.isLoading) {
    return (
      <div className="py-4">
        <Loading variant="ripple" />
      </div>
    );
  }

  if (rowsQuery.error || !rowsQuery.data?.data) {
    return <div className="text-sm text-destructive">Failed to load bracket rows.</div>;
  }

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">No nations matched this bracket for the current filters.</div>;
  }

  const selectedNationRowIndex = selectedNationId === null
    ? -1
    : rows.findIndex((row) => row.nationId === selectedNationId);
  const highlightedRows = selectedNationRowIndex >= 0 ? [selectedNationRowIndex] : [];

  return (
    <div className="space-y-3">
      <PreparedDataTable
        columnsInfo={BRACKET_ROW_COLUMNS}
        data={tableData}
        showExports
        highlightedRowIndexes={highlightedRows}
        indexCellRenderer={renderIndexCell}
        indexColumnWidth={82}
      />
      <div ref={detailSectionRef}>
        <NationDetailSection
          datasetId={datasetId}
          taxId={taxId}
          nationId={selectedNationId}
          nationLabel={selectedNationId ? `Nation #${selectedNationId.toLocaleString()}` : null}
        />
      </div>
    </div>
  );
}

function NationDetailSection({
  datasetId,
  nationId,
  nationLabel,
  taxId,
}: {
  datasetId: number;
  nationId: number | null;
  nationLabel: ReactNode;
  taxId: number;
}) {
  const nationQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_NATION.endpoint, buildSummaryNationArgs(datasetId, taxId, nationId ?? 0)),
    enabled: (nationId ?? 0) > 0,
  });

  if ((nationId ?? 0) <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
        Select a nation row to inspect its tax-expense detail and transactions.
      </div>
    );
  }

  if (nationQuery.isLoading) {
    return (
      <div className="rounded-lg border border-border/60 bg-background/80 px-4 py-6">
        <Loading variant="ripple" />
      </div>
    );
  }

  if (nationQuery.error || !nationQuery.data?.data) {
    return <div className="text-sm text-destructive">Failed to load nation detail.</div>;
  }

  const detail = nationQuery.data.data;
  const net = subtractResourceArrays(detail.income, detail.expense);
  const transactionTableData = useMemo(() => detail.transactions.map((transaction) => [
    transaction.txDatetime,
    formatTransactionRoute(transaction),
    transaction.noteSummary,
    formatTransactionResources(transaction.resources),
  ] as JSONValue[]), [detail.transactions]);

  return (
    <section className="rounded-lg border border-border/60 bg-background/85 px-4 py-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 text-sm font-semibold text-foreground">{nationLabel ?? `Nation #${nationId}`}</div>
        {typeof detail.currentTaxId === "number" ? <Badge variant="outline">Current tax #{detail.currentTaxId}</Badge> : null}
        <Badge variant="outline">{formatCountLabel(detail.depositCount, "deposit record")}</Badge>
        <Badge variant="outline">{formatCountLabel(detail.transactionCount, "transaction")}</Badge>
      </div>
      <TaxExpenseValueStrip incomeValue={detail.incomeValue} expenseValue={detail.expenseValue} netValue={detail.netValue} />
      <div className="grid gap-2 xl:grid-cols-2">
        <ResourceBreakdownPanel title="Income" entries={getResourceBreakdownRows(detail.income)} tone="income" />
        <ResourceBreakdownPanel title="Expense" entries={getResourceBreakdownRows(detail.expense)} tone="expense" />
      </div>
      <ResourceBreakdownPanel title="Net" entries={getResourceBreakdownRows(net)} tone="net" />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Transactions</h3>
        </div>
        {transactionTableData.length === 0 ? (
          <div className="text-sm text-muted-foreground">No transactions in this window.</div>
        ) : (
          <PreparedDataTable
            columnsInfo={TRANSACTION_TABLE_COLUMNS}
            data={transactionTableData}
            indexColumnWidth={44}
          />
        )}
      </div>
    </section>
  );
}

function SummaryPanel({
  datasetId,
  section,
  isOpen,
  toggleSection,
}: {
  datasetId: number;
  section: SummarySection;
  isOpen: boolean;
  toggleSection: (taxId: number) => void;
}) {
  const net = useMemo(() => subtractResourceArrays(section.income, section.expense), [section.expense, section.income]);
  const title = formatBracketTitle(section.taxId, section.bracket);
  const meta = formatBracketMeta(section.bracket);
  const handleToggle = useCallback(() => {
    toggleSection(section.taxId);
  }, [section.taxId, toggleSection]);

  return (
    <section className="rounded-xl border border-border/70 bg-background/90 shadow-sm">
      <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base">{title}</h2>
            {section.taxId !== TAX_EXPENSE_TOTAL_TAX_ID ? <Badge variant="outline">#{section.taxId}</Badge> : null}
            <Badge variant="outline">{formatCountLabel(section.nationCount, "nation")}</Badge>
            {meta ? <Badge variant="outline">{meta}</Badge> : null}
          </div>
          <TaxExpenseValueStrip incomeValue={section.incomeValue} expenseValue={section.expenseValue} netValue={section.netValue} />
        </div>
        <div className="flex shrink-0 items-start justify-end">
          <Button size="sm" variant="outline" onClick={handleToggle} disabled={section.nationCount === 0}>
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isOpen ? "Hide nations" : `Show nations (${section.nationCount.toLocaleString()})`}
          </Button>
        </div>
      </div>
      {isOpen ? (
        <div className="border-t border-border/60 px-3 py-3">
          <div className="mb-3 grid gap-2 xl:grid-cols-3">
            <ResourceBreakdownPanel title="Income" entries={getResourceBreakdownRows(section.income)} tone="income" />
            <ResourceBreakdownPanel title="Expense" entries={getResourceBreakdownRows(section.expense)} tone="expense" />
            <ResourceBreakdownPanel title="Net" entries={getResourceBreakdownRows(net)} tone="net" />
          </div>
          {section.nationCount === 0 ? (
            <div className="text-sm text-muted-foreground">No nations matched this bracket for the current filters.</div>
          ) : (
            <NationTable datasetId={datasetId} taxId={section.taxId} nationCount={section.nationCount} />
          )}
        </div>
      ) : null}
    </section>
  );
}

export default function TaxExpensesPage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseTaxExpenseSummaryFilters(searchParams), [searchParams]);
  const filtersSignature = useMemo(() => buildSummaryFilterSignature(filters), [filters]);
  const [openSectionIds, setOpenSectionIds] = useState<Set<number>>(() => new Set<number>());

  const {
    draftFilters,
    setDraftValue,
    applyFilters,
    resetFilters,
  } = useSearchParamFilterDraft<TaxExpenseSummaryFilters>({
    filters,
    syncKey: filtersSignature,
    defaultFilters: TAX_EXPENSE_SUMMARY_DEFAULT_FILTERS,
    searchParams,
    setSearchParams,
    writeFilters: writeTaxExpenseSummaryFilters,
  });

  useEffect(() => {
    setOpenSectionIds(new Set<number>());
    queryClient.removeQueries({ queryKey: [TAX_EXPENSE_BRACKET_ROWS.endpoint.name] });
    queryClient.removeQueries({ queryKey: [TAX_EXPENSE_NATION.endpoint.name] });
  }, [filtersSignature, queryClient]);

  const summaryQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE.endpoint, buildSummaryEndpointArgs(filters)),
    enabled: Boolean(session?.guild),
  });

  const summaryData = summaryQuery.data?.data;
  const sections = useMemo<SummarySection[]>(() => {
    if (!summaryData) {
      return [];
    }

    return [
      {
        taxId: TAX_EXPENSE_TOTAL_TAX_ID,
        bracket: summaryData.total.bracket,
        nationCount: summaryData.total.nationCount,
        incomeValue: summaryData.total.incomeValue,
        expenseValue: summaryData.total.expenseValue,
        netValue: summaryData.total.netValue,
        income: summaryData.total.income,
        expense: summaryData.total.expense,
      },
      ...summaryData.brackets
        .map((bracket) => ({
          taxId: bracket.taxId,
          bracket: bracket.bracket,
          nationCount: bracket.nationCount,
          incomeValue: bracket.incomeValue,
          expenseValue: bracket.expenseValue,
          netValue: bracket.netValue,
          income: bracket.income,
          expense: bracket.expense,
        }))
        .sort((left, right) => {
          const leftActivity = left.incomeValue + left.expenseValue;
          const rightActivity = right.incomeValue + right.expenseValue;
          return rightActivity - leftActivity || left.taxId - right.taxId;
        }),
    ];
  }, [summaryData]);

  const filterBadges = useMemo(() => buildSummaryFilterBadges(filters), [filters]);
  const headerSummary = useMemo(() => {
    if (!summaryData) {
      return <FilterBadgeRow badges={filterBadges} />;
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {summaryData.alliances.map((allianceId) => (
          <Badge key={allianceId} variant="outline">{formatAllianceBadge(allianceId)}</Badge>
        ))}
        {filterBadges.map((badge) => (
          <Badge key={badge} variant="outline">{badge}</Badge>
        ))}
      </div>
    );
  }, [filterBadges, summaryData]);

  const pageHeaderConfig = useMemo<PageHeaderConfig>(() => ({
    sticky: true,
    title: (
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Tax expenses</h1>
        {summaryData ? (
          <>
            <span className="text-xs text-muted-foreground">{formatCountLabel(summaryData.brackets.length, "bracket")}</span>
            <span className="text-xs text-muted-foreground">{formatCountLabel(summaryData.taxRecordCount, "tax record")}</span>
          </>
        ) : null}
      </div>
    ),
    summary: headerSummary,
    content: (
      <EndpointFilterPanel
        endpoint={TAX_EXPENSE}
        showArguments={[...SUMMARY_FILTER_FIELDS]}
        draft={draftFilters}
        fieldKey={filtersSignature}
        setDraftValue={setDraftValue}
        onApply={applyFilters}
        onReset={resetFilters}
        isLoading={summaryQuery.isFetching}
      />
    ),
  }), [applyFilters, draftFilters, filtersSignature, headerSummary, resetFilters, setDraftValue, summaryData, summaryQuery.isFetching]);

  usePageHeader(pageHeaderConfig);

  const toggleSection = useCallback((taxId: number) => {
    setOpenSectionIds((current) => {
      const next = new Set(current);
      if (next.has(taxId)) {
        next.delete(taxId);
      } else {
        next.add(taxId);
      }
      return next;
    });
  }, []);

  if (!session?.guild) {
    return <LoginPickerPage />;
  }

  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">
        {summaryQuery.isLoading ? (
          <div className="py-10">
            <Loading variant="ripple" />
          </div>
        ) : summaryQuery.error || !summaryData ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load tax expenses.
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-6 text-sm text-muted-foreground">
            No tax expense data matched the current filter set.
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((section) => (
              <SummaryPanel
                key={`section-${section.taxId}`}
                datasetId={Number(summaryData.datasetId)}
                section={section}
                isOpen={openSectionIds.has(section.taxId)}
                toggleSection={toggleSection}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

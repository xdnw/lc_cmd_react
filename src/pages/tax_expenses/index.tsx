import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { EndpointFilterPanel } from "@/components/api/EndpointFilterPanel";
import { useSession } from "@/components/api/SessionContext";
import { useSearchParamFilterDraft } from "@/components/api/useSearchParamFilterDraft";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import { FilterBadgeRow } from "@/components/ui/FilterBadgeRow";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { TABLE, TAX_EXPENSE, TAX_EXPENSE_BRACKET_ROWS, TAX_EXPENSE_NATION } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import { bulkQueryOptions } from "@/lib/queries";
import type { TaxExpenseBracket, WebTable } from "@/lib/apitypes";
import LoginPickerPage from "@/pages/login_picker";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";

import { TaxExpenseValueStrip } from "./TaxExpenseValueStrip";
import {
  TAX_EXPENSE_NATION_TABLE_COLUMNS,
  TAX_EXPENSE_RESOURCE_PRICE_COLUMNS,
  TAX_EXPENSE_SUMMARY_DEFAULT_FILTERS,
  TAX_EXPENSE_TOTAL_TAX_ID,
  buildEntitySelection,
  buildResourceTypeSelection,
  buildSummaryBracketArgs,
  buildSummaryEndpointArgs,
  buildSummaryFilterBadges,
  buildSummaryFilterSignature,
  buildSummaryNationArgs,
  formatAllianceBadge,
  formatBracketMeta,
  formatBracketTitle,
  formatCountLabel,
  formatMonetaryAmount,
  formatTaxExpenseTimestamp,
  formatTransactionResources,
  getResourceBreakdownRows,
  parseTaxExpenseNationTable,
  parseTaxExpenseResourcePrices,
  parseTaxExpenseSummaryFilters,
  subtractResourceArrays,
  writeTaxExpenseSummaryFilters,
  type TaxExpenseDisplayMode,
  type TaxExpenseNationMeta,
  type TaxExpenseResourceBreakdownRow,
  type TaxExpenseResourcePriceMap,
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

const TRANSACTION_TABLE_COLUMNS: ConfigColumns[] = [
  {
    title: "Time",
    index: 0,
    sortable: true,
    editable: false,
    draggable: false,
    width: 126,
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
    width: 210,
    cellClassName: "whitespace-pre-wrap",
  },
  {
    title: "Note",
    index: 2,
    sortable: true,
    editable: false,
    draggable: false,
    width: 180,
    cellClassName: "whitespace-pre-wrap",
  },
  {
    index: 3,
    title: "Resources",
    sortable: false,
    editable: false,
    draggable: false,
    width: 132,
    cellClassName: "whitespace-pre-wrap font-mono",
  },
];

const BRACKET_ROW_COLUMNS: ConfigColumns[] = [
  {
    title: "Nation",
    index: 0,
    sortable: true,
    editable: false,
    draggable: false,
    width: 190,
    render: {
      display: (value) => <MarkupRenderer content={String(value ?? "")} disableLinkTabStops />,
    },
  },
  {
    title: "AA",
    index: 1,
    sortable: true,
    editable: false,
    draggable: false,
    width: 120,
    render: {
      display: (value) => value ? <MarkupRenderer content={String(value)} disableLinkTabStops /> : "-",
    },
  },
  {
    title: "Tax ID",
    index: 2,
    sortable: true,
    editable: false,
    draggable: false,
    width: 82,
    render: {
      display: (value) => typeof value === "number" ? `#${value}` : "-",
    },
  },
  {
    title: "Cities",
    index: 3,
    sortable: true,
    editable: false,
    draggable: false,
    width: 70,
    render: {
      display: (value) => typeof value === "number" ? String(value) : "-",
    },
  },
  {
    title: "Free Proj",
    index: 4,
    sortable: true,
    editable: false,
    draggable: false,
    width: 86,
    render: {
      display: (value) => typeof value === "number" ? String(value) : "-",
    },
  },
  {
    title: "Color",
    index: 5,
    sortable: true,
    editable: false,
    draggable: false,
    width: 84,
    render: {
      display: (value) => String(value ?? "-"),
    },
  },
  {
    title: "Net",
    index: 6,
    sortable: true,
    editable: false,
    draggable: false,
    width: 110,
    render: {
      display: (value) => formatMonetaryAmount(Number(value ?? 0)),
    },
    cellClassName: "font-mono",
  },
];

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
      className="h-6 px-2 text-[10px]"
      onClick={handleClick}
      disabled={nationId <= 0}
      aria-pressed={isSelected}
    >
      Inspect
    </Button>
  );
}

function DisplayModeToggle({
  displayMode,
  onChange,
  valueEnabled,
}: {
  displayMode: TaxExpenseDisplayMode;
  onChange: (next: TaxExpenseDisplayMode) => void;
  valueEnabled: boolean;
}) {
  const handleValueClick = useCallback(() => {
    onChange("value");
  }, [onChange]);
  const handleRawClick = useCallback(() => {
    onChange("raw");
  }, [onChange]);

  return (
    <div className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-background/70 p-1 text-[11px]">
      <button
        type="button"
        className={`rounded-sm px-2 py-1 ${displayMode === "value" ? "bg-foreground text-background" : "text-muted-foreground"}`}
        onClick={handleValueClick}
        disabled={!valueEnabled}
      >
        Value
      </button>
      <button
        type="button"
        className={`rounded-sm px-2 py-1 ${displayMode === "raw" ? "bg-foreground text-background" : "text-muted-foreground"}`}
        onClick={handleRawClick}
      >
        Raw
      </button>
    </div>
  );
}

function BreakdownColumn({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: readonly TaxExpenseResourceBreakdownRow[];
  tone: "income" | "expense" | "net";
}) {
  const valueClass = tone === "income"
    ? "text-emerald-700 dark:text-emerald-300"
    : tone === "expense"
      ? "text-rose-700 dark:text-rose-300"
      : "text-foreground";
  const barClass = tone === "income"
    ? "bg-emerald-500/15"
    : tone === "expense"
      ? "bg-rose-500/15"
      : "bg-sky-500/12";
  const maxMagnitude = rows.reduce((currentMax, row) => Math.max(currentMax, Math.abs(row.value)), 0);

  return (
    <div className="border border-border/50 bg-background/35 px-2 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">{rows.length === 0 ? "No movement" : `${rows.length} rows`}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">No movement.</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => {
            const width = maxMagnitude > 0 ? Math.max((Math.abs(row.value) / maxMagnitude) * 100, 10) : 0;
            return (
              <div key={row.key} className="relative overflow-hidden border border-border/40 px-2 py-1.5 text-xs">
                <div className={`pointer-events-none absolute inset-y-0 left-0 ${barClass}`} style={{ width: `${width}%` }} />
                <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <span className="truncate text-foreground">{row.label}</span>
                  <span className={`font-mono tabular-nums ${valueClass}`}>{row.displayValue}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BreakdownGrid({
  income,
  expense,
  displayMode,
  resourcePrices,
}: {
  income: readonly number[];
  expense: readonly number[];
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
}) {
  const net = useMemo(() => subtractResourceArrays(income, expense), [expense, income]);
  const incomeRows = useMemo(() => getResourceBreakdownRows(income, { displayMode, priceMap: resourcePrices }), [displayMode, income, resourcePrices]);
  const expenseRows = useMemo(() => getResourceBreakdownRows(expense, { displayMode, priceMap: resourcePrices }), [displayMode, expense, resourcePrices]);
  const netRows = useMemo(() => getResourceBreakdownRows(net, { displayMode, priceMap: resourcePrices }), [displayMode, net, resourcePrices]);

  return (
    <div className="grid gap-2 lg:grid-cols-3">
      <BreakdownColumn title="Income" rows={incomeRows} tone="income" />
      <BreakdownColumn title="Expense" rows={expenseRows} tone="expense" />
      <BreakdownColumn title="Net" rows={netRows} tone="net" />
    </div>
  );
}

function NationTable({
  datasetId,
  taxId,
  nationCount,
  displayMode,
  resourcePrices,
}: {
  datasetId: number;
  taxId: number;
  nationCount: number;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
}) {
  const [selectedNationId, setSelectedNationId] = useState<number | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const rowsQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_BRACKET_ROWS.endpoint, buildSummaryBracketArgs(datasetId, taxId)),
    enabled: nationCount > 0,
  });

  const rows = useMemo(() => rowsQuery.data?.data?.rows ?? [], [rowsQuery.data?.data?.rows]);
  const nationSelection = useMemo(() => buildEntitySelection(rows.map((row) => row.nationId)), [rows]);
  const nationInfoQuery = useQuery({
    ...bulkQueryOptions(TABLE.endpoint, {
      type: "DBNation",
      selection_str: nationSelection,
      columns: [...TAX_EXPENSE_NATION_TABLE_COLUMNS],
    }),
    enabled: rows.length > 0,
  });
  const nationLookup = useMemo(
    () => parseTaxExpenseNationTable(nationInfoQuery.data?.data as WebTable | null | undefined),
    [nationInfoQuery.data?.data],
  );
  const selectedNationMeta = selectedNationId === null ? null : nationLookup[selectedNationId] ?? null;
  const handleNationSelect = useCallback((nationId: number) => {
    setSelectedNationId(nationId);
  }, []);
  const tableData = useMemo<JSONValue[][]>(() => rows.map((row) => {
    const meta = nationLookup[row.nationId];
    return [
      meta?.nationMarkup ?? `[Nation #${row.nationId}](https://politicsandwar.com/nation/id=${row.nationId})`,
      meta?.allianceMarkup ?? "",
      row.currentTaxId ?? null,
      meta?.cities ?? null,
      meta?.freeProjectSlots ?? null,
      meta?.color ?? "-",
      row.netValue,
    ] as JSONValue[];
  }), [nationLookup, rows]);
  const selectedNationRowIndex = useMemo(() => selectedNationId === null
    ? -1
    : rows.findIndex((row) => row.nationId === selectedNationId), [rows, selectedNationId]);
  const highlightedRows = useMemo(() => selectedNationRowIndex >= 0 ? [selectedNationRowIndex] : [], [selectedNationRowIndex]);
  const renderIndexCell = useCallback(({ rowIdx }: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => {
    const nationId = rows[rowIdx]?.nationId ?? 0;
    return (
      <NationSelectCell
        nationId={nationId}
        isSelected={nationId > 0 && nationId === selectedNationId}
        onSelect={handleNationSelect}
      />
    );
  }, [handleNationSelect, rows, selectedNationId]);

  useEffect(() => {
    setSelectedNationId(null);
  }, [datasetId, taxId]);

  useEffect(() => {
    if (selectedNationId === null) {
      return;
    }
    detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedNationId]);

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

  return (
    <div className="space-y-3">
      <PreparedDataTable
        columnsInfo={BRACKET_ROW_COLUMNS}
        data={tableData}
        highlightedRowIndexes={highlightedRows}
        indexCellRenderer={renderIndexCell}
        indexColumnWidth={82}
      />
      <div ref={detailSectionRef}>
        <NationDetailSection
          datasetId={datasetId}
          taxId={taxId}
          nationId={selectedNationId}
          nationMeta={selectedNationMeta}
          displayMode={displayMode}
          resourcePrices={resourcePrices}
        />
      </div>
    </div>
  );
}

function NationDetailSection({
  datasetId,
  nationId,
  nationMeta,
  taxId,
  displayMode,
  resourcePrices,
}: {
  datasetId: number;
  nationId: number | null;
  nationMeta: TaxExpenseNationMeta | null;
  taxId: number;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const nationQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_NATION.endpoint, buildSummaryNationArgs(datasetId, taxId, nationId ?? 0)),
    enabled: (nationId ?? 0) > 0,
  });
  const detail = nationQuery.data?.data;
  const handleToggleBreakdown = useCallback(() => {
    setBreakdownOpen((current) => !current);
  }, []);
  const transactionTableData = useMemo<JSONValue[][]>(() => {
    if (!detail) {
      return [];
    }

    return detail.transactions.map((transaction) => [
      transaction.txDatetime,
      formatTransactionRoute(transaction),
      transaction.noteSummary,
      formatTransactionResources(transaction.resources, displayMode, resourcePrices),
    ] as JSONValue[]);
  }, [detail, displayMode, resourcePrices]);

  useEffect(() => {
    setBreakdownOpen(false);
  }, [nationId]);

  if ((nationId ?? 0) <= 0) {
    return (
      <div className="border border-dashed border-border/70 bg-background/30 px-3 py-3 text-sm text-muted-foreground">
        Select a nation row to inspect its tax-expense detail and transactions.
      </div>
    );
  }

  if (nationQuery.isLoading) {
    return (
      <div className="border border-border/60 bg-background/35 px-3 py-4">
        <Loading variant="ripple" />
      </div>
    );
  }

  if (nationQuery.error || !detail) {
    return <div className="text-sm text-destructive">Failed to load nation detail.</div>;
  }
  return (
    <section className="border border-border/60 bg-background/35">
      <div className="space-y-2 px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="min-w-0 text-sm font-semibold text-foreground">
            <MarkupRenderer content={nationMeta?.nationMarkup ?? `[Nation #${nationId}](https://politicsandwar.com/nation/id=${nationId})`} disableLinkTabStops />
          </div>
          {typeof detail.currentTaxId === "number" ? <Badge variant="outline">Tax #{detail.currentTaxId}</Badge> : null}
          {nationMeta?.cities !== null && nationMeta?.cities !== undefined ? <Badge variant="outline">{nationMeta.cities} cities</Badge> : null}
          {nationMeta?.freeProjectSlots !== null && nationMeta?.freeProjectSlots !== undefined ? <Badge variant="outline">{nationMeta.freeProjectSlots} free proj</Badge> : null}
          {nationMeta?.color ? <Badge variant="outline">{nationMeta.color}</Badge> : null}
          <Badge variant="outline">{formatCountLabel(detail.depositCount, "deposit record")}</Badge>
          <Badge variant="outline">{formatCountLabel(detail.transactionCount, "transaction")}</Badge>
        </div>
        <TaxExpenseValueStrip
          incomeValue={detail.incomeValue}
          expenseValue={detail.expenseValue}
          netValue={detail.netValue}
          onToggleBreakdown={handleToggleBreakdown}
          breakdownOpen={breakdownOpen}
        />
      </div>
      {breakdownOpen ? (
        <div className="border-t border-border/50 px-3 py-3">
          <BreakdownGrid
            income={detail.income}
            expense={detail.expense}
            displayMode={displayMode}
            resourcePrices={resourcePrices}
          />
          <div className="mt-2 text-[11px] text-muted-foreground">
            {displayMode === "value" ? "Breakdown uses current market prices." : "Breakdown shows raw resource amounts."}
          </div>
        </div>
      ) : null}
      <div className="border-t border-border/50 px-3 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
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
  displayMode,
  resourcePrices,
}: {
  datasetId: number;
  section: SummarySection;
  isOpen: boolean;
  toggleSection: (taxId: number) => void;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const title = formatBracketTitle(section.taxId, section.bracket);
  const meta = formatBracketMeta(section.bracket);
  const handleToggle = useCallback(() => {
    toggleSection(section.taxId);
  }, [section.taxId, toggleSection]);
  const handleToggleBreakdown = useCallback(() => {
    setBreakdownOpen((current) => !current);
  }, []);

  useEffect(() => {
    setBreakdownOpen(false);
  }, [section.taxId]);

  return (
    <section className="border border-border/60 bg-background/40">
      <div className="flex flex-col gap-2 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            {section.taxId !== TAX_EXPENSE_TOTAL_TAX_ID ? <Badge variant="outline">#{section.taxId}</Badge> : null}
            <Badge variant="outline">{formatCountLabel(section.nationCount, "nation")}</Badge>
            {meta ? <Badge variant="outline">{meta}</Badge> : null}
          </div>
          <TaxExpenseValueStrip
            incomeValue={section.incomeValue}
            expenseValue={section.expenseValue}
            netValue={section.netValue}
            onToggleBreakdown={handleToggleBreakdown}
            breakdownOpen={breakdownOpen}
          />
        </div>
        <div className="flex shrink-0 items-center justify-end">
          <Button size="sm" variant="outline" onClick={handleToggle} disabled={section.nationCount === 0}>
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isOpen ? "Hide nations" : `Nations (${section.nationCount.toLocaleString()})`}
          </Button>
        </div>
      </div>
      {breakdownOpen ? (
        <div className="border-t border-border/50 px-3 py-3">
          <BreakdownGrid
            income={section.income}
            expense={section.expense}
            displayMode={displayMode}
            resourcePrices={resourcePrices}
          />
          <div className="mt-2 text-[11px] text-muted-foreground">
            {displayMode === "value" ? "Breakdown uses current market prices." : "Breakdown shows raw resource amounts."}
          </div>
        </div>
      ) : null}
      {isOpen ? (
        <div className="border-t border-border/50 px-3 py-3">
          {section.nationCount === 0 ? (
            <div className="text-sm text-muted-foreground">No nations matched this bracket for the current filters.</div>
          ) : (
            <NationTable
              datasetId={datasetId}
              taxId={section.taxId}
              nationCount={section.nationCount}
              displayMode={displayMode}
              resourcePrices={resourcePrices}
            />
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
  const [displayMode, setDisplayMode] = useState<TaxExpenseDisplayMode>("value");
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
  const resourcePricesQuery = useQuery({
    ...bulkQueryOptions(TABLE.endpoint, {
      type: "ResourceType",
      selection_str: buildResourceTypeSelection(),
      columns: [...TAX_EXPENSE_RESOURCE_PRICE_COLUMNS],
    }),
    enabled: Boolean(session?.guild),
    staleTime: 300_000,
  });

  const summaryData = summaryQuery.data?.data;
  const resourcePrices = useMemo(
    () => parseTaxExpenseResourcePrices(resourcePricesQuery.data?.data as WebTable | null | undefined),
    [resourcePricesQuery.data?.data],
  );
  const effectiveDisplayMode = resourcePricesQuery.data?.data ? displayMode : "raw";
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border border-border/60 bg-background/35 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">
            {effectiveDisplayMode === "value"
              ? "Breakdowns use current market prices."
              : resourcePricesQuery.isLoading
                ? "Loading resource prices. Raw amounts shown until prices arrive."
                : resourcePricesQuery.error
                  ? "Resource prices failed to load. Raw amounts shown."
                  : "Breakdowns show raw resource amounts."}
          </div>
          <DisplayModeToggle
            displayMode={effectiveDisplayMode}
            onChange={setDisplayMode}
            valueEnabled={Boolean(resourcePricesQuery.data?.data)}
          />
        </div>
        {summaryQuery.isLoading ? (
          <div className="py-10">
            <Loading variant="ripple" />
          </div>
        ) : summaryQuery.error || !summaryData ? (
          <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load tax expenses.
          </div>
        ) : sections.length === 0 ? (
          <div className="border border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
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
                displayMode={effectiveDisplayMode}
                resourcePrices={resourcePrices}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

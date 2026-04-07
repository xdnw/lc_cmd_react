import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { EndpointFilterPanel } from "@/components/api/EndpointFilterPanel";
import { useSession } from "@/components/api/SessionContext";
import { useSearchParamFilterDraft } from "@/components/api/useSearchParamFilterDraft";
import CommandDialogButton from "@/components/cmd/CommandDialogButton";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import { FilterBadgeRow } from "@/components/ui/FilterBadgeRow";
import { ResourceBreakdownPanel } from "@/components/ui/ResourceBreakdownPanel";
import { ResourceMapText, createCopyableResourceMapRenderer } from "@/components/ui/resourceMap";
import { TransactionNoteBadges } from "@/components/ui/TransactionNoteBadges";
import { BlockCopyButton } from "@/components/ui/block-copy-button";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Loading from "@/components/ui/loading";
import { getRenderer } from "@/components/ui/renderers";
import type { TaxExpenseBracket, WebTable } from "@/lib/apitypes";
import { TABLE, TAX_EXPENSE, TAX_EXPENSE_BRACKET_ROWS, TAX_EXPENSE_NATION } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import { bulkQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import LoginPickerPage from "@/pages/login_picker";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ClientColumnOverlay, ConfigColumns, ObjectColumnRender, TableRowSelection, TableRowSelectionId } from "@/pages/custom_table/DataTable";
import PlaceholderTableDialogButton from "@/pages/custom_table/PlaceholderTableDialogButton";
import type { TableUrlColumnInput } from "@/pages/custom_table/table_util";
import { useIdSelection } from "@/utils/useIdSelection";

import { TaxExpenseValueStrip } from "./TaxExpenseValueStrip";
import {
  TAX_EXPENSE_NATION_TABLE_COLUMNS,
  TAX_EXPENSE_RESOURCE_PRICE_COLUMNS,
  TAX_EXPENSE_RESOURCE_TYPES,
  TAX_EXPENSE_SUMMARY_DEFAULT_FILTERS,
  TAX_EXPENSE_TOTAL_TAX_ID,
  buildEntitySelection,
  buildResourceTypeSelection,
  buildSummaryBracketArgs,
  buildSummaryEndpointArgs,
  buildSummaryFilterBadges,
  buildSummaryFilterSignature,
  buildSummaryNationArgs,
  formatBracketMeta,
  formatBracketTitle,
  formatCountLabel,
  formatMonetaryAmount,
  formatResourceCopyMap,
  formatTaxExpenseTimestamp,
  getResourceBreakdownRows,
  getResourceMoneyValue,
  parseTaxExpenseNationTable,
  parseTaxExpenseResourcePrices,
  parseTaxExpenseSummaryFilters,
  subtractResourceArrays,
  writeTaxExpenseSummaryFilters,
  type TaxExpenseDisplayMode,
  type TaxExpenseNationMeta,
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

type TaxExpenseBracketRowLike = {
  nationId: number;
  currentTaxId?: number;
  netValue: number;
  incomeValue?: number;
  expenseValue?: number;
};

type NationInspectionState = {
  datasetId: number;
  taxId: number;
  bracket?: TaxExpenseBracket["bracket"];
  nationId: number;
  nationMeta: TaxExpenseNationMeta | null;
};

const NATION_TABLE_INDEX = {
  nationId: 0,
  nationMarkup: 1,
  currentTaxId: 2,
  cities: 3,
  builtProjects: 4,
  projectSlots: 5,
  avgInfra: 6,
  avgLand: 7,
  color: 8,
  incomeValue: 9,
  expenseValue: 10,
  netValue: 11,
} as const;

const SUMMARY_FILTER_FIELDS = [
  "start",
  "end",
  "nationList",
  "dontRequireGrant",
  "dontRequireTagged",
  "dontRequireExpiry",
  "includeDeposits",
] as const satisfies readonly (keyof TaxExpenseSummaryFilters)[];

const COLOR_RENDERER = getRenderer("color") ?? {
  display: (value: unknown) => String(value ?? "-"),
};

const CITY_COST_COMMAND: ["city", "cost"] = ["city", "cost"];
const GRANT_COST_COMMAND: ["grant", "cost"] = ["grant", "cost"];

const INLINE_DIALOG_BUTTON_CLASS_NAME = "h-5 max-w-full rounded-sm px-1.5 text-[11px] font-medium whitespace-nowrap";
const PROJECT_COST_COLUMN_KEY = "{cost}";
const PROJECT_MARKET_VALUE_COLUMN_KEY = "{getmarketvalue}";
const TAX_EXPENSE_RESOURCE_COPY_KEYS = TAX_EXPENSE_RESOURCE_TYPES.map((resource) => resource.toLowerCase());

const NATION_CITY_TABLE_COLUMNS: readonly TableUrlColumnInput[] = [
  ["{getmarkdownurl}", "City"],
  ["{getinfra}", "Infra"],
  ["{getland}", "Land"],
  ["{getagedays}", "Age"],
  ["{getnumbuildings}", "Buildings"],
  ["{getmmr}", "MMR"],
  ["{tojson}", "Build JSON"],
];

function formatMetricNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function getRowNumberValue(row: JSONValue[] | undefined, index: number): number | null {
  const value = row?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatProjectProgress(meta: Pick<TaxExpenseNationMeta, "builtProjects" | "projectSlots">): string | null {
  if (meta.builtProjects === null || meta.projectSlots === null) {
    return null;
  }

  return `${meta.builtProjects}/${meta.projectSlots}`;
}

function buildProjectTableColumns(nationId: number): readonly TableUrlColumnInput[] {
  return [
    ["{name}", "Project"],
    [`{has(${nationId})}`, "Has"],
    [`{canbuild(${nationId})}`, "Can Build"],
    [PROJECT_COST_COLUMN_KEY, "Raw Cost"],
    [PROJECT_MARKET_VALUE_COLUMN_KEY, "Market Value"],
  ];
}

function buildProjectCostRenderer(rawCostIndex: number): ObjectColumnRender {
  return createCopyableResourceMapRenderer({
    getButtonLabel: (value) => <span className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono">{formatMonetaryAmount(Number(value ?? 0))}</span>,
    getCopySource: (_value, context) => context?.row[rawCostIndex] as JSONValue | null | undefined,
    getTitle: (copyText, value) => `${formatMonetaryAmount(Number(value ?? 0))}\n${copyText}\nClick to copy the raw resource map.`,
    className: cn(INLINE_DIALOG_BUTTON_CLASS_NAME, "font-mono"),
  });
}

function buildNationUrl(nationId: number): string {
  return `https://politicsandwar.com/nation/id=${nationId}`;
}

function extractMarkupLabel(markup: string | null | undefined, fallback: string): string {
  const trimmed = markup?.trim();
  if (!trimmed) {
    return fallback;
  }

  const exactMarkdownLink = trimmed.match(/^\[([^\]]+)\]\([^)]+\)$/);
  if (exactMarkdownLink?.[1]) {
    return exactMarkdownLink[1].trim();
  }

  const stripped = trimmed
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
  return stripped || fallback;
}

function TransactionResourceList({ resources }: { resources: readonly number[] }) {
  return <ResourceMapText value={resources as unknown as JSONValue} className="text-[11px]" resourceKeys={TAX_EXPENSE_RESOURCE_COPY_KEYS} />;
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
  const panels = useMemo(() => [
    {
      title: "Income",
      tone: "income" as const,
      values: income,
      entries: getResourceBreakdownRows(income, { displayMode, priceMap: resourcePrices }),
    },
    {
      title: "Expense",
      tone: "expense" as const,
      values: expense,
      entries: getResourceBreakdownRows(expense, { displayMode, priceMap: resourcePrices }),
    },
    {
      title: "Net",
      tone: "net" as const,
      values: net,
      entries: getResourceBreakdownRows(net, { displayMode, priceMap: resourcePrices }),
    },
  ], [displayMode, expense, income, net, resourcePrices]);

  return (
    <div className="grid gap-1.5 xl:grid-cols-3">
      {panels.map((panel) => (
        <BreakdownPanelCard
          key={panel.title}
          title={panel.title}
          entries={panel.entries}
          tone={panel.tone}
          values={panel.values}
        />
      ))}
    </div>
  );
}

function BreakdownPanelCard({
  title,
  entries,
  tone,
  values,
}: {
  title: string;
  entries: ReturnType<typeof getResourceBreakdownRows>;
  tone: "income" | "expense" | "net";
  values: readonly number[];
}) {
  const getCopyText = useCallback(() => formatResourceCopyMap(values), [values]);

  return (
    <ResourceBreakdownPanel
      title={title}
      entries={entries}
      tone={tone}
      compact
      showEntryCount={false}
      headerActions={<BlockCopyButton getText={getCopyText} />}
    />
  );
}

function TaxExpenseBreakdownSection({
  incomeValue,
  expenseValue,
  netValue,
  income,
  expense,
  displayMode,
  resourcePrices,
  resetKey,
  breakdownContainerClassName,
}: {
  incomeValue: number;
  expenseValue: number;
  netValue: number;
  income: readonly number[];
  expense: readonly number[];
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
  resetKey: string | number;
  breakdownContainerClassName?: string;
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const handleToggleBreakdown = useCallback(() => {
    setBreakdownOpen((current) => !current);
  }, []);

  useEffect(() => {
    setBreakdownOpen(false);
  }, [resetKey]);

  return (
    <>
      <TaxExpenseValueStrip
        incomeValue={incomeValue}
        expenseValue={expenseValue}
        netValue={netValue}
        onToggleBreakdown={handleToggleBreakdown}
        breakdownOpen={breakdownOpen}
      />

      {breakdownOpen ? (
        <div className={cn("border-t border-border/50 px-3 py-2", breakdownContainerClassName)}>
          <BreakdownGrid
            income={income}
            expense={expense}
            displayMode={displayMode}
            resourcePrices={resourcePrices}
          />
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            {displayMode === "value" ? "Breakdown uses current market prices, while the copy buttons preserve raw resource amounts." : "Breakdown shows raw resource amounts."}
          </div>
        </div>
      ) : null}
    </>
  );
}

function CityCostButton({
  cities,
  children,
  className,
}: {
  cities: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (typeof cities !== "number" || cities <= 0) {
    return <span className={cn("text-muted-foreground", className)}>-</span>;
  }

  return (
    <CommandDialogButton
      title={`City Cost: ${cities} -> ${cities + 1}`}
      commandPath={CITY_COST_COMMAND}
      initialValues={{
        currentCity: String(cities),
        maxCity: String(cities + 1),
      }}
      description="Review the next city cost with the current city count prefilled."
      variant="outline"
      size="sm"
      className={cn(INLINE_DIALOG_BUTTON_CLASS_NAME, "overflow-hidden", className)}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={String(children)}>{children}</span>
    </CommandDialogButton>
  );
}

function NationCityTableButton({
  nationId,
  title,
  children,
  className,
}: {
  nationId: number;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  if (nationId <= 0) {
    return <span className={cn("text-muted-foreground", className)}>-</span>;
  }

  return (
    <PlaceholderTableDialogButton
      title={title}
      typeName="DBCity"
      selection={`nation:${nationId}`}
      columns={NATION_CITY_TABLE_COLUMNS}
      sort={{ idx: 1, dir: "desc" }}
      variant="outline"
      size="sm"
      className={cn(INLINE_DIALOG_BUTTON_CLASS_NAME, "overflow-hidden", className)}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={String(children)}>{children}</span>
    </PlaceholderTableDialogButton>
  );
}

function ProjectsButton({
  nationId,
  children,
  className,
}: {
  nationId: number;
  children: ReactNode;
  className?: string;
}) {
  const projectCostRenderer = useMemo(() => buildProjectCostRenderer(3), []);
  const projectClientColumns = useMemo<ClientColumnOverlay[]>(() => [
    {
      id: "project-cost",
      title: "Cost",
      value: (row) => row[4] ?? null,
      render: projectCostRenderer,
      sortable: true,
      exportable: false,
      editable: false,
      draggable: false,
      width: 116,
    },
  ], [projectCostRenderer]);

  if (nationId <= 0) {
    return <span className={cn("text-muted-foreground", className)}>-</span>;
  }

  return (
    <PlaceholderTableDialogButton
      title="Projects"
      typeName="Project"
      selection="*"
      columns={buildProjectTableColumns(nationId)}
      clientColumns={projectClientColumns}
      hiddenColumns={[PROJECT_COST_COLUMN_KEY, PROJECT_MARKET_VALUE_COLUMN_KEY]}
      sort={{ idx: 0, dir: "asc" }}
      variant="outline"
      size="sm"
      className={cn(INLINE_DIALOG_BUTTON_CLASS_NAME, "overflow-hidden", className)}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={String(children)}>{children}</span>
    </PlaceholderTableDialogButton>
  );
}

function NationButtonCell({
  inspectionState,
  nationMarkup,
  onOpenNation,
}: {
  inspectionState: NationInspectionState;
  nationMarkup: string;
  onOpenNation: (next: NationInspectionState) => void;
}) {
  const nationId = inspectionState.nationId;
  const label = useMemo(
    () => extractMarkupLabel(nationMarkup, `Nation #${nationId}`),
    [nationId, nationMarkup],
  );
  const handleClick = useCallback(() => {
    onOpenNation(inspectionState);
  }, [inspectionState, onOpenNation]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-6 max-w-full justify-start overflow-hidden px-2 text-left text-xs font-semibold whitespace-nowrap"
      onClick={handleClick}
      disabled={nationId <= 0}
      title={label}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
    </Button>
  );
}

function TaxExpenseNationDialog({
  inspection,
  onClose,
  displayMode,
  resourcePrices,
}: {
  inspection: NationInspectionState | null;
  onClose: () => void;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
}) {
  const open = inspection !== null;
  const detailQuery = useQuery({
    ...bulkQueryOptions(
      TAX_EXPENSE_NATION.endpoint,
      buildSummaryNationArgs(inspection?.datasetId ?? 0, inspection?.taxId ?? 0, inspection?.nationId ?? 0),
    ),
    enabled: Boolean(open && inspection && inspection.nationId > 0),
  });
  const detail = detailQuery.data?.data;
  const transactionTableData = useMemo<JSONValue[][]>(() => {
    if (!detail) {
      return [];
    }

    return detail.transactions.map((transaction, index) => [
      transaction.txDatetime,
      transaction.note,
      getResourceMoneyValue(transaction.resources, resourcePrices),
    ] as JSONValue[]);
  }, [detail, resourcePrices]);
  const transactionColumns = useMemo<ConfigColumns[]>(() => [
    {
      title: "Time",
      index: 0,
      sortable: true,
      editable: false,
      draggable: false,
      width: 128,
      render: {
        display: (value) => formatTaxExpenseTimestamp(Number(value ?? 0)),
      },
    },
    {
      title: "Note",
      index: 1,
      sortable: false,
      editable: false,
      draggable: false,
      width: 320,
      render: {
        display: (_value, context) => {
          const transaction = context ? detail?.transactions[context.rowIdx] : undefined;
          return transaction ? <TransactionNoteBadges note={transaction.note} maxVisibleBadges={3} /> : "-";
        },
      },
    },
    {
      title: "Resources",
      index: 2,
      sortable: false,
      editable: false,
      draggable: false,
      width: 320,
      render: {
        display: (_value, context) => {
          const transaction = context ? detail?.transactions[context.rowIdx] : undefined;
          return transaction ? <TransactionResourceList resources={transaction.resources} /> : "-";
        },
      },
    },
    {
      title: "Value",
      index: 2,
      sortable: true,
      editable: false,
      draggable: false,
      width: 112,
      render: {
        display: (value) => formatMonetaryAmount(Number(value ?? 0)),
      },
      cellClassName: "font-mono",
    },
  ], [detail?.transactions]);
  const nationTitle = inspection
    ? extractMarkupLabel(inspection.nationMeta?.nationMarkup, `Nation #${inspection.nationId}`)
    : "Nation";
  const sectionTitle = inspection ? formatBracketTitle(inspection.taxId, inspection.bracket) : "";
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {inspection ? (
        <DialogContent className="max-w-6xl gap-3 sm:max-h-[85vh]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-left text-lg font-semibold tracking-tight">{nationTitle}</DialogTitle>
            {sectionTitle && sectionTitle !== "Total" ? (
              <div className="text-left text-xs text-muted-foreground">{sectionTitle}</div>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <CityCostButton cities={inspection.nationMeta?.cities}>
                cities:{formatMetricNumber(inspection.nationMeta?.cities)}
              </CityCostButton>
              {inspection.nationMeta ? (
                <ProjectsButton nationId={inspection.nationId}>
                  project:{formatProjectProgress(inspection.nationMeta) ?? "-"}
                </ProjectsButton>
              ) : null}
              <NationCityTableButton nationId={inspection.nationId} title="Nation Cities">
                infra:{formatMetricNumber(inspection.nationMeta?.avgInfra, 1)}
              </NationCityTableButton>
              <NationCityTableButton nationId={inspection.nationId} title="Nation Cities">
                land:{formatMetricNumber(inspection.nationMeta?.avgLand, 1)}
              </NationCityTableButton>
              {inspection.nationMeta?.score !== null && inspection.nationMeta?.score !== undefined ? <Badge variant="outline">Score {inspection.nationMeta.score.toLocaleString()}</Badge> : null}
              {inspection.nationMeta?.color ? (
                <div className="inline-flex items-center gap-1 rounded-sm border border-border/70 bg-muted/15 px-1.5 py-0 text-[11px] leading-5 text-foreground/85">
                  <span className="shrink-0">{COLOR_RENDERER.display(inspection.nationMeta.color)}</span>
                  <span>{inspection.nationMeta.color}</span>
                </div>
              ) : null}
              {typeof detail?.currentTaxId === "number" ? <Badge variant="outline">Tax #{detail.currentTaxId}</Badge> : null}
              {typeof detail?.depositCount === "number" ? <Badge variant="outline">{formatCountLabel(detail.depositCount, "deposit record")}</Badge> : null}
              {typeof detail?.transactionCount === "number" ? <Badge variant="outline">{formatCountLabel(detail.transactionCount, "transaction")}</Badge> : null}
            </div>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="py-8">
              <Loading variant="ripple" />
            </div>
          ) : detailQuery.error || !detail ? (
            <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to load nation detail.
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1">
              <section className="space-y-2 border border-border/60 bg-background/35 px-3 py-3">
                <TaxExpenseBreakdownSection
                  incomeValue={detail.incomeValue}
                  expenseValue={detail.expenseValue}
                  netValue={detail.netValue}
                  income={detail.income}
                  expense={detail.expense}
                  displayMode={displayMode}
                  resourcePrices={resourcePrices}
                  resetKey={`${inspection.taxId}:${inspection.nationId}`}
                  breakdownContainerClassName="px-0 pb-0"
                />
              </section>

              <section className="border border-border/60 bg-background/35 px-3 py-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Transactions</h3>
                  <span className="text-[11px] text-muted-foreground">Actual resource amounts plus converted value.</span>
                </div>
                {transactionTableData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No transactions in this window.</div>
                ) : (
                  <PreparedDataTable
                    columnsInfo={transactionColumns}
                    data={transactionTableData}
                    showExports={false}
                    showIndexColumn={false}
                  />
                )}
              </section>
            </div>
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function NationTable({
  datasetId,
  section,
  inspection,
  onInspectNation,
  resourcePrices,
}: {
  datasetId: number;
  section: SummarySection;
  inspection: NationInspectionState | null;
  onInspectNation: (next: NationInspectionState) => void;
  resourcePrices?: TaxExpenseResourcePriceMap;
}) {
  const rowsQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_BRACKET_ROWS.endpoint, buildSummaryBracketArgs(datasetId, section.taxId)),
    enabled: section.nationCount > 0,
  });

  const rows = useMemo(
    () => (rowsQuery.data?.data?.rows ?? []) as TaxExpenseBracketRowLike[],
    [rowsQuery.data?.data?.rows],
  );
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
  const selected = useIdSelection<number>();
  const {
    addMany: addSelectedNationIds,
    clear: clearSelectedNationIds,
    count: selectedNationCount,
    selectedIds,
    setSelectedIds,
  } = selected;
  const [visibleNationIds, setVisibleNationIds] = useState<number[]>([]);
  const includeTaxIdColumn = section.taxId === TAX_EXPENSE_TOTAL_TAX_ID;
  const hasIncomeExpenseColumns = useMemo(
    () => rows.some((row) => typeof row.incomeValue === "number" || typeof row.expenseValue === "number"),
    [rows],
  );
  const selectedNationIds = useMemo(
    () => Array.from(selectedIds).sort((left, right) => left - right),
    [selectedIds],
  );
  const selectedNationSelection = useMemo(
    () => buildEntitySelection(selectedNationIds),
    [selectedNationIds],
  );
  const tableData = useMemo<JSONValue[][]>(() => rows.map((row) => {
    const meta = nationLookup[row.nationId];
    return [
      row.nationId,
      meta?.nationMarkup ?? `[Nation #${row.nationId}](${buildNationUrl(row.nationId)})`,
      row.currentTaxId ?? null,
      meta?.cities ?? null,
      meta?.builtProjects ?? null,
      meta?.projectSlots ?? null,
      meta?.avgInfra ?? null,
      meta?.avgLand ?? null,
      meta?.color ?? "-",
      row.incomeValue ?? null,
      row.expenseValue ?? null,
      row.netValue,
    ] as JSONValue[];
  }), [nationLookup, rows]);

  useEffect(() => {
    const availableNationIds = new Set(rows.map((row) => row.nationId));
    setSelectedIds((current) => {
      let changed = false;
      const next = new Set<number>();

      current.forEach((nationId) => {
        if (availableNationIds.has(nationId)) {
          next.add(nationId);
        } else {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [rows, setSelectedIds]);

  const rowSelection = useMemo<TableRowSelection>(() => ({
    getRowId: (row: JSONValue[]) => {
      return getRowNumberValue(row, NATION_TABLE_INDEX.nationId);
    },
    selectedIds,
    onSelectedIdsChange: (nextSelectedIds: Set<TableRowSelectionId>) => {
      setSelectedIds(new Set(Array.from(nextSelectedIds).filter((nationId): nationId is number => typeof nationId === "number")));
    },
    onVisibleIdsChange: (nextVisibleIds: TableRowSelectionId[]) => {
      setVisibleNationIds(nextVisibleIds.filter((nationId): nationId is number => typeof nationId === "number"));
    },
    getLabel: (nationId) => typeof nationId === "number" && selectedIds.has(nationId) ? `Deselect nation ${nationId}` : `Select nation ${nationId}`,
    debugTagPrefix: "tax-expense-nation-select",
  }), [selectedIds, setSelectedIds]);
  const handleSelectVisible = useCallback(() => {
    addSelectedNationIds(visibleNationIds);
  }, [addSelectedNationIds, visibleNationIds]);
  const inspectedNationId = inspection && inspection.taxId === section.taxId
    ? inspection.nationId
    : null;
  const highlightedRowClassName = useCallback((row: JSONValue[]) => {
    const nationId = getRowNumberValue(row, NATION_TABLE_INDEX.nationId);
    if (nationId === null || inspectedNationId === null || nationId !== inspectedNationId) {
      return undefined;
    }

    return "bg-blue-100/90 dark:bg-blue-800/30";
  }, [inspectedNationId]);
  const columns = useMemo<ConfigColumns[]>(() => {
    const nextColumns: ConfigColumns[] = [
      {
        title: "Nation",
        index: 1,
        sortable: true,
        editable: false,
        draggable: false,
        width: 220,
        render: {
          display: (value, context) => {
            const row = context?.row;
            const nationId = getRowNumberValue(row, NATION_TABLE_INDEX.nationId) ?? 0;
            return (
              <NationButtonCell
                inspectionState={{
                  datasetId,
                  taxId: section.taxId,
                  bracket: section.bracket,
                  nationId,
                  nationMeta: nationLookup[nationId] ?? null,
                }}
                nationMarkup={typeof value === "string" ? value : ""}
                onOpenNation={onInspectNation}
              />
            );
          },
        },
      },
    ];

    if (includeTaxIdColumn) {
      nextColumns.push({
        title: "Tax ID",
        index: 2,
        sortable: true,
        editable: false,
        draggable: false,
        width: 82,
        render: {
          display: (value) => typeof value === "number" ? `#${value}` : "-",
        },
      });
    }

    nextColumns.push(
      {
        title: "Cities",
        index: 3,
        sortable: true,
        editable: false,
        draggable: false,
        width: 84,
        render: {
          display: (value, context) => {
            const row = context?.row;
            const nationId = getRowNumberValue(row, NATION_TABLE_INDEX.nationId) ?? 0;
            const cities = typeof value === "number" ? value : getRowNumberValue(row, NATION_TABLE_INDEX.cities);
            return <CityCostButton cities={cities} className="w-full justify-start" key={`city-${nationId}`}>{formatMetricNumber(cities)}</CityCostButton>;
          },
        },
      },
      {
        title: "Projects",
        index: 4,
        sortable: true,
        editable: false,
        draggable: false,
        width: 96,
        render: {
          display: (_value, context) => {
            const row = context?.row;
            const nationId = getRowNumberValue(row, NATION_TABLE_INDEX.nationId);
            const builtProjects = getRowNumberValue(row, NATION_TABLE_INDEX.builtProjects);
            const projectSlots = getRowNumberValue(row, NATION_TABLE_INDEX.projectSlots);
            if (nationId === null) {
              return "-";
            }

            return (
              <ProjectsButton nationId={nationId} className="w-full justify-start">
                {formatProjectProgress({ builtProjects, projectSlots }) ?? "-"}
              </ProjectsButton>
            );
          },
        },
      },
      {
        title: "Infra",
        index: 6,
        sortable: true,
        editable: false,
        draggable: false,
        width: 96,
        render: {
          display: (value, context) => {
            const row = context?.row;
            const nationId = getRowNumberValue(row, NATION_TABLE_INDEX.nationId) ?? 0;
            const avgInfra = typeof value === "number" ? value : getRowNumberValue(row, NATION_TABLE_INDEX.avgInfra);
            return (
              <NationCityTableButton nationId={nationId} title="Nation Cities" className="w-full justify-start">
                {formatMetricNumber(avgInfra, 1)}
              </NationCityTableButton>
            );
          },
        },
      },
      {
        title: "Land",
        index: 7,
        sortable: true,
        editable: false,
        draggable: false,
        width: 96,
        render: {
          display: (value, context) => {
            const row = context?.row;
            const nationId = getRowNumberValue(row, NATION_TABLE_INDEX.nationId) ?? 0;
            const avgLand = typeof value === "number" ? value : getRowNumberValue(row, NATION_TABLE_INDEX.avgLand);
            return (
              <NationCityTableButton nationId={nationId} title="Nation Cities" className="w-full justify-start">
                {formatMetricNumber(avgLand, 1)}
              </NationCityTableButton>
            );
          },
        },
      },
      {
        title: "Color",
        index: 8,
        sortable: true,
        editable: false,
        draggable: false,
        width: 74,
        render: COLOR_RENDERER,
      },
    );

    if (hasIncomeExpenseColumns) {
      nextColumns.push(
        {
          title: "Income",
          index: 9,
          sortable: true,
          editable: false,
          draggable: false,
          width: 110,
          render: {
            display: (value) => typeof value === "number" ? formatMonetaryAmount(value) : "-",
          },
          cellClassName: "font-mono",
        },
        {
          title: "Expense",
          index: 10,
          sortable: true,
          editable: false,
          draggable: false,
          width: 110,
          render: {
            display: (value) => typeof value === "number" ? formatMonetaryAmount(value) : "-",
          },
          cellClassName: "font-mono",
        },
      );
    }

    nextColumns.push({
      title: "Net",
      index: 11,
      sortable: true,
      editable: false,
      draggable: false,
      width: 110,
      render: {
        display: (value) => formatMonetaryAmount(Number(value ?? 0)),
      },
      cellClassName: "font-mono",
    });

    return nextColumns;
  }, [datasetId, hasIncomeExpenseColumns, includeTaxIdColumn, nationLookup, onInspectNation, section.bracket, section.taxId]);

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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <CommandDialogButton
          title="Grant Cost"
          commandPath={GRANT_COST_COMMAND}
          initialValues={{ receivers: selectedNationSelection }}
          description="Selected nations are prefilled so you can estimate city, infra, land, and project grant costs together."
          variant="outline"
          size="sm"
          className="h-7"
          disabled={selectedNationCount === 0}
        >
          Grant cost{selectedNationCount > 0 ? ` (${selectedNationCount})` : ""}
        </CommandDialogButton>
        <Button variant="outline" size="sm" className="h-7" onClick={handleSelectVisible} disabled={visibleNationIds.length === 0}>
          Select visible
        </Button>
        <Button variant="outline" size="sm" className="h-7" onClick={clearSelectedNationIds} disabled={selectedNationCount === 0}>
          Clear selected
        </Button>
        {selectedNationCount > 0 ? <Badge variant="outline">{formatCountLabel(selectedNationCount, "nation")} selected</Badge> : null}
      </div>
      <PreparedDataTable
        columnsInfo={columns}
        data={tableData}
        rowClassName={highlightedRowClassName}
        showIndexColumn
        indexColumnWidth={68}
        rowSelection={rowSelection}
      />
    </div>
  );
}

function SummaryPanel({
  datasetId,
  section,
  isOpen,
  toggleSection,
  displayMode,
  resourcePrices,
  inspection,
  onInspectNation,
}: {
  datasetId: number;
  section: SummarySection;
  isOpen: boolean;
  toggleSection: (taxId: number) => void;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
  inspection: NationInspectionState | null;
  onInspectNation: (next: NationInspectionState) => void;
}) {
  const title = formatBracketTitle(section.taxId, section.bracket);
  const meta = formatBracketMeta(section.bracket);
  const handleToggleSection = useCallback(() => {
    toggleSection(section.taxId);
  }, [section.taxId, toggleSection]);

  return (
    <section className="border border-border/60 bg-background/40">
      <div className="space-y-1.5 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            <Badge variant="outline">{formatCountLabel(section.nationCount, "nation")}</Badge>
            {section.taxId !== TAX_EXPENSE_TOTAL_TAX_ID ? <Badge variant="outline">#{section.taxId}</Badge> : null}
            {meta ? <Badge variant="outline">{meta}</Badge> : null}
          </div>
          <Button size="sm" variant="outline" onClick={handleToggleSection} disabled={section.nationCount === 0}>
            {isOpen ? "Hide nations" : "Show nations"}
          </Button>
        </div>
        <TaxExpenseBreakdownSection
          incomeValue={section.incomeValue}
          expenseValue={section.expenseValue}
          netValue={section.netValue}
          income={section.income}
          expense={section.expense}
          displayMode={displayMode}
          resourcePrices={resourcePrices}
          resetKey={section.taxId}
        />
      </div>

      {isOpen ? (
        <div className="border-t border-border/50 px-3 py-2">
          {section.nationCount === 0 ? (
            <div className="text-sm text-muted-foreground">No nations matched this bracket for the current filters.</div>
          ) : (
            <NationTable
              datasetId={datasetId}
              section={section}
              inspection={inspection}
              onInspectNation={onInspectNation}
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
  const [inspection, setInspection] = useState<NationInspectionState | null>(null);
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
    setInspection(null);
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
  const headerSummary = useMemo(() => <FilterBadgeRow badges={filterBadges} />, [filterBadges]);

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
  const handleInspectNation = useCallback((next: NationInspectionState) => {
    setInspection(next);
  }, []);
  const handleCloseInspection = useCallback(() => {
    setInspection(null);
  }, []);
  const handleSetValueDisplayMode = useCallback(() => {
    setDisplayMode("value");
  }, []);
  const handleSetRawDisplayMode = useCallback(() => {
    setDisplayMode("raw");
  }, []);

  if (!session?.guild) {
    return <LoginPickerPage />;
  }

  return (
    <>
      <div className="pb-8">
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border border-border/60 bg-background/35 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">
              {effectiveDisplayMode === "value"
                ? "Breakdowns use current market prices. Copy buttons always preserve raw resource amounts."
                : resourcePricesQuery.isLoading
                  ? "Loading resource prices. Raw amounts shown until prices arrive."
                  : resourcePricesQuery.error
                    ? "Resource prices failed to load. Raw amounts shown."
                    : "Breakdowns show raw resource amounts."}
            </div>
            <div className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-background/70 p-1 text-[11px]">
              <button
                type="button"
                className={`rounded-sm px-2 py-1 ${effectiveDisplayMode === "value" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                onClick={handleSetValueDisplayMode}
                disabled={!resourcePricesQuery.data?.data}
              >
                Value
              </button>
              <button
                type="button"
                className={`rounded-sm px-2 py-1 ${effectiveDisplayMode === "raw" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                onClick={handleSetRawDisplayMode}
              >
                Raw
              </button>
            </div>
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
                  inspection={inspection}
                  onInspectNation={handleInspectNation}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <TaxExpenseNationDialog
        inspection={inspection}
        onClose={handleCloseInspection}
        displayMode={effectiveDisplayMode}
        resourcePrices={resourcePrices}
      />
    </>
  );
}

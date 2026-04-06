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
import { collectTransactionNoteNationIds, parseTransactionNote, type ParsedTransactionNote } from "@/lib/transactionNotes";
import { bulkQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import LoginPickerPage from "@/pages/login_picker";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";
import PlaceholderTableDialogButton from "@/pages/custom_table/PlaceholderTableDialogButton";
import type { TableUrlColumnInput } from "@/pages/custom_table/table_util";

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
const INFRA_COST_COMMAND: ["infra", "cost"] = ["infra", "cost"];
const LAND_COST_COMMAND: ["land", "cost"] = ["land", "cost"];

const INLINE_DIALOG_BUTTON_CLASS_NAME = "h-5 rounded-sm px-1.5 text-[11px] font-medium";

function formatMetricNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function toCommandNumberString(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return String(Math.max(0, Math.round(value)));
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
  ];
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
  const rows = useMemo(() => getResourceBreakdownRows(resources, { displayMode: "raw" }), [resources]);

  if (rows.length === 0) {
    return <span className="text-xs text-muted-foreground">0</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {rows.map((row) => (
        <Badge key={row.key} variant="outline" className="border-border/70 bg-muted/15 px-1.5 py-0 text-[10px] leading-4">
          <span className="truncate">{row.label}</span>
          <span className="font-mono text-[10px] tabular-nums">{row.displayValue}</span>
        </Badge>
      ))}
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
    <div className="grid gap-2 xl:grid-cols-3">
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
      className={cn(INLINE_DIALOG_BUTTON_CLASS_NAME, className)}
    >
      {children}
    </CommandDialogButton>
  );
}

function InfraCostButton({
  avgInfra,
  cities,
  children,
  className,
}: {
  avgInfra: number | null | undefined;
  cities: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const currentInfra = toCommandNumberString(avgInfra);
  if (!currentInfra) {
    return <span className={cn("text-muted-foreground", className)}>-</span>;
  }

  return (
    <CommandDialogButton
      title="Infra Cost"
      commandPath={INFRA_COST_COMMAND}
      initialValues={{
        currentInfra,
        maxInfra: currentInfra,
        ...(typeof cities === "number" && cities > 0 ? { cities: String(cities) } : {}),
      }}
      description="Current average infra is prefilled so you can price the next target quickly."
      variant="outline"
      size="sm"
      className={cn(INLINE_DIALOG_BUTTON_CLASS_NAME, className)}
    >
      {children}
    </CommandDialogButton>
  );
}

function LandCostButton({
  avgLand,
  cities,
  children,
  className,
}: {
  avgLand: number | null | undefined;
  cities: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const currentLand = toCommandNumberString(avgLand);
  if (!currentLand) {
    return <span className={cn("text-muted-foreground", className)}>-</span>;
  }

  return (
    <CommandDialogButton
      title="Land Cost"
      commandPath={LAND_COST_COMMAND}
      initialValues={{
        currentLand,
        maxLand: currentLand,
        ...(typeof cities === "number" && cities > 0 ? { cities: String(cities) } : {}),
      }}
      description="Current average land is prefilled so you can price the next target quickly."
      variant="outline"
      size="sm"
      className={cn(INLINE_DIALOG_BUTTON_CLASS_NAME, className)}
    >
      {children}
    </CommandDialogButton>
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
  if (nationId <= 0) {
    return <span className={cn("text-muted-foreground", className)}>-</span>;
  }

  return (
    <PlaceholderTableDialogButton
      title="Projects"
      typeName="Project"
      selection="*"
      columns={buildProjectTableColumns(nationId)}
      sort={{ idx: 0, dir: "asc" }}
      variant="outline"
      size="sm"
      className={cn(INLINE_DIALOG_BUTTON_CLASS_NAME, className)}
    >
      {children}
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
      className="h-6 justify-start px-2 text-left text-xs font-semibold"
      onClick={handleClick}
      disabled={nationId <= 0}
    >
      {label}
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
  const parsedNotes = useMemo<ParsedTransactionNote[]>(() => {
    if (!detail) {
      return [];
    }
    return detail.transactions.map((transaction) => parseTransactionNote(transaction.noteSummary, { compact: true }));
  }, [detail]);
  const noteNationIds = useMemo(() => collectTransactionNoteNationIds(parsedNotes), [parsedNotes]);
  const noteNationSelection = useMemo(() => buildEntitySelection(noteNationIds), [noteNationIds]);
  const noteNationQuery = useQuery({
    ...bulkQueryOptions(TABLE.endpoint, {
      type: "DBNation",
      selection_str: noteNationSelection,
      columns: [...TAX_EXPENSE_NATION_TABLE_COLUMNS],
    }),
    enabled: noteNationIds.length > 0,
  });
  const noteNationMetaLookup = useMemo(
    () => parseTaxExpenseNationTable(noteNationQuery.data?.data as WebTable | null | undefined),
    [noteNationQuery.data?.data],
  );
  const noteNationLookup = useMemo(
    () => Object.fromEntries(
      noteNationIds.map((nationId) => [
        nationId,
        {
          label: extractMarkupLabel(noteNationMetaLookup[nationId]?.nationMarkup, `Nation #${nationId}`),
          url: buildNationUrl(nationId),
        },
      ]),
    ),
    [noteNationIds, noteNationMetaLookup],
  );
  const transactionTableData = useMemo<JSONValue[][]>(() => {
    if (!detail) {
      return [];
    }

    return detail.transactions.map((transaction) => [
      transaction.txDatetime,
      transaction.noteSummary,
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
          const note = context ? parsedNotes[context.rowIdx] : null;
          return note ? <TransactionNoteBadges note={note} nationLookup={noteNationLookup} maxVisibleBadges={3} /> : "-";
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
  ], [detail?.transactions, noteNationLookup, parsedNotes]);
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
              <InfraCostButton avgInfra={inspection.nationMeta?.avgInfra} cities={inspection.nationMeta?.cities}>
                infra:{formatMetricNumber(inspection.nationMeta?.avgInfra, 1)}
              </InfraCostButton>
              <LandCostButton avgLand={inspection.nationMeta?.avgLand} cities={inspection.nationMeta?.cities}>
                land:{formatMetricNumber(inspection.nationMeta?.avgLand, 1)}
              </LandCostButton>
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
                <TaxExpenseValueStrip
                  incomeValue={detail.incomeValue}
                  expenseValue={detail.expenseValue}
                  netValue={detail.netValue}
                />
                <BreakdownGrid
                  income={detail.income}
                  expense={detail.expense}
                  displayMode={displayMode}
                  resourcePrices={resourcePrices}
                />
                <div className="text-[11px] text-muted-foreground">
                  {displayMode === "value" ? "Breakdown uses current market prices, while the copy buttons preserve raw resource amounts." : "Breakdown shows raw resource amounts."}
                </div>
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
}: {
  datasetId: number;
  section: SummarySection;
  inspection: NationInspectionState | null;
  onInspectNation: (next: NationInspectionState) => void;
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
  const includeTaxIdColumn = section.taxId === TAX_EXPENSE_TOTAL_TAX_ID;
  const hasIncomeExpenseColumns = useMemo(
    () => rows.some((row) => typeof row.incomeValue === "number" || typeof row.expenseValue === "number"),
    [rows],
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
            const row = context ? rows[context.rowIdx] : undefined;
            const nationId = row?.nationId ?? 0;
            return (
              <NationButtonCell
                inspectionState={{
                  datasetId,
                  taxId: section.taxId,
                  bracket: section.bracket,
                  nationId,
                  nationMeta: nationLookup[nationId] ?? null,
                }}
                nationMarkup={String(value ?? "")}
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
          display: (_value, context) => {
            const row = context ? rows[context.rowIdx] : undefined;
            const meta = row ? nationLookup[row.nationId] : undefined;
            return <CityCostButton cities={meta?.cities}>{formatMetricNumber(meta?.cities)}</CityCostButton>;
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
            const row = context ? rows[context.rowIdx] : undefined;
            const meta = row ? nationLookup[row.nationId] : undefined;
            if (!row || !meta) {
              return "-";
            }

            return (
              <ProjectsButton nationId={row.nationId}>
                {formatProjectProgress(meta) ?? "-"}
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
          display: (_value, context) => {
            const row = context ? rows[context.rowIdx] : undefined;
            const meta = row ? nationLookup[row.nationId] : undefined;
            return (
              <InfraCostButton avgInfra={meta?.avgInfra} cities={meta?.cities}>
                {formatMetricNumber(meta?.avgInfra, 1)}
              </InfraCostButton>
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
          display: (_value, context) => {
            const row = context ? rows[context.rowIdx] : undefined;
            const meta = row ? nationLookup[row.nationId] : undefined;
            return (
              <LandCostButton avgLand={meta?.avgLand} cities={meta?.cities}>
                {formatMetricNumber(meta?.avgLand, 1)}
              </LandCostButton>
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
  }, [datasetId, hasIncomeExpenseColumns, includeTaxIdColumn, nationLookup, onInspectNation, rows, section.bracket, section.taxId]);
  const highlightedRows = useMemo(
    () => inspection && inspection.taxId === section.taxId
      ? rows.reduce<number[]>((matches, row, rowIdx) => {
        if (row.nationId === inspection.nationId) {
          matches.push(rowIdx);
        }
        return matches;
      }, [])
      : [],
    [inspection, rows, section.taxId],
  );

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
    <PreparedDataTable
      columnsInfo={columns}
      data={tableData}
      highlightedRowIndexes={highlightedRows}
      showIndexColumn={false}
    />
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
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const title = formatBracketTitle(section.taxId, section.bracket);
  const meta = formatBracketMeta(section.bracket);
  const handleToggleSection = useCallback(() => {
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
      <div className="space-y-2 px-3 py-3">
        <div className="flex flex-wrap items-start gap-2">
          <Button size="sm" variant="outline" onClick={handleToggleSection} disabled={section.nationCount === 0}>
            {isOpen ? "Hide nations" : "Show nations"}
          </Button>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
              <Badge variant="outline">{formatCountLabel(section.nationCount, "nation")}</Badge>
              {section.taxId !== TAX_EXPENSE_TOTAL_TAX_ID ? <Badge variant="outline">#{section.taxId}</Badge> : null}
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
            {displayMode === "value" ? "Breakdown uses current market prices, while the copy buttons preserve raw resource amounts." : "Breakdown shows raw resource amounts."}
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
              section={section}
              inspection={inspection}
              onInspectNation={onInspectNation}
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

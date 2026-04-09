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
import type { TableColumnCustomization, TableColumnCustomizationItem } from "@/pages/custom_table/TableToolbar";
import { formatColName, normalizePlaceholderColumnExpression, toPlaceholderColumnId, type TableUrlColumnInput } from "@/pages/custom_table/table_util";
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

const NATION_QUERY_INDEX = {
  nationId: 0,
  nationMarkup: 1,
  allianceMarkup: 2,
  cities: 3,
  freeProjectSlots: 4,
  projectSlots: 5,
  builtProjects: 6,
  avgInfra: 7,
  avgLand: 8,
  color: 9,
  score: 10,
} as const;

const TAX_EXPENSE_NATION_VISIBLE_PLACEHOLDERS = [
  { value: TAX_EXPENSE_NATION_TABLE_COLUMNS[1], title: "Nation", width: 220 },
  { value: TAX_EXPENSE_NATION_TABLE_COLUMNS[3], title: "Cities", width: 84 },
  { value: TAX_EXPENSE_NATION_TABLE_COLUMNS[6], title: "Projects", width: 96 },
  { value: TAX_EXPENSE_NATION_TABLE_COLUMNS[7], title: "Infra", width: 96 },
  { value: TAX_EXPENSE_NATION_TABLE_COLUMNS[8], title: "Land", width: 96 },
  { value: TAX_EXPENSE_NATION_TABLE_COLUMNS[9], title: "Color", width: 74 },
] as const;

const TAX_EXPENSE_NATION_SUPPORT_PLACEHOLDER_SET = new Set<string>(TAX_EXPENSE_NATION_TABLE_COLUMNS);
const TAX_EXPENSE_NATION_VISIBLE_PLACEHOLDER_ID_SET = new Set<string>(
  TAX_EXPENSE_NATION_VISIBLE_PLACEHOLDERS.map((column) => toPlaceholderColumnId(column.value)),
);
const TAX_EXPENSE_NATION_TAX_ID_COLUMN_ID = "tax-expense:tax-id";
const TAX_EXPENSE_NATION_INCOME_COLUMN_ID = "tax-expense:income";
const TAX_EXPENSE_NATION_EXPENSE_COLUMN_ID = "tax-expense:expense";
const TAX_EXPENSE_NATION_NET_COLUMN_ID = "tax-expense:net";

type TaxExpenseNationTableCustomizationState = {
  items: TableColumnCustomizationItem[] | null;
};

function createTaxExpenseNationDefaultItems(options: {
  includeTaxIdColumn: boolean;
  includeIncomeExpenseColumns: boolean;
}): TableColumnCustomizationItem[] {
  const items = TAX_EXPENSE_NATION_VISIBLE_PLACEHOLDERS.map<TableColumnCustomizationItem>((column) => ({
    id: toPlaceholderColumnId(column.value),
    source: "placeholder",
    title: column.title,
    rawTitle: column.title,
    value: column.value,
    titleEditable: true,
    removable: true,
  }));

  if (options.includeTaxIdColumn) {
    items.push({
      id: TAX_EXPENSE_NATION_TAX_ID_COLUMN_ID,
      source: "client",
      title: "Tax ID",
      rawTitle: "Tax ID",
      titleEditable: true,
      removable: true,
    });
  }

  if (options.includeIncomeExpenseColumns) {
    items.push(
      {
        id: TAX_EXPENSE_NATION_INCOME_COLUMN_ID,
        source: "client",
        title: "Income",
        rawTitle: "Income",
        titleEditable: true,
        removable: true,
      },
      {
        id: TAX_EXPENSE_NATION_EXPENSE_COLUMN_ID,
        source: "client",
        title: "Expense",
        rawTitle: "Expense",
        titleEditable: true,
        removable: true,
      },
    );
  }

  items.push({
    id: TAX_EXPENSE_NATION_NET_COLUMN_ID,
    source: "client",
    title: "Net",
    rawTitle: "Net",
    titleEditable: true,
    removable: true,
  });

  return items;
}

function normalizeTaxExpenseNationCustomizationItems(
  items: readonly TableColumnCustomizationItem[],
  systemItems: readonly TableColumnCustomizationItem[],
): TableColumnCustomizationItem[] {
  const systemItemsById = new Map(systemItems.map((item) => [item.id, item]));
  const normalizedItems: TableColumnCustomizationItem[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    const systemItem = systemItemsById.get(item.id);
    if (systemItem) {
      if (seenIds.has(systemItem.id)) {
        continue;
      }

      seenIds.add(systemItem.id);
      normalizedItems.push({
        ...systemItem,
        rawTitle: (item.rawTitle ?? item.title ?? systemItem.rawTitle ?? systemItem.title).trim() || systemItem.title,
      });
      continue;
    }

    const normalizedValue = normalizePlaceholderColumnExpression(item.value ?? "");
    if (!normalizedValue) {
      continue;
    }

    const customId = toPlaceholderColumnId(normalizedValue);
    if (seenIds.has(customId)) {
      continue;
    }

    const systemPlaceholderItem = systemItemsById.get(customId);
    if (systemPlaceholderItem) {
      seenIds.add(customId);
      normalizedItems.push({
        ...systemPlaceholderItem,
        rawTitle: (item.rawTitle ?? item.title ?? systemPlaceholderItem.rawTitle ?? systemPlaceholderItem.title).trim() || systemPlaceholderItem.title,
      });
      continue;
    }

    const defaultTitle = formatColName(normalizedValue);
    seenIds.add(customId);
    normalizedItems.push({
      id: customId,
      source: "placeholder",
      title: defaultTitle,
      rawTitle: (item.rawTitle ?? item.title ?? defaultTitle).trim() || defaultTitle,
      value: normalizedValue,
      valueEditable: true,
      titleEditable: true,
      removable: true,
    });
  }

  return normalizedItems;
}

function buildTaxExpenseNationFallbackRow(
  nationId: number,
  nationMeta: TaxExpenseNationMeta | null | undefined,
  columnCount: number,
): JSONValue[] {
  const cells = Array.from({ length: columnCount }, () => null as JSONValue);
  cells[NATION_QUERY_INDEX.nationId] = nationId;
  cells[NATION_QUERY_INDEX.nationMarkup] = nationMeta?.nationMarkup ?? `[Nation #${nationId}](${buildNationUrl(nationId)})`;
  cells[NATION_QUERY_INDEX.allianceMarkup] = nationMeta?.allianceMarkup ?? "";
  cells[NATION_QUERY_INDEX.cities] = nationMeta?.cities ?? null;
  cells[NATION_QUERY_INDEX.freeProjectSlots] = nationMeta?.freeProjectSlots ?? null;
  cells[NATION_QUERY_INDEX.projectSlots] = nationMeta?.projectSlots ?? null;
  cells[NATION_QUERY_INDEX.builtProjects] = nationMeta?.builtProjects ?? null;
  cells[NATION_QUERY_INDEX.avgInfra] = nationMeta?.avgInfra ?? null;
  cells[NATION_QUERY_INDEX.avgLand] = nationMeta?.avgLand ?? null;
  cells[NATION_QUERY_INDEX.color] = nationMeta?.color ?? "-";
  cells[NATION_QUERY_INDEX.score] = nationMeta?.score ?? null;
  return cells;
}

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

function resolveCustomizationItemTitle(item: TableColumnCustomizationItem, fallback: string): string {
  const title = (item.rawTitle ?? item.title).trim();
  return title || fallback;
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
  customizationState,
  onCustomizationChange,
}: {
  datasetId: number;
  section: SummarySection;
  inspection: NationInspectionState | null;
  onInspectNation: (next: NationInspectionState) => void;
  customizationState: TaxExpenseNationTableCustomizationState;
  onCustomizationChange: (next: TaxExpenseNationTableCustomizationState) => void;
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
  const includeTaxIdColumn = section.taxId === TAX_EXPENSE_TOTAL_TAX_ID;
  const hasIncomeExpenseColumns = useMemo(
    () => rows.some((row) => typeof row.incomeValue === "number" || typeof row.expenseValue === "number"),
    [rows],
  );
  const systemCustomizationItems = useMemo(
    () => createTaxExpenseNationDefaultItems({
      includeTaxIdColumn,
      includeIncomeExpenseColumns: hasIncomeExpenseColumns,
    }),
    [hasIncomeExpenseColumns, includeTaxIdColumn],
  );
  const effectiveCustomizationItems = useMemo(
    () => customizationState.items ?? systemCustomizationItems,
    [customizationState.items, systemCustomizationItems],
  );
  const customPlaceholderItems = useMemo(
    () => effectiveCustomizationItems.filter((item) => (
      item.source === "placeholder"
      && typeof item.value === "string"
      && !TAX_EXPENSE_NATION_VISIBLE_PLACEHOLDER_ID_SET.has(item.id)
    )),
    [effectiveCustomizationItems],
  );
  const extraPlaceholderColumns = useMemo(() => {
    const seen = new Set<string>();
    const nextColumns: string[] = [];
    for (const item of customPlaceholderItems) {
      const normalizedValue = normalizePlaceholderColumnExpression(item.value ?? "");
      if (!normalizedValue || seen.has(normalizedValue) || TAX_EXPENSE_NATION_SUPPORT_PLACEHOLDER_SET.has(normalizedValue)) {
        continue;
      }

      seen.add(normalizedValue);
      nextColumns.push(normalizedValue);
    }

    return nextColumns;
  }, [customPlaceholderItems]);
  const nationQueryColumns = useMemo(
    () => [...TAX_EXPENSE_NATION_TABLE_COLUMNS, ...extraPlaceholderColumns],
    [extraPlaceholderColumns],
  );
  const nationInfoQuery = useQuery({
    ...bulkQueryOptions(TABLE.endpoint, {
      type: "DBNation",
      selection_str: nationSelection,
      columns: nationQueryColumns,
    }),
    enabled: rows.length > 0,
  });
  const nationInfoTable = nationInfoQuery.data?.data as WebTable | null | undefined;
  const nationLookup = useMemo(
    () => parseTaxExpenseNationTable(nationInfoTable),
    [nationInfoTable],
  );
  const nationTableRowsById = useMemo(() => {
    const lookup = new Map<number, JSONValue[]>();
    const tableRows = nationInfoTable?.cells?.slice(1) ?? [];
    for (const row of tableRows) {
      const nationId = getRowNumberValue(row as JSONValue[], NATION_QUERY_INDEX.nationId);
      if (nationId === null) {
        continue;
      }

      lookup.set(nationId, row as JSONValue[]);
    }

    return lookup;
  }, [nationInfoTable?.cells]);
  const rendererTypeByPlaceholderValue = useMemo(() => {
    const nextRenderers = new Map<string, string>();
    const rendererTypes = nationInfoTable?.renderers ?? [];
    nationQueryColumns.forEach((column, index) => {
      const rendererType = rendererTypes[index];
      if (rendererType) {
        nextRenderers.set(column, rendererType);
      }
    });
    return nextRenderers;
  }, [nationInfoTable?.renderers, nationQueryColumns]);
  const selected = useIdSelection<number>();
  const {
    addMany: addSelectedNationIds,
    clear: clearSelectedNationIds,
    count: selectedNationCount,
    selectedIds,
    setSelectedIds,
  } = selected;
  const [visibleNationIds, setVisibleNationIds] = useState<number[]>([]);
  const selectedNationIds = useMemo(
    () => Array.from(selectedIds).sort((left, right) => left - right),
    [selectedIds],
  );
  const selectedNationSelection = useMemo(
    () => buildEntitySelection(selectedNationIds),
    [selectedNationIds],
  );
  const currentTaxIdIndex = nationQueryColumns.length;
  const incomeValueIndex = currentTaxIdIndex + 1;
  const expenseValueIndex = incomeValueIndex + 1;
  const netValueIndex = expenseValueIndex + 1;
  const tableData = useMemo<JSONValue[][]>(() => rows.map((row) => {
    const meta = nationLookup[row.nationId] ?? null;
    const queryRow = nationTableRowsById.get(row.nationId)
      ?? buildTaxExpenseNationFallbackRow(row.nationId, meta, nationQueryColumns.length);
    return [
      ...queryRow,
      row.currentTaxId ?? null,
      row.incomeValue ?? null,
      row.expenseValue ?? null,
      row.netValue,
    ] as JSONValue[];
  }), [nationLookup, nationQueryColumns.length, nationTableRowsById, rows]);

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
      return getRowNumberValue(row, NATION_QUERY_INDEX.nationId);
    },
    selectedIds,
    onSelectedIdsChange: (nextSelectedIds: Set<TableRowSelectionId>) => {
      setSelectedIds(new Set(Array.from(nextSelectedIds).filter((nationId): nationId is number => typeof nationId === "number")));
    },
    onVisibleIdsChange: (nextVisibleIds: TableRowSelectionId[]) => {
      setVisibleNationIds(nextVisibleIds.filter((nationId): nationId is number => typeof nationId === "number"));
    },
    getLabel: (nationId) => typeof nationId === "number" && selectedIds.has(nationId) ? `Deselect nation ${nationId}` : `Select nation ${nationId}`,
    copySelection: {
      label: "Copy selected nations",
      serialize: (nextSelectedIds) => buildEntitySelection(
        Array.from(nextSelectedIds)
          .filter((nationId): nationId is number => typeof nationId === "number")
          .sort((left, right) => left - right),
      ),
    },
    debugTagPrefix: "tax-expense-nation-select",
  }), [selectedIds, setSelectedIds]);
  const handleSelectVisible = useCallback(() => {
    addSelectedNationIds(visibleNationIds);
  }, [addSelectedNationIds, visibleNationIds]);
  const inspectedNationId = inspection && inspection.taxId === section.taxId
    ? inspection.nationId
    : null;
  const highlightedRowClassName = useCallback((row: JSONValue[]) => {
    const nationId = getRowNumberValue(row, NATION_QUERY_INDEX.nationId);
    if (nationId === null || inspectedNationId === null || nationId !== inspectedNationId) {
      return undefined;
    }

    return "bg-blue-100/90 dark:bg-blue-800/30";
  }, [inspectedNationId]);
  const handleApplyCustomization = useCallback((nextItems: TableColumnCustomizationItem[]) => {
    onCustomizationChange({
      items: normalizeTaxExpenseNationCustomizationItems(nextItems, systemCustomizationItems),
    });
  }, [onCustomizationChange, systemCustomizationItems]);
  const columnCustomization = useMemo<TableColumnCustomization>(() => ({
    items: effectiveCustomizationItems,
    composer: {
      placeholderType: "DBNation",
    },
    onApply: handleApplyCustomization,
  }), [effectiveCustomizationItems, handleApplyCustomization]);
  const columns = useMemo<ConfigColumns[]>(() => {
    const availableColumnsById = new Map<string, ConfigColumns>();

    availableColumnsById.set(toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[1]), {
      title: "Nation",
      key: TAX_EXPENSE_NATION_TABLE_COLUMNS[1],
      columnId: toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[1]),
      source: "placeholder",
      index: NATION_QUERY_INDEX.nationMarkup,
      sortable: true,
      editable: false,
      draggable: false,
      width: 220,
      render: {
        display: (value, context) => {
          const row = context?.row;
          const nationId = getRowNumberValue(row, NATION_QUERY_INDEX.nationId) ?? 0;
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
    });

    availableColumnsById.set(toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[3]), {
      title: "Cities",
      key: TAX_EXPENSE_NATION_TABLE_COLUMNS[3],
      columnId: toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[3]),
      source: "placeholder",
      index: NATION_QUERY_INDEX.cities,
      sortable: true,
      editable: false,
      draggable: false,
      width: 84,
      render: {
        display: (value, context) => {
          const row = context?.row;
          const nationId = getRowNumberValue(row, NATION_QUERY_INDEX.nationId) ?? 0;
          const cities = typeof value === "number" ? value : getRowNumberValue(row, NATION_QUERY_INDEX.cities);
          return <CityCostButton cities={cities} className="w-full justify-start" key={`city-${nationId}`}>{formatMetricNumber(cities)}</CityCostButton>;
        },
      },
    });

    availableColumnsById.set(toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[6]), {
      title: "Projects",
      key: TAX_EXPENSE_NATION_TABLE_COLUMNS[6],
      columnId: toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[6]),
      source: "placeholder",
      index: NATION_QUERY_INDEX.builtProjects,
      sortable: true,
      editable: false,
      draggable: false,
      width: 96,
      render: {
        display: (_value, context) => {
          const row = context?.row;
          const nationId = getRowNumberValue(row, NATION_QUERY_INDEX.nationId);
          const builtProjects = getRowNumberValue(row, NATION_QUERY_INDEX.builtProjects);
          const projectSlots = getRowNumberValue(row, NATION_QUERY_INDEX.projectSlots);
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
    });

    availableColumnsById.set(toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[7]), {
      title: "Infra",
      key: TAX_EXPENSE_NATION_TABLE_COLUMNS[7],
      columnId: toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[7]),
      source: "placeholder",
      index: NATION_QUERY_INDEX.avgInfra,
      sortable: true,
      editable: false,
      draggable: false,
      width: 96,
      render: {
        display: (value, context) => {
          const row = context?.row;
          const nationId = getRowNumberValue(row, NATION_QUERY_INDEX.nationId) ?? 0;
          const avgInfra = typeof value === "number" ? value : getRowNumberValue(row, NATION_QUERY_INDEX.avgInfra);
          return (
            <NationCityTableButton nationId={nationId} title="Nation Cities" className="w-full justify-start">
              {formatMetricNumber(avgInfra, 1)}
            </NationCityTableButton>
          );
        },
      },
    });

    availableColumnsById.set(toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[8]), {
      title: "Land",
      key: TAX_EXPENSE_NATION_TABLE_COLUMNS[8],
      columnId: toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[8]),
      source: "placeholder",
      index: NATION_QUERY_INDEX.avgLand,
      sortable: true,
      editable: false,
      draggable: false,
      width: 96,
      render: {
        display: (value, context) => {
          const row = context?.row;
          const nationId = getRowNumberValue(row, NATION_QUERY_INDEX.nationId) ?? 0;
          const avgLand = typeof value === "number" ? value : getRowNumberValue(row, NATION_QUERY_INDEX.avgLand);
          return (
            <NationCityTableButton nationId={nationId} title="Nation Cities" className="w-full justify-start">
              {formatMetricNumber(avgLand, 1)}
            </NationCityTableButton>
          );
        },
      },
    });

    availableColumnsById.set(toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[9]), {
      title: "Color",
      key: TAX_EXPENSE_NATION_TABLE_COLUMNS[9],
      columnId: toPlaceholderColumnId(TAX_EXPENSE_NATION_TABLE_COLUMNS[9]),
      source: "placeholder",
      index: NATION_QUERY_INDEX.color,
      sortable: true,
      editable: false,
      draggable: false,
      width: 74,
      render: COLOR_RENDERER,
    });

    if (includeTaxIdColumn) {
      availableColumnsById.set(TAX_EXPENSE_NATION_TAX_ID_COLUMN_ID, {
        title: "Tax ID",
        key: TAX_EXPENSE_NATION_TAX_ID_COLUMN_ID,
        columnId: TAX_EXPENSE_NATION_TAX_ID_COLUMN_ID,
        source: "client",
        index: currentTaxIdIndex,
        sortable: true,
        editable: false,
        draggable: false,
        width: 82,
        render: {
          display: (value) => typeof value === "number" ? `#${value}` : "-",
        },
      });
    }

    if (hasIncomeExpenseColumns) {
      availableColumnsById.set(TAX_EXPENSE_NATION_INCOME_COLUMN_ID, {
        title: "Income",
        key: TAX_EXPENSE_NATION_INCOME_COLUMN_ID,
        columnId: TAX_EXPENSE_NATION_INCOME_COLUMN_ID,
        source: "client",
        index: incomeValueIndex,
        sortable: true,
        editable: false,
        draggable: false,
        width: 110,
        render: {
          display: (value) => typeof value === "number" ? formatMonetaryAmount(value) : "-",
        },
        cellClassName: "font-mono",
      });
      availableColumnsById.set(TAX_EXPENSE_NATION_EXPENSE_COLUMN_ID, {
        title: "Expense",
        key: TAX_EXPENSE_NATION_EXPENSE_COLUMN_ID,
        columnId: TAX_EXPENSE_NATION_EXPENSE_COLUMN_ID,
        source: "client",
        index: expenseValueIndex,
        sortable: true,
        editable: false,
        draggable: false,
        width: 110,
        render: {
          display: (value) => typeof value === "number" ? formatMonetaryAmount(value) : "-",
        },
        cellClassName: "font-mono",
      });
    }

    availableColumnsById.set(TAX_EXPENSE_NATION_NET_COLUMN_ID, {
      title: "Net",
      key: TAX_EXPENSE_NATION_NET_COLUMN_ID,
      columnId: TAX_EXPENSE_NATION_NET_COLUMN_ID,
      source: "client",
      index: netValueIndex,
      sortable: true,
      editable: false,
      draggable: false,
      width: 110,
      render: {
        display: (value) => formatMonetaryAmount(Number(value ?? 0)),
      },
      cellClassName: "font-mono",
    });

    return effectiveCustomizationItems.map<ConfigColumns | null>((item) => {
      const existingColumn = availableColumnsById.get(item.id);
      if (existingColumn) {
        return {
          ...existingColumn,
          title: resolveCustomizationItemTitle(item, existingColumn.title),
        };
      }

      const normalizedValue = normalizePlaceholderColumnExpression(item.value ?? "");
      if (!normalizedValue) {
        return null;
      }

      const queryIndex = nationQueryColumns.indexOf(normalizedValue);
      if (queryIndex < 0) {
        return null;
      }

      const rendererType = rendererTypeByPlaceholderValue.get(normalizedValue);
      return {
        title: resolveCustomizationItemTitle(item, formatColName(normalizedValue)),
        key: normalizedValue,
        columnId: toPlaceholderColumnId(normalizedValue),
        source: "placeholder",
        index: queryIndex,
        sortable: true,
        editable: false,
        draggable: false,
        width: 140,
        render: rendererType ? getRenderer(rendererType) : undefined,
      } satisfies ConfigColumns;
    }).filter((column): column is ConfigColumns => Boolean(column));
  }, [
    currentTaxIdIndex,
    datasetId,
    effectiveCustomizationItems,
    expenseValueIndex,
    hasIncomeExpenseColumns,
    includeTaxIdColumn,
    incomeValueIndex,
    nationLookup,
    nationQueryColumns,
    netValueIndex,
    onInspectNation,
    rendererTypeByPlaceholderValue,
    section.bracket,
    section.taxId,
  ]);

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
        sourceSelection={{ value: nationSelection, label: "Copy source selection" }}
        rowSelection={rowSelection}
        columnCustomization={columnCustomization}
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
  nationTableCustomization,
  onNationTableCustomizationChange,
}: {
  datasetId: number;
  section: SummarySection;
  isOpen: boolean;
  toggleSection: (taxId: number) => void;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
  inspection: NationInspectionState | null;
  onInspectNation: (next: NationInspectionState) => void;
  nationTableCustomization: TaxExpenseNationTableCustomizationState;
  onNationTableCustomizationChange: (taxId: number, next: TaxExpenseNationTableCustomizationState) => void;
}) {
  const title = formatBracketTitle(section.taxId, section.bracket);
  const meta = formatBracketMeta(section.bracket);
  const handleToggleSection = useCallback(() => {
    toggleSection(section.taxId);
  }, [section.taxId, toggleSection]);
  const handleNationTableCustomizationChange = useCallback((next: TaxExpenseNationTableCustomizationState) => {
    onNationTableCustomizationChange(section.taxId, next);
  }, [onNationTableCustomizationChange, section.taxId]);

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
              customizationState={nationTableCustomization}
              onCustomizationChange={handleNationTableCustomizationChange}
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
  const [nationTableCustomizationByTaxId, setNationTableCustomizationByTaxId] = useState<Record<number, TaxExpenseNationTableCustomizationState>>({});
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
  const handleNationTableCustomizationChange = useCallback((taxId: number, next: TaxExpenseNationTableCustomizationState) => {
    setNationTableCustomizationByTaxId((current) => {
      if (current[taxId] === next) {
        return current;
      }

      return {
        ...current,
        [taxId]: next,
      };
    });
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
                  nationTableCustomization={nationTableCustomizationByTaxId[section.taxId] ?? { items: null }}
                  onNationTableCustomizationChange={handleNationTableCustomizationChange}
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

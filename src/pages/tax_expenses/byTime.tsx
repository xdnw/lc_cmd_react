import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { EndpointFilterPanel } from "@/components/api/EndpointFilterPanel";
import { useSession } from "@/components/api/SessionContext";
import { useSearchParamFilterDraft } from "@/components/api/useSearchParamFilterDraft";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import { FilterBadgeRow } from "@/components/ui/FilterBadgeRow";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import type { ResourceType, TaxExpenseTime, TaxExpenseTimeBracket, TaxExpenseTimeCategory, TaxExpenseTimeResources, WebGraph, WebTable } from "@/lib/apitypes";
import { TABLE, TAX_EXPENSE_BY_TIME, TAX_EXPENSE_BY_TIME_BRACKET, TAX_EXPENSE_BY_TIME_RESOURCES } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import LoginPickerPage from "@/pages/login_picker";
import SimpleChart from "@/pages/graphs/SimpleChart";

import { TaxExpenseChartControls } from "./TaxExpenseFilterPanel";
import { TaxExpenseValueStrip } from "./TaxExpenseValueStrip";
import {
  TAX_EXPENSE_RESOURCE_PRICE_COLUMNS,
  TAX_EXPENSE_TIME_DEFAULT_FILTERS,
  TAX_EXPENSE_TOTAL_TAX_ID,
  buildResourceTypeSelection,
  buildTaxExpenseTimeGraph,
  buildTimeBracketArgs,
  buildTimeEndpointArgs,
  buildTimeFilterBadges,
  buildTimeFilterSignature,
  buildTimeResourceArgs,
  formatAllianceBadge,
  formatBracketMeta,
  formatBracketTitle,
  formatCountLabel,
  formatTaxExpenseAxisDate,
  formatTaxExpenseTimestamp,
  parseTaxExpenseResourcePrices,
  parseTaxExpenseTimeFilters,
  writeTaxExpenseTimeFilters,
  type TaxExpenseChartMode,
  type TaxExpenseDisplayMode,
  type TaxExpenseResourcePriceMap,
  type TaxExpenseTimeFilters,
} from "./taxExpensesState";

const TIME_FILTER_FIELDS = ["start", "end", "nationFilter", "dontRequireTagged"] as const satisfies readonly (keyof TaxExpenseTimeFilters)[];

function buildSeriesLabels(categories: readonly TaxExpenseTimeCategory[]): TaxExpenseTimeCategory[] {
  return categories.map((category) => ({
    ...category,
    name: category.expense ? `${category.name} expense` : category.name,
  }));
}

function scaleSeries(series: readonly number[][], factor: number): number[][] {
  return series.map((values) => values.map((value) => value * factor));
}

function useCompactTimeFormatters() {
  const xTickLabelFormatter = useCallback(({ graphValue, defaultLabel, graph }: {
    graphValue: number | string | undefined;
    defaultLabel: string;
    graph: WebGraph;
    axisValue: number;
  }) => {
    const numericValue = typeof graphValue === "number" ? graphValue : Number(graphValue);
    return Number.isFinite(numericValue) ? formatTaxExpenseAxisDate(numericValue, graph.time_format) : defaultLabel;
  }, []);

  const tooltipTitleFormatter = useCallback(({ graphValue, defaultLabel, graph }: {
    graphValue: number | string | undefined;
    defaultLabel: string;
    graph: WebGraph;
    axisValue: number;
    dataIndex: number;
  }) => {
    const numericValue = typeof graphValue === "number" ? graphValue : Number(graphValue);
    return Number.isFinite(numericValue) ? formatTaxExpenseTimestamp(numericValue, graph.time_format) : defaultLabel;
  }, []);

  return { xTickLabelFormatter, tooltipTitleFormatter };
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

function TimeSeriesPanel({
  title,
  graph,
  incomeValue,
  expenseValue,
  netValue,
  meta,
  xTickLabelFormatter,
  tooltipTitleFormatter,
}: {
  title: string;
  graph: WebGraph;
  incomeValue: number;
  expenseValue: number;
  netValue: number;
  meta: ReactNode;
  xTickLabelFormatter: ReturnType<typeof useCompactTimeFormatters>["xTickLabelFormatter"];
  tooltipTitleFormatter: ReturnType<typeof useCompactTimeFormatters>["tooltipTitleFormatter"];
}) {
  return (
    <section className="border border-border/60 bg-background/40">
      <div className="space-y-2 px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base">{title}</h2>
          {meta}
        </div>
        <TaxExpenseValueStrip incomeValue={incomeValue} expenseValue={expenseValue} netValue={netValue} />
      </div>
      <div className="border-t border-border/50 px-2 py-2">
        <div className="h-64 min-h-64 bg-muted/8">
          <SimpleChart
            graph={graph}
            type="LINE"
            hideDots
            hideLegend={false}
            minHeight="14rem"
            maxHeight="16rem"
            xTickLabelFormatter={xTickLabelFormatter}
            tooltipTitleFormatter={tooltipTitleFormatter}
          />
        </div>
      </div>
    </section>
  );
}

function CollapsibleBracketPanel({
  datasetId,
  bracket,
  open,
  onToggleTaxId,
  timestamps,
  categories,
  mode,
  movingAverageWindow,
  xTickLabelFormatter,
  tooltipTitleFormatter,
}: {
  datasetId: number;
  bracket: TaxExpenseTime["brackets"][number];
  open: boolean;
  onToggleTaxId: (taxId: number) => void;
  timestamps: readonly number[];
  categories: readonly TaxExpenseTimeCategory[];
  mode: TaxExpenseChartMode;
  movingAverageWindow: number;
  xTickLabelFormatter: ReturnType<typeof useCompactTimeFormatters>["xTickLabelFormatter"];
  tooltipTitleFormatter: ReturnType<typeof useCompactTimeFormatters>["tooltipTitleFormatter"];
}) {
  const handleToggle = useCallback(() => {
    onToggleTaxId(bracket.taxId);
  }, [bracket.taxId, onToggleTaxId]);
  const title = formatBracketTitle(bracket.taxId, bracket.bracket);
  const bracketQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_BY_TIME_BRACKET.endpoint, buildTimeBracketArgs(datasetId, bracket.taxId)),
    enabled: open && Boolean(datasetId),
  });
  const bracketSeries = bracketQuery.data?.data as TaxExpenseTimeBracket | undefined;
  const graph = useMemo(() => {
    if (!bracketSeries) {
      return null;
    }

    return buildTaxExpenseTimeGraph({
      title,
      timestamps,
      categories,
      series: bracketSeries.overallByCategory,
      mode,
      movingAverageWindow,
      yLabel: "Value",
    });
  }, [bracketSeries, categories, mode, movingAverageWindow, timestamps, title]);

  return (
    <section className="border border-border/60 bg-background/40">
      <div className="flex flex-col gap-2 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base">{title}</h2>
            <Badge variant="outline">#{bracket.taxId}</Badge>
            <Badge variant="outline">{formatCountLabel(bracket.nationCount, "nation")}</Badge>
            {formatBracketMeta(bracket.bracket) ? <Badge variant="outline">{formatBracketMeta(bracket.bracket)}</Badge> : null}
          </div>
          <TaxExpenseValueStrip
            incomeValue={bracket.incomeValue}
            expenseValue={bracket.expenseValue}
            netValue={bracket.netValue}
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleToggle}>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? "Hide chart" : "Show chart"}
        </Button>
      </div>
      {open ? (
        <div className="border-t border-border/50 px-2 py-2">
          {bracketQuery.isLoading ? (
            <Loading variant="ripple" />
          ) : bracketQuery.error || !graph ? (
            <div className="text-sm text-destructive">Failed to load bracket chart.</div>
          ) : (
            <div className="h-64 min-h-64 bg-muted/8">
              <SimpleChart
                graph={graph}
                type="LINE"
                hideDots
                hideLegend={false}
                minHeight="14rem"
                maxHeight="16rem"
                xTickLabelFormatter={xTickLabelFormatter}
                tooltipTitleFormatter={tooltipTitleFormatter}
              />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ResourceChartBlock({
  resource,
  series,
  timestamps,
  categories,
  mode,
  movingAverageWindow,
  displayMode,
  resourcePrices,
  xTickLabelFormatter,
  tooltipTitleFormatter,
}: {
  resource: string;
  series: readonly number[][];
  timestamps: readonly number[];
  categories: readonly TaxExpenseTimeCategory[];
  mode: TaxExpenseChartMode;
  movingAverageWindow: number;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
  xTickLabelFormatter: ReturnType<typeof useCompactTimeFormatters>["xTickLabelFormatter"];
  tooltipTitleFormatter: ReturnType<typeof useCompactTimeFormatters>["tooltipTitleFormatter"];
}) {
  const price = resourcePrices?.[resource as ResourceType] ?? (resource === "MONEY" ? 1 : 1);
  const displaySeries = useMemo(
    () => displayMode === "value" ? scaleSeries(series, price) : series.map((values) => [...values]),
    [displayMode, price, series],
  );
  const graph = useMemo(() => buildTaxExpenseTimeGraph({
    title: resource,
    timestamps,
    categories,
    series: displaySeries,
    mode,
    movingAverageWindow,
    yLabel: displayMode === "value" ? "Value" : "Amount",
  }), [categories, displayMode, displaySeries, mode, movingAverageWindow, resource, timestamps]);

  return (
    <div className="border border-border/50 bg-background/30 px-2 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{resource}</h3>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{displayMode === "value" ? "Value" : "Raw"}</span>
      </div>
      <div className="h-52 min-h-52">
        <SimpleChart
          graph={graph}
          type="LINE"
          hideDots
          hideLegend={false}
          minHeight="12rem"
          maxHeight="14rem"
          xTickLabelFormatter={xTickLabelFormatter}
          tooltipTitleFormatter={tooltipTitleFormatter}
        />
      </div>
    </div>
  );
}

function ResourceDrilldown({
  open,
  onToggle,
  resourceData,
  isLoading,
  hasError,
  timestamps,
  categories,
  mode,
  movingAverageWindow,
  displayMode,
  resourcePrices,
  xTickLabelFormatter,
  tooltipTitleFormatter,
}: {
  open: boolean;
  onToggle: () => void;
  resourceData?: Record<string, number[][]>;
  isLoading: boolean;
  hasError: boolean;
  timestamps: readonly number[];
  categories: readonly TaxExpenseTimeCategory[];
  mode: TaxExpenseChartMode;
  movingAverageWindow: number;
  displayMode: TaxExpenseDisplayMode;
  resourcePrices?: TaxExpenseResourcePriceMap;
  xTickLabelFormatter: ReturnType<typeof useCompactTimeFormatters>["xTickLabelFormatter"];
  tooltipTitleFormatter: ReturnType<typeof useCompactTimeFormatters>["tooltipTitleFormatter"];
}) {
  const labelledCategories = useMemo(() => buildSeriesLabels(categories), [categories]);

  return (
    <section className="border border-border/60 bg-background/40">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground md:text-base">Resource drilldown</h2>
          <p className="text-[11px] text-muted-foreground">{displayMode === "value" ? "Resource charts use current market prices." : "Resource charts show raw amounts."}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onToggle}>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? "Hide resource charts" : "Show resource charts"}
        </Button>
      </div>
      {open ? (
        <div className="border-t border-border/50 px-3 py-3">
          {isLoading ? (
            <Loading variant="ripple" />
          ) : hasError ? (
            <div className="text-sm text-destructive">Failed to load resource drilldown.</div>
          ) : !resourceData ? (
            <div className="text-sm text-muted-foreground">No resource drilldown data available.</div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {Object.entries(resourceData).map(([resource, resourceSeries]) => (
                <ResourceChartBlock
                  key={resource}
                  resource={resource}
                  series={resourceSeries}
                  timestamps={timestamps}
                  categories={labelledCategories}
                  mode={mode}
                  movingAverageWindow={movingAverageWindow}
                  displayMode={displayMode}
                  resourcePrices={resourcePrices}
                  xTickLabelFormatter={xTickLabelFormatter}
                  tooltipTitleFormatter={tooltipTitleFormatter}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default function TaxExpensesByTimePage() {
  const { session } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [displayMode, setDisplayMode] = useState<TaxExpenseDisplayMode>("value");
  const filters = useMemo(() => parseTaxExpenseTimeFilters(searchParams), [searchParams]);
  const filtersSignature = useMemo(() => buildTimeFilterSignature(filters), [filters]);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [openBracketIds, setOpenBracketIds] = useState<Set<number>>(() => new Set<number>());
  const { xTickLabelFormatter, tooltipTitleFormatter } = useCompactTimeFormatters();

  const {
    draftFilters,
    setDraftFilters,
    setDraftValue,
    applyFilters,
    resetFilters,
  } = useSearchParamFilterDraft<TaxExpenseTimeFilters>({
    filters,
    syncKey: filtersSignature,
    defaultFilters: TAX_EXPENSE_TIME_DEFAULT_FILTERS,
    searchParams,
    setSearchParams,
    writeFilters: writeTaxExpenseTimeFilters,
  });

  useEffect(() => {
    setResourceOpen(false);
    setOpenBracketIds(new Set<number>());
  }, [filtersSignature]);

  const timeQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_BY_TIME.endpoint, buildTimeEndpointArgs(filters)),
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

  const timeData = timeQuery.data?.data as TaxExpenseTime | undefined;
  const filterBadges = useMemo(() => buildTimeFilterBadges(filters), [filters]);
  const labelledCategories = useMemo(() => buildSeriesLabels(timeData?.categories ?? []), [timeData?.categories]);
  const resourcePrices = useMemo(
    () => parseTaxExpenseResourcePrices(resourcePricesQuery.data?.data as WebTable | null | undefined),
    [resourcePricesQuery.data?.data],
  );
  const effectiveDisplayMode = resourcePricesQuery.data?.data ? displayMode : "raw";
  const resourceQuery = useQuery({
    ...bulkQueryOptions(TAX_EXPENSE_BY_TIME_RESOURCES.endpoint, buildTimeResourceArgs(Number(timeData?.datasetId ?? 0))),
    enabled: resourceOpen && Boolean(timeData?.datasetId),
  });

  const draftQueryFilters = useMemo(() => ({
    start: draftFilters.start,
    end: draftFilters.end,
    nationFilter: draftFilters.nationFilter,
    dontRequireTagged: draftFilters.dontRequireTagged,
  }), [draftFilters.dontRequireTagged, draftFilters.end, draftFilters.nationFilter, draftFilters.start]);

  const handleChartModeChange = useCallback((chartMode: TaxExpenseChartMode) => {
    setDraftFilters((current) => ({ ...current, chartMode }));
  }, [setDraftFilters]);

  const handleMovingAverageWindowChange = useCallback((movingAverageWindow: number) => {
    setDraftFilters((current) => ({ ...current, movingAverageWindow }));
  }, [setDraftFilters]);

  const handleToggleResourceOpen = useCallback(() => {
    setResourceOpen((current) => !current);
  }, []);

  const toggleBracket = useCallback((taxId: number) => {
    setOpenBracketIds((current) => {
      const next = new Set(current);
      if (next.has(taxId)) {
        next.delete(taxId);
      } else {
        next.add(taxId);
      }
      return next;
    });
  }, []);

  const totalGraph = useMemo(() => {
    if (!timeData) {
      return null;
    }

    return buildTaxExpenseTimeGraph({
      title: "Total",
      timestamps: timeData.timestamps,
      categories: labelledCategories,
      series: timeData.total.overallByCategory,
      mode: filters.chartMode,
      movingAverageWindow: filters.movingAverageWindow,
      yLabel: "Value",
    });
  }, [filters.chartMode, filters.movingAverageWindow, labelledCategories, timeData]);

  const pageHeaderConfig = useMemo<PageHeaderConfig>(() => ({
    sticky: true,
    title: (
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Tax expenses by time</h1>
        {timeData ? (
          <>
            <span className="text-xs text-muted-foreground">{formatCountLabel(timeData.timestamps.length, "point")}</span>
            <span className="text-xs text-muted-foreground">{formatCountLabel(timeData.brackets.length, "bracket")}</span>
          </>
        ) : null}
      </div>
    ),
    summary: timeData ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {timeData.total.bracket?.allianceId ? <Badge variant="outline">{formatAllianceBadge(timeData.total.bracket.allianceId)}</Badge> : null}
        {filterBadges.map((badge) => (
          <Badge key={badge} variant="outline">{badge}</Badge>
        ))}
      </div>
    ) : <FilterBadgeRow badges={filterBadges} />,
    content: (
      <EndpointFilterPanel
        endpoint={TAX_EXPENSE_BY_TIME}
        showArguments={[...TIME_FILTER_FIELDS]}
        draft={draftQueryFilters}
        fieldKey={filtersSignature}
        setDraftValue={setDraftValue}
        onApply={applyFilters}
        onReset={resetFilters}
        isLoading={timeQuery.isFetching}
      >
        <TaxExpenseChartControls
          chartMode={draftFilters.chartMode}
          onChartModeChange={handleChartModeChange}
          movingAverageWindow={draftFilters.movingAverageWindow}
          onMovingAverageWindowChange={handleMovingAverageWindowChange}
        />
      </EndpointFilterPanel>
    ),
  }), [
    applyFilters,
    draftFilters.chartMode,
    draftFilters.movingAverageWindow,
    draftQueryFilters,
    filterBadges,
    filtersSignature,
    handleChartModeChange,
    handleMovingAverageWindowChange,
    resetFilters,
    setDraftValue,
    timeData,
    timeQuery.isFetching,
  ]);

  usePageHeader(pageHeaderConfig);

  if (!session?.guild) {
    return <LoginPickerPage />;
  }

  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border border-border/60 bg-background/35 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">
            {effectiveDisplayMode === "value"
              ? "Resource drilldown charts use current market prices."
              : resourcePricesQuery.isLoading
                ? "Loading resource prices. Raw resource charts shown until prices arrive."
                : resourcePricesQuery.error
                  ? "Resource prices failed to load. Raw resource charts shown."
                  : "Resource drilldown charts show raw amounts."}
          </div>
          <DisplayModeToggle
            displayMode={effectiveDisplayMode}
            onChange={setDisplayMode}
            valueEnabled={Boolean(resourcePricesQuery.data?.data)}
          />
        </div>
        {timeQuery.isLoading ? (
          <div className="py-10">
            <Loading variant="ripple" />
          </div>
        ) : timeQuery.error || !timeData || !totalGraph ? (
          <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load time-series tax expenses.
          </div>
        ) : (
          <div className="space-y-2">
            <TimeSeriesPanel
              title="Total"
              graph={totalGraph}
              incomeValue={timeData.total.incomeValue}
              expenseValue={timeData.total.expenseValue}
              netValue={timeData.total.netValue}
              meta={(
                <>
                  {timeData.total.taxId !== TAX_EXPENSE_TOTAL_TAX_ID ? <Badge variant="outline">#{timeData.total.taxId}</Badge> : null}
                  <Badge variant="outline">{formatCountLabel(timeData.total.nationCount, "nation")}</Badge>
                </>
              )}
              xTickLabelFormatter={xTickLabelFormatter}
              tooltipTitleFormatter={tooltipTitleFormatter}
            />
            <ResourceDrilldown
              open={resourceOpen}
              onToggle={handleToggleResourceOpen}
              resourceData={(resourceQuery.data?.data as TaxExpenseTimeResources | undefined)?.byResourceByCategory}
              isLoading={resourceQuery.isLoading}
              hasError={Boolean(resourceQuery.error)}
              timestamps={timeData.timestamps}
              categories={timeData.categories}
              mode={filters.chartMode}
              movingAverageWindow={filters.movingAverageWindow}
              displayMode={effectiveDisplayMode}
              resourcePrices={resourcePrices}
              xTickLabelFormatter={xTickLabelFormatter}
              tooltipTitleFormatter={tooltipTitleFormatter}
            />
            {timeData.brackets.map((bracket) => (
              <CollapsibleBracketPanel
                key={`bracket-${bracket.taxId}`}
                datasetId={Number(timeData.datasetId)}
                bracket={bracket}
                open={openBracketIds.has(bracket.taxId)}
                onToggleTaxId={toggleBracket}
                timestamps={timeData.timestamps}
                categories={labelledCategories}
                mode={filters.chartMode}
                movingAverageWindow={filters.movingAverageWindow}
                xTickLabelFormatter={xTickLabelFormatter}
                tooltipTitleFormatter={tooltipTitleFormatter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

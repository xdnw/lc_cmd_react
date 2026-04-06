import type { CommonEndpoint } from "@/lib/BulkQuery";
import type { ResourceType, TaxExpenseTimeCategory, TimeFormat, WebGraph, WebTable, WebTaxBracket } from "@/lib/apitypes";
import { TAX_EXPENSE, TAX_EXPENSE_BY_TIME, TAX_EXPENSE_BY_TIME_BRACKET, TAX_EXPENSE_BY_TIME_RESOURCES } from "@/lib/endpoints";
import { parseSearchParamStringRecord, writeSearchParamStringRecord, type SearchParamStringSpec } from "@/lib/searchParams";
import { parseTimestampMs } from "@/lib/temporal";
import { formatDate, toMillisFunction } from "@/utils/StringUtil";

export const TAX_EXPENSE_TOTAL_TAX_ID = -1;
export const TAX_EXPENSE_DEFAULT_START = "30d";
export const TAX_EXPENSE_DEFAULT_MOVING_AVERAGE_WINDOW = 1;
export const TAX_EXPENSE_MAX_MOVING_AVERAGE_WINDOW = 30;

export const TAX_EXPENSE_ROUTE_SEARCH_PARAMS = [
  "start",
  "end",
  "nationList",
  "nationFilter",
  "dontRequireGrant",
  "dontRequireTagged",
  "dontRequireExpiry",
  "includeDeposits",
  "chartMode",
  "movingAverageWindow",
] as const;

type EndpointArgRecord = { [key: string]: string | string[] | undefined };
type EndpointArgs<TEndpoint> = TEndpoint extends CommonEndpoint<unknown, infer A, EndpointArgRecord> ? A : never;
type TaxExpenseByTimeEndpointArgs = EndpointArgs<typeof TAX_EXPENSE_BY_TIME>;

export type TaxExpenseChartMode = "cumulative" | "moving-average";
export type TaxExpenseDisplayMode = "value" | "raw";
export type TaxExpenseSummaryFilters = EndpointArgs<typeof TAX_EXPENSE>;
export type TaxExpenseTimeQueryFilters = Omit<TaxExpenseByTimeEndpointArgs, "datasetId">;
export type TaxExpenseTimeFilters = TaxExpenseTimeQueryFilters & {
  chartMode: TaxExpenseChartMode;
  movingAverageWindow: number;
};

export type TaxExpenseResourcePriceMap = Partial<Record<ResourceType, number>>;

export type TaxExpenseNationMeta = {
  nationId: number;
  nationMarkup: string;
  allianceMarkup: string;
  cities: number | null;
  freeProjectSlots: number | null;
  projectSlots: number | null;
  builtProjects: number | null;
  avgInfra: number | null;
  avgLand: number | null;
  color: string;
  score: number | null;
};

export const TAX_EXPENSE_RESOURCE_TYPES: readonly ResourceType[] = [
  "MONEY",
  "CREDITS",
  "FOOD",
  "COAL",
  "OIL",
  "URANIUM",
  "LEAD",
  "IRON",
  "BAUXITE",
  "GASOLINE",
  "MUNITIONS",
  "STEEL",
  "ALUMINUM",
] as const;

export const TAX_EXPENSE_RESOURCE_LABELS: Record<ResourceType, string> = {
  MONEY: "Money",
  CREDITS: "Credits",
  FOOD: "Food",
  COAL: "Coal",
  OIL: "Oil",
  URANIUM: "Uranium",
  LEAD: "Lead",
  IRON: "Iron",
  BAUXITE: "Bauxite",
  GASOLINE: "Gasoline",
  MUNITIONS: "Munitions",
  STEEL: "Steel",
  ALUMINUM: "Aluminum",
};

export const TAX_EXPENSE_RESOURCE_EMOJIS: Partial<Record<ResourceType, string>> = {
  MONEY: "💵",
  FOOD: "🌾",
  COAL: "🪨",
  OIL: "🛢️",
  URANIUM: "☢️",
  LEAD: "⚫",
  IRON: "🟤",
  BAUXITE: "🟠",
  GASOLINE: "⛽",
  MUNITIONS: "🧨",
  STEEL: "⚙️",
  ALUMINUM: "🥫",
};

const TAX_EXPENSE_RESOURCE_COPY_KEYS: Record<ResourceType, string> = {
  MONEY: "money",
  CREDITS: "credits",
  FOOD: "food",
  COAL: "coal",
  OIL: "oil",
  URANIUM: "uranium",
  LEAD: "lead",
  IRON: "iron",
  BAUXITE: "bauxite",
  GASOLINE: "gasoline",
  MUNITIONS: "munitions",
  STEEL: "steel",
  ALUMINUM: "aluminum",
};

export const TAX_EXPENSE_NATION_TABLE_COLUMNS = [
  "{getid}",
  "{getmarkdownurl}",
  "{getallianceurlmarkup}",
  "{getcities}",
  "{getfreeprojectslots}",
  "{projectslots}",
  "{getnumprojects}",
  "{getavg_infra}",
  "{getavgland}",
  "{getcolor}",
  "{getscore}",
] as const;

export const TAX_EXPENSE_RESOURCE_PRICE_COLUMNS = ["{getname}", "{getmarketvalue}"] as const;

const SUMMARY_FILTER_PARAM_SPEC: SearchParamStringSpec<TaxExpenseSummaryFilters> = {
  start: { defaultValue: TAX_EXPENSE_DEFAULT_START, omitWhen: isDefaultTaxExpenseStart },
  end: {},
  nationList: { aliases: ["nationFilter"] },
  dontRequireGrant: {},
  dontRequireTagged: {},
  dontRequireExpiry: {},
  includeDeposits: {},
};

const TIME_FILTER_PARAM_SPEC: SearchParamStringSpec<TaxExpenseTimeQueryFilters> = {
  start: { defaultValue: TAX_EXPENSE_DEFAULT_START, omitWhen: isDefaultTaxExpenseStart },
  end: {},
  nationFilter: { key: "nationList", aliases: ["nationFilter"] },
  dontRequireTagged: {},
};

export const TAX_EXPENSE_SUMMARY_DEFAULT_FILTERS: TaxExpenseSummaryFilters = {
  start: TAX_EXPENSE_DEFAULT_START,
};

export const TAX_EXPENSE_TIME_DEFAULT_FILTERS: TaxExpenseTimeFilters = {
  start: TAX_EXPENSE_DEFAULT_START,
  chartMode: "cumulative",
  movingAverageWindow: TAX_EXPENSE_DEFAULT_MOVING_AVERAGE_WINDOW,
};

const TAX_EXPENSE_TURN_LIKE_MAX = 1_000_000;
const TAX_EXPENSE_SECOND_LIKE_MAX = 100_000_000_000;
const TAX_EXPENSE_DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
});
const TAX_EXPENSE_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function toQueryArgs(filters: EndpointArgRecord): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0),
  );
}

function parseBooleanParam(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

function normalizeMovingAverageWindow(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return TAX_EXPENSE_DEFAULT_MOVING_AVERAGE_WINDOW;
  }

  const rounded = Math.round(parsed);
  return Math.min(Math.max(rounded, 1), TAX_EXPENSE_MAX_MOVING_AVERAGE_WINDOW);
}

function normalizeChartMode(value: string | null): TaxExpenseChartMode {
  return value === "moving-average" ? value : "cumulative";
}

function isDefaultTaxExpenseStart(value: string): boolean {
  return value.trim() === TAX_EXPENSE_DEFAULT_START;
}

function trimTrailingZeros(value: string): string {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function parseNumericCellValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatTaxExpenseResourceLabel(resource: ResourceType): string {
  const emoji = TAX_EXPENSE_RESOURCE_EMOJIS[resource];
  const label = TAX_EXPENSE_RESOURCE_LABELS[resource];
  return emoji ? `${emoji} ${label}` : label;
}

function readTableRows(table?: WebTable | null): unknown[][] {
  return Array.isArray(table?.cells)
    ? table.cells.slice(1).filter((row): row is unknown[] => Array.isArray(row))
    : [];
}

export function parseTaxExpenseSummaryFilters(searchParams: URLSearchParams): TaxExpenseSummaryFilters {
  return parseSearchParamStringRecord(searchParams, SUMMARY_FILTER_PARAM_SPEC);
}

export function parseTaxExpenseTimeFilters(searchParams: URLSearchParams): TaxExpenseTimeFilters {
  const queryFilters = parseSearchParamStringRecord(searchParams, TIME_FILTER_PARAM_SPEC);

  return {
    ...TAX_EXPENSE_TIME_DEFAULT_FILTERS,
    ...queryFilters,
    chartMode: normalizeChartMode(searchParams.get("chartMode")),
    movingAverageWindow: normalizeMovingAverageWindow(searchParams.get("movingAverageWindow")),
  };
}

export function writeTaxExpenseSummaryFilters(searchParams: URLSearchParams, filters: TaxExpenseSummaryFilters): URLSearchParams {
  return writeSearchParamStringRecord(searchParams, filters, SUMMARY_FILTER_PARAM_SPEC);
}

export function writeTaxExpenseTimeFilters(searchParams: URLSearchParams, filters: TaxExpenseTimeFilters): URLSearchParams {
  const next = writeSearchParamStringRecord(searchParams, {
    start: filters.start,
    end: filters.end,
    nationFilter: filters.nationFilter,
    dontRequireTagged: filters.dontRequireTagged,
  }, TIME_FILTER_PARAM_SPEC);

  if (filters.chartMode === "cumulative") {
    next.delete("chartMode");
  } else {
    next.set("chartMode", filters.chartMode);
  }

  if (filters.movingAverageWindow === TAX_EXPENSE_DEFAULT_MOVING_AVERAGE_WINDOW) {
    next.delete("movingAverageWindow");
  } else {
    next.set("movingAverageWindow", String(filters.movingAverageWindow));
  }

  return next;
}

export function buildSummaryEndpointArgs(filters: TaxExpenseSummaryFilters) {
  return toQueryArgs(filters);
}

export function buildSummaryBracketArgs(datasetId: number, taxId: number) {
  return {
    datasetId: String(datasetId),
    taxId: String(taxId),
  };
}

export function buildSummaryNationArgs(datasetId: number, taxId: number, nationId: number) {
  return {
    ...buildSummaryBracketArgs(datasetId, taxId),
    nation: String(nationId),
  };
}

export function buildTimeEndpointArgs(filters: TaxExpenseTimeFilters) {
  return toQueryArgs({
    start: filters.start,
    end: filters.end,
    nationFilter: filters.nationFilter,
    dontRequireTagged: filters.dontRequireTagged,
  });
}

export function buildTimeResourceArgs(datasetId: number): EndpointArgs<typeof TAX_EXPENSE_BY_TIME_RESOURCES> {
  return {
    datasetId: String(datasetId),
  };
}

export function buildTimeBracketArgs(datasetId: number, taxId: number): EndpointArgs<typeof TAX_EXPENSE_BY_TIME_BRACKET> {
  return {
    datasetId: String(datasetId),
    taxId: String(taxId),
  };
}

export function buildSummaryFilterSignature(filters: TaxExpenseSummaryFilters): string {
  return JSON.stringify(buildSummaryEndpointArgs(filters));
}

export function buildTimeFilterSignature(filters: TaxExpenseTimeFilters): string {
  return JSON.stringify({
    ...buildTimeEndpointArgs(filters),
    chartMode: filters.chartMode,
    movingAverageWindow: filters.movingAverageWindow,
  });
}

export function buildSummaryFilterBadges(filters: TaxExpenseSummaryFilters): string[] {
  const badges: string[] = [];
  if (filters.nationList) {
    badges.push(`Scope ${filters.nationList}`);
  }
  if (parseBooleanParam(filters.dontRequireGrant)) {
    badges.push("Ignore grant gate");
  }
  if (parseBooleanParam(filters.dontRequireTagged)) {
    badges.push("Ignore tagged gate");
  }
  if (parseBooleanParam(filters.dontRequireExpiry)) {
    badges.push("Ignore expiry gate");
  }
  if (parseBooleanParam(filters.includeDeposits)) {
    badges.push("Include deposits");
  }

  return badges;
}

export function buildTimeFilterBadges(filters: TaxExpenseTimeFilters): string[] {
  const badges: string[] = [];
  if (filters.nationFilter) {
    badges.push(`Scope ${filters.nationFilter}`);
  }
  if (parseBooleanParam(filters.dontRequireTagged)) {
    badges.push("Ignore tagged gate");
  }
  if (filters.chartMode === "moving-average") {
    badges.push(filters.movingAverageWindow > 1 ? `Moving avg ${filters.movingAverageWindow}` : "Moving avg");
  }

  return badges;
}

export function formatCountLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export function formatResourceAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    return `${trimTrailingZeros((value / 1_000_000_000).toFixed(2))}B`;
  }
  if (absValue >= 1_000_000) {
    return `${trimTrailingZeros((value / 1_000_000).toFixed(2))}M`;
  }
  if (absValue >= 1_000) {
    return `${trimTrailingZeros((value / 1_000).toFixed(1))}k`;
  }
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return trimTrailingZeros(value.toFixed(2));
}

export function formatSignedResourceAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatResourceAmount(Math.abs(value))}`;
}

export function formatResourceCopyMap(values: readonly number[]): string {
  const entries = TAX_EXPENSE_RESOURCE_TYPES.flatMap((resource, index) => {
    const value = values[index] ?? 0;
    if (!Number.isFinite(value) || value === 0) {
      return [];
    }

    const normalizedValue = Number.isInteger(value)
      ? String(value)
      : trimTrailingZeros(value.toFixed(2));
    return [`${TAX_EXPENSE_RESOURCE_COPY_KEYS[resource]}=${normalizedValue}`];
  });

  return `{${entries.join(",")}}`;
}

export function formatMonetaryAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  const prefix = value < 0 ? "-" : "";
  return `${prefix}$${formatResourceAmount(Math.abs(value))}`;
}

export type TaxExpenseResourceBreakdownRow = {
  key: string;
  resource: ResourceType;
  label: string;
  displayValue: string;
  value: number;
  rawValue: number;
  moneyValue: number;
};

export function buildEntitySelection(ids: readonly number[]): string {
  return ids.join(",");
}

export function buildResourceTypeSelection(resources: readonly ResourceType[] = TAX_EXPENSE_RESOURCE_TYPES): string {
  return resources.join(",");
}

export function parseTaxExpenseNationTable(table?: WebTable | null): Record<number, TaxExpenseNationMeta> {
  return readTableRows(table).reduce<Record<number, TaxExpenseNationMeta>>((lookup, row) => {
    const nationId = parseNumericCellValue(row[0]);
    if (nationId === null) {
      return lookup;
    }

    lookup[nationId] = {
      nationId,
      nationMarkup: typeof row[1] === "string" ? row[1] : `[Nation #${nationId}](https://politicsandwar.com/nation/id=${nationId})`,
      allianceMarkup: typeof row[2] === "string" ? row[2] : "",
      cities: parseNumericCellValue(row[3]),
      freeProjectSlots: parseNumericCellValue(row[4]),
      projectSlots: parseNumericCellValue(row[5]),
      builtProjects: parseNumericCellValue(row[6]),
      avgInfra: parseNumericCellValue(row[7]),
      avgLand: parseNumericCellValue(row[8]),
      color: typeof row[9] === "string" ? row[9] : String(row[9] ?? "-"),
      score: parseNumericCellValue(row[10]),
    };
    return lookup;
  }, {});
}

export function parseTaxExpenseResourcePrices(table?: WebTable | null): TaxExpenseResourcePriceMap {
  return readTableRows(table).reduce<TaxExpenseResourcePriceMap>((lookup, row) => {
    const resource = typeof row[0] === "string" ? row[0].trim().toUpperCase() as ResourceType : null;
    const value = parseNumericCellValue(row[1]);
    if (!resource || value === null || !TAX_EXPENSE_RESOURCE_TYPES.includes(resource)) {
      return lookup;
    }

    lookup[resource] = value;
    return lookup;
  }, { MONEY: 1 });
}

export function getResourceMoneyValueForType(
  resource: ResourceType,
  amount: number,
  priceMap?: TaxExpenseResourcePriceMap,
): number {
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }

  const price = priceMap?.[resource] ?? (resource === "MONEY" ? 1 : null);
  if (price === null || !Number.isFinite(price)) {
    return amount;
  }

  return amount * price;
}

export function getResourceMoneyValue(values: readonly number[], priceMap?: TaxExpenseResourcePriceMap): number {
  return TAX_EXPENSE_RESOURCE_TYPES.reduce((total, resource, index) => {
    return total + getResourceMoneyValueForType(resource, values[index] ?? 0, priceMap);
  }, 0);
}

export function getResourceBreakdownRows(
  values: readonly number[],
  options?: {
    displayMode?: TaxExpenseDisplayMode;
    priceMap?: TaxExpenseResourcePriceMap;
  },
): TaxExpenseResourceBreakdownRow[] {
  const displayMode = options?.displayMode ?? "raw";

  return TAX_EXPENSE_RESOURCE_TYPES.map((resource, index) => {
    const rawValue = values[index] ?? 0;
    const moneyValue = getResourceMoneyValueForType(resource, rawValue, options?.priceMap);
    return {
      key: resource,
      resource,
      label: formatTaxExpenseResourceLabel(resource),
      displayValue: displayMode === "value" ? formatMonetaryAmount(moneyValue) : formatResourceAmount(rawValue),
      value: displayMode === "value" ? moneyValue : rawValue,
      rawValue,
      moneyValue,
    };
  })
    .filter((entry) => entry.rawValue !== 0)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value) || left.label.localeCompare(right.label));
}

export function formatTransactionResources(
  resources: readonly number[],
  displayMode: TaxExpenseDisplayMode,
  priceMap?: TaxExpenseResourcePriceMap,
): string {
  if (displayMode === "value") {
    return formatMonetaryAmount(getResourceMoneyValue(resources, priceMap));
  }

  const rows = getResourceBreakdownRows(resources, { displayMode: "raw", priceMap });
  if (rows.length === 0) {
    return "0";
  }

  return rows.map((row) => `${row.label} ${row.displayValue}`).join(", ");
}

export function subtractResourceArrays(left: readonly number[], right: readonly number[]): number[] {
  const length = Math.max(left.length, right.length);
  const result = new Array<number>(length);
  for (let index = 0; index < length; index += 1) {
    result[index] = (left[index] ?? 0) - (right[index] ?? 0);
  }
  return result;
}

export function formatBracketTitle(taxId: number, bracket?: WebTaxBracket | null): string {
  if (taxId === TAX_EXPENSE_TOTAL_TAX_ID) {
    return "Total";
  }

  const name = bracket?.name?.trim();
  if (!name) {
    return `Tax #${taxId}`;
  }

  return name;
}

export function formatBracketMeta(bracket?: WebTaxBracket | null): string | null {
  if (!bracket) {
    return null;
  }

  return `${bracket.moneyRate}/${bracket.rssRate}`;
}

export function formatAllianceBadge(allianceId: number): string {
  return `AA ${allianceId}`;
}

export function formatDurationMinutes(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  if (rounded < 60) {
    return `${rounded}m`;
  }
  if (rounded < 24 * 60) {
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(rounded / (24 * 60));
  const hours = Math.floor((rounded % (24 * 60)) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function detectTaxExpenseTimeFormat(values: readonly number[]): TimeFormat {
  const finiteValues = values.filter((value) => Number.isFinite(value) && value !== 0).map((value) => Math.abs(value));
  if (finiteValues.length === 0) {
    return "MILLIS_TO_DATE";
  }

  const maxValue = Math.max(...finiteValues);
  if (maxValue < TAX_EXPENSE_TURN_LIKE_MAX) {
    return "TURN_TO_DATE";
  }
  if (maxValue < TAX_EXPENSE_SECOND_LIKE_MAX) {
    return "SECONDS_TO_DATE";
  }

  return "MILLIS_TO_DATE";
}

export function normalizeTaxExpenseTimestampMs(value: number, timeFormat?: TimeFormat): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const resolvedFormat = timeFormat ?? detectTaxExpenseTimeFormat([value]);
  return toMillisFunction(resolvedFormat)(value);
}

export function formatTaxExpenseTimestamp(value: number, timeFormat?: TimeFormat): string {
  const timestampMs = normalizeTaxExpenseTimestampMs(value, timeFormat);
  if (timestampMs === null) {
    return "N/A";
  }

  const parts = TAX_EXPENSE_TIMESTAMP_FORMATTER.formatToParts(new Date(timestampMs));
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const dayPeriod = (parts.find((part) => part.type === "dayPeriod")?.value ?? "").toLowerCase().replace(/\./g, "");
  const dateLabel = day && month ? `${day}/${month}` : formatDate(timestampMs);

  if (!hour || !dayPeriod || (hour === "12" && minute === "00" && dayPeriod === "am")) {
    return dateLabel;
  }

  const timeLabel = minute && minute !== "00"
    ? `${hour}:${minute}${dayPeriod}`
    : `${hour}${dayPeriod}`;

  return `${dateLabel} ${timeLabel}`;
}

export function formatTaxExpenseAxisDate(value: number, timeFormat?: TimeFormat): string {
  const timestampMs = normalizeTaxExpenseTimestampMs(value, timeFormat);
  if (timestampMs === null) {
    return "N/A";
  }

  return TAX_EXPENSE_DATE_ONLY_FORMATTER.format(new Date(timestampMs));
}

export function applySeriesTransform(series: readonly number[][], mode: TaxExpenseChartMode, movingAverageWindow: number): number[][] {
  if (mode === "cumulative") {
    return series.map((values) => {
      let runningTotal = 0;
      return values.map((value) => {
        runningTotal += value;
        return runningTotal;
      });
    });
  }

  return series.map((values) => {
    if (movingAverageWindow <= 1) {
      return [...values];
    }

    const next: number[] = [];
    for (let index = 0; index < values.length; index += 1) {
      const start = Math.max(0, index - movingAverageWindow + 1);
      const slice = values.slice(start, index + 1);
      const sum = slice.reduce((total, value) => total + value, 0);
      next.push(slice.length > 0 ? sum / slice.length : 0);
    }
    return next;
  });
}

export function buildTaxExpenseTimeGraph(params: {
  title: string;
  timestamps: readonly number[];
  categories: readonly TaxExpenseTimeCategory[];
  series: readonly number[][];
  mode: TaxExpenseChartMode;
  movingAverageWindow: number;
  yLabel?: string;
}): WebGraph {
  const transformedSeries = applySeriesTransform(params.series, params.mode, params.movingAverageWindow);
  const timeFormat = detectTaxExpenseTimeFormat(params.timestamps);
  return {
    title: params.title,
    x: "Timestamp",
    y: params.yLabel ?? "Resources",
    type: "LINE",
    time_format: timeFormat,
    number_format: "SI_UNIT",
    labels: params.categories.map((category) => category.name),
    data: [
      [...params.timestamps],
      ...transformedSeries.map((values) => [...values]),
    ],
  };
}

export function formatDateBadge(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  const timestampMs = parseTimestampMs(trimmed);
  return timestampMs !== null ? formatDate(timestampMs) : trimmed;
}

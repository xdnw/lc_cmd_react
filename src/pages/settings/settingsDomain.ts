import type { ArgInputSupport } from "@/components/cmd/ArgInput";
import { getArgInputSupport } from "@/components/cmd/ArgInput";
import { QueryResult } from "@/lib/BulkQuery";
import type { GuildSettingCategory, GuildSettingSubgroup, WebTable, WebTableError } from "@/lib/apitypes";
import { COMMANDS } from "@/lib/commands";
import type { JSONValue } from "@/lib/internaltypes";
import { getRenderer } from "@/components/ui/renderers";
import { CM, getTypeBreakdown, type TypeBreakdown } from "@/utils/Command";

type GuildSettingPlaceholderCommand = keyof typeof COMMANDS.placeholders["GuildSetting"]["commands"];

type GuildSettingPlaceholderArgs<C extends GuildSettingPlaceholderCommand> =
    typeof COMMANDS.placeholders["GuildSetting"]["commands"][C] extends { arguments: infer Args extends Record<string, unknown> }
        ? { [K in keyof Args]?: string }
        : never;

type SettingColumnDefinition<
    Key extends string = string,
    Command extends GuildSettingPlaceholderCommand = GuildSettingPlaceholderCommand,
> = {
    key: Key;
    placeholder: {
        cmd: Command;
        args?: GuildSettingPlaceholderArgs<Command>;
    };
    useRenderer?: boolean;
    includeInViewTable?: boolean;
};

function defineSettingColumn<
    Key extends string,
    Command extends GuildSettingPlaceholderCommand,
>(definition: SettingColumnDefinition<Key, Command>): SettingColumnDefinition<Key, Command> {
    return definition;
}

function getColumnPlaceholder(column: string | readonly [string, string]): string {
    return typeof column === "string" ? column : column[0];
}

export const GUILD_SETTING_TABLE_TYPE = "GuildSetting" as const;

const GUILD_SETTING_COLUMN_SCHEMA = [
    defineSettingColumn({ key: "settingKey", placeholder: { cmd: "name" } }),
    defineSettingColumn({ key: "argType", placeholder: { cmd: "getwebtype" } }),
    defineSettingColumn({ key: "category", placeholder: { cmd: "getcategory" }, useRenderer: true }),
    defineSettingColumn({ key: "subgroup", placeholder: { cmd: "getsubgroup" }, useRenderer: true }),
    defineSettingColumn({ key: "helpFull", placeholder: { cmd: "help" } }),
    defineSettingColumn({ key: "valueString", placeholder: { cmd: "getvaluestring", args: { checkDelegate: "false" } } }),
    defineSettingColumn({ key: "valueRaw", placeholder: { cmd: "getvalueraw", args: { checkDelegate: "false" } } }),
    defineSettingColumn({ key: "invalid", placeholder: { cmd: "hasinvalidvalue", args: { checkDelegate: "false" } } }),
    defineSettingColumn({ key: "isChannelType", placeholder: { cmd: "ischanneltype" } }),
    defineSettingColumn({ key: "isAllowed", placeholder: { cmd: "allowed", args: { throwException: "false" } } }),
    defineSettingColumn({ key: "availabilityReason", placeholder: { cmd: "allowed", args: { throwException: "true" } }, includeInViewTable: false }),
] as const;

type SettingColumnKey = (typeof GUILD_SETTING_COLUMN_SCHEMA)[number]["key"];
type SettingColumnEntry = (typeof GUILD_SETTING_COLUMN_SCHEMA)[number] & { index: number };

const guildSettingColumnEntries = GUILD_SETTING_COLUMN_SCHEMA.map((column, index) => ({
    ...column,
    index,
})) as SettingColumnEntry[];

const guildSettingColumnEntryByKey = Object.fromEntries(
    guildSettingColumnEntries.map((column) => [column.key, column]),
) as Record<SettingColumnKey, SettingColumnEntry>;

function toPlaceholderString(
    cmd: GuildSettingPlaceholderCommand,
    args?: Record<string, string>,
): string {
    if (!args || Object.keys(args).length === 0) {
        return `{${cmd}}`;
    }

    const serializedArgs = Object.entries(args)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" ");

    return `{${cmd}(${serializedArgs})}`;
}

export const guildSettingColumns = GUILD_SETTING_COLUMN_SCHEMA.reduce(
    (builder, column) => builder.addRaw(
        toPlaceholderString(column.placeholder.cmd, column.placeholder.args),
        column.key,
    ),
    CM.placeholders(GUILD_SETTING_TABLE_TYPE).aliased(),
);

export const GUILD_SETTING_VIEW_TABLE_COLUMNS = guildSettingColumnEntries
    .filter((column) => column.includeInViewTable !== false)
    .map((column) => guildSettingColumns.aliasedArray()[column.index]);
export const GUILD_SETTING_COLUMNS = guildSettingColumns.array();

function getColumnIndex(key: SettingColumnKey): number {
    return guildSettingColumnEntryByKey[key].index;
}

function getRawColumnValue(rawRow: readonly JSONValue[], key: SettingColumnKey): JSONValue | undefined {
    return rawRow[getColumnIndex(key)];
}

type BackendRendererList = readonly (string | null | undefined)[];

const EMPTY_RENDERERS: BackendRendererList = [];

type TableCellErrorLookup = Map<string, string[]>;

function getCellErrorKey(rowIndex: number, colIndex: number): string {
    return `${rowIndex}:${colIndex}`;
}

function buildTableCellErrorLookup(errors?: readonly WebTableError[]): TableCellErrorLookup {
    const lookup: TableCellErrorLookup = new Map();

    for (const error of errors ?? []) {
        if (typeof error.row !== "number" || typeof error.col !== "number") {
            continue;
        }

        const key = getCellErrorKey(error.row, error.col);
        const existing = lookup.get(key);
        if (existing) {
            existing.push(error.msg);
            continue;
        }

        lookup.set(key, [error.msg]);
    }

    return lookup;
}

function toText(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function toBoolean(value: JSONValue | undefined): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (lowered === "true" || lowered === "1" || lowered === "yes") return true;
        if (lowered === "false" || lowered === "0" || lowered === "no") return false;
    }
    return undefined;
}

function readTextColumn(
    rawRow: readonly JSONValue[],
    key: SettingColumnKey,
    backendRenderers: BackendRendererList,
): string {
    const column = guildSettingColumnEntryByKey[key];
    const rawValue = getRawColumnValue(rawRow, key);

    if (!column.useRenderer) {
        return toText(rawValue);
    }

    const rendererType = backendRenderers[column.index];
    const display = rendererType ? getRenderer(rendererType)?.display : undefined;
    if (!display) {
        return toText(rawValue);
    }

    try {
        return toText(display(rawValue as never));
    } catch {
        return toText(rawValue);
    }
}

function readBooleanColumn(
    rawRow: readonly JSONValue[],
    key: Extract<SettingColumnKey, "invalid" | "isChannelType" | "isAllowed">,
    parseErrors: string[],
): boolean {
    const parsed = toBoolean(getRawColumnValue(rawRow, key));
    if (parsed == null) {
        parseErrors.push(`Failed to parse ${key} as boolean`);
    }
    return parsed ?? false;
}

function readCellErrorMessage(
    cellErrors: TableCellErrorLookup,
    rowIndex: number,
    key: SettingColumnKey,
): string | undefined {
    const messages = cellErrors.get(getCellErrorKey(rowIndex, getColumnIndex(key)));
    if (!messages || messages.length === 0) {
        return undefined;
    }

    return messages.join("; ");
}

function readAvailabilityReason(
    rawRow: readonly JSONValue[],
    backendRenderers: BackendRendererList,
    cellErrors: TableCellErrorLookup,
    rowIndex: number,
): string | undefined {
    const errorMessage = readCellErrorMessage(cellErrors, rowIndex, "availabilityReason");
    if (errorMessage) {
        return errorMessage;
    }

    const rawValue = readTextColumn(rawRow, "availabilityReason", backendRenderers).trim();
    if (!rawValue) {
        return undefined;
    }

    const normalized = rawValue.toLowerCase();
    if (normalized === "true" || normalized === "false") {
        return undefined;
    }

    return rawValue;
}

function toSettingKey(value: string): SettingKey {
    return value as SettingKey;
}

export type SettingKey = typeof COMMANDS.options["GuildSetting<?>"]["options"][number];

export type SettingMetadata = {
    argType: string;
    category: GuildSettingCategory;
    subgroup: GuildSettingSubgroup;
    helpShort: string;
    helpFull: string;
};

export type SettingValue = {
    displayText: string;
    rawText: string;
    hasValue: boolean;
};

export type SettingFlags = {
    invalid: boolean;
    isChannelType: boolean;
    isAllowed: boolean;
    availabilityReason?: string;
};

export type SettingEditor = {
    breakdown: TypeBreakdown | null;
    inputSupport: ArgInputSupport;
    initialValue: string;
};

export type SettingRow = {
    settingKey: SettingKey;
    metadata: SettingMetadata;
    value: SettingValue;
    flags: SettingFlags;
    editor: SettingEditor;
    rowParseErrors: string[];
    rawRow: JSONValue[];
};

export type UnsupportedInputIssue = {
    settingKey: string;
    argType: string;
    reason: string;
};

export type NormalizedSettingsRowsResult = {
    rows: SettingRow[];
    schemaErrors: string[];
    rowParseErrors: string[];
    unsupportedInputRows: UnsupportedInputIssue[];
};

export type SettingsSubgroupVM = {
    subgroup: GuildSettingSubgroup;
    rows: SettingRow[];
};

export type SettingsCategoryVM = {
    category: GuildSettingCategory;
    subgroups: SettingsSubgroupVM[];
};

export type FlattenedSettingsItem =
    | {
        key: string;
        kind: "category";
        category: GuildSettingCategory;
        subgroupCount: number;
        settingCount: number;
    }
    | {
        key: string;
        kind: "subgroup";
        category: GuildSettingCategory;
        subgroup: GuildSettingSubgroup;
        settingCount: number;
    }
    | {
        key: string;
        kind: "setting";
        category: GuildSettingCategory;
        subgroup: GuildSettingSubgroup;
        subgroupSettingCount: number;
        subgroupPosition: "first" | "middle" | "last" | "only";
        row: SettingRow;
    };

export type SettingsSubsetModel = {
    requestedKeys: readonly SettingKey[];
    presentRows: SettingRow[];
    missingKeys: SettingKey[];
    flattenedItems: FlattenedSettingsItem[];
};

export type SettingsAvailabilityFilter = "available" | "all" | "unavailable";
export type SettingsFlagFilter = "all" | "only" | "exclude";
export type SettingsSortMode = "category" | "name" | "relevance";

export type SettingsBrowserState = {
    query: string;
    availability: SettingsAvailabilityFilter;
    invalid: SettingsFlagFilter;
    unsupported: SettingsFlagFilter;
    hasValue: SettingsFlagFilter;
    channelType: SettingsFlagFilter;
    sort: SettingsSortMode;
};

export type SettingsPageSearchState = {
    browserState: SettingsBrowserState;
    focusSettingKey: string | null;
};

export type SettingsBrowserCounts = {
    totalRows: number;
    visibleRows: number;
    availableRows: number;
    unavailableRows: number;
    invalidRows: number;
    unsupportedRows: number;
    hasValueRows: number;
    unsetRows: number;
    channelTypeRows: number;
};

export type SettingsBrowserDerivedResult = {
    rows: SettingRow[];
    flattenedItems: FlattenedSettingsItem[];
    counts: SettingsBrowserCounts;
};

export type SettingsVisibleContext = {
    category: GuildSettingCategory | null;
    subgroup: GuildSettingSubgroup | null;
};

export function hasVisibleSettingsSubgroup(subgroup: string | null | undefined): subgroup is GuildSettingSubgroup {
    const normalized = subgroup?.trim() ?? "";
    return normalized.length > 0 && normalized.toUpperCase() !== "NONE";
}

export const SETTINGS_CATEGORY_ITEM_HEIGHT = 52;
export const SETTINGS_SUBGROUP_ITEM_HEIGHT = 42;
export const SETTINGS_ROW_ITEM_HEIGHT = 118;

function compareSettingRowsByCategory(left: SettingRow, right: SettingRow): number {
    return left.metadata.category.localeCompare(right.metadata.category)
        || left.metadata.subgroup.localeCompare(right.metadata.subgroup)
        || left.settingKey.localeCompare(right.settingKey);
}

function compareSettingRowsByName(left: SettingRow, right: SettingRow): number {
    return left.settingKey.localeCompare(right.settingKey)
        || left.metadata.category.localeCompare(right.metadata.category)
        || left.metadata.subgroup.localeCompare(right.metadata.subgroup);
}

function normalizeSettingsQuery(query: string): string {
    return query.trim().toLowerCase();
}

function getSettingsFlagFilterMatch(mode: SettingsFlagFilter, value: boolean): boolean {
    switch (mode) {
        case "only":
            return value;
        case "exclude":
            return !value;
        default:
            return true;
    }
}

function getSettingSearchRank(row: SettingRow, normalizedQuery: string): number {
    if (!normalizedQuery) {
        return 0;
    }

    const prefixCandidates = [
        row.settingKey,
        row.metadata.category,
        row.metadata.subgroup,
    ].map((value) => value.toLowerCase());

    if (prefixCandidates.some((value) => value.startsWith(normalizedQuery))) {
        return 0;
    }

    const keyText = row.settingKey.toLowerCase();
    if (keyText.includes(normalizedQuery)) {
        return 1;
    }

    const metadataText = [
        row.metadata.argType,
        row.metadata.helpShort,
        row.value.displayText,
        row.value.rawText,
    ].join("\n").toLowerCase();

    if (metadataText.includes(normalizedQuery)) {
        return 2;
    }

    return Number.POSITIVE_INFINITY;
}

export function createDefaultSettingsBrowserState(
    overrides?: Partial<SettingsBrowserState>,
): SettingsBrowserState {
    return {
        query: overrides?.query ?? "",
        availability: overrides?.availability ?? "available",
        invalid: overrides?.invalid ?? "all",
        unsupported: overrides?.unsupported ?? "all",
        hasValue: overrides?.hasValue ?? "all",
        channelType: overrides?.channelType ?? "all",
        sort: overrides?.sort ?? "category",
    };
}

function normalizeFocusedSettingKey(value: string | null): string | null {
    const normalized = value?.trim() ?? "";
    return normalized.length > 0 ? normalized : null;
}

export function parseSettingsPageSearchParams(searchParams: URLSearchParams): SettingsPageSearchState {
    const focusSettingKey = normalizeFocusedSettingKey(searchParams.get("focus"));

    return {
        focusSettingKey,
        browserState: createDefaultSettingsBrowserState(
            focusSettingKey
                ? {
                    query: focusSettingKey,
                    availability: "all",
                    sort: "relevance",
                }
                : undefined,
        ),
    };
}

export function countActiveSettingsBrowserFilters(state: SettingsBrowserState): number {
    let count = 0;

    if (normalizeSettingsQuery(state.query)) {
        count += 1;
    }

    if (state.availability !== "available") {
        count += 1;
    }

    if (state.invalid !== "all") {
        count += 1;
    }

    if (state.unsupported !== "all") {
        count += 1;
    }

    if (state.hasValue !== "all") {
        count += 1;
    }

    if (state.channelType !== "all") {
        count += 1;
    }

    if (state.sort !== "category") {
        count += 1;
    }

    return count;
}

export function getSettingSearchableText(row: SettingRow): string {
    return [
        row.settingKey,
        row.metadata.argType,
        row.metadata.category,
        row.metadata.subgroup,
        row.metadata.helpShort,
        row.metadata.helpFull,
        row.value.displayText,
        row.value.rawText,
        row.flags.invalid ? "invalid" : "",
        row.flags.isAllowed ? "available" : "unavailable",
        row.editor.inputSupport.supported ? "" : "unsupported",
        row.value.hasValue ? "set" : "unset",
        row.flags.isChannelType ? "channel" : "",
    ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
}

export function matchesSettingsBrowserFilters(row: SettingRow, state: SettingsBrowserState): boolean {
    const normalizedQuery = normalizeSettingsQuery(state.query);
    if (normalizedQuery && !getSettingSearchableText(row).includes(normalizedQuery)) {
        return false;
    }

    if (state.availability === "available" && !row.flags.isAllowed) {
        return false;
    }

    if (state.availability === "unavailable" && row.flags.isAllowed) {
        return false;
    }

    if (!getSettingsFlagFilterMatch(state.invalid, row.flags.invalid)) {
        return false;
    }

    if (!getSettingsFlagFilterMatch(state.unsupported, !row.editor.inputSupport.supported)) {
        return false;
    }

    if (!getSettingsFlagFilterMatch(state.hasValue, row.value.hasValue)) {
        return false;
    }

    if (!getSettingsFlagFilterMatch(state.channelType, row.flags.isChannelType)) {
        return false;
    }

    return true;
}

export function getSettingsBrowserCounts(rows: SettingRow[]): SettingsBrowserCounts {
    let availableRows = 0;
    let invalidRows = 0;
    let unsupportedRows = 0;
    let hasValueRows = 0;
    let channelTypeRows = 0;

    rows.forEach((row) => {
        if (row.flags.isAllowed) {
            availableRows += 1;
        }

        if (row.flags.invalid) {
            invalidRows += 1;
        }

        if (!row.editor.inputSupport.supported) {
            unsupportedRows += 1;
        }

        if (row.value.hasValue) {
            hasValueRows += 1;
        }

        if (row.flags.isChannelType) {
            channelTypeRows += 1;
        }
    });

    return {
        totalRows: rows.length,
        visibleRows: rows.length,
        availableRows,
        unavailableRows: rows.length - availableRows,
        invalidRows,
        unsupportedRows,
        hasValueRows,
        unsetRows: rows.length - hasValueRows,
        channelTypeRows,
    };
}

export function deriveSettingsBrowserRows(
    rows: SettingRow[],
    state: SettingsBrowserState,
): SettingsBrowserDerivedResult {
    const counts = getSettingsBrowserCounts(rows);
    const normalizedQuery = normalizeSettingsQuery(state.query);

    const filteredRows = rows.filter((row) => matchesSettingsBrowserFilters(row, state));
    const sortedRows = [...filteredRows].sort((left, right) => {
        if (state.sort === "name") {
            return compareSettingRowsByName(left, right);
        }

        if (state.sort === "relevance") {
            const leftRank = getSettingSearchRank(left, normalizedQuery);
            const rightRank = getSettingSearchRank(right, normalizedQuery);
            return leftRank - rightRank || compareSettingRowsByCategory(left, right);
        }

        return compareSettingRowsByCategory(left, right);
    });

    return {
        rows: sortedRows,
        flattenedItems: flattenSettingsRows(sortedRows),
        counts: {
            ...counts,
            visibleRows: sortedRows.length,
        },
    };
}

export function estimateSettingsItemHeight(item: FlattenedSettingsItem): number {
    switch (item.kind) {
        case "category":
            return SETTINGS_CATEGORY_ITEM_HEIGHT;
        case "subgroup":
            return SETTINGS_SUBGROUP_ITEM_HEIGHT;
        case "setting":
            return SETTINGS_ROW_ITEM_HEIGHT;
    }
}

export function getSettingsVisibleContext(
    items: FlattenedSettingsItem[],
    firstVisibleIndex: number,
): SettingsVisibleContext {
    let category: GuildSettingCategory | null = null;
    let subgroup: GuildSettingSubgroup | null = null;

    const clampedIndex = Math.max(0, Math.min(firstVisibleIndex, Math.max(0, items.length - 1)));

    for (let index = 0; index <= clampedIndex; index++) {
        const item = items[index];
        if (!item) {
            continue;
        }

        if (item.kind === "category") {
            category = item.category;
            subgroup = null;
            continue;
        }

        if (item.kind === "subgroup") {
            category = item.category;
            subgroup = item.subgroup;
            continue;
        }

        category = item.category;
        subgroup = item.subgroup;
    }

    return { category, subgroup };
}

function buildSettingMetadata(
    rawRow: readonly JSONValue[],
    backendRenderers: BackendRendererList,
): SettingMetadata {
    const helpFull = readTextColumn(rawRow, "helpFull", backendRenderers);
    const helpShortCandidate = helpFull.split("\n")[0]?.trim() ?? "";

    return {
        argType: readTextColumn(rawRow, "argType", backendRenderers),
        category: (readTextColumn(rawRow, "category", backendRenderers) || "DEFAULT") as GuildSettingCategory,
        subgroup: (readTextColumn(rawRow, "subgroup", backendRenderers) || "NONE") as GuildSettingSubgroup,
        helpShort: helpShortCandidate || "No help text provided",
        helpFull,
    };
}

function buildSettingValue(
    rawRow: readonly JSONValue[],
    backendRenderers: BackendRendererList,
): SettingValue {
    const valueStringCell = getRawColumnValue(rawRow, "valueString");
    const valueRawCell = getRawColumnValue(rawRow, "valueRaw");
    const displayText = readTextColumn(rawRow, "valueString", backendRenderers);
    const rawText = toText(valueRawCell);

    return {
        displayText,
        rawText,
        hasValue: valueRawCell != null || valueStringCell != null,
    };
}

function buildSettingRow(
    rawRow: readonly JSONValue[],
    backendRenderers: BackendRendererList,
    rowIndex: number,
    cellErrors: TableCellErrorLookup,
): {
    row: SettingRow;
    unsupportedInputIssue?: UnsupportedInputIssue;
} {
    const parseErrors: string[] = [];

    if (rawRow.length < GUILD_SETTING_COLUMN_SCHEMA.length) {
        parseErrors.push(
            `Expected at least ${GUILD_SETTING_COLUMN_SCHEMA.length} columns, received ${rawRow.length}`,
        );
    }

    const settingKeyText = readTextColumn(rawRow, "settingKey", backendRenderers);
    if (!settingKeyText) {
        parseErrors.push("Missing setting key (name)");
    }

    const metadata = buildSettingMetadata(rawRow, backendRenderers);
    const value = buildSettingValue(rawRow, backendRenderers);
    const flags: SettingFlags = {
        invalid: readBooleanColumn(rawRow, "invalid", parseErrors),
        isChannelType: readBooleanColumn(rawRow, "isChannelType", parseErrors),
        isAllowed: readBooleanColumn(rawRow, "isAllowed", parseErrors),
        availabilityReason: readAvailabilityReason(rawRow, backendRenderers, cellErrors, rowIndex),
    };

    const breakdown = metadata.argType ? getTypeBreakdown(CM, metadata.argType) : null;
    const inputSupport = breakdown
        ? getArgInputSupport(breakdown)
        : { supported: false, reason: "missing type metadata" };

    const row: SettingRow = {
        settingKey: toSettingKey(settingKeyText || ""),
        metadata,
        value,
        flags,
        editor: {
            breakdown,
            inputSupport,
            initialValue: value.rawText || value.displayText,
        },
        rowParseErrors: parseErrors,
        rawRow: [...rawRow],
    };

    return {
        row,
        unsupportedInputIssue: inputSupport.supported
            ? undefined
            : {
                settingKey: settingKeyText || `row-${rowIndex + 1}`,
                argType: metadata.argType,
                reason: inputSupport.reason ?? "unsupported setting input type",
            },
    };
}

export function normalizeGuildSettingRows(table: WebTable): NormalizedSettingsRowsResult {
    const schemaErrors: string[] = [];
    const rowParseErrors: string[] = [];
    const rows: SettingRow[] = [];
    const unsupportedInputRows: UnsupportedInputIssue[] = [];

    const backendRenderers = Array.isArray(table.renderers) ? table.renderers : EMPTY_RENDERERS;
    const allCells = Array.isArray(table.cells) ? table.cells : [];
    const cellErrors = buildTableCellErrorLookup(table.errors);

    const dataRows = allCells.slice(1);

    for (let index = 0; index < dataRows.length; index++) {
        const rawRow = dataRows[index];
        if (!Array.isArray(rawRow)) {
            rowParseErrors.push(`Row ${index + 1}: row was not an array`);
            continue;
        }

        const { row, unsupportedInputIssue } = buildSettingRow(rawRow as JSONValue[], backendRenderers, index, cellErrors);
        rows.push(row);

        if (unsupportedInputIssue) {
            unsupportedInputRows.push(unsupportedInputIssue);
        }

        if (row.rowParseErrors.length > 0) {
            rowParseErrors.push(`Row ${index + 1}: ${row.rowParseErrors.join("; ")}`);
        }
    }

    return {
        rows,
        schemaErrors,
        rowParseErrors,
        unsupportedInputRows,
    };
}

export function groupRowsByCategory(rows: SettingRow[]): SettingsCategoryVM[] {
    const categoryMap = new Map<GuildSettingCategory, Map<GuildSettingSubgroup, SettingRow[]>>();

    for (const row of rows) {
        const { category, subgroup } = row.metadata;

        if (!categoryMap.has(category)) {
            categoryMap.set(category, new Map());
        }

        const subgroupMap = categoryMap.get(category)!;
        if (!subgroupMap.has(subgroup)) {
            subgroupMap.set(subgroup, []);
        }

        subgroupMap.get(subgroup)!.push(row);
    }

    return Array.from(categoryMap.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([category, subgroupMap]) => ({
            category,
            subgroups: Array.from(subgroupMap.entries())
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([subgroup, subgroupRows]) => ({
                    subgroup,
                    rows: subgroupRows.sort((left, right) => left.settingKey.localeCompare(right.settingKey)),
                })),
        }));
}

export function flattenSettingsRows(rows: SettingRow[]): FlattenedSettingsItem[] {
    const groupedRows = groupRowsByCategory(rows);
    const items: FlattenedSettingsItem[] = [];

    groupedRows.forEach((category) => {
        const visibleSubgroupCount = category.subgroups.filter((subgroup) => hasVisibleSettingsSubgroup(subgroup.subgroup)).length;

        items.push({
            key: `category-${category.category}`,
            kind: "category",
            category: category.category,
            subgroupCount: visibleSubgroupCount,
            settingCount: category.subgroups.reduce((count, subgroup) => count + subgroup.rows.length, 0),
        });

        category.subgroups.forEach((subgroup) => {
            if (hasVisibleSettingsSubgroup(subgroup.subgroup)) {
                items.push({
                    key: `subgroup-${category.category}-${subgroup.subgroup}`,
                    kind: "subgroup",
                    category: category.category,
                    subgroup: subgroup.subgroup,
                    settingCount: subgroup.rows.length,
                });
            }

            subgroup.rows.forEach((row) => {
                const subgroupSettingCount = subgroup.rows.length;
                const subgroupPosition = subgroupSettingCount === 1
                    ? "only"
                    : subgroup.rows[0] === row
                        ? "first"
                        : subgroup.rows[subgroup.rows.length - 1] === row
                            ? "last"
                            : "middle";

                items.push({
                    key: `setting-${row.settingKey}`,
                    kind: "setting",
                    category: category.category,
                    subgroup: subgroup.subgroup,
                    subgroupSettingCount,
                    subgroupPosition,
                    row,
                });
            });
        });
    });

    return items;
}

export function deriveSettingsSubsetModel(rows: SettingRow[], requestedKeys: readonly SettingKey[]): SettingsSubsetModel {
    const requestedKeySet = new Set<string>(requestedKeys);
    const presentRows = rows.filter((row) => requestedKeySet.has(row.settingKey));
    const presentKeySet = new Set(presentRows.map((row) => row.settingKey));

    return {
        requestedKeys,
        presentRows,
        missingKeys: requestedKeys.filter((settingKey) => !presentKeySet.has(settingKey)),
        flattenedItems: flattenSettingsRows(presentRows),
    };
}

export function mergeRowIntoTableCache({
    oldResult,
    updatedRow,
}: {
    oldResult: QueryResult<WebTable> | undefined;
    updatedRow: SettingRow;
}): QueryResult<WebTable> | undefined {
    if (!oldResult?.data?.cells) return oldResult;

    const table = oldResult.data;
    const keyIndex = getColumnIndex("settingKey");
    const nextCells = table.cells.map((row) => (Array.isArray(row) ? [...row] : row));

    let updated = false;
    for (let index = 1; index < nextCells.length; index++) {
        const row = nextCells[index];
        if (!Array.isArray(row)) continue;

        const existingKey = String(row[keyIndex] ?? "");
        if (existingKey === updatedRow.settingKey) {
            nextCells[index] = [...updatedRow.rawRow];
            updated = true;
            break;
        }
    }

    if (!updated) {
        nextCells.push([...updatedRow.rawRow]);
    }

    return new QueryResult<WebTable>({
        endpoint: oldResult.endpoint,
        query: oldResult.query,
        update_ms: oldResult.update_ms,
        cache: oldResult.cache,
        data: { ...table, cells: nextCells },
        error: oldResult.error,
    });
}

export function removeRowFromTableCache({
    oldResult,
    settingKey,
}: {
    oldResult: QueryResult<WebTable> | undefined;
    settingKey: string;
}): QueryResult<WebTable> | undefined {
    if (!oldResult?.data?.cells) return oldResult;

    const table = oldResult.data;
    const keyIndex = getColumnIndex("settingKey");
    const nextCells = table.cells
        .filter((row, index) => {
            if (index === 0 || !Array.isArray(row)) return true;
            return String(row[keyIndex] ?? "") !== settingKey;
        })
        .map((row) => (Array.isArray(row) ? [...row] : row));

    return new QueryResult<WebTable>({
        endpoint: oldResult.endpoint,
        query: oldResult.query,
        update_ms: oldResult.update_ms,
        cache: oldResult.cache,
        data: { ...table, cells: nextCells },
        error: oldResult.error,
    });
}
import type { ArgInputSupport } from "@/components/cmd/ArgInput";
import { getArgInputSupport } from "@/components/cmd/ArgInput";
import { QueryResult } from "@/lib/BulkQuery";
import type { GuildSettingCategory, GuildSettingSubgroup, WebTable } from "@/lib/apitypes";
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
};

function defineSettingColumn<
    Key extends string,
    Command extends GuildSettingPlaceholderCommand,
>(definition: SettingColumnDefinition<Key, Command>): SettingColumnDefinition<Key, Command> {
    return definition;
}

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
    CM.placeholders("GuildSetting").aliased(),
);

export const GUILD_SETTING_COLUMNS = guildSettingColumns.array();

function getColumnIndex(key: SettingColumnKey): number {
    return guildSettingColumnEntryByKey[key].index;
}

function getRawColumnValue(rawRow: readonly JSONValue[], key: SettingColumnKey): JSONValue | undefined {
    return rawRow[getColumnIndex(key)];
}

type BackendRendererList = readonly (string | null | undefined)[];

const EMPTY_RENDERERS: BackendRendererList = [];

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
    inputText: string;
    hasValue: boolean;
};

export type SettingFlags = {
    invalid: boolean;
    isChannelType: boolean;
    isAllowed: boolean;
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
    }
    | {
        key: string;
        kind: "subgroup";
        category: GuildSettingCategory;
        subgroup: GuildSettingSubgroup;
    }
    | {
        key: string;
        kind: "setting";
        category: GuildSettingCategory;
        subgroup: GuildSettingSubgroup;
        row: SettingRow;
    };

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
        inputText: valueRawCell == null ? displayText : rawText,
        hasValue: valueRawCell != null || valueStringCell != null,
    };
}

function buildSettingRow(
    rawRow: readonly JSONValue[],
    backendRenderers: BackendRendererList,
    rowNumber: number,
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
            initialValue: value.inputText,
        },
        rowParseErrors: parseErrors,
        rawRow: [...rawRow],
    };

    return {
        row,
        unsupportedInputIssue: inputSupport.supported
            ? undefined
            : {
                settingKey: settingKeyText || `row-${rowNumber}`,
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

    if (allCells.length === 0) {
        schemaErrors.push("GuildSetting TABLE returned no rows");
    }

    const dataRows = allCells.slice(1);

    for (let index = 0; index < dataRows.length; index++) {
        const rawRow = dataRows[index];
        if (!Array.isArray(rawRow)) {
            rowParseErrors.push(`Row ${index + 1}: row was not an array`);
            continue;
        }

        const { row, unsupportedInputIssue } = buildSettingRow(rawRow as JSONValue[], backendRenderers, index + 1);
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
        items.push({
            key: `category-${category.category}`,
            kind: "category",
            category: category.category,
        });

        category.subgroups.forEach((subgroup) => {
            items.push({
                key: `subgroup-${category.category}-${subgroup.subgroup}`,
                kind: "subgroup",
                category: category.category,
                subgroup: subgroup.subgroup,
            });

            subgroup.rows.forEach((row) => {
                items.push({
                    key: `setting-${row.settingKey}`,
                    kind: "setting",
                    category: category.category,
                    subgroup: subgroup.subgroup,
                    row,
                });
            });
        });
    });

    return items;
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
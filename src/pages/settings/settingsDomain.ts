import type { ArgInputSupport } from "@/components/cmd/ArgInput";
import { getArgInputSupport } from "@/components/cmd/ArgInput";
import type { WebTable, GuildSettingCategory, GuildSettingSubgroup } from "@/lib/apitypes";
import { getRenderer } from "@/components/ui/renderers";
import { COMMANDS } from "@/lib/commands";
import { QueryResult } from "@/lib/BulkQuery";
import { CM, getTypeBreakdown, type TypeBreakdown } from "@/utils/Command";

type GuildSettingPlaceholderCommand = keyof typeof COMMANDS.placeholders["GuildSetting"]["commands"];

type GuildSettingColumnEntry = {
    key: string;
    cmd: GuildSettingPlaceholderCommand;
    args?: Record<string, string>;
};

// settingKey  ← {name}      → "API_KEY"         (setting identifier, used in commands)
// argType     ← {getwebtype} → "Set<DBNation>"  (arg type, passed to getTypeBreakdown)
const GUILD_SETTING_COLUMN_SCHEMA: readonly GuildSettingColumnEntry[] = [
    { key: "settingKey",    cmd: "name" },
    { key: "argType",       cmd: "getwebtype" },
    { key: "category",      cmd: "getcategory" },
    { key: "subgroup",      cmd: "getsubgroup" },
    { key: "helpFull",      cmd: "help" },
    { key: "valueString",   cmd: "getvaluestring", args: { checkDelegate: "false"} }, // human readable
    { key: "invalid",       cmd: "hasinvalidvalue", args: { checkDelegate: "false"} },
    { key: "isChannelType", cmd: "ischanneltype" },
    { key: "isAllowed",     cmd: "allowed", args: { throwException: "false" } },
];

type GuildSettingColumnKey = "settingKey" | "argType" | "category" | "subgroup" | "helpFull" |
    "valueString" | "invalid" | "isChannelType" | "isAllowed";

// Build column list — generates {name}, {getkeyname}, {allowed(throwException: false)} etc.
export const guildSettingColumns = GUILD_SETTING_COLUMN_SCHEMA.reduce(
    (builder, col) => {
        const placeholder = col.args
            ? `{${col.cmd}(${Object.entries(col.args).map(([k, v]) => `${k}: ${v}`).join(" ")})}`
            : `{${col.cmd}}`;
        return builder.addRaw(placeholder, col.key);
    },
    CM.placeholders("GuildSetting").aliased(),
);

/** Column string array for the TABLE query `columns` parameter */
export const GUILD_SETTING_COLUMNS = guildSettingColumns.array();

// Positional index lookup (used by mergeRowIntoTableCache)
const columnIndexByKey = Object.fromEntries(
    GUILD_SETTING_COLUMN_SCHEMA.map((col, idx) => [col.key, idx]),
) as Record<GuildSettingColumnKey, number>;

function getColumnIndex(key: GuildSettingColumnKey): number {
    return columnIndexByKey[key];
}



export type SettingKey = typeof COMMANDS.options["GuildSetting<?>"]["options"][number];

export type SettingRow = {
    /** "API_KEY" — setting identifier used in commands (from {name}) */
    settingKey: SettingKey;
    /** "Set<DBNation>" — arg type passed to getTypeBreakdown (from {getkeyname}) */
    argType: string;
    category: GuildSettingCategory;
    subgroup: GuildSettingSubgroup;
    helpShort: string;
    helpFull: string;
    valueString: string;
    hasValue: boolean;
    invalid: boolean;
    isChannelType: boolean;
    isAllowed: boolean;
    initialEditValue: string;
    rowParseErrors: string[];
    breakdown: TypeBreakdown | null;
    inputSupport: ArgInputSupport;
    rawRow: unknown[];
};

export type UnsupportedInputIssue = {
    settingKey: SettingKey;
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

function toBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (lowered === "true" || lowered === "1" || lowered === "yes") return true;
        if (lowered === "false" || lowered === "0" || lowered === "no") return false;
    }
    return undefined;
}

function toInitialEditValue(valueString: string): string {
    // the value string is the human-readable form returned by getvaluestring
    // and is what should be used as the initial input value in the edit dialog.
    return valueString;
}

export function normalizeGuildSettingRows(table: WebTable): NormalizedSettingsRowsResult {
    const schemaErrors: string[] = [];
    const rowParseErrors: string[] = [];
    const rows: SettingRow[] = [];
    const unsupportedInputRows: UnsupportedInputIssue[] = [];

    console.log("Table from backend:", table);

    // Build per-column decoders from the backend-supplied renderer strings.
    // Column positions match the schema order, so renderers[columnIndexByKey[key]] gives the renderer for that column.
    const backendRenderers = Array.isArray(table.renderers) ? table.renderers : [];
    const decodeColumn = (key: GuildSettingColumnKey, raw: unknown): string => {
        const rendererType = backendRenderers[columnIndexByKey[key]];
        if (rendererType) {
            const display = getRenderer(rendererType)?.display;
            if (display) {
                try { return toText(display(raw as never)); } catch { /* fall through */ }
            }
        }
        return toText(raw);
    };

    // cells[0] is always the header row from the TABLE endpoint; data starts at cells[1]
    const allCells = Array.isArray(table.cells) ? table.cells : [];
    if (allCells.length === 0) {
        schemaErrors.push("GuildSetting TABLE returned no rows");
    }
    const dataRows = allCells.slice(1).filter(Array.isArray) as unknown[][];

    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const raw = dataRows[rowIndex];
        const r = guildSettingColumns.createRowAdapter(raw);
        const parseErrors: string[] = [];

        const settingKey = toText(r.settingKey);
        if (!settingKey) {
            parseErrors.push("Missing setting key (name)");
        }

        const argType = toText(r.argType);
        const category = decodeColumn("category", r.category);
        const subgroup = decodeColumn("subgroup", r.subgroup);
        const helpFull = toText(r.helpFull);
        const valueString = toText(r.valueString);
        // compute hasValue based on whether the backend provided a value string at all
        const hasValue = r.valueString != null;

        const invalid = toBoolean(r.invalid);
        if (invalid == null) parseErrors.push("Failed to parse hasinvalidvalue as boolean");

        const isChannelType = toBoolean(r.isChannelType);
        if (isChannelType == null) parseErrors.push("Failed to parse ischanneltype as boolean");

        const isAllowed = toBoolean(r.isAllowed);
        if (isAllowed == null) parseErrors.push("Failed to parse allowed as boolean");

        const breakdown = argType ? getTypeBreakdown(CM, argType) : null;
        const inputSupport = breakdown
            ? getArgInputSupport(breakdown)
            : { supported: false, reason: "missing type metadata" };
        if (!inputSupport.supported) {
            unsupportedInputRows.push({
                settingKey: (settingKey || `row-${rowIndex + 1}`) as SettingKey,
                argType,
                reason: inputSupport.reason ?? "unsupported setting input type",
            });
        }

        if (parseErrors.length > 0) {
            rowParseErrors.push(`Row ${rowIndex + 1}: ${parseErrors.join("; ")}`);
        }

        const shortHelpCandidate = helpFull.split("\n")[0]?.trim() ?? "";
        rows.push({
            settingKey: (settingKey || "") as SettingKey,
            argType,
            category: (category || "DEFAULT") as GuildSettingCategory,
            subgroup: (subgroup || "NONE") as GuildSettingSubgroup,
            helpShort: shortHelpCandidate || "No help text provided",
            helpFull,
            valueString,
            hasValue,
            invalid: invalid ?? false,
            isChannelType: isChannelType ?? false,
            isAllowed: isAllowed ?? false,
            initialEditValue: toInitialEditValue(valueString),
            rowParseErrors: parseErrors,
            breakdown,
            inputSupport,
            rawRow: raw,
        });
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
        if (!categoryMap.has(row.category)) {
            categoryMap.set(row.category, new Map());
        }
        const subgroupMap = categoryMap.get(row.category)!;
        if (!subgroupMap.has(row.subgroup)) {
            subgroupMap.set(row.subgroup, []);
        }
        subgroupMap.get(row.subgroup)!.push(row);
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

    // cells[0] is the header; data starts at cells[1]
    let updated = false;
    for (let idx = 1; idx < nextCells.length; idx++) {
        const row = nextCells[idx];
        if (!Array.isArray(row)) continue;
        const existingKey = String(row[keyIndex] ?? "");
        if (existingKey === updatedRow.settingKey) {
            nextCells[idx] = [...updatedRow.rawRow];
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
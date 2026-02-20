import type { JSONValue } from "@/lib/internaltypes";
import { COMMANDS } from "@/lib/commands";
import { renderTableCellValue, type ConfigColumns, type ObjectColumnRender } from "@/pages/custom_table/DataTable";
import { CM } from "@/utils/Command";
import type { ReactNode } from "react";

export type ConflictRow = {
    id: number;
    name: string;
    category: string;
    c1Name: string;
    c2Name: string;
    status: string;
    wiki: string;
    start: number;
    end: number;
    casusBelli: string;
    raw: JSONValue[];
};

type ConflictDataKey = Exclude<keyof ConflictRow, "raw">;
type ConflictPlaceholderCommand = keyof typeof COMMANDS.placeholders["Conflict"]["commands"];

type ConflictColumnSchemaEntry = {
    key: ConflictDataKey;
    placeholder: {
        cmd: ConflictPlaceholderCommand;
        alias: string;
        args?: Record<string, string>;
    };
    renderer?: "turn_to_date";
};

const CONFLICT_COLUMN_SCHEMA = [
    { key: "id", placeholder: { cmd: "getid", alias: "ID" } },
    { key: "name", placeholder: { cmd: "getname", alias: "Name" } },
    { key: "category", placeholder: { cmd: "getcategory", alias: "Category" } },
    { key: "start", placeholder: { cmd: "getstartturn", alias: "Start" }, renderer: "turn_to_date" },
    { key: "end", placeholder: { cmd: "getendturn", alias: "End" }, renderer: "turn_to_date" },
    { key: "wiki", placeholder: { cmd: "getwiki", alias: "Wiki" } },
    { key: "status", placeholder: { cmd: "getstatusdesc", alias: "Status" } },
    { key: "casusBelli", placeholder: { cmd: "getcasusbelli", alias: "CB" } },
    { key: "c1Name", placeholder: { cmd: "getcoalitionname", args: { side: "false" }, alias: "C1" } },
    { key: "c2Name", placeholder: { cmd: "getcoalitionname", args: { side: "true" }, alias: "C2" } },
] as const satisfies readonly ConflictColumnSchemaEntry[];

export type ConflictColumnKey = (typeof CONFLICT_COLUMN_SCHEMA)[number]["key"];

export const conflictPlaceholderColumns = CONFLICT_COLUMN_SCHEMA.reduce(
    (builder, column) => {
        const args = "args" in column.placeholder ? column.placeholder.args : undefined;
        const placeholder = args
            ? `{${column.placeholder.cmd}(${Object.entries(args).map(([key, value]) => `${key}: ${value}`).join(" ")})}`
            : `{${column.placeholder.cmd}}`;
        return builder.addRaw(placeholder, column.placeholder.alias);
    },
    CM.placeholders("Conflict").aliased(),
);

const conflictColumnEntries: Array<ConflictColumnSchemaEntry & { index: number }> = CONFLICT_COLUMN_SCHEMA.map((column, index) => ({
    ...column,
    index,
}));

const conflictColumnEntryByKey = Object.fromEntries(
    conflictColumnEntries.map((column) => [column.key, column]),
) as Record<ConflictColumnKey, (typeof conflictColumnEntries)[number]>;

export const conflictColumnRenderers = Object.fromEntries(
    conflictColumnEntries
        .filter((column): column is ConflictColumnSchemaEntry & { index: number; renderer: "turn_to_date" } =>
            typeof column.renderer === "string",
        )
        .map((column) => [column.placeholder.cmd, column.renderer]),
) as Record<string, string>;

function getConflictColumnIndex(key: ConflictColumnKey): number {
    return conflictColumnEntryByKey[key].index;
}

export function toConflictId(value: JSONValue): number | null {
    const id = Number(value);
    return Number.isFinite(id) ? id : null;
}

export function getConflictRawValue(row: JSONValue[], key: ConflictColumnKey): JSONValue {
    return row[getConflictColumnIndex(key)];
}

export function createConflictRow(raw: JSONValue[]): ConflictRow {
    const id = Number(getConflictRawValue(raw, "id"));

    return {
        id: Number.isFinite(id) ? id : -1,
        name: String(getConflictRawValue(raw, "name") ?? getConflictRawValue(raw, "id") ?? "Conflict"),
        category: String(getConflictRawValue(raw, "category") ?? ""),
        c1Name: String(getConflictRawValue(raw, "c1Name") ?? ""),
        c2Name: String(getConflictRawValue(raw, "c2Name") ?? ""),
        status: String(getConflictRawValue(raw, "status") ?? ""),
        wiki: String(getConflictRawValue(raw, "wiki") ?? ""),
        start: Number(getConflictRawValue(raw, "start") ?? 0),
        end: Number(getConflictRawValue(raw, "end") ?? 0),
        casusBelli: String(getConflictRawValue(raw, "casusBelli") ?? ""),
        raw,
    };
}

export function isConflictRow(value: JSONValue): value is ConflictRow {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const raw = (value as { raw?: JSONValue }).raw;
    const id = (value as { id?: JSONValue }).id;
    return Array.isArray(raw) && Number.isFinite(Number(id));
}

function getColumnByKey(key: ConflictColumnKey, columnsInfo?: ConfigColumns[]): ConfigColumns | undefined {
    return columnsInfo?.find((value) => value.index === getConflictColumnIndex(key));
}

export function renderConflictCell(row: ConflictRow, key: ConflictColumnKey, columnsInfo?: ConfigColumns[]): ReactNode {
    const idx = getConflictColumnIndex(key);
    const rawValue = row.raw[idx];
    const column = getColumnByKey(key, columnsInfo);

    if (column) {
        return renderTableCellValue(rawValue, {
            row: row.raw,
            rowIdx: 0,
            column,
        });
    }

    return String(rawValue);
}

export function toPlainString(value: ReactNode): string | null {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return null;
}

export function resolveConflictEnumLabel(
    row: ConflictRow,
    key: ConflictColumnKey,
    columnsInfo?: ConfigColumns[],
): string | null {
    const column = getColumnByKey(key, columnsInfo);
    const raw = getConflictRawValue(row.raw, key);
    const opts = (column?.render as ObjectColumnRender | undefined)?.options;

    if (!column?.render?.isEnum || !Array.isArray(opts)) {
        return null;
    }

    const idx = Number(raw);
    if (Number.isNaN(idx) || !opts[idx]) {
        return null;
    }

    return opts[idx];
}

export function turnToTimestampPrefill(turn: number): string {
    if (!Number.isFinite(turn) || turn < 0) return "";
    const turnsPerDay = process.env.TEST ? 24 : 12;
    const timeMillis = (turn / turnsPerDay) * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(timeMillis)) return "";
    return `timestamp:${Math.floor(timeMillis)}`;
}

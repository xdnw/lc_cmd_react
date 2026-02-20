import type { JSONValue } from "@/lib/internaltypes";
import { COMMANDS } from "@/lib/commands";
import type { ConfigColumns, ObjectColumnRender } from "@/pages/custom_table/DataTable";
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
    activeWars: number;
    c1Damage: string;
    c2Damage: string;
    casusBelli: string;
    raw: JSONValue[];
};

type ConflictDataKey = Exclude<keyof ConflictRow, "raw">;
type ConflictPlaceholderCommand = keyof typeof COMMANDS.placeholders["Conflict"]["commands"];

type ConflictColumnDefinition = {
    key: ConflictDataKey;
    placeholder: {
        cmd: ConflictPlaceholderCommand;
        alias: string;
        args?: Record<string, string>;
    };
};

const CONFLICT_COLUMNS = [
    { key: "id", placeholder: { cmd: "getid", alias: "ID" } },
    { key: "name", placeholder: { cmd: "getname", alias: "Name" } },
    { key: "category", placeholder: { cmd: "getcategory", alias: "Category" } },
    { key: "start", placeholder: { cmd: "getstartturn", alias: "Start" } },
    { key: "end", placeholder: { cmd: "getendturn", alias: "End" } },
    { key: "activeWars", placeholder: { cmd: "getactivewars", alias: "Active Wars" } },
    { key: "c1Damage", placeholder: { cmd: "getdamageconverted", args: { isPrimary: "true" }, alias: "c1_damage" } },
    { key: "c2Damage", placeholder: { cmd: "getdamageconverted", args: { isPrimary: "false" }, alias: "c2_damage" } },
    { key: "wiki", placeholder: { cmd: "getwiki", alias: "Wiki" } },
    { key: "status", placeholder: { cmd: "getstatusdesc", alias: "Status" } },
    { key: "casusBelli", placeholder: { cmd: "getcasusbelli", alias: "CB" } },
    { key: "c1Name", placeholder: { cmd: "getcoalitionname", args: { side: "false" }, alias: "C1" } },
    { key: "c2Name", placeholder: { cmd: "getcoalitionname", args: { side: "true" }, alias: "C2" } },
] as const satisfies ReadonlyArray<ConflictColumnDefinition>;

export type ConflictColumnKey = (typeof CONFLICT_COLUMNS)[number]["key"];

export const CONFLICT_COLUMN_INDEX: Record<ConflictColumnKey, number> = CONFLICT_COLUMNS.reduce(
    (acc, column, idx) => {
        acc[column.key] = idx;
        return acc;
    },
    {} as Record<ConflictColumnKey, number>,
);

export const conflictPlaceholderColumns = CONFLICT_COLUMNS.reduce(
    (builder, column) => builder.add(column.placeholder),
    CM.placeholders("Conflict").aliased(),
);

export const conflictColumnRenderers = {
    getstartturn: "turn_to_date",
    getendturn: "turn_to_date",
} as const;

export function toConflictId(value: JSONValue): number | null {
    const id = Number(value);
    return Number.isFinite(id) ? id : null;
}

export function getConflictRawValue(row: JSONValue[], key: ConflictColumnKey): JSONValue {
    return row[CONFLICT_COLUMN_INDEX[key]];
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
        activeWars: Number(getConflictRawValue(raw, "activeWars") ?? 0),
        c1Damage: String(getConflictRawValue(raw, "c1Damage") ?? ""),
        c2Damage: String(getConflictRawValue(raw, "c2Damage") ?? ""),
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
    return columnsInfo?.find((value) => value.index === CONFLICT_COLUMN_INDEX[key]);
}

export function renderConflictCell(row: ConflictRow, key: ConflictColumnKey, columnsInfo?: ConfigColumns[]): ReactNode {
    const idx = CONFLICT_COLUMN_INDEX[key];
    const rawValue = row.raw[idx];
    const column = getColumnByKey(key, columnsInfo);
    const renderer = column?.render?.display;

    if (renderer && column) {
        return renderer(rawValue, {
            row: row.raw,
            rowIdx: 0,
            column,
        }) ?? "-";
    }

    return rawValue == null || rawValue === "" ? "-" : String(rawValue);
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

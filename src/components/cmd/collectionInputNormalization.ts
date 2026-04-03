import type { TypeBreakdown } from "@/utils/Command";

import type { ScalarNormalizationNotice } from "./scalarInputNormalization";
import { normalizeScalarInput } from "./scalarInputNormalization";

type MapEntry = { [key: string]: string };
export type KeyValueEntry = { key: string; value: string };

export type CollectionNotice = ScalarNormalizationNotice;

type NormalizedCollectionValue = {
    value: string;
    notices: CollectionNotice[];
};

function dedupeNotices(notices: CollectionNotice[]): CollectionNotice[] {
    const seen = new Set<string>();
    return notices.filter((notice) => {
        const key = `${notice.severity}:${notice.message}`;
        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

export function summarizeCollectionNotices(notices: CollectionNotice[]): { warningText: string; noteText: string } {
    return {
        warningText: notices.filter((notice) => notice.severity === "warning").map((notice) => notice.message).join(" "),
        noteText: notices.filter((notice) => notice.severity === "note").map((notice) => notice.message).join(" "),
    };
}

export function parseSetString(input: string): string[] {
    if (!input) return [];
    return input
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

export function serializeMapEntries(entries: MapEntry[]): string {
    if (entries.length === 0) {
        return "";
    }

    return `{${entries
        .map((entry) => `${Object.keys(entry)[0]}=${Object.values(entry)[0]}`)
        .join(",")}}`;
}

export const normalizeCollectionScalar = normalizeScalarInput;

export function normalizeKeyValueEntries(
    entries: KeyValueEntry[],
    options: {
        normalizeKey: (rawKey: string) => NormalizedCollectionValue;
        normalizeValue: (rawValue: string, normalizedKey: string) => NormalizedCollectionValue;
        duplicateMessage?: (key: string) => string;
        sortEntries?: (entries: KeyValueEntry[]) => KeyValueEntry[];
    },
): { entries: KeyValueEntry[]; notices: CollectionNotice[] } {
    const normalizedEntries: KeyValueEntry[] = [];
    const indexByKey = new Map<string, number>();
    const notices: CollectionNotice[] = [];

    for (const entry of entries) {
        const normalizedKey = options.normalizeKey(entry.key);
        notices.push(...normalizedKey.notices);
        if (!normalizedKey.value) {
            continue;
        }

        const normalizedValue = options.normalizeValue(entry.value, normalizedKey.value);
        notices.push(...normalizedValue.notices);

        const nextEntry = { key: normalizedKey.value, value: normalizedValue.value };
        const existingIndex = indexByKey.get(normalizedKey.value);
        if (existingIndex == null) {
            indexByKey.set(normalizedKey.value, normalizedEntries.length);
            normalizedEntries.push(nextEntry);
            continue;
        }

        normalizedEntries[existingIndex] = nextEntry;
        notices.push({
            severity: "note",
            message: options.duplicateMessage?.(normalizedKey.value) ?? `Key "${normalizedKey.value}" replaced an earlier entry.`,
        });
    }

    return {
        entries: options.sortEntries ? options.sortEntries([...normalizedEntries]) : normalizedEntries,
        notices: dedupeNotices(notices),
    };
}

export function normalizeSetValues(values: string[], breakdown: TypeBreakdown): { values: string[]; notices: CollectionNotice[] } {
    const normalizedValues: string[] = [];
    const seen = new Set<string>();
    const notices: CollectionNotice[] = [];

    for (const rawValue of values) {
        const normalized = normalizeCollectionScalar(rawValue, breakdown, "Value");
        notices.push(...normalized.notices);
        if (!normalized.value) {
            continue;
        }
        if (seen.has(normalized.value)) {
            notices.push({
                severity: "note",
                message: `Value "${normalized.value}" was kept only once.`,
            });
            continue;
        }

        seen.add(normalized.value);
        normalizedValues.push(normalized.value);
    }

    return {
        values: normalizedValues,
        notices: dedupeNotices(notices),
    };
}

export function normalizeMapEntries(
    entries: MapEntry[],
    keyBreakdown: TypeBreakdown,
    valueBreakdown: TypeBreakdown,
): { entries: MapEntry[]; notices: CollectionNotice[] } {
    const normalized = normalizeKeyValueEntries(
        entries.map((entry) => {
            const rawKey = Object.keys(entry)[0] ?? "";
            return {
                key: rawKey,
                value: rawKey ? entry[rawKey] ?? "" : "",
            };
        }),
        {
            normalizeKey: (rawKey) => normalizeCollectionScalar(rawKey, keyBreakdown, "Key"),
            normalizeValue: (rawValue) => normalizeCollectionScalar(rawValue, valueBreakdown, "Value"),
        },
    );

    return {
        entries: normalized.entries.map((entry) => ({ [entry.key]: entry.value })),
        notices: normalized.notices,
    };
}

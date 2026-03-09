import type { TypeBreakdown } from "@/utils/Command";
import type { ScalarNormalizationNotice } from "./scalarInputNormalization";
import { normalizeScalarInput } from "./scalarInputNormalization";

type MapEntry = { [key: string]: string };

export type CollectionNotice = ScalarNormalizationNotice;

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

export function parseSetString(input: string): string[] {
    if (!input) return [];
    return input
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

export function serializeMapEntries(entries: MapEntry[]): string {
    return entries
        .map((entry) => `${Object.keys(entry)[0]}=${Object.values(entry)[0]}`)
        .join("\n");
}

export const normalizeCollectionScalar = normalizeScalarInput;

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
    const normalizedEntries: MapEntry[] = [];
    const indexByKey = new Map<string, number>();
    const notices: CollectionNotice[] = [];

    for (const entry of entries) {
        const rawKey = Object.keys(entry)[0] ?? "";
        const rawValue = rawKey ? entry[rawKey] ?? "" : "";
        const normalizedKey = normalizeCollectionScalar(rawKey, keyBreakdown, "Key");
        const normalizedValue = normalizeCollectionScalar(rawValue, valueBreakdown, "Value");

        notices.push(...normalizedKey.notices, ...normalizedValue.notices);

        if (!normalizedKey.value) {
            continue;
        }

        const nextEntry = { [normalizedKey.value]: normalizedValue.value };
        const existingIndex = indexByKey.get(normalizedKey.value);
        if (existingIndex == null) {
            indexByKey.set(normalizedKey.value, normalizedEntries.length);
            normalizedEntries.push(nextEntry);
            continue;
        }

        normalizedEntries[existingIndex] = nextEntry;
        notices.push({
            severity: "note",
            message: `Key "${normalizedKey.value}" replaced an earlier entry.`,
        });
    }

    return {
        entries: normalizedEntries,
        notices: dedupeNotices(notices),
    };
}
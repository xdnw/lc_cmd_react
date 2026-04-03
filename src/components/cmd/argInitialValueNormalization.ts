import { normalizeTimediffValue, normalizeTimeValue } from "@/lib/temporal";
import type { TypeBreakdown } from "@/utils/Command";
import { parseMapStringDetailed } from "@/utils/MapParser";

import { parseCityBuildInput, serializeParsedCityBuildValue } from "./cityBuildInputUtils";
import { normalizeMapEntries, normalizeSetValues, parseSetString, serializeMapEntries } from "./collectionInputNormalization";
import { resolveArgInput } from "./argInputMetadata";
import { serializeBooleanValue } from "./booleanValueUtils";
import { normalizeMmrValue } from "./scalarInputNormalization";

export function normalizeArgInitialValue(
    breakdown: TypeBreakdown,
    initialValue: string | null | undefined,
    options?: { isOptional?: boolean },
): string {
    const rawValue = typeof initialValue === "string" ? initialValue : "";
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
        return "";
    }

    if (breakdown.element === "Map") {
        const keyBreakdown = breakdown.child?.[0];
        const valueBreakdown = breakdown.child?.[1];
        if (!keyBreakdown || !valueBreakdown) {
            return rawValue;
        }

        const parsed = parseMapStringDetailed(rawValue, keyBreakdown, valueBreakdown);
        if (!parsed.entries) {
            return rawValue;
        }

        const normalizedEntries = (() => {
            try {
                return normalizeMapEntries(parsed.entries, keyBreakdown, valueBreakdown).entries;
            } catch {
                return parsed.entries;
            }
        })()
            .filter((entry) => {
                const key = Object.keys(entry)[0] ?? "";
                return key !== "" && (entry[key] ?? "") !== "";
            });

        return serializeMapEntries(normalizedEntries);
    }

    if (breakdown.element === "Set") {
        const childBreakdown = breakdown.child?.[0];
        if (!childBreakdown) {
            return rawValue;
        }

        try {
            return normalizeSetValues(parseSetString(rawValue), childBreakdown).values.join(",");
        } catch {
            return parseSetString(rawValue).join(",");
        }
    }

    if (breakdown.element === "CityBuild") {
        const parsed = parseCityBuildInput(rawValue);
        return parsed.error ? rawValue : serializeParsedCityBuildValue(parsed);
    }

    let resolution;
    try {
        resolution = resolveArgInput(breakdown);
    } catch {
        return rawValue;
    }

    switch (resolution.kind) {
        case "boolean": {
            const mode = resolution.booleanMode === "tri-state" ? "tri-state" : "boolean";
            return serializeBooleanValue(rawValue, { mode, optional: options?.isOptional });
        }

        case "time":
            return normalizeTimeValue(trimmedValue, Date.now()).outputValue || rawValue;

        case "timediff":
            return normalizeTimediffValue(trimmedValue, Date.now()).outputValue || rawValue;
        case "mmr": {
            const normalizedValue = normalizeMmrValue(rawValue, resolution.allowWildcard ?? false);
            return normalizedValue.length === 4 ? normalizedValue : rawValue;
        }

        default:
            return rawValue;
    }
}
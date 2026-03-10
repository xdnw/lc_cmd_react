import { COMMANDS } from "@/lib/commands";
import { parseMapStringDetailed } from "@/utils/MapParser";

import { normalizeKeyValueEntries, summarizeCollectionNotices, type CollectionNotice } from "./collectionInputNormalization";
import { validateNumberInput } from "./field/argValidation";

export type CityBuildModifier = {
    key: string;
    value: string;
};

export type CityBuildParseResult = {
    cityId: string;
    modifiers: CityBuildModifier[];
    notices?: CollectionNotice[];
    error?: string;
    note?: string;
};

const BASE_MODIFIER_KEYS = ["infra_needed", "land", "age"] as const;
const IGNORED_MODIFIER_KEY = "imp_total";
const CITY_ID_PATTERN = /^(?:(?:https?:\/\/)?politicsandwar\.com\/)?city\/id=(\d+)$/i;
const BARE_CITY_ID_PATTERN = /^\d+$/;

function normalizeCityBuildText(value: string | null | undefined): string {
    return typeof value === "string" ? value : "";
}

function compactModifierKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function extractBuildingNames(): string[] {
    const tokens = new Set<string>();
    const selectors = COMMANDS.placeholders.Building?.selectors ?? [];

    for (const selector of selectors) {
        for (const value of selector) {
            if (typeof value !== "string") {
                continue;
            }

            const matches = value.match(/imp[A-Za-z]+/g) ?? [];
            for (const match of matches) {
                const buildingName = match.replace(/^imp/, "").toLowerCase();
                if (buildingName) {
                    tokens.add(buildingName);
                }
            }
        }
    }

    return Array.from(tokens).sort((left, right) => left.localeCompare(right));
}

const BUILDING_NAMES = extractBuildingNames();
export const CITY_BUILD_ALLOWED_KEYS = [
    ...BASE_MODIFIER_KEYS,
    ...BUILDING_NAMES.map((buildingName) => `imp_${buildingName}`),
] as const;

const ALLOWED_KEY_LOOKUP = new Map<string, string>([
    ...BASE_MODIFIER_KEYS.map((key) => [compactModifierKey(key), key] as const),
    ...BUILDING_NAMES.map((buildingName) => [compactModifierKey(`imp_${buildingName}`), `imp_${buildingName}`] as const),
]);

function sortModifiers(modifiers: CityBuildModifier[]): CityBuildModifier[] {
    return [...modifiers].sort((left, right) => {
        const leftBaseIndex = BASE_MODIFIER_KEYS.indexOf(left.key as (typeof BASE_MODIFIER_KEYS)[number]);
        const rightBaseIndex = BASE_MODIFIER_KEYS.indexOf(right.key as (typeof BASE_MODIFIER_KEYS)[number]);

        if (leftBaseIndex !== -1 || rightBaseIndex !== -1) {
            if (leftBaseIndex === -1) return 1;
            if (rightBaseIndex === -1) return -1;
            return leftBaseIndex - rightBaseIndex;
        }

        return left.key.localeCompare(right.key);
    });
}

export function normalizeCityBuildModifiers(modifiers: CityBuildModifier[]): { modifiers: CityBuildModifier[]; notices: CollectionNotice[] } {
    const normalized = normalizeKeyValueEntries(modifiers, {
        normalizeKey: (rawKey) => {
            const normalizedKey = normalizeCityBuildModifierKey(rawKey);
            if (normalizedKey.ignored) {
                return {
                    value: "",
                    notices: [{ severity: "note", message: `Ignored ${IGNORED_MODIFIER_KEY}.` }],
                };
            }
            if (normalizedKey.error || !normalizedKey.key) {
                return {
                    value: "",
                    notices: [{ severity: "warning", message: normalizedKey.error || `Unknown modifier key "${rawKey}".` }],
                };
            }

            return {
                value: normalizedKey.key,
                notices: [],
            };
        },
        normalizeValue: (rawValue, normalizedKey) => {
            const normalizedValue = normalizeModifierValue(rawValue);
            if (normalizedValue.error) {
                return {
                    value: "",
                    notices: [{ severity: "warning", message: `${normalizedKey}: ${normalizedValue.error}` }],
                };
            }

            return {
                value: normalizedValue.value,
                notices: [],
            };
        },
        duplicateMessage: (key) => `Modifier "${key}" replaced an earlier value.`,
        sortEntries: sortModifiers,
    });

    return {
        modifiers: normalized.entries,
        notices: normalized.notices,
    };
}

export function formatCityBuildCityId(cityId: string): string {
    return cityId ? `city/id=${cityId}` : "";
}

function serializeNormalizedCityBuildValue(cityId: string, modifiers: CityBuildModifier[]): string {
    const cityPart = formatCityBuildCityId(cityId);
    const modifierPart = modifiers.length > 0
        ? `{${modifiers.map((modifier) => `${modifier.key}:${modifier.value}`).join(",")}}`
        : "";

    return `${cityPart}${modifierPart}`;
}

export function parseCityBuildCityInput(rawValue: string | null | undefined): { cityId: string; error?: string } {
    const trimmed = normalizeCityBuildText(rawValue).trim();
    if (!trimmed) {
        return { cityId: "" };
    }

    if (BARE_CITY_ID_PATTERN.test(trimmed)) {
        return { cityId: trimmed };
    }

    const matched = trimmed.match(CITY_ID_PATTERN);
    if (matched) {
        return { cityId: matched[1] };
    }

    return {
        cityId: "",
        error: "Expected a city id, city/id=123, or https://politicsandwar.com/city/id=123.",
    };
}

export function normalizeCityBuildModifierKey(rawKey: string): { key?: string; ignored?: boolean; error?: string } {
    const compactKey = compactModifierKey(rawKey);
    if (!compactKey) {
        return { error: "Modifier key cannot be empty." };
    }

    if (compactKey === compactModifierKey(IGNORED_MODIFIER_KEY)) {
        return { ignored: true };
    }

    const canonicalKey = ALLOWED_KEY_LOOKUP.get(compactKey);
    if (!canonicalKey) {
        return {
            error: `Unknown city build modifier "${rawKey}". Allowed keys are infra_needed, land, age, and imp_<buildingname>.`,
        };
    }

    return { key: canonicalKey };
}

function normalizeModifierValue(rawValue: string | null | undefined): { value: string; error?: string } {
    const normalizedRawValue = normalizeCityBuildText(rawValue);
    const validation = validateNumberInput(normalizedRawValue, { isFloat: true });
    if (!validation.isValid) {
        return {
            value: "",
            error: validation.error || `Invalid numeric value "${normalizedRawValue}".`,
        };
    }

    return { value: validation.normalizedValue };
}

function splitCityBuildInput(rawValue: string | null | undefined): { cityPart: string; modifierPart: string } {
    const trimmed = normalizeCityBuildText(rawValue).trim();
    if (!trimmed) {
        return { cityPart: "", modifierPart: "" };
    }

    const braceIndex = trimmed.indexOf("{");
    if (braceIndex === -1) {
        return { cityPart: trimmed, modifierPart: "" };
    }

    return {
        cityPart: trimmed.slice(0, braceIndex).trim(),
        modifierPart: trimmed.slice(braceIndex).trim(),
    };
}

function parseModifierPart(rawValue: string | null | undefined): { modifiers: CityBuildModifier[]; notices: CollectionNotice[]; parseError?: string } {
    const normalizedRawValue = normalizeCityBuildText(rawValue);
    if (!normalizedRawValue.trim()) {
        return { modifiers: [], notices: [] };
    }

    const parsed = parseMapStringDetailed(normalizedRawValue);
    if (!parsed.entries) {
        return {
            modifiers: [],
            notices: [],
            parseError: parsed.error || "Unable to parse city build modifiers.",
        };
    }

    return normalizeCityBuildModifiers(parsed.entries.map((entry) => {
        const rawKey = Object.keys(entry)[0] ?? "";
        return {
            key: rawKey,
            value: rawKey ? entry[rawKey] ?? "" : "",
        };
    }));
}

export function parseCityBuildInput(rawValue: string | null | undefined): CityBuildParseResult {
    const trimmed = normalizeCityBuildText(rawValue).trim();
    if (!trimmed) {
        return {
            cityId: "",
            modifiers: [],
            notices: [],
        };
    }

    const { cityPart, modifierPart } = splitCityBuildInput(trimmed);
    const parsedCity = parseCityBuildCityInput(cityPart);
    const parsedModifiers = parseModifierPart(modifierPart);
    const notices: CollectionNotice[] = [];

    if (parsedCity.error) {
        notices.push({ severity: "warning", message: parsedCity.error });
    }
    if (parsedModifiers.parseError) {
        notices.push({ severity: "warning", message: parsedModifiers.parseError });
    }
    notices.push(...parsedModifiers.notices);

    const summary = summarizeCollectionNotices(notices);

    return {
        cityId: parsedCity.cityId,
        modifiers: parsedModifiers.modifiers,
        notices,
        error: summary.warningText || undefined,
        note: summary.noteText || undefined,
    };
}

export function serializeCityBuildValue(cityId: string, modifiers: CityBuildModifier[]): string {
    const normalized = normalizeCityBuildModifiers(modifiers);
    return serializeNormalizedCityBuildValue(cityId, normalized.modifiers);
}

export function serializeParsedCityBuildValue(parsed: Pick<CityBuildParseResult, "cityId" | "modifiers">): string {
    return serializeNormalizedCityBuildValue(parsed.cityId, parsed.modifiers);
}

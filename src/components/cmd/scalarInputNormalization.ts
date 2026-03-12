import { normalizeTimediffValue, normalizeTimeValue } from "@/lib/temporal";
import type { TypeBreakdown } from "@/utils/Command";
import { buildStaticOptions, resolveArgInput } from "./argInputMetadata";
import { validateNumberInput, validateRegexInput } from "./field/argValidation";
import { resolveOptionMatch } from "./selectValueUtils";
import { serializeBooleanValue } from "./booleanValueUtils";

export type ScalarNormalizationNotice = {
    severity: "note" | "warning";
    message: string;
};

export type ScalarNormalizationResult = {
    value: string;
    notices: ScalarNormalizationNotice[];
};

export function normalizeBooleanValue(value: string): "1" | "0" {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "y", "on", "t"].includes(normalized) ? "1" : "0";
}

export function normalizeTriStateValue(value: string): "-1" | "0" | "1" {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on", "t"].includes(normalized)) {
        return "1";
    }
    if (["-1", "false", "no", "n", "off", "f"].includes(normalized)) {
        return "-1";
    }
    return "0";
}

export function normalizeColorValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed || typeof document === "undefined") return "";

    const probe = document.createElement("div");
    probe.style.color = "";
    probe.style.color = trimmed;
    if (!probe.style.color) return "";

    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    document.body.removeChild(probe);

    const matched = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (!matched) return "";

    return `#${[matched[1], matched[2], matched[3]]
        .map((component) => Number(component).toString(16).padStart(2, "0"))
        .join("")}`;
}

export function normalizeMmrValue(value: string, allowWildcard: boolean): string {
    const upper = (value || "").toUpperCase().replace(/[/\s,-]+/g, "");
    const pattern = allowWildcard ? /[^0-9X]/g : /[^0-9]/g;
    return upper.replace(pattern, "").slice(0, 4);
}

function buildNormalizationNote(subject: string, rawValue: string, nextValue: string): ScalarNormalizationNotice | null {
    if (!rawValue || rawValue === nextValue) {
        return null;
    }

    return {
        severity: "note",
        message: `${subject} "${rawValue}" normalized to "${nextValue}".`,
    };
}

function buildInvalidNotice(subject: string, rawValue: string, typeName: string, reason: string): ScalarNormalizationNotice {
    return {
        severity: "warning",
        message: `${subject} "${rawValue}" may be invalid for ${typeName}: ${reason}`,
    };
}

export function normalizeScalarInput(rawValue: string, breakdown: TypeBreakdown, subject: string): ScalarNormalizationResult {
    const trimmed = rawValue.trim();
    if (!trimmed) {
        return { value: "", notices: [] };
    }

    const resolution = resolveArgInput(breakdown);
    const typeName = breakdown.element;

    if (resolution.kind === "static-options" || resolution.kind === "placeholder-class") {
        const options = buildStaticOptions(breakdown) ?? [];
        const match = resolveOptionMatch(trimmed, options);
        if (!match.option) {
            return {
                value: trimmed,
                notices: [buildInvalidNotice(subject, trimmed, typeName, "did not match any known option.")],
            };
        }

        const normalizedValue = match.option.value;
        const note = buildNormalizationNote(subject, trimmed, normalizedValue);
        return {
            value: normalizedValue,
            notices: note ? [note] : [],
        };
    }

    if (resolution.kind === "number") {
        const validation = validateNumberInput(trimmed, { isFloat: resolution.numberIsFloat ?? true });
        if (!validation.isValid) {
            return {
                value: trimmed,
                notices: [buildInvalidNotice(subject, trimmed, typeName, validation.error)],
            };
        }

        const normalizedValue = validation.normalizedValue;
        const note = buildNormalizationNote(subject, trimmed, normalizedValue);
        return {
            value: normalizedValue,
            notices: note ? [note] : [],
        };
    }

    if (resolution.kind === "boolean") {
        const normalizedValue = resolution.booleanMode === "tri-state"
            ? serializeBooleanValue(normalizeTriStateValue(trimmed), { mode: "tri-state" })
            : serializeBooleanValue(normalizeBooleanValue(trimmed), { mode: "boolean" });
        const note = buildNormalizationNote(subject, trimmed, normalizedValue);
        return {
            value: normalizedValue,
            notices: note ? [note] : [],
        };
    }

    if (resolution.kind === "time") {
        const normalized = normalizeTimeValue(trimmed, Date.now());
        if (!normalized.outputValue) {
            return {
                value: trimmed,
                notices: [buildInvalidNotice(subject, trimmed, typeName, "could not be parsed as a timestamp.")],
            };
        }

        const note = buildNormalizationNote(subject, trimmed, normalized.outputValue);
        return {
            value: normalized.outputValue,
            notices: note ? [note] : [],
        };
    }

    if (resolution.kind === "timediff") {
        const normalized = normalizeTimediffValue(trimmed, Date.now());
        if (!normalized.outputValue) {
            return {
                value: trimmed,
                notices: [buildInvalidNotice(subject, trimmed, typeName, "could not be parsed as a time difference.")],
            };
        }

        const note = buildNormalizationNote(subject, trimmed, normalized.outputValue);
        return {
            value: normalized.outputValue,
            notices: note ? [note] : [],
        };
    }

    if (resolution.kind === "mmr") {
        const normalizedValue = normalizeMmrValue(trimmed, resolution.allowWildcard ?? false);
        if (normalizedValue.length !== 4) {
            return {
                value: trimmed,
                notices: [buildInvalidNotice(subject, trimmed, typeName, "did not normalize to a four-slot MMR value.")],
            };
        }

        const note = buildNormalizationNote(subject, trimmed, normalizedValue);
        return {
            value: normalizedValue,
            notices: note ? [note] : [],
        };
    }

    if (resolution.kind === "color") {
        const normalized = normalizeColorValue(trimmed);
        if (!normalized) {
            return {
                value: trimmed,
                notices: [buildInvalidNotice(subject, trimmed, typeName, "did not match a supported CSS color.")],
            };
        }
    }

    const validation = validateRegexInput(
        trimmed,
        resolution.textInputConfig?.filter,
        resolution.textInputConfig?.filterHelp,
    );
    if (!validation.isValid) {
        return {
            value: trimmed,
            notices: [buildInvalidNotice(subject, trimmed, typeName, validation.error)],
        };
    }

    return { value: trimmed, notices: [] };
}
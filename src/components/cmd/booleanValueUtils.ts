export type BooleanControlValue = "1" | "0";
export type TriStateControlValue = "-1" | "0" | "1";
export type BooleanSerializationMode = "boolean" | "tri-state";

const TRUE_INPUTS = new Set(["1", "true", "yes", "y", "on", "t"]);
const FALSE_INPUTS = new Set(["0", "false", "no", "n", "off", "f"]);
const TRI_STATE_FALSE_INPUTS = new Set(["-1", "false", "no", "n", "off", "f"]);
const ANY_INPUTS = new Set(["0", "any", "either", "all", "*"]);

export function normalizeBooleanControlValue(input: string | null | undefined): BooleanControlValue {
    const normalized = (input ?? "").trim().toLowerCase();
    return TRUE_INPUTS.has(normalized) ? "1" : "0";
}

export function normalizeTriStateControlValue(input: string | null | undefined): TriStateControlValue {
    const normalized = (input ?? "").trim().toLowerCase();
    if (TRUE_INPUTS.has(normalized)) {
        return "1";
    }
    if (TRI_STATE_FALSE_INPUTS.has(normalized)) {
        return "-1";
    }
    if (ANY_INPUTS.has(normalized)) {
        return "0";
    }
    return "0";
}

export function formatBooleanOutput(value: BooleanControlValue): "False" | "True" {
    return value === "1" ? "True" : "False";
}

export function formatTriStateOutput(value: TriStateControlValue): "False" | "True" | "" {
    switch (value) {
        case "1":
            return "True";
        case "-1":
            return "False";
        default:
            return "";
    }
}

export function serializeBooleanValue(
    input: string | null | undefined,
    options: { mode: BooleanSerializationMode; optional?: boolean },
): string {
    const trimmed = (input ?? "").trim();
    if (!trimmed) {
        return "";
    }

    if (options.mode === "tri-state") {
        return formatTriStateOutput(normalizeTriStateControlValue(trimmed));
    }

    const normalized = normalizeBooleanControlValue(trimmed);
    if (normalized === "0" && options.optional) {
        return "";
    }

    return formatBooleanOutput(normalized);
}
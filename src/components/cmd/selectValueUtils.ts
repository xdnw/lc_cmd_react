export type SelectOption = {
    label: string;
    value: string;
    subtext?: string;
    color?: string;
    icon?: string;
};

function normalizeToken(token: string): string {
    const trimmed = token.trim();
    // Handle quoted scalar values passed from serialized command args.
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

function toFiniteNumber(value: string): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function resolveByNumericToken(token: string, options: SelectOption[]): SelectOption | null {
    const numericToken = toFiniteNumber(token);
    if (numericToken == null) return null;

    // Some endpoints expose numeric keys as strings (e.g. "1", "2.0").
    const byNumericValue = options.find((option) => {
        const n = toFiniteNumber(option.value);
        return n != null && n === numericToken;
    });
    if (byNumericValue) return byNumericValue;

    if (!Number.isInteger(numericToken)) return null;

    // Fallback: some prefills are enum indices rather than actual option values.
    const zeroBasedIdx = numericToken;
    if (zeroBasedIdx >= 0 && zeroBasedIdx < options.length) {
        return options[zeroBasedIdx];
    }

    const oneBasedIdx = numericToken - 1;
    if (oneBasedIdx >= 0 && oneBasedIdx < options.length) {
        return options[oneBasedIdx];
    }

    return null;
}

export function splitInitialValue(initialValue: string): string[] {
    if (!initialValue) return [];
    return initialValue
        .split(",")
        .map(normalizeToken)
        .filter((token) => token.length > 0);
}

export function resolveOptionForToken(token: string, options: SelectOption[]): SelectOption {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
        return { label: "", value: "" };
    }

    const byValue = options.find((option) => option.value === normalizedToken);
    if (byValue) return byValue;

    const byLabel = options.find((option) => option.label === normalizedToken);
    if (byLabel) return byLabel;

    const byValueInsensitive = options.find((option) => option.value.toLowerCase() === normalizedToken.toLowerCase());
    if (byValueInsensitive) return byValueInsensitive;

    const byLabelInsensitive = options.find((option) => option.label.toLowerCase() === normalizedToken.toLowerCase());
    if (byLabelInsensitive) return byLabelInsensitive;

    const byNumeric = resolveByNumericToken(normalizedToken, options);
    if (byNumeric) return byNumeric;

    return { label: normalizedToken, value: normalizedToken };
}

export function resolveInitialSelection(initialValue: string, options: SelectOption[], isMulti: boolean): SelectOption[] {
    const resolved = splitInitialValue(initialValue)
        .map((token) => resolveOptionForToken(token, options))
        .filter((option) => option.value.length > 0);

    if (resolved.length === 0) return [];
    return isMulti ? dedupeByValue(resolved) : [resolved[0]];
}

export function dedupeByValue(options: SelectOption[]): SelectOption[] {
    const deduped = new Map<string, SelectOption>();
    options.forEach((option) => {
        if (!option.value) return;
        deduped.set(option.value, option);
    });
    return Array.from(deduped.values());
}

export function serializeSelection(options: SelectOption[], isMulti: boolean): string {
    if (isMulti) {
        return options.map((option) => option.value).join(",");
    }
    return options[0]?.value ?? "";
}

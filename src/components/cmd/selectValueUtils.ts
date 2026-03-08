export type SelectOption = {
    label: string;
    value: string;
    aliases?: string[];
    subtext?: string;
    color?: string;
    icon?: string;
};

export function toPlainSelectOptions(values: readonly string[]): SelectOption[] {
    return values.map((value) => ({ label: value, value }));
}

export type SelectMatchReason =
    | "value-exact"
    | "label-exact"
    | "value-insensitive"
    | "label-insensitive"
    | "alias-exact"
    | "alias-insensitive"
    | "value-prefix-stripped"
    | "label-prefix-stripped"
    | "numeric";

export type SelectMatchResult = {
    token: string;
    normalizedToken: string;
    comparableToken: string;
    option: SelectOption | null;
    reason?: SelectMatchReason;
};

export type SelectResolution = {
    selection: SelectOption[];
    unmatchedTokens: string[];
    matchedTokens: SelectMatchResult[];
    appliedRules: string[];
};

const OPTIONAL_PREFIX_RE = /^[#/]+/;

export function normalizeSelectToken(token: string): string {
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

export function stripOptionalSelectPrefixes(token: string): string {
    return token.replace(OPTIONAL_PREFIX_RE, "");
}

export function toComparableSelectToken(token: string): string {
    return stripOptionalSelectPrefixes(normalizeSelectToken(token));
}

function extractAdditionalCandidates(token: string): string[] {
    const candidates = new Set<string>();

    const eqIndex = token.lastIndexOf("=");
    if (eqIndex >= 0 && eqIndex < token.length - 1) {
        candidates.add(token.slice(eqIndex + 1).trim());
    }

    return Array.from(candidates).filter(Boolean);
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
        .split(/[\n,]+/)
        .map(normalizeSelectToken)
        .filter((token) => token.length > 0);
}

export function resolveOptionMatch(token: string, options: SelectOption[]): SelectMatchResult {
    const normalizedToken = normalizeSelectToken(token);
    const comparableToken = stripOptionalSelectPrefixes(normalizedToken);
    const exactCandidates = Array.from(new Set([
        normalizedToken,
        comparableToken,
        ...extractAdditionalCandidates(normalizedToken),
        ...extractAdditionalCandidates(comparableToken),
    ].filter(Boolean)));

    for (const candidate of exactCandidates) {
        const byValue = options.find((option) => option.value === candidate);
        if (byValue) {
            return { token, normalizedToken, comparableToken, option: byValue, reason: candidate === normalizedToken ? "value-exact" : "value-prefix-stripped" };
        }

        const byLabel = options.find((option) => option.label === candidate);
        if (byLabel) {
            return { token, normalizedToken, comparableToken, option: byLabel, reason: candidate === normalizedToken ? "label-exact" : "label-prefix-stripped" };
        }

        const byAlias = options.find((option) => option.aliases?.includes(candidate));
        if (byAlias) {
            return { token, normalizedToken, comparableToken, option: byAlias, reason: "alias-exact" };
        }
    }

    for (const candidate of exactCandidates) {
        const lowerCandidate = candidate.toLowerCase();
        const byValueInsensitive = options.find((option) => option.value.toLowerCase() === lowerCandidate);
        if (byValueInsensitive) {
            return { token, normalizedToken, comparableToken, option: byValueInsensitive, reason: candidate === normalizedToken ? "value-insensitive" : "value-prefix-stripped" };
        }

        const byLabelInsensitive = options.find((option) => option.label.toLowerCase() === lowerCandidate);
        if (byLabelInsensitive) {
            return { token, normalizedToken, comparableToken, option: byLabelInsensitive, reason: candidate === normalizedToken ? "label-insensitive" : "label-prefix-stripped" };
        }

        const byAliasInsensitive = options.find((option) => option.aliases?.some((alias) => alias.toLowerCase() === lowerCandidate));
        if (byAliasInsensitive) {
            return { token, normalizedToken, comparableToken, option: byAliasInsensitive, reason: "alias-insensitive" };
        }
    }

    const byNumeric = resolveByNumericToken(comparableToken, options);
    if (byNumeric) {
        return { token, normalizedToken, comparableToken, option: byNumeric, reason: "numeric" };
    }

    return { token, normalizedToken, comparableToken, option: null };
}

function matchesPrefix(candidate: string, prefix: string): boolean {
    return candidate.toLowerCase().startsWith(prefix.toLowerCase());
}

export function filterSelectOptions(prefix: string, options: SelectOption[]): SelectOption[] {
    const normalizedPrefix = normalizeSelectToken(prefix);
    const comparablePrefix = stripOptionalSelectPrefixes(normalizedPrefix);
    const candidates = Array.from(new Set([
        normalizedPrefix,
        comparablePrefix,
        ...extractAdditionalCandidates(normalizedPrefix),
        ...extractAdditionalCandidates(comparablePrefix),
    ].filter(Boolean)));

    if (candidates.length === 0) {
        return options;
    }

    return options.filter((option) => {
        const haystacks = [
            option.value,
            option.label,
            ...(option.aliases ?? []),
        ].filter(Boolean);

        return candidates.some((candidate) => haystacks.some((haystack) => matchesPrefix(haystack, candidate)));
    });
}

export function resolveOptionForToken(token: string, options: SelectOption[]): SelectOption {
    const result = resolveOptionMatch(token, options);
    if (!result.normalizedToken) {
        return { label: "", value: "" };
    }
    return result.option ?? { label: result.normalizedToken, value: result.normalizedToken };
}

export function resolveSelectionInput(initialValue: string, options: SelectOption[], isMulti: boolean, baseSelection?: SelectOption[]): SelectResolution {
    const tokens = splitInitialValue(initialValue);
    const selection = isMulti ? [...(baseSelection ?? [])] : [];
    const unmatchedTokens: string[] = [];
    const matchedTokens: SelectMatchResult[] = [];
    const appliedRules: string[] = [];

    for (const rawToken of tokens) {
        const normalizedToken = normalizeSelectToken(rawToken);
        const comparableToken = stripOptionalSelectPrefixes(normalizedToken);
        if (!comparableToken) continue;

        if (isMulti && comparableToken === "*") {
            selection.splice(0, selection.length, ...options);
            appliedRules.push(`expanded '*' to all ${options.length} option(s)`);
            continue;
        }

        if (isMulti && comparableToken.startsWith("!")) {
            const negateTarget = comparableToken.slice(1).trim();
            if (!negateTarget) {
                unmatchedTokens.push(rawToken);
                continue;
            }
            if (selection.length === 0) {
                selection.push(...options);
                appliedRules.push(`started from all ${options.length} option(s) for negation`);
            }
            if (negateTarget === "*") {
                selection.splice(0, selection.length);
                appliedRules.push("cleared all options via '!*'");
                continue;
            }
            const match = resolveOptionMatch(negateTarget, options);
            matchedTokens.push({ ...match, token: rawToken });
            if (!match.option) {
                unmatchedTokens.push(rawToken);
                continue;
            }
            const filtered = selection.filter((option) => option.value !== match.option!.value);
            selection.splice(0, selection.length, ...filtered);
            appliedRules.push(`excluded ${match.option.value}`);
            continue;
        }

        const match = resolveOptionMatch(rawToken, options);
        matchedTokens.push(match);
        if (!match.option) {
            unmatchedTokens.push(rawToken);
            continue;
        }

        if (isMulti) {
            if (!selection.some((option) => option.value === match.option!.value)) {
                selection.push(match.option);
            }
        } else {
            selection.splice(0, selection.length, match.option);
        }
    }

    return {
        selection: isMulti ? dedupeByValue(selection) : selection.slice(0, 1),
        unmatchedTokens,
        matchedTokens,
        appliedRules,
    };
}

export function resolveInitialSelection(initialValue: string, options: SelectOption[], isMulti: boolean): SelectOption[] {
    const resolved = resolveSelectionInput(initialValue, options, isMulti).selection;

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

export function summarizeOptions(options: SelectOption[], limit: number = 10): string {
    if (options.length === 0) return "(no options)";
    const shown = options.slice(0, limit).map((option) => {
        const label = option.label || option.value;
        if (!option.value || option.value === label) {
            return label;
        }
        return `${label} [${option.value}]`;
    });
    return options.length > limit
        ? `${shown.join(", ")} ... (+${options.length - limit} more)`
        : shown.join(", ");
}

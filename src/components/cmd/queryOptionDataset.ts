import type { WebError, WebOptions } from "@/lib/apitypes";

import {
    filterSelectOptions,
    resolveOptionMatch,
    type SelectOption,
} from "./selectValueUtils";

type MentionKind = "user" | "channel" | "role";

type QueryAliasProfile = {
    backendPrefixes?: string[];
    parserPrefixes?: string[];
    urlTemplates?: string[];
    mention?: MentionKind;
};

type QueryOptionRow = {
    stringKey?: string;
    numericKey?: string;
    label: string;
    subtext?: string;
    color?: string;
    icon?: string;
};

export type QueryOptionDataset = {
    options: SelectOption[];
};

export type QueryOptionSearchResult = {
    options: SelectOption[];
    hasAnyMatch: boolean;
    hasExactMatch: boolean;
};

type CompositeCanonicalOption = {
    label: string;
    value: string;
    aliases: string[];
};

const QUERY_ALIAS_PROFILES: Record<string, QueryAliasProfile> = {
    DBAlliance: {
        backendPrefixes: ["AA:"],
        parserPrefixes: ["AA:"],
        urlTemplates: ["alliance/id={id}", "https://politicsandwar.com/alliance/id={id}"],
    },
    DBNation: {
        parserPrefixes: ["nation:"],
        urlTemplates: ["nation/id={id}", "https://politicsandwar.com/nation/id={id}"],
    },
    Guild: {
        parserPrefixes: ["guild:"],
    },
    GuildDB: {
        parserPrefixes: ["guild:"],
    },
    TaxBracket: {
        parserPrefixes: ["tax_id="],
        urlTemplates: ["tax_id={id}", "https://politicsandwar.com/index.php?id=15&tax_id={id}"],
    },
    DBWar: {
        parserPrefixes: ["war="],
        urlTemplates: ["war={id}", "https://politicsandwar.com/nation/war/timeline/war={id}"]
    },
    DBCity: {
        urlTemplates: ["city/id={id}", "https://politicsandwar.com/city/id={id}"],
    },
    TextChannel: {
        mention: "channel",
    },
    User: {
        mention: "user",
    },
    Role: {
        mention: "role",
    },
};

function normalizeField(value: string | number | undefined): string | undefined {
    if (value == null) {
        return undefined;
    }

    const normalized = `${value}`.trim();
    return normalized || undefined;
}

function splitStructuredSegments(value: string | undefined): string[] {
    if (!value) {
        return [];
    }

    return value
        .split(/\s*\|\s*|\r?\n+/)
        .map((segment) => segment.trim())
        .filter(Boolean);
}

function stripRepeatedLabelPrefix(label: string, subtext: string | undefined): string | undefined {
    if (!subtext) {
        return undefined;
    }

    const normalizedLabel = label.trim().toLowerCase();
    const normalizedSubtext = subtext.trim();
    if (!normalizedLabel || !normalizedSubtext) {
        return normalizedSubtext || undefined;
    }

    const lowerSubtext = normalizedSubtext.toLowerCase();
    if (lowerSubtext === normalizedLabel) {
        return undefined;
    }

    for (const separator of [" | ", " - ", ": ", " / "]) {
        const repeatedPrefix = `${normalizedLabel}${separator}`;
        if (lowerSubtext.startsWith(repeatedPrefix)) {
            return normalizedSubtext.slice(repeatedPrefix.length).trim() || undefined;
        }
    }

    return normalizedSubtext;
}

function stripPrefixes(value: string, prefixes: string[] | undefined): string[] {
    if (!value) {
        return [];
    }

    if (!prefixes || prefixes.length === 0) {
        return [value];
    }

    const stripped = new Set<string>([value]);
    for (const prefix of prefixes) {
        if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
            stripped.add(value.slice(prefix.length));
        }
    }

    return Array.from(stripped).filter(Boolean);
}

function addMentionAliases(aliases: Set<string>, kind: MentionKind, key: string, label: string): void {
    if (kind === "user") {
        if (/^\d+$/.test(key)) {
            aliases.add(`<@${key}>`);
            aliases.add(`<@!${key}>`);
        }
        if (label) {
            aliases.add(`@${label.replace(/^@+/, "")}`);
        }
        return;
    }

    if (kind === "channel") {
        if (/^\d+$/.test(key)) {
            aliases.add(`<#${key}>`);
        }
        if (label) {
            aliases.add(`#${label.replace(/^#+/, "")}`);
        }
        return;
    }

    if (/^\d+$/.test(key)) {
        aliases.add(`<@&${key}>`);
    }
    if (label) {
        aliases.add(`@${label.replace(/^@+/, "")}`);
    }
}

function getQueryAliasProfile(type: string): QueryAliasProfile | undefined {
    return QUERY_ALIAS_PROFILES[type];
}

function prefixCanonicalToken(value: string, prefix: string | undefined): string {
    if (!value || !prefix) {
        return value;
    }

    return value.toLowerCase().startsWith(prefix.toLowerCase()) ? value : `${prefix}${value}`;
}

export function getCanonicalQueryPrefix(type: string): string | undefined {
    const profile = getQueryAliasProfile(type);
    return profile?.parserPrefixes?.[0] ?? profile?.backendPrefixes?.[0];
}

export function toCompositeCanonicalOption(type: string, option: SelectOption): CompositeCanonicalOption {
    const prefix = getCanonicalQueryPrefix(type);
    if (!prefix) {
        return {
            label: option.label,
            value: option.value,
            aliases: option.aliases ?? [],
        };
    }

    const prefixedLabel = prefixCanonicalToken(option.label || option.value, prefix);
    const prefixedValue = prefixCanonicalToken(option.value, prefix);
    const aliases = new Set<string>(option.aliases ?? []);

    aliases.add(option.value);
    aliases.add(option.label);
    aliases.add(prefixedLabel);
    aliases.add(prefixedValue);

    return {
        label: prefixedLabel,
        value: prefixedValue,
        aliases: Array.from(aliases).filter(Boolean),
    };
}

export function getQueryOptionCount(payload: WebOptions | WebError | unknown): number {
    if (!payload || typeof payload !== "object" || "error" in (payload as Record<string, unknown>)) {
        return 0;
    }

    const options = payload as WebOptions;
    return Math.max(
        options.text?.length ?? 0,
        options.key_string?.length ?? 0,
        options.key_numeric?.length ?? 0,
        options.subtext?.length ?? 0,
        options.color?.length ?? 0,
        options.icon?.length ?? 0,
    );
}

function buildRows(options: WebOptions): QueryOptionRow[] {
    const maxLength = getQueryOptionCount(options);

    return Array.from({ length: maxLength }, (_, index) => {
        const stringKey = normalizeField(options.key_string?.[index]);
        const numericKey = normalizeField(options.key_numeric?.[index]);
        const label = normalizeField(options.text?.[index]) ?? stringKey ?? numericKey ?? "";

        return {
            stringKey,
            numericKey,
            label,
            subtext: stripRepeatedLabelPrefix(label, normalizeField(options.subtext?.[index])),
            color: normalizeField(options.color?.[index]),
            icon: normalizeField(options.icon?.[index]),
        } satisfies QueryOptionRow;
    });
}

function collectBaseAliases(row: QueryOptionRow): Set<string> {
    const aliases = new Set<string>();
    const baseFields = [row.stringKey, row.numericKey, row.label, row.subtext];

    for (const field of baseFields) {
        if (!field) {
            continue;
        }

        aliases.add(field);
        for (const segment of splitStructuredSegments(field)) {
            aliases.add(segment);
        }
    }

    return aliases;
}

function addProfileAliases(type: string, aliases: Set<string>, row: QueryOptionRow, value: string): void {
    const profile = getQueryAliasProfile(type);
    if (!profile) {
        return;
    }

    const strippedKeys = stripPrefixes(value, profile.backendPrefixes);
    for (const strippedKey of strippedKeys) {
        aliases.add(strippedKey);
    }

    const parserTargets = new Set<string>([
        row.label,
        row.subtext,
        ...strippedKeys,
    ].filter(Boolean) as string[]);

    for (const target of parserTargets) {
        for (const prefix of profile.parserPrefixes ?? []) {
            aliases.add(`${prefix}${target}`);
        }
    }

    const scalarTargets = new Set<string>([
        value,
        row.numericKey,
        row.label,
        row.subtext,
        ...strippedKeys,
        ...splitStructuredSegments(row.label),
        ...splitStructuredSegments(row.subtext),
    ].filter(Boolean) as string[]);

    for (const target of scalarTargets) {
        for (const template of profile.urlTemplates ?? []) {
            aliases.add(template.split("{id}").join(target));
        }
    }

    if (profile.mention) {
        addMentionAliases(aliases, profile.mention, strippedKeys[0] ?? value, row.label);
    }
}

export function buildQuerySelectOptions(type: string, options: WebOptions): SelectOption[] {
    return buildRows(options)
        .map((row) => {
            const value = row.stringKey ?? row.numericKey ?? row.label;
            const aliases = collectBaseAliases(row);

            addProfileAliases(type, aliases, row, value);
            aliases.delete(value);
            aliases.delete(row.label);

            return {
                label: row.label,
                value,
                aliases: Array.from(aliases).filter(Boolean),
                subtext: row.subtext,
                color: row.color,
                icon: row.icon,
            } satisfies SelectOption;
        })
        .filter((option) => option.value || option.label);
}

export function buildQueryOptionDataset(type: string, options: WebOptions): QueryOptionDataset {
    return {
        options: buildQuerySelectOptions(type, options),
    };
}

export function searchQueryOptionDataset(
    token: string,
    dataset: QueryOptionDataset,
    limit?: number,
): QueryOptionSearchResult {
    const options = dataset.options;
    const filtered = filterSelectOptions(token, options);
    const boundedOptions = limit == null ? filtered : filtered.slice(0, Math.max(1, limit));

    return {
        options: boundedOptions,
        hasAnyMatch: filtered.length > 0,
        hasExactMatch: resolveOptionMatch(token, options).option != null,
    };
}
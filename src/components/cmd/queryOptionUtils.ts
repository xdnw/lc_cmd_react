import { extractBackendError } from "@/lib/BulkQuery";
import type { WebError, WebOptions } from "@/lib/apitypes";
import type { SelectOption } from "./selectValueUtils";

type MentionKind = "user" | "channel" | "role";

type QueryAliasProfile = {
    backendPrefixes?: string[];
    parserPrefixes?: string[];
    urlTemplates?: string[];
    mention?: MentionKind;
};

export type QueryOptionsResolution = {
    options: SelectOption[];
    error?: string;
};

export type CompositeSourceResult = {
    type: string;
    options: SelectOption[];
    error?: string;
};

export type CombinedCompositeResult = {
    options: SelectOption[];
    blockingError?: string;
    warning?: string;
};

export type CompositeQueryState = {
    error: unknown;
    data?: {
        data?: WebOptions | WebError | null;
    };
};

type QueryOptionRow = {
    stringKey?: string;
    numericKey?: string;
    label: string;
    subtext?: string;
    color?: string;
    icon?: string;
};

const QUERY_ALIAS_PROFILES: Record<string, QueryAliasProfile> = {
    DBAlliance: {
        backendPrefixes: ["AA:"],
        parserPrefixes: ["AA:"],
        urlTemplates: ["alliance/id={id}", "https://politicsandwar.com/alliance/id={id}"],
    },
    DBNation: {
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
    if (value == null) return undefined;
    const normalized = `${value}`.trim();
    return normalized || undefined;
}

function splitStructuredSegments(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(/\s*\|\s*|\r?\n+/)
        .map((segment) => segment.trim())
        .filter(Boolean);
}

function stripPrefixes(value: string, prefixes: string[] | undefined): string[] {
    if (!value) return [];
    if (!prefixes || prefixes.length === 0) return [value];

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

function buildRows(options: WebOptions): QueryOptionRow[] {
    const maxLength = Math.max(
        options.text?.length ?? 0,
        options.key_string?.length ?? 0,
        options.key_numeric?.length ?? 0,
        options.subtext?.length ?? 0,
        options.color?.length ?? 0,
        options.icon?.length ?? 0,
    );

    return Array.from({ length: maxLength }, (_, index) => {
        const stringKey = normalizeField(options.key_string?.[index]);
        const numericKey = normalizeField(options.key_numeric?.[index]);
        const label = normalizeField(options.text?.[index]) ?? stringKey ?? numericKey ?? "";

        return {
            stringKey,
            numericKey,
            label,
            subtext: normalizeField(options.subtext?.[index]),
            color: normalizeField(options.color?.[index]),
            icon: normalizeField(options.icon?.[index]),
        };
    });
}

function collectBaseAliases(row: QueryOptionRow): Set<string> {
    const aliases = new Set<string>();
    const baseFields = [row.stringKey, row.numericKey, row.label, row.subtext];

    for (const field of baseFields) {
        if (!field) continue;
        aliases.add(field);
        for (const segment of splitStructuredSegments(field)) {
            aliases.add(segment);
        }
    }

    return aliases;
}

function addProfileAliases(type: string, aliases: Set<string>, row: QueryOptionRow, value: string): void {
    const profile = QUERY_ALIAS_PROFILES[type];
    if (!profile) return;

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

export function resolveQueryOptionsPayload(type: string, payload: WebOptions | WebError | unknown): QueryOptionsResolution {
    const error = extractBackendError(payload);
    if (error) {
        return { options: [], error };
    }

    if (!payload || typeof payload !== "object") {
        return { options: [], error: `Invalid input_options payload for ${type || "query"}` };
    }

    return { options: buildQuerySelectOptions(type, payload as WebOptions) };
}

export function toCompositeSourceResult(type: string, query: CompositeQueryState): CompositeSourceResult {
    if (query.error) {
        return {
            type,
            options: [],
            error: query.error instanceof Error ? query.error.message : String(query.error),
        };
    }

    const payload = query.data?.data;
    if (payload === undefined) {
        return {
            type,
            options: [],
            error: "No data returned by the backend.",
        };
    }

    const resolved = resolveQueryOptionsPayload(type, payload);
    return {
        type,
        options: resolved.options,
        error: resolved.error,
    };
}

export function combineCompositeSourceResults(results: CompositeSourceResult[]): CombinedCompositeResult {
    const errors: string[] = [];
    const options: SelectOption[] = [];

    results.forEach((result) => {
        if (result.error) {
            errors.push(result.type ? `${result.type}: ${result.error}` : result.error);
            return;
        }
        options.push(...result.options);
    });

    if (options.length === 0) {
        return {
            options,
            blockingError: errors.length > 0 ? errors.join(" | ") : undefined,
        };
    }

    return {
        options,
        warning: errors.length > 0 ? errors.join(" | ") : undefined,
    };
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

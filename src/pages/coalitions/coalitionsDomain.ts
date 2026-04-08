import type { WebCoalitionMember, WebCoalitions } from "@/lib/apitypes.d.ts";
import { getCanonicalQueryPrefix } from "@/components/cmd/queryOptionDataset";
import { COMMANDS } from "@/lib/commands";
import type { AnyCommandPath } from "@/utils/Command";

export type CoalitionRenameCommandPath = ["coalitions", "rename"];
type CoalitionKnownCommandPath = AnyCommandPath | CoalitionRenameCommandPath;

export const COALITION_GUILD_ID_THRESHOLD = 2_147_483_647;
export const COALITION_LIST_QUERY_ARGS = Object.freeze({}) satisfies Record<string, never>;

export const COALITION_COMMANDS = {
    list: ["coalition", "list"],
    create: ["coalition", "create"],
    add: ["coalition", "add"],
    remove: ["coalition", "remove"],
    delete: ["coalition", "delete"],
    generate: ["coalition", "generate"],
    sheet: ["coalition", "sheet"],
    rename: ["coalitions", "rename"],
} as const satisfies Record<string, CoalitionKnownCommandPath>;

export type CoalitionCommandPath = (typeof COALITION_COMMANDS)[keyof typeof COALITION_COMMANDS];
export type CoalitionMemberKind = "alliance" | "guild";
export type CoalitionMemberTokenValue = "canonical" | "id" | "name";
export type CoalitionCopyMode = "ids" | "names";
export type CoalitionCopyNameMode = "flat" | "named";

export type CoalitionCopyRow = {
    coalitionName: string;
    tokens: string[];
    skippedCount: number;
};

export type CoalitionCopyOutput = {
    rows: CoalitionCopyRow[];
    output: string;
    tokenCount: number;
    coalitionCount: number;
    skippedCount: number;
};

export function coerceCoalitionCommandPath(path: CoalitionCommandPath): AnyCommandPath {
    return path as unknown as AnyCommandPath;
}

export type CoalitionMemberQueryMatch = {
    name: boolean;
    id: boolean;
    kind: boolean;
    any: boolean;
};

export type CoalitionMemberRecord = {
    key: string;
    id: number;
    name: string;
    deleted: boolean;
    kind: CoalitionMemberKind;
    kindLabel: "Alliance" | "Guild";
    displayToken: string;
    idText?: string;
    isSafeId: boolean;
};

export type CoalitionRecord = {
    key: string;
    name: string;
    description?: string;
    members: CoalitionMemberRecord[];
    allianceMembers: CoalitionMemberRecord[];
    guildMembers: CoalitionMemberRecord[];
    totalMembers: number;
    activeMembers: number;
    deletedMembers: number;
};

export type CoalitionViewRecord = CoalitionRecord & {
    visibleMembers: CoalitionMemberRecord[];
    visibleAllianceMembers: CoalitionMemberRecord[];
    visibleGuildMembers: CoalitionMemberRecord[];
    visibleTotalMembers: number;
};

type CoalitionWithOptionalDescription = WebCoalitions["coalitions"][number] & {
    description?: string;
};

type KnownCoalitionDefault = {
    name: string;
    description?: string;
};

const coalitionOptionConfig = COMMANDS.options.Coalition;
const KNOWN_COALITION_DEFAULTS = Object.freeze(
    typeof coalitionOptionConfig === "string"
        ? []
        : Array.from(coalitionOptionConfig.options.reduce((defaults, option, index) => {
            const name = option.trim();
            if (!name) {
                return defaults;
            }

            const key = name.toLowerCase();
            const description = normalizeCoalitionDescription(coalitionOptionConfig.subtext?.[index]);
            const existing = defaults.get(key);

            if (!existing) {
                defaults.set(key, { name, description });
                return defaults;
            }

            if (description && !existing.description) {
                defaults.set(key, { ...existing, description });
            }

            return defaults;
        }, new Map<string, KnownCoalitionDefault>()).values()),
);
const KNOWN_COALITION_DEFAULT_NAMES = new Set(KNOWN_COALITION_DEFAULTS.map((coalition) => coalition.name.toLowerCase()));
const KNOWN_COALITION_DESCRIPTIONS = new Map<string, string>(
    KNOWN_COALITION_DEFAULTS.flatMap((coalition) => {
        return coalition.description ? [[coalition.name.toLowerCase(), coalition.description] as const] : [];
    }),
);

function normalizeCoalitionName(name: string | undefined): string {
    const normalized = name?.trim();
    return normalized || "Unnamed coalition";
}

function normalizeCoalitionDescription(description: string | undefined): string | undefined {
    const normalized = description?.trim();
    return normalized || undefined;
}

function getKnownCoalitionDescription(name: string): string | undefined {
    return KNOWN_COALITION_DESCRIPTIONS.get(name.trim().toLowerCase());
}

function isKnownCoalitionDefaultName(name: string): boolean {
    return KNOWN_COALITION_DEFAULT_NAMES.has(name.trim().toLowerCase());
}

function resolveCoalitionDescription(coalition: CoalitionWithOptionalDescription, normalizedName: string): string | undefined {
    return normalizeCoalitionDescription(coalition.description) ?? getKnownCoalitionDescription(normalizedName);
}

function isPositiveFiniteNumber(value: number): boolean {
    return Number.isFinite(value) && value > 0;
}

function formatSafeId(id: number, isSafeId: boolean): string | undefined {
    if (!isSafeId || !isPositiveFiniteNumber(id)) {
        return undefined;
    }

    return String(Math.trunc(id));
}

function getCoalitionMemberQueryType(kind: CoalitionMemberKind): "DBAlliance" | "GuildDB" {
    return kind === "guild" ? "GuildDB" : "DBAlliance";
}

function qualifyCoalitionMemberValue(kind: CoalitionMemberKind, value: string): string {
    if (!value) {
        return "";
    }

    const prefix = getCanonicalQueryPrefix(getCoalitionMemberQueryType(kind));
    if (!prefix) {
        return value;
    }

    return value.toLowerCase().startsWith(prefix.toLowerCase()) ? value : `${prefix}${value}`;
}

function getCoalitionMemberRawValue(member: Pick<CoalitionMemberRecord, "idText" | "name">, value: CoalitionMemberTokenValue): string {
    switch (value) {
        case "id":
            return member.idText ?? "";
        case "name":
            return member.name;
        case "canonical":
        default:
            return member.idText ?? member.name;
    }
}

export function formatCoalitionMemberToken(
    member: Pick<CoalitionMemberRecord, "kind" | "idText" | "name">,
    options: { value?: CoalitionMemberTokenValue; qualified?: boolean } = {},
): string {
    const rawValue = getCoalitionMemberRawValue(member, options.value ?? "canonical");
    if (!rawValue) {
        return "";
    }

    if (options.qualified === false) {
        return rawValue;
    }

    return qualifyCoalitionMemberValue(member.kind, rawValue);
}

export function getCoalitionMemberKind(id: number): CoalitionMemberKind {
    return Number.isFinite(id) && id > COALITION_GUILD_ID_THRESHOLD ? "guild" : "alliance";
}

export function toCoalitionMemberRecord(member: WebCoalitionMember, index = 0): CoalitionMemberRecord {
    const id = Number(member.id);
    const isSafeId = Number.isSafeInteger(id);
    const idText = formatSafeId(id, isSafeId);
    const name = normalizeCoalitionName(member.name);
    const kind = getCoalitionMemberKind(id);
    const displayToken = formatCoalitionMemberToken({ kind, idText, name });

    return {
        key: `${kind}:${displayToken || name}:${index}`,
        id,
        name,
        deleted: Boolean(member.deleted),
        kind,
        kindLabel: kind === "guild" ? "Guild" : "Alliance",
        displayToken,
        idText,
        isSafeId,
    };
}

export function normalizeCoalitions(data: WebCoalitions | undefined): CoalitionRecord[] {
    const coalitions = Array.isArray(data?.coalitions) ? data.coalitions as CoalitionWithOptionalDescription[] : null;
    if (!coalitions) {
        return [];
    }

    const normalizedCoalitions = coalitions
        .map((coalition, coalitionIndex) => {
            const name = normalizeCoalitionName(coalition.name);
            const description = resolveCoalitionDescription(coalition, name);
            const members = Array.isArray(coalition.members)
                ? coalition.members.map((member, memberIndex) => toCoalitionMemberRecord(member, memberIndex))
                : [];
            const allianceMembers = members.filter((member) => member.kind === "alliance");
            const guildMembers = members.filter((member) => member.kind === "guild");
            const deletedMembers = members.filter((member) => member.deleted).length;

            return {
                key: `coalition:${coalitionIndex}`,
                name,
                description,
                members,
                allianceMembers,
                guildMembers,
                totalMembers: members.length,
                activeMembers: members.length - deletedMembers,
                deletedMembers,
            } satisfies CoalitionRecord;
        });

    const knownCoalitionNames = new Set(normalizedCoalitions.map((coalition) => coalition.name.toLowerCase()));
    const missingDefaultCoalitions = KNOWN_COALITION_DEFAULTS.flatMap((coalition) => {
        if (knownCoalitionNames.has(coalition.name.toLowerCase())) {
            return [];
        }

        return [{
            key: `coalition:known:${coalition.name.toLowerCase()}`,
            name: coalition.name,
            description: coalition.description,
            members: [],
            allianceMembers: [],
            guildMembers: [],
            totalMembers: 0,
            activeMembers: 0,
            deletedMembers: 0,
        } satisfies CoalitionRecord];
    });

    return [
        ...normalizedCoalitions
            .filter((coalition) => !isKnownCoalitionDefaultName(coalition.name))
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })),
        ...normalizedCoalitions.filter((coalition) => isKnownCoalitionDefaultName(coalition.name)),
        ...missingDefaultCoalitions,
    ];
}

export function getCoalitionMemberQueryMatch(member: CoalitionMemberRecord, query: string): CoalitionMemberQueryMatch {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return {
            name: false,
            id: false,
            kind: false,
            any: false,
        };
    }

    const name = member.name.toLowerCase().includes(normalizedQuery);
    const id = (member.idText ?? "").toLowerCase().includes(normalizedQuery);
    const kind = member.kind.toLowerCase().includes(normalizedQuery)
        || member.kindLabel.toLowerCase().includes(normalizedQuery);

    return {
        name,
        id,
        kind,
        any: name || id || kind,
    };
}

export function filterCoalitions(
    coalitions: CoalitionRecord[],
    options: { query: string; memberVisibility: "active" | "all" | "deleted" },
): CoalitionViewRecord[] {
    const normalizedQuery = options.query.trim().toLowerCase();

    return coalitions.flatMap((coalition) => {
        const scopedMembers = options.memberVisibility === "all"
            ? coalition.members
            : options.memberVisibility === "deleted"
                ? coalition.members.filter((member) => member.deleted)
                : coalition.members.filter((member) => !member.deleted);

        const coalitionNameMatches = !normalizedQuery || coalition.name.toLowerCase().includes(normalizedQuery);
        const matchingMembers = normalizedQuery
            ? scopedMembers.filter((member) => getCoalitionMemberQueryMatch(member, normalizedQuery).any)
            : scopedMembers;

        if (!coalitionNameMatches && matchingMembers.length === 0) {
            return [];
        }

        const visibleMembers = coalitionNameMatches ? scopedMembers : matchingMembers;

        const visibleAllianceMembers = visibleMembers.filter((member) => member.kind === "alliance");
        const visibleGuildMembers = visibleMembers.filter((member) => member.kind === "guild");

        return [{
            ...coalition,
            visibleMembers,
            visibleAllianceMembers,
            visibleGuildMembers,
            visibleTotalMembers: visibleMembers.length,
        } satisfies CoalitionViewRecord];
    });
}

export function buildCoalitionCopyOutput(
    coalitions: readonly Pick<CoalitionViewRecord, "name" | "visibleMembers">[],
    options: {
        mode: CoalitionCopyMode;
        qualified?: boolean;
        nameMode?: CoalitionCopyNameMode;
    },
): CoalitionCopyOutput {
    const tokenValue = options.mode === "ids" ? "id" : "name";
    const qualified = options.qualified ?? true;
    const includeCoalitionNames = (options.nameMode ?? "flat") === "named";

    const allRows = coalitions.map((coalition) => {
        const rawTokens = coalition.visibleMembers
            .map((member) => formatCoalitionMemberToken(member, { value: tokenValue, qualified }))
            .filter(Boolean);

        return {
            coalitionName: coalition.name,
            tokens: Array.from(new Set(rawTokens)),
            skippedCount: coalition.visibleMembers.length - rawTokens.length,
        } satisfies CoalitionCopyRow;
    });

    const rows = allRows.filter((row) => row.tokens.length > 0);

    const tokenList = includeCoalitionNames
        ? rows.flatMap((row) => row.tokens)
        : Array.from(new Set(rows.flatMap((row) => row.tokens)));

    return {
        rows,
        output: includeCoalitionNames
            ? rows.map((row) => `${row.coalitionName}: ${row.tokens.join(",")}`).join("\n")
            : tokenList.join(","),
        tokenCount: tokenList.length,
        coalitionCount: rows.length,
        skippedCount: allRows.reduce((sum, row) => sum + row.skippedCount, 0),
    };
}

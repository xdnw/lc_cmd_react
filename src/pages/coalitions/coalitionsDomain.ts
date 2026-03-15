import type { WebCoalitionMember, WebCoalitions } from "@/lib/apitypes.d.ts";
import type { AnyCommandPath } from "@/utils/Command";

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
} as const satisfies Record<string, AnyCommandPath>;

export type CoalitionCommandPath = (typeof COALITION_COMMANDS)[keyof typeof COALITION_COMMANDS];
export type CoalitionMemberKind = "alliance" | "guild";

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

function normalizeCoalitionName(name: string | undefined): string {
    const normalized = name?.trim();
    return normalized || "Unnamed coalition";
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

function buildAllianceToken(name: string, idText: string | undefined): string {
    if (idText) {
        return `AA:${idText}`;
    }

    return name ? `AA:${name}` : "";
}

function buildGuildToken(name: string, idText: string | undefined): string {
    if (idText) {
        return `guild:${idText}`;
    }

    // Guild ids can exceed JS's safe integer range, so fall back to the canonical
    // name prefix when the numeric id is not precise enough to round-trip safely.
    return name ? `guild:${name}` : "";
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
    const displayToken = kind === "guild"
        ? buildGuildToken(name, idText)
        : buildAllianceToken(name, idText);

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
    const coalitions = Array.isArray(data?.coalitions) ? data.coalitions : [];

    return coalitions
        .map((coalition, coalitionIndex) => {
            const name = normalizeCoalitionName(coalition.name);
            const members = Array.isArray(coalition.members)
                ? coalition.members.map((member, memberIndex) => toCoalitionMemberRecord(member, memberIndex))
                : [];
            const allianceMembers = members.filter((member) => member.kind === "alliance");
            const guildMembers = members.filter((member) => member.kind === "guild");
            const deletedMembers = members.filter((member) => member.deleted).length;

            return {
                key: `${name}:${coalitionIndex}`,
                name,
                members,
                allianceMembers,
                guildMembers,
                totalMembers: members.length,
                activeMembers: members.length - deletedMembers,
                deletedMembers,
            } satisfies CoalitionRecord;
        })
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
}

function matchesCoalitionQuery(coalition: CoalitionRecord, visibleMembers: CoalitionMemberRecord[], normalizedQuery: string): boolean {
    if (!normalizedQuery) {
        return true;
    }

    if (coalition.name.toLowerCase().includes(normalizedQuery)) {
        return true;
    }

    return visibleMembers.some((member) => {
        if (member.name.toLowerCase().includes(normalizedQuery)) {
            return true;
        }

        if ((member.idText ?? "").toLowerCase().includes(normalizedQuery)) {
            return true;
        }

        return member.kind.toLowerCase().includes(normalizedQuery);
    });
}

export function filterCoalitions(
    coalitions: CoalitionRecord[],
    options: { query: string; showDeletedMembers: boolean },
): CoalitionViewRecord[] {
    const normalizedQuery = options.query.trim().toLowerCase();

    return coalitions.flatMap((coalition) => {
        const visibleMembers = options.showDeletedMembers
            ? coalition.members
            : coalition.members.filter((member) => !member.deleted);

        if (!matchesCoalitionQuery(coalition, visibleMembers, normalizedQuery)) {
            return [];
        }

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

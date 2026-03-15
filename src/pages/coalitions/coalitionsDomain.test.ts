import { describe, expect, it } from "vitest";

import {
    COALITION_GUILD_ID_THRESHOLD,
    filterCoalitions,
    formatCoalitionMemberToken,
    getCoalitionMemberKind,
    normalizeCoalitions,
    toCoalitionMemberRecord,
} from "./coalitionsDomain";

describe("coalitionsDomain", () => {
    it("classifies members by id threshold", () => {
        expect(getCoalitionMemberKind(99)).toBe("alliance");
        expect(getCoalitionMemberKind(COALITION_GUILD_ID_THRESHOLD + 1)).toBe("guild");

        const allianceMember = toCoalitionMemberRecord({
            id: 77,
            name: "Aurora",
            deleted: false,
        });
        const guildMember = toCoalitionMemberRecord({
            id: COALITION_GUILD_ID_THRESHOLD + 10,
            name: "Nightglass",
            deleted: false,
        });

        expect(allianceMember.kind).toBe("alliance");
        expect(allianceMember.displayToken).toBe("AA:77");
        expect(guildMember.kind).toBe("guild");
        expect(guildMember.displayToken).toBe(`guild:${COALITION_GUILD_ID_THRESHOLD + 10}`);
    });

    it("falls back to a guild-prefixed name token when the guild id is not JS-safe", () => {
        const guildMember = toCoalitionMemberRecord({
            id: Number.MAX_SAFE_INTEGER + 100,
            name: "Northline Reserve",
            deleted: false,
        });

        expect(guildMember.kind).toBe("guild");
        expect(guildMember.isSafeId).toBe(false);
        expect(guildMember.displayToken).toBe("guild:Northline Reserve");
        expect(guildMember.idText).toBeUndefined();
    });

    it("formats coalition member copy tokens with shared canonical prefixes", () => {
        const allianceMember = toCoalitionMemberRecord({
            id: 790,
            name: "Aurora",
            deleted: false,
        });
        const unsafeGuildMember = toCoalitionMemberRecord({
            id: Number.MAX_SAFE_INTEGER + 100,
            name: "Northline Reserve",
            deleted: false,
        });

        expect(formatCoalitionMemberToken(allianceMember)).toBe("AA:790");
        expect(formatCoalitionMemberToken(allianceMember, { value: "id", qualified: false })).toBe("790");
        expect(formatCoalitionMemberToken(allianceMember, { value: "name" })).toBe("AA:Aurora");
        expect(formatCoalitionMemberToken(unsafeGuildMember, { value: "id" })).toBe("");
        expect(formatCoalitionMemberToken(unsafeGuildMember, { value: "name" })).toBe("guild:Northline Reserve");
        expect(formatCoalitionMemberToken(unsafeGuildMember, { value: "name", qualified: false })).toBe("Northline Reserve");
    });

    it("filters deleted members locally while keeping coalition search usable", () => {
        const coalitions = normalizeCoalitions({
            coalitions: [{
                name: "Aurora Watch",
                members: [
                    { id: 10, name: "Rose", deleted: false },
                    { id: COALITION_GUILD_ID_THRESHOLD + 2, name: "Nightglass", deleted: true },
                ],
            }],
        });

        const hiddenDeleted = filterCoalitions(coalitions, {
            query: "rose",
            memberVisibility: "active",
        });
        const shownDeleted = filterCoalitions(coalitions, {
            query: "nightglass",
            memberVisibility: "all",
        });
        const matchedMembersOnly = filterCoalitions(coalitions, {
            query: "rose",
            memberVisibility: "all",
        });

        expect(hiddenDeleted).toHaveLength(1);
        expect(hiddenDeleted[0]?.visibleMembers.map((member) => member.name)).toEqual(["Rose"]);
        expect(shownDeleted).toHaveLength(1);
        expect(shownDeleted[0]?.visibleGuildMembers.map((member) => member.name)).toEqual(["Nightglass"]);
        expect(matchedMembersOnly).toHaveLength(1);
        expect(matchedMembersOnly[0]?.visibleMembers.map((member) => member.name)).toEqual(["Rose"]);
    });
});

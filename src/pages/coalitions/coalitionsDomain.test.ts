import { describe, expect, it } from "vitest";

import {
    buildCoalitionCopyOutput,
    COALITION_COMMANDS,
    COALITION_GUILD_ID_THRESHOLD,
    filterCoalitions,
    formatCoalitionMemberToken,
    getCoalitionMemberQueryMatch,
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

    it("keeps coalition keys stable across local rename refreshes", () => {
        const beforeRename = normalizeCoalitions({
            coalitions: [{
                name: "Old Banner",
                members: [],
            }],
        });
        const afterRename = normalizeCoalitions({
            coalitions: [{
                name: "New Banner",
                members: [],
            }],
        });

        const beforeCoalition = beforeRename.find((coalition) => coalition.name === "Old Banner");
        const afterCoalition = afterRename.find((coalition) => coalition.name === "New Banner");

        expect(beforeCoalition?.key).toBe("coalition:0");
        expect(afterCoalition?.key).toBe(beforeCoalition?.key);
        expect(afterCoalition?.name).toBe("New Banner");
    });

    it("adds built-in coalition descriptions when a known coalition name matches", () => {
        const coalitions = normalizeCoalitions({
            coalitions: [
                {
                    name: "DNR",
                    members: [],
                },
                {
                    name: "Custom Desk",
                    members: [],
                },
            ],
        });

        expect(coalitions.find((coalition) => coalition.name === "DNR")?.description)
            .toBe("Alliances to inclide members and applicants in the Do Not Raid list");
        expect(coalitions.find((coalition) => coalition.name === "Custom Desk")?.description).toBeUndefined();
    });

    it("lists missing built-in coalition defaults after real coalitions", () => {
        const coalitions = normalizeCoalitions({
            coalitions: [{
                name: "Zulu Desk",
                members: [],
            }, {
                name: "DNR",
                members: [],
            }],
        });

        expect(coalitions[0]?.name).toBe("Zulu Desk");
        expect(coalitions[1]?.name).toBe("DNR");
        expect(coalitions.find((coalition) => coalition.name === "DNR")?.description)
            .toBe("Alliances to inclide members and applicants in the Do Not Raid list");
        expect(coalitions.find((coalition) => coalition.name === "ALLIES")?.totalMembers).toBe(0);
    });

    it("reports whether a member matched by name, id, or kind", () => {
        const guildMember = toCoalitionMemberRecord({
            id: COALITION_GUILD_ID_THRESHOLD + 25,
            name: "Nightglass",
            deleted: false,
        });

        expect(getCoalitionMemberQueryMatch(guildMember, "night")).toMatchObject({
            name: true,
            id: false,
            kind: false,
            any: true,
        });
        expect(getCoalitionMemberQueryMatch(guildMember, String(COALITION_GUILD_ID_THRESHOLD + 25))).toMatchObject({
            name: false,
            id: true,
            kind: false,
            any: true,
        });
        expect(getCoalitionMemberQueryMatch(guildMember, "guild")).toMatchObject({
            name: false,
            id: false,
            kind: true,
            any: true,
        });
    });

    it("exposes the coalition rename command path", () => {
        expect(COALITION_COMMANDS.rename).toEqual(["coalitions", "rename"]);
    });

    it("builds flat coalition copy output with deduped tokens and skip counts", () => {
        const coalitions = filterCoalitions(normalizeCoalitions({
            coalitions: [
                {
                    name: "Aurora Watch",
                    members: [
                        { id: 12, name: "Rose", deleted: false },
                        { id: 12, name: "Rose", deleted: false },
                    ],
                },
                {
                    name: "Nightglass",
                    members: [
                        { id: Number.MAX_SAFE_INTEGER + 100, name: "Nightglass Reserve", deleted: false },
                    ],
                },
            ],
        }), {
            query: "",
            memberVisibility: "all",
        });

        const output = buildCoalitionCopyOutput(coalitions, {
            mode: "ids",
            qualified: false,
            nameMode: "flat",
        });

        expect(output.output).toBe("12");
        expect(output.tokenCount).toBe(1);
        expect(output.coalitionCount).toBe(1);
        expect(output.skippedCount).toBe(1);
    });

    it("builds named coalition copy output without cross-coalition flattening", () => {
        const coalitions = filterCoalitions(normalizeCoalitions({
            coalitions: [
                {
                    name: "Aurora Watch",
                    members: [
                        { id: 12, name: "Rose", deleted: false },
                    ],
                },
                {
                    name: "Nightglass",
                    members: [
                        { id: COALITION_GUILD_ID_THRESHOLD + 5, name: "Nightglass", deleted: false },
                    ],
                },
            ],
        }), {
            query: "",
            memberVisibility: "all",
        });

        const output = buildCoalitionCopyOutput(coalitions, {
            mode: "names",
            qualified: true,
            nameMode: "named",
        });

        expect(output.output).toBe(["Aurora Watch: AA:Rose", "Nightglass: guild:Nightglass"].join("\n"));
        expect(output.tokenCount).toBe(2);
        expect(output.coalitionCount).toBe(2);
        expect(output.skippedCount).toBe(0);
    });

    it("uses compact comma delimiters in copied coalition output", () => {
        const coalitions = filterCoalitions(normalizeCoalitions({
            coalitions: [
                {
                    name: "Aurora Watch",
                    members: [
                        { id: 12, name: "Rose", deleted: false },
                        { id: 13, name: "Lily", deleted: false },
                    ],
                },
                {
                    name: "Nightglass",
                    members: [
                        { id: 14, name: "Iris", deleted: false },
                    ],
                },
            ],
        }), {
            query: "",
            memberVisibility: "all",
        });

        const flatOutput = buildCoalitionCopyOutput(coalitions, {
            mode: "ids",
            qualified: false,
            nameMode: "flat",
        });
        const namedOutput = buildCoalitionCopyOutput(coalitions.filter((coalition) => coalition.name === "Aurora Watch"), {
            mode: "names",
            qualified: true,
            nameMode: "named",
        });

        expect(flatOutput.output).toBe("12,13,14");
        expect(namedOutput.output).toBe("Aurora Watch: AA:Rose,AA:Lily");
    });
});

import { describe, expect, it } from "vitest";

import type { AutoRoleBulkResult, WebAutoRoleRoles, WebRoleAliases } from "@/lib/apitypes";

import {
    AUTO_ROLE_SETTING_KEYS,
    LOCUTUS_ROLE_OPTIONS,
    buildRoleAliasEntries,
    formatAliasScopeLabel,
    formatAllianceLabel,
    formatAutoRoleIssueType,
    formatCityRoleRangeLabel,
    formatDiscordRoleName,
    formatDiscordRoleLabel,
    formatTaxRoleRateLabel,
    formatUnmaskedReason,
    getAutoRoleMemberDisplayName,
    getRoleMention,
    summarizeAutoRoleBulkResult,
    summarizeManagedRoles,
    summarizeRoleAliases,
} from "./rolesDomain";

type AutoRoleManagedRoles = WebAutoRoleRoles;

describe("rolesDomain", () => {
    it("keeps the AUTO_ROLE settings subset strongly typed and stable", () => {
        expect(AUTO_ROLE_SETTING_KEYS).toEqual([
            "AUTONICK",
            "AUTOROLE_ALLIANCES",
            "AUTOROLE_ALLIANCE_RANK",
            "AUTOROLE_ALLY_GOV",
            "AUTOROLE_ALLY_ROLES",
            "AUTOROLE_MEMBER_APPS",
            "AUTOROLE_TOP_X",
            "CONDITIONAL_ROLES",
        ]);
    });

    it("builds alias entries for known and unknown role ordinals", () => {
        const aliases: WebRoleAliases = {
            mappings: {
                "0": { "0": 101 },
                "3": { "123": 303 },
                "99": { "0": 909 },
            },
            invalid_role_ordinals: [3],
            discord_role_names: {
                "101": "Registered",
                "303": "Milcom",
                "909": "Legacy",
            },
        };

        const entries = buildRoleAliasEntries(aliases);
        const registeredEntry = entries.find((entry) => entry.ordinal === 0);
        const milcomEntry = entries.find((entry) => entry.ordinal === 3);
        const unknownEntry = entries.find((entry) => entry.ordinal === 99);

        expect(registeredEntry).toMatchObject({
            roleName: LOCUTUS_ROLE_OPTIONS[0],
            mappingCount: 1,
            isInvalid: false,
        });
        expect(registeredEntry?.mappings[0]).toMatchObject({
            scopeLabel: "Global",
            roleId: "101",
            discordRoleName: "Registered",
        });

        expect(milcomEntry).toMatchObject({
            roleName: LOCUTUS_ROLE_OPTIONS[3],
            isInvalid: true,
            hasAllianceSpecificMappings: true,
        });
        expect(milcomEntry?.mappings[0]).toMatchObject({
            allianceId: 123,
            scopeLabel: "AA:123",
            discordRoleName: "Milcom",
        });

        expect(unknownEntry).toMatchObject({
            roleName: "Role #99",
            isKnownRole: false,
        });
    });

    it("summarizes alias coverage and managed-role counts", () => {
        const aliases = buildRoleAliasEntries({
            mappings: {
                "0": { "0": 101 },
                "5": { "321": 505, "0": 506 },
            },
            invalid_role_ordinals: [5],
            discord_role_names: {},
        } satisfies WebRoleAliases);

        const aliasSummary = summarizeRoleAliases(aliases);
        expect(aliasSummary).toMatchObject({
            mappedRoles: 2,
            invalidRoles: 1,
            totalMappings: 3,
            allianceScopedMappings: 1,
        });

        const managedRoles: AutoRoleManagedRoles = {
            alliance_roles: [
                { role_id: 1, name: "Alliance One", color: 0, alliance_id: 10, duplicate_key: false },
                { role_id: 2, name: "Alliance Two", color: 0, alliance_id: 11, duplicate_key: true },
            ],
            city_roles: [
                { role_id: 3, name: "City Role", color: 0, range_start: 5, range_end: 9, duplicate_key: false },
            ],
            tax_roles: [
                { role_id: 4, name: "Tax Role", color: 0, money_rate: 50, rss_rate: 50, duplicate_key: true },
            ],
        };

        expect(summarizeManagedRoles(managedRoles)).toEqual({
            total: 4,
            allianceRoles: 2,
            cityRoles: 1,
            taxRoles: 1,
            duplicateKeys: 2,
        });
    });

    it("formats issue, reason, and role labels for UI output", () => {
        expect(formatAutoRoleIssueType("MISSING_REGISTERED_ROLE_MAPPING")).toBe("Missing Registered Role Mapping");
        expect(formatUnmaskedReason("NOT_IN_ALLIANCE")).toBe("Not In Alliance");
        expect(formatDiscordRoleName("15", { "15": "Registered" })).toBe("@Registered");
        expect(formatDiscordRoleLabel("15", { "15": "Registered" })).toBe("@Registered (15)");
        expect(formatDiscordRoleLabel("16", {})).toBe("Role #16");
        expect(getRoleMention("15")).toBe("<@&15>");
        expect(formatAllianceLabel(77, { "77": "Aurora" })).toBe("Aurora");
        expect(formatAllianceLabel(78, {})).toBe("AA:78");
        expect(formatAliasScopeLabel({ allianceId: 77, scopeLabel: "AA:77" }, { "77": "Aurora" })).toBe("Aurora");
        expect(formatCityRoleRangeLabel(1, 10)).toBe("c1-10");
        expect(formatCityRoleRangeLabel(5, 0)).toBe("c5+");
        expect(formatCityRoleRangeLabel(1, 2147483647)).toBe("c1+");
        expect(formatTaxRoleRateLabel(10, 10)).toBe("10/10");
    });

    it("builds grouped bulk autorole summaries by category instead of per-member cards", () => {
        const result: AutoRoleBulkResult = {
            role_names: {
                "10": "Registered",
                "20": "Applicant",
            },
            create_roles: [],
            rename_roles: {},
            created_roles: [],
            renamed_roles: {},
            execution_issues: [
                { type: "CREATE_ROLE_FAILED", detail: "Could not create Registered" },
                { type: "CREATE_ROLE_FAILED", detail: "Discord rejected request" },
            ],
            results: [
                {
                    user_id: 1,
                    username: "alpha",
                    display_name: "Alpha",
                    nation_id: 101,
                    alliance_id: 501,
                    create_roles: [],
                    add_roles: [10],
                    remove_roles: [20],
                    nickname: "Alpha | AA",
                    clear_nickname: false,
                    issues: [
                        { type: "NOT_REGISTERED", detail: "Missing registration" },
                        { type: "ADD_ROLE_FAILED", role_id: 10, detail: "Discord denied add" },
                    ],
                    added_roles: [],
                    removed_roles: [],
                    applied_nickname: undefined,
                    cleared_nickname: false,
                    execution_issues: [{ type: "ADD_ROLE_FAILED", role_id: 10, detail: "Discord denied add" }],
                },
                {
                    user_id: 2,
                    username: "beta",
                    display_name: "",
                    nation_id: 102,
                    alliance_id: 501,
                    create_roles: [],
                    add_roles: [10],
                    remove_roles: [],
                    nickname: "Alpha | AA",
                    clear_nickname: true,
                    issues: [{ type: "NOT_REGISTERED", detail: "Missing registration" }],
                    added_roles: [10],
                    removed_roles: [20],
                    applied_nickname: "Alpha | AA",
                    cleared_nickname: false,
                    execution_issues: [],
                },
                {
                    user_id: 3,
                    username: "gamma",
                    display_name: "Gamma",
                    nation_id: undefined,
                    alliance_id: undefined,
                    create_roles: [],
                    add_roles: [],
                    remove_roles: [20],
                    nickname: undefined,
                    clear_nickname: false,
                    issues: [],
                    added_roles: [],
                    removed_roles: [],
                    applied_nickname: undefined,
                    cleared_nickname: true,
                    execution_issues: [{ type: "REMOVE_ROLE_FAILED", role_id: 20, detail: "Role missing" }],
                },
            ],
            masked_non_members: [
                {
                    user_id: 4,
                    username: "delta",
                    display_name: "Delta",
                    nation_id: 103,
                    reason: "NOT_IN_ALLIANCE",
                },
                {
                    user_id: 5,
                    username: "epsilon",
                    display_name: "",
                    nation_id: undefined,
                    reason: "NOT_IN_ALLIANCE",
                },
            ],
            sync: undefined,
        };

        const summary = summarizeAutoRoleBulkResult(result);

        expect(summary.plannedAdds).toHaveLength(1);
        expect(summary.plannedAdds[0]).toMatchObject({ roleId: 10 });
        expect(summary.plannedAdds[0]?.members.map((member) => member.userId)).toEqual([1, 2]);

        expect(summary.plannedRemovals[0]?.members.map((member) => member.userId)).toEqual([1, 3]);
        expect(summary.plannedNicknames[0]).toMatchObject({ nickname: "Alpha | AA" });
        expect(summary.plannedNicknames[0]?.members.map((member) => member.userId)).toEqual([1, 2]);
        expect(summary.plannedNicknameClears.map((member) => member.userId)).toEqual([2]);

        expect(summary.appliedAdds[0]?.members.map((member) => member.userId)).toEqual([2]);
        expect(summary.appliedRemovals[0]?.members.map((member) => member.userId)).toEqual([2]);
        expect(summary.appliedNicknames[0]?.members.map((member) => member.userId)).toEqual([2]);
        expect(summary.appliedNicknameClears.map((member) => member.userId)).toEqual([3]);

        expect(summary.planningIssues[0]).toMatchObject({ type: "NOT_REGISTERED" });
        expect(summary.planningIssues[0]?.members.map((entry) => entry.member.userId)).toEqual([1, 2]);
        expect(summary.executionIssues[0]).toMatchObject({ type: "ADD_ROLE_FAILED" });
        expect(summary.executionIssues[1]).toMatchObject({ type: "REMOVE_ROLE_FAILED" });

        expect(summary.topLevelIssues[0]).toMatchObject({ type: "CREATE_ROLE_FAILED" });
        expect(summary.topLevelIssues[0]?.issues).toHaveLength(2);

        expect(summary.maskedNonMembers[0]).toMatchObject({ reason: "NOT_IN_ALLIANCE" });
        expect(summary.maskedNonMembers[0]?.members.map((member) => member.userId)).toEqual([4, 5]);
    });

    it("prefers display names and falls back cleanly for member labels", () => {
        expect(getAutoRoleMemberDisplayName({ user_id: 10, username: "alpha", display_name: "Alpha Prime" })).toBe("Alpha Prime");
        expect(getAutoRoleMemberDisplayName({ user_id: 11, username: "beta", display_name: "   " })).toBe("beta");
        expect(getAutoRoleMemberDisplayName({ user_id: 12, username: "", display_name: "" })).toBe("User #12");
    });
});

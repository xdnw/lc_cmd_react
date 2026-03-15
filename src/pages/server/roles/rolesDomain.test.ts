import { describe, expect, it } from "vitest";

import type { AutoRoleManagedRoles, WebRoleAliases } from "@/lib/apitypes";

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
    getRoleMention,
    summarizeManagedRoles,
    summarizeRoleAliases,
} from "./rolesDomain";

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
            roleId: 101,
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
                { role_id: 1, alliance_id: 10, duplicate_key: false },
                { role_id: 2, alliance_id: 11, duplicate_key: true },
            ],
            city_roles: [
                { role_id: 3, range_start: 5, range_end: 9, duplicate_key: false },
            ],
            tax_roles: [
                { role_id: 4, money_rate: 50, rss_rate: 50, duplicate_key: true },
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
        expect(formatDiscordRoleName(15, { "15": "Registered" })).toBe("Registered");
        expect(formatDiscordRoleLabel(15, { "15": "Registered" })).toBe("Registered (15)");
        expect(formatDiscordRoleLabel(16, {})).toBe("Role #16");
        expect(getRoleMention(15)).toBe("<@&15>");
        expect(formatAllianceLabel(77, { "77": "Aurora" })).toBe("Aurora");
        expect(formatAllianceLabel(78, {})).toBe("AA:78");
        expect(formatAliasScopeLabel({ allianceId: 77, scopeLabel: "AA:77" }, { "77": "Aurora" })).toBe("Aurora");
        expect(formatCityRoleRangeLabel(1, 10)).toBe("c1-10");
        expect(formatCityRoleRangeLabel(5, 0)).toBe("c5+");
        expect(formatTaxRoleRateLabel(10, 10)).toBe("10/10");
    });
});

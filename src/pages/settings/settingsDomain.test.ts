import { describe, expect, it } from "vitest";

import {
    ORDERED_GUILD_SETTING_KEYS,
    deriveSettingsSubsetModel,
    SETTINGS_CATEGORY_ITEM_HEIGHT,
    SETTINGS_ROW_ITEM_HEIGHT,
    SETTINGS_SUBGROUP_ITEM_HEIGHT,
    createDefaultSettingsBrowserState,
    deriveSettingsBrowserRows,
    estimateSettingsItemHeight,
    flattenSettingsRows,
    getGuildSettingKeyByOrdinal,
    getGuildSettingOrdinal,
    hasVisibleSettingsSubgroup,
    normalizeGuildSettingRows,
    parseSettingsPageSearchParams,
    type SettingRow,
} from "./settingsDomain";
import { CM, getTypeBreakdown } from "@/utils/Command";
import { normalizeArgInitialValue } from "@/components/cmd/argInitialValueNormalization";

function toIso88591DoubleBlob(values: number[]): string {
    const bytes = new Uint8Array(values.length * 8);
    const view = new DataView(bytes.buffer);
    values.forEach((value, index) => {
        view.setFloat64(index * 8, value, false);
    });

    return String.fromCharCode(...bytes);
}

function createSettingRow({
    settingKey,
    category,
    subgroup,
    isAllowed = true,
    invalid = false,
    supported = true,
    hasValue = true,
    isChannelType = false,
    helpShort,
    displayText,
}: {
    settingKey: string;
    category: string;
    subgroup: string;
    isAllowed?: boolean;
    invalid?: boolean;
    supported?: boolean;
    hasValue?: boolean;
    isChannelType?: boolean;
    helpShort?: string;
    displayText?: string;
}): SettingRow {
    return {
        settingKey: settingKey as never,
        metadata: {
            argType: "text",
            category: category as never,
            subgroup: subgroup as never,
            helpShort: helpShort ?? `${settingKey} short help`,
            helpFull: `${settingKey} full help`,
        },
        value: {
            displayText: displayText ?? settingKey,
            rawText: displayText ?? settingKey,
            hasValue,
        },
        flags: {
            invalid,
            isChannelType,
            isAllowed,
        },
        editor: {
            breakdown: null,
            inputSupport: supported ? { supported: true } : { supported: false, reason: "unsupported" },
            initialValue: settingKey,
        },
        rowParseErrors: [],
        rawRow: [],
    };
}

describe("flattenSettingsRows", () => {
    it("emits category headers, subgroup headers, and sorted rows in display order", () => {
        const rows: SettingRow[] = [
            createSettingRow({ settingKey: "beta", category: "Admin", subgroup: "Limits" }),
            createSettingRow({ settingKey: "alpha", category: "Admin", subgroup: "Limits" }),
            createSettingRow({ settingKey: "gamma", category: "Member", subgroup: "General" }),
        ];

        const flattened = flattenSettingsRows(rows);

        expect(flattened.map((item) => item.kind)).toEqual([
            "category",
            "subgroup",
            "setting",
            "setting",
            "category",
            "subgroup",
            "setting",
        ]);
        expect(flattened.map((item) => item.key)).toEqual([
            "category-Admin",
            "subgroup-Admin-Limits",
            "setting-alpha",
            "setting-beta",
            "category-Member",
            "subgroup-Member-General",
            "setting-gamma",
        ]);
        expect(flattened[0]).toMatchObject({ kind: "category", subgroupCount: 1, settingCount: 2 });
        expect(flattened[1]).toMatchObject({ kind: "subgroup", settingCount: 2 });
        expect(flattened[2]).toMatchObject({ kind: "setting", subgroupPosition: "first", subgroupSettingCount: 2 });
        expect(flattened[3]).toMatchObject({ kind: "setting", subgroupPosition: "last", subgroupSettingCount: 2 });
        expect(flattened[4]).toMatchObject({ kind: "category", subgroupCount: 1, settingCount: 1 });
        expect(flattened[6]).toMatchObject({ kind: "setting", subgroupPosition: "only", subgroupSettingCount: 1 });
    });

    it("skips subgroup headers for placeholder none buckets", () => {
        const rows: SettingRow[] = [
            createSettingRow({ settingKey: "alpha", category: "Admin", subgroup: "NONE" }),
        ];

        const flattened = flattenSettingsRows(rows);

        expect(flattened.map((item) => item.kind)).toEqual(["category", "setting"]);
        expect(flattened[0]).toMatchObject({ subgroupCount: 0, settingCount: 1 });
    });
});

describe("deriveSettingsSubsetModel", () => {
    it("keeps only present settings while reporting missing requested keys", () => {
        const rows: SettingRow[] = [
            createSettingRow({ settingKey: "AUTONICK", category: "Admin", subgroup: "Roles" }),
            createSettingRow({ settingKey: "AUTOROLE_ALLIANCES", category: "Admin", subgroup: "Roles", isAllowed: false }),
            createSettingRow({ settingKey: "WELCOME_TEXT", category: "Member", subgroup: "General" }),
        ];

        const subset = deriveSettingsSubsetModel(rows, [
            "AUTONICK" as never,
            "AUTOROLE_ALLIANCES" as never,
            "AUTOROLE_TOP_X" as never,
        ]);

        expect(subset.presentRows.map((row) => row.settingKey)).toEqual([
            "AUTONICK",
            "AUTOROLE_ALLIANCES",
        ]);
        expect(subset.missingKeys).toEqual(["AUTOROLE_TOP_X"]);
        expect(subset.flattenedItems.filter((item) => item.kind === "setting").map((item) => item.row.settingKey)).toEqual([
            "AUTONICK",
            "AUTOROLE_ALLIANCES",
        ]);
    });
});

describe("guild setting ordinal helpers", () => {
    it("round-trips ordered GuildSetting metadata between keys and ordinals", () => {
        const firstSettingKey = ORDERED_GUILD_SETTING_KEYS[0];
        const lastSettingKey = ORDERED_GUILD_SETTING_KEYS[ORDERED_GUILD_SETTING_KEYS.length - 1];

        expect(getGuildSettingOrdinal(firstSettingKey)).toBe(0);
        expect(getGuildSettingKeyByOrdinal(0)).toBe(firstSettingKey);

        const lastOrdinal = ORDERED_GUILD_SETTING_KEYS.length - 1;
        expect(getGuildSettingOrdinal(lastSettingKey)).toBe(lastOrdinal);
        expect(getGuildSettingKeyByOrdinal(lastOrdinal)).toBe(lastSettingKey);
        expect(getGuildSettingOrdinal("NOT_A_SETTING")).toBeNull();
        expect(getGuildSettingKeyByOrdinal(-1)).toBeNull();
    });
});

describe("hasVisibleSettingsSubgroup", () => {
    it("hides empty placeholder subgroup labels", () => {
        expect(hasVisibleSettingsSubgroup("NONE")).toBe(false);
        expect(hasVisibleSettingsSubgroup("   ")).toBe(false);
        expect(hasVisibleSettingsSubgroup("General")).toBe(true);
    });
});

describe("deriveSettingsBrowserRows", () => {
    it("defaults to available-only category ordering", () => {
        const rows: SettingRow[] = [
            createSettingRow({ settingKey: "beta", category: "Admin", subgroup: "Limits" }),
            createSettingRow({ settingKey: "alpha", category: "Admin", subgroup: "Limits", isAllowed: false }),
            createSettingRow({ settingKey: "gamma", category: "Member", subgroup: "General" }),
        ];

        const result = deriveSettingsBrowserRows(rows, createDefaultSettingsBrowserState());

        expect(result.rows.map((row) => row.settingKey)).toEqual(["beta", "gamma"]);
        expect(result.counts.totalRows).toBe(3);
        expect(result.counts.visibleRows).toBe(2);
        expect(result.counts.unavailableRows).toBe(1);
    });

    it("filters and sorts by search relevance when requested", () => {
        const rows: SettingRow[] = [
            createSettingRow({ settingKey: "alerts.channel", category: "Admin", subgroup: "Alerts", helpShort: "Configure delivery" }),
            createSettingRow({ settingKey: "audit.log", category: "Admin", subgroup: "Audit", helpShort: "Alert archive" }),
            createSettingRow({ settingKey: "welcome.text", category: "Member", subgroup: "General", helpShort: "Greeting" }),
        ];

        const result = deriveSettingsBrowserRows(rows, createDefaultSettingsBrowserState({
            availability: "all",
            query: "alert",
            sort: "relevance",
        }));

        expect(result.rows.map((row) => row.settingKey)).toEqual(["alerts.channel", "audit.log"]);
        expect(result.counts.visibleRows).toBe(2);
    });

    it("supports state filters for invalid, unsupported, and unset rows", () => {
        const rows: SettingRow[] = [
            createSettingRow({ settingKey: "alpha", category: "Admin", subgroup: "General", invalid: true }),
            createSettingRow({ settingKey: "beta", category: "Admin", subgroup: "General", supported: false }),
            createSettingRow({ settingKey: "gamma", category: "Admin", subgroup: "General", hasValue: false }),
        ];

        const invalidOnly = deriveSettingsBrowserRows(rows, createDefaultSettingsBrowserState({ invalid: "only" }));
        const unsupportedOnly = deriveSettingsBrowserRows(rows, createDefaultSettingsBrowserState({ unsupported: "only" }));
        const unsetOnly = deriveSettingsBrowserRows(rows, createDefaultSettingsBrowserState({ hasValue: "exclude" }));

        expect(invalidOnly.rows.map((row) => row.settingKey)).toEqual(["alpha"]);
        expect(unsupportedOnly.rows.map((row) => row.settingKey)).toEqual(["beta"]);
        expect(unsetOnly.rows.map((row) => row.settingKey)).toEqual(["gamma"]);
    });

    it("supports channel-only filtering and counts channel rows", () => {
        const rows: SettingRow[] = [
            createSettingRow({ settingKey: "alpha", category: "Admin", subgroup: "General", isChannelType: true }),
            createSettingRow({ settingKey: "beta", category: "Admin", subgroup: "General" }),
        ];

        const result = deriveSettingsBrowserRows(rows, createDefaultSettingsBrowserState({ channelType: "only" }));

        expect(result.rows.map((row) => row.settingKey)).toEqual(["alpha"]);
        expect(result.counts.channelTypeRows).toBe(1);
    });
});

describe("parseSettingsPageSearchParams", () => {
    it("maps focus links to a reveal-friendly browser state", () => {
        const result = parseSettingsPageSearchParams(new URLSearchParams("focus=alerts.channel"));

        expect(result.focusSettingKey).toBe("alerts.channel");
        expect(result.browserState).toMatchObject({
            query: "alerts.channel",
            availability: "all",
            sort: "relevance",
        });
    });

    it("falls back to the default browser state when focus is missing", () => {
        const result = parseSettingsPageSearchParams(new URLSearchParams());

        expect(result.focusSettingKey).toBeNull();
        expect(result.browserState).toEqual(createDefaultSettingsBrowserState());
    });
});

describe("normalizeGuildSettingRows", () => {
    it("does not treat an empty table as a schema error", () => {
        const result = normalizeGuildSettingRows({ cells: [], renderers: [] } as never);

        expect(result.rows).toEqual([]);
        expect(result.schemaErrors).toEqual([]);
        expect(result.rowParseErrors).toEqual([]);
    });

    it("captures availability reasons from per-cell table errors", () => {
        const result = normalizeGuildSettingRows({
            cells: [
                [],
                ["AUTONICK", "text", "DEFAULT", "NONE", "Help text", "nick", "nick", false, false, false, null],
            ],
            renderers: [],
            errors: [{ row: 0, col: 10, msg: "Requires current guild to be the root server" }],
        } as never);

        expect(result.rows[0]?.flags.isAllowed).toBe(false);
        expect(result.rows[0]?.flags.availabilityReason).toBe("Requires current guild to be the root server");
    });

    it("keeps raw setting text on the row and leaves input normalization to shared cmd helpers", () => {
        const breakdown = getTypeBreakdown(CM, "Map<AttackType,Double>");
        const keys = breakdown.child?.[0]?.getOptionData().options ?? [];
        const binaryPayload = toIso88591DoubleBlob(keys.map((_, index) => {
            if (index === 0) return 1.5;
            if (index === 1) return 2.5;
            if (index === 2) return 3.5;
            return 0;
        }));

        const result = normalizeGuildSettingRows({
            cells: [
                [],
                [
                    "WARCHEST_PER_CITY",
                    "Map<AttackType,Double>",
                    "DEFAULT",
                    "NONE",
                    "Help text",
                    "{GROUND=1.5,VICTORY=2.5,FORTIFY=3.5}",
                    binaryPayload,
                    false,
                    false,
                    true,
                    null,
                ],
            ],
            renderers: [],
        } as never);

        expect(result.rows[0]?.editor.initialValue).toBe(binaryPayload);
        expect(result.rows[0]?.editor.initialValue).toBe(result.rows[0]?.value.rawText);
        expect(normalizeArgInitialValue(breakdown, result.rows[0]?.editor.initialValue ?? "")).toBe(`{${keys[0]}=1.5,${keys[1]}=2.5,${keys[2]}=3.5}`);
    });
});

describe("estimateSettingsItemHeight", () => {
    it("returns kind-based height estimates", () => {
        const flattened = flattenSettingsRows([
            createSettingRow({ settingKey: "alpha", category: "Admin", subgroup: "General" }),
        ]);

        expect(estimateSettingsItemHeight(flattened[0])).toBe(SETTINGS_CATEGORY_ITEM_HEIGHT);
        expect(estimateSettingsItemHeight(flattened[1])).toBe(SETTINGS_SUBGROUP_ITEM_HEIGHT);
        expect(estimateSettingsItemHeight(flattened[2])).toBe(SETTINGS_ROW_ITEM_HEIGHT);
    });
});

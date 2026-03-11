import { describe, expect, it } from "vitest";

import { flattenSettingsRows, type SettingRow } from "./settingsDomain";

function createSettingRow({
    settingKey,
    category,
    subgroup,
}: {
    settingKey: string;
    category: string;
    subgroup: string;
}): SettingRow {
    return {
        settingKey: settingKey as never,
        metadata: {
            argType: "text",
            category: category as never,
            subgroup: subgroup as never,
            helpShort: `${settingKey} short help`,
            helpFull: `${settingKey} full help`,
        },
        value: {
            displayText: settingKey,
            rawText: settingKey,
            inputText: settingKey,
            hasValue: true,
        },
        flags: {
            invalid: false,
            isChannelType: false,
            isAllowed: true,
        },
        editor: {
            breakdown: null,
            inputSupport: { supported: true },
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
    });
});

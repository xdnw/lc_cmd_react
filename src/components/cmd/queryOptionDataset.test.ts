import { describe, expect, it } from "vitest";

import type { WebOptions } from "@/lib/apitypes";

import {
    buildQueryOptionDataset,
    buildQuerySelectOptions,
    searchQueryOptionDataset,
} from "./queryOptionDataset";

function createOptions(): WebOptions {
    return {
        text: ["Borg", "Aurora"],
        key_string: ["7", "11"],
        subtext: ["Leader | Alpha", "Leader | Borealis"],
    };
}

describe("queryOptionDataset", () => {
    it("builds the same enriched aliases used by query-backed selects", () => {
        const options = buildQuerySelectOptions("DBNation", createOptions());

        expect(options[0]).toMatchObject({
            label: "Borg",
            value: "7",
        });
        expect(options[0].aliases).toContain("nation/id=7");
        expect(options[0].aliases).toContain("https://politicsandwar.com/nation/id=7");
        expect(options[0].aliases).toContain("Leader");
    });

    it("searches with the shared select matching rules", () => {
        const dataset = buildQueryOptionDataset("DBNation", createOptions());

        const prefixSearch = searchQueryOptionDataset("Bo", dataset, 20);
        expect(prefixSearch.hasAnyMatch).toBe(true);
        expect(prefixSearch.hasExactMatch).toBe(false);
        expect(prefixSearch.options.map((option) => option.label)).toEqual(["Borg", "Aurora"]);

        expect(searchQueryOptionDataset("nation/id=7", dataset, 20)).toMatchObject({
            hasAnyMatch: true,
            hasExactMatch: true,
            options: [{ label: "Borg", value: "7" }],
        });
    });

    it("preserves mention aliases for discord-backed option types", () => {
        const options = buildQuerySelectOptions("Role", {
            text: ["drone"],
            key_string: ["672263980193939469"],
        });

        expect(options[0].aliases).toContain("<@&672263980193939469>");
        expect(options[0].aliases).toContain("@drone");

        const dataset = buildQueryOptionDataset("TextChannel", {
            text: ["intel"],
            key_string: ["672310912090243092"],
        });

        expect(searchQueryOptionDataset("<#672310912090243092>", dataset, 20)).toMatchObject({
            hasAnyMatch: true,
            hasExactMatch: true,
            options: [{ label: "intel", value: "672310912090243092" }],
        });
    });

    it("builds shared aliases for alliance, tax, war, and city profile tokens", () => {
        const allianceOptions = buildQuerySelectOptions("DBAlliance", {
            text: ["Cataclysm"],
            key_string: ["AA:7413"],
        });
        expect(allianceOptions[0].aliases).toContain("alliance/id=7413");
        expect(allianceOptions[0].aliases).toContain("https://politicsandwar.com/alliance/id=7413");

        const taxOptions = buildQuerySelectOptions("TaxBracket", {
            text: ["Bracket 26171"],
            key_string: ["26171"],
        });
        expect(taxOptions[0].aliases).toContain("tax_id=26171");
        expect(taxOptions[0].aliases).toContain("https://politicsandwar.com/index.php?id=15&tax_id=26171");

        const warOptions = buildQuerySelectOptions("DBWar", {
            text: ["War 1234"],
            key_string: ["1234"],
        });
        expect(warOptions[0].aliases).toContain("war=1234");
        expect(warOptions[0].aliases).toContain("https://politicsandwar.com/nation/war/timeline/war=1234");

        const cityDataset = buildQueryOptionDataset("DBCity", {
            text: ["City 9988"],
            key_string: ["9988"],
        });
        expect(searchQueryOptionDataset("city/id=9988", cityDataset, 20)).toMatchObject({
            hasAnyMatch: true,
            hasExactMatch: true,
            options: [{ label: "City 9988", value: "9988" }],
        });
    });
});
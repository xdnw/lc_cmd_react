import { describe, expect, it } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";
import { analyzeExpression, parseExpressionCursorContext } from "./expressionAnalysis";
import { getExpressionCompletionSourceRefs, getExpressionValueSourceRef } from "./expressionSchema";
import { getPlaceholderExpressionDescriptor } from "./expressionTypes";
import type { ExpressionValueSourceRegistry } from "./expressionValueFetcher";

function analyzeWithRegistry(type: string, value: string, cursor: number, registry: ExpressionValueSourceRegistry) {
    const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, type));
    expect(descriptor).not.toBeNull();
    return analyzeExpression(descriptor!, value, cursor, registry);
}

describe("expressionAnalysis", () => {
    it("requests both selector and backend option sources for query-backed root types", () => {
        const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "Set<DBNation>"));
        expect(descriptor).not.toBeNull();

        const context = parseExpressionCursorContext(descriptor!, "nation:Bo", "nation:Bo".length);

        expect(context.requiredSources).toEqual(expect.arrayContaining([
            expect.objectContaining({ kind: "placeholder", typeName: "DBNation" }),
            expect.objectContaining({ kind: "query-options", typeName: "DBNation" }),
        ]));
        expect(context.replaceFrom).toBe("nation:".length);
        expect(context.activeToken).toBe("Bo");
    });

    it("suggests selector prefixes before any value is recognized", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "nat",
            "nat".length,
            {},
        );

        expect(analysis.suggestions.some((suggestion) => suggestion.insertText === "nation:")).toBe(true);
        expect(analysis.hint?.detail).toContain("Continue typing a known selector");
    });

    it("suggests actual backend-backed options after a recognized selector prefix", () => {
        const optionSource = getExpressionCompletionSourceRefs("DBNation").find((source) => source.kind === "query-options");
        expect(optionSource).toBeDefined();

        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "nation:Bo",
            "nation:Bo".length,
            {
                [optionSource!.cacheKey]: {
                    status: "ready",
                    sourceKind: "query-options",
                    typeLabel: "Nation",
                    options: [
                        { label: "Borg", value: "Borg", aliases: ["189573", "nation/id=189573"] },
                        { label: "Rose", value: "Rose" },
                    ],
                },
                "placeholder:DBNation": {
                    status: "ready",
                    sourceKind: "placeholder",
                    typeLabel: "Nation",
                    options: [],
                },
            },
        );

        expect(analysis.suggestions.map((suggestion) => suggestion.insertText)).toContain("Borg");
        expect(analysis.hint?.detail).toContain("Type to match Nation options");
    });

    it("recognizes exact selector-prefixed option matches", () => {
        const optionSource = getExpressionCompletionSourceRefs("DBNation").find((source) => source.kind === "query-options");
        expect(optionSource).toBeDefined();

        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "nation:Borg",
            "nation:Borg".length,
            {
                [optionSource!.cacheKey]: {
                    status: "ready",
                    sourceKind: "query-options",
                    typeLabel: "Nation",
                    options: [
                        { label: "Borg", value: "Borg", aliases: ["189573"] },
                    ],
                },
                "placeholder:DBNation": {
                    status: "ready",
                    sourceKind: "placeholder",
                    typeLabel: "Nation",
                    options: [],
                },
            },
        );

        expect(analysis.hint?.detail).toContain("Matched Nation option");
    });

    it("recognizes raw option matches even without an explicit selector prefix", () => {
        const optionSource = getExpressionCompletionSourceRefs("DBNation").find((source) => source.kind === "query-options");
        expect(optionSource).toBeDefined();

        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "Borg",
            "Borg".length,
            {
                [optionSource!.cacheKey]: {
                    status: "ready",
                    sourceKind: "query-options",
                    typeLabel: "Nation",
                    options: [
                        { label: "Borg", value: "Borg", aliases: ["189573"] },
                    ],
                },
            },
        );

        expect(analysis.hint?.title).toBe("Borg");
        expect(analysis.hint?.detail).toContain("Recognized Nation option");
    });

    it("reports unrecognized selector text instead of pretending it is valid", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "totallymadeupselector",
            "totallymadeupselector".length,
            {},
        );

        expect(analysis.hint?.detail).toContain("Unrecognized selector or option");
    });

    it("accepts long-form predicate members and shows function info", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getScore",
            "*,#getScore".length,
            {},
        );

        expect(analysis.errors).toHaveLength(0);
        expect(analysis.hint?.title.toLowerCase()).toContain("getscore");
        expect(analysis.hint?.meta).toContain("returns: double");
    });

    it("accepts short-form predicate members without requiring get/is prefixes", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#score",
            "*,#score".length,
            {},
        );

        expect(analysis.errors).toHaveLength(0);
        expect(analysis.hint?.title.toLowerCase()).toContain("getscore");
    });

    it("tracks nested receiver types inside predicate member chains", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getAlliance.getSco",
            "*,#getAlliance.getSco".length,
            {},
        );

        expect(analysis.hint?.meta).toContain("receiver: DBAlliance");
        expect(analysis.suggestions.some((suggestion) => suggestion.insertText.toLowerCase().includes("score"))).toBe(true);
    });

    it("supports positional argument completion in predicate expressions", () => {
        const argSource = getExpressionValueSourceRef("AllianceMetric");
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getAlliance.getMetricAt(TA",
            "*,#getAlliance.getMetricAt(TA".length,
            {
                [argSource.cacheKey]: {
                    status: "ready",
                    sourceKind: argSource.kind,
                    typeLabel: "AllianceMetric",
                    options: [
                        { label: "TANK", value: "TANK" },
                        { label: "SCORE", value: "SCORE" },
                    ],
                },
            },
        );

        expect(analysis.hint?.meta).toContain("receiver: AllianceMetric");
        expect(analysis.hint?.meta).toContain("active arg: metric: AllianceMetric");
        expect(analysis.suggestions.map((suggestion) => suggestion.label)).toContain("TANK");
    });

    it("defaults first-argument option suggestions to named arguments", () => {
        const argSource = getExpressionValueSourceRef("AllianceMetric");
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getAlliance.getMetricAt(TA",
            "*,#getAlliance.getMetricAt(TA".length,
            {
                [argSource.cacheKey]: {
                    status: "ready",
                    sourceKind: argSource.kind,
                    typeLabel: "AllianceMetric",
                    options: [
                        { label: "TANK", value: "TANK" },
                    ],
                },
            },
        );

        expect(analysis.suggestions.some((suggestion) => suggestion.insertText === "metric: TANK")).toBe(true);
    });

    it("recovers to the next argument after a completed scalar argument with trailing whitespace", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getAlliance.getMetricAt(metric: TANK )",
            "*,#getAlliance.getMetricAt(metric: TANK )".length - 1,
            {},
        );

        expect(analysis.suggestions.some((suggestion) => suggestion.label === "date")).toBe(true);
        expect(analysis.suggestions.every((suggestion) => suggestion.label !== "metric")).toBe(true);
        expect(analysis.suggestions.some((suggestion) => suggestion.insertText === ", date: ")).toBe(true);
    });

    it("recovers malformed next-argument text by replacing it with a comma-prefixed argument name", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getAlliance.getMetricAt(metric: TANK date)",
            "*,#getAlliance.getMetricAt(metric: TANK date)".indexOf("date") + "date".length,
            {},
        );

        expect(analysis.suggestions.some((suggestion) => suggestion.insertText === ", date: ")).toBe(true);
        expect(analysis.suggestions.every((suggestion) => suggestion.label !== "metric")).toBe(true);
    });

    it("supports bracketed map-key completion in predicate expressions", () => {
        const mapKeySource = getExpressionValueSourceRef("Map<ResourceType, Double>");
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getCity(1).getRevenue()[mo",
            "*,#getCity(1).getRevenue()[mo".length,
            {
                [mapKeySource.cacheKey]: {
                    status: "ready",
                    sourceKind: "map-key-options",
                    typeLabel: "ResourceType key",
                    options: [
                        { label: "MONEY", value: "MONEY" },
                        { label: "FOOD", value: "FOOD" },
                    ],
                },
            },
        );

        expect(analysis.hint?.detail).toContain("Pick a key");
        expect(analysis.suggestions.map((suggestion) => suggestion.label)).toContain("MONEY");
    });

    it("marks invalid predicate member expressions as errors", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#totallyMadeUpMember",
            "*,#totallyMadeUpMember".length,
            {},
        );

        expect(analysis.errors.some((error) => error.includes("Unknown member"))).toBe(true);
    });

    it("suggests placeholder continuations after a completed placeholder-returning call", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getAlliance()",
            "*,#getAlliance()".length,
            {
                "placeholder:DBAlliance": {
                    status: "ready",
                    sourceKind: "placeholder",
                    typeLabel: "Alliance",
                    options: [],
                },
            },
        );

        expect(analysis.hint?.meta).toContain("receiver: DBAlliance");
        expect(analysis.suggestions.some((suggestion) => suggestion.label.startsWith("."))).toBe(true);
        expect(analysis.suggestions.some((suggestion) => suggestion.insertText.startsWith("."))).toBe(true);
    });

    it("does not report stale filter-field errors when the cursor is inside a valid predicate member", () => {
        const value = "*,#getScore";
        const cursor = value.indexOf("Score");
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {},
        );

        expect(analysis.errors).toHaveLength(0);
        expect(analysis.hint?.title.toLowerCase()).toContain("getscore");
    });

    it("suggests comparators when the cursor is on a predicate operator", () => {
        const value = "*,#getScore>=20";
        const cursor = value.indexOf(">=") + 1;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {},
        );

        expect(analysis.suggestions.map((suggestion) => suggestion.label)).toEqual(expect.arrayContaining([">=", "<=", ">", "<"]));
        expect(analysis.suggestions.some((suggestion) => suggestion.label === "==")).toBe(false);
        expect(analysis.hint?.title).toContain("comparator");
    });

    it("treats map-key lookups as the map value type for predicate RHS completion", () => {
        const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "Set<DBNation>"));
        expect(descriptor).not.toBeNull();

        const value = "*,#getCity(1).getRevenue()[food]>=";
        const context = parseExpressionCursorContext(descriptor!, value, value.length);

        expect(context.mode).toBe("predicate-rhs");
        expect(context.receiverType).toBe("Double");
        expect(context.activeSourceRef?.kind).not.toBe("map-key-options");
    });

    it("accepts arithmetic predicate expressions on both sides of the comparator", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#score/#cities>#score/10",
            "*,#score/#cities>#score/10".length,
            {},
        );

        expect(analysis.errors).toHaveLength(0);
    });

    it("infers enum suggestions from the opposite side of a comparison", () => {
        const sourceRef = getExpressionValueSourceRef("WarPolicy");
        const value = "*,#TUR=getWarPolicy";
        const cursor = value.indexOf("TUR") + 2;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {
                [sourceRef.cacheKey]: {
                    status: "ready",
                    sourceKind: sourceRef.kind,
                    typeLabel: "WarPolicy",
                    options: [
                        { label: "TURTLE", value: "TURTLE" },
                        { label: "BLITZKRIEG", value: "BLITZKRIEG" },
                    ],
                },
            },
        );

        expect(analysis.suggestions.map((suggestion) => suggestion.label)).toContain("TURTLE");
    });

    it("reports invalid RHS members instead of silently accepting them", () => {
        const value = "*,#score>#gibberish";
        const cursor = value.length;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {},
        );

        expect(analysis.errors.length).toBeGreaterThan(0);
        expect(analysis.errors.some((error) => error.includes("gibberish"))).toBe(true);
    });

    it("treats comparator-led tokens as predicate context instead of selector context", () => {
        const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "Set<DBNation>"));
        expect(descriptor).not.toBeNull();

        const value = "*,>#score";
        const cursor = value.indexOf(">");
        const context = parseExpressionCursorContext(descriptor!, value, cursor);
        const analysis = analyzeWithRegistry("Set<DBNation>", value, cursor, {});

        expect(["predicate-operator", "predicate-rhs", "member-chain"]).toContain(context.mode);
        expect(analysis.hint?.title.toLowerCase()).not.toContain("selector");
    });

    it("keeps structured member hints on the RHS instead of collapsing to a generic value hint", () => {
        const value = "*,#getAlliance().getMetricAt(metric:TANK)>#getAlliance().getMetricAt(metric:TANK)";
        const rhsGetMetricAt = value.lastIndexOf("getMetricAt") + 4;
        const lhsGetMetricAt = value.indexOf("getMetricAt") + 4;

        const lhsAnalysis = analyzeWithRegistry("Set<DBNation>", value, lhsGetMetricAt, {});
        const rhsAnalysis = analyzeWithRegistry("Set<DBNation>", value, rhsGetMetricAt, {});

        expect(lhsAnalysis.hint?.title.toLowerCase()).toContain("getmetricat");
        expect(rhsAnalysis.hint?.title.toLowerCase()).toContain("getmetricat");
        expect(rhsAnalysis.hint?.detail?.toLowerCase()).not.toContain("right-hand side");
    });

    it("keeps an empty RHS after a comparator in predicate value context", () => {
        const value = "*,#score>";
        const cursor = value.length;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {},
        );

        expect(analysis.hint?.title.toLowerCase()).not.toContain("selector");
        expect(analysis.hint?.detail?.toLowerCase()).toContain("right-hand side");
        expect(analysis.errors).toHaveLength(0);
    });

    it("keeps RHS incomplete map access in map-key completion mode", () => {
        const mapKeySource = getExpressionValueSourceRef("Map<ResourceType, Double>");
        const value = "*,#score>#getCity(1).getRevenue()[";
        const cursor = value.length;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {
                [mapKeySource.cacheKey]: {
                    status: "ready",
                    sourceKind: "map-key-options",
                    typeLabel: "ResourceType key",
                    options: [
                        { label: "MONEY", value: "MONEY" },
                    ],
                },
            },
        );

        expect(analysis.hint?.detail).toContain("Pick a key");
        expect(analysis.suggestions.map((suggestion) => suggestion.label)).toContain("MONEY");
    });

    it("keeps RHS incomplete function calls in argument completion mode", () => {
        const argSource = getExpressionValueSourceRef("AllianceMetric");
        const value = "*,#score>#getAlliance().getMetricAt(";
        const cursor = value.length;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {
                [argSource.cacheKey]: {
                    status: "ready",
                    sourceKind: argSource.kind,
                    typeLabel: "AllianceMetric",
                    options: [
                        { label: "TANK", value: "TANK" },
                    ],
                },
            },
        );

        expect(analysis.hint?.title.toLowerCase()).toContain("getmetricat");
        expect(analysis.hint?.meta).toContain("active arg: metric: AllianceMetric");
        expect(analysis.suggestions.some((suggestion) => suggestion.insertText === "metric: TANK")).toBe(true);
    });

    it("recovers malformed RHS next-argument text inside incomplete function calls", () => {
        const value = "*,#score>#getAlliance().getMetricAt(metric: TANK date)";
        const cursor = value.indexOf("date)") + "date".length;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {},
        );

        expect(analysis.hint?.title.toLowerCase()).toContain("getmetricat");
        expect(analysis.suggestions.some((suggestion) => suggestion.insertText === ", date: ")).toBe(true);
    });

    it("does not suggest invalid functions while editing a numeric predicate RHS", () => {
        const value = "*,#getScore>=10";
        const cursor = value.indexOf("10") + 1;
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            value,
            cursor,
            {},
        );

        expect(analysis.suggestions).toHaveLength(0);
        expect(analysis.errors).toHaveLength(0);
    });

    it("parses nested member chains and requests placeholder sources", () => {
        const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "TypedFunction<DBNation,String>"));
        expect(descriptor).not.toBeNull();

        const value = "prefix {getalliance.getna} suffix";
        const cursor = value.indexOf("getna") + "getna".length;
        const context = parseExpressionCursorContext(descriptor!, value, cursor);

        expect(context.mode).toBe("member-chain");
        expect(context.receiverType).toBe("DBAlliance");
        expect(context.activeToken).toBe("getna");
        expect(context.requiredSources).toEqual([
            expect.objectContaining({ kind: "placeholder", typeName: "DBAlliance" }),
        ]);
    });

    it("tracks replacement spans across the full token around the cursor", () => {
        const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "TypedFunction<DBNation,String>"));
        expect(descriptor).not.toBeNull();

        const value = "prefix {getalliance.getname} suffix";
        const tokenStart = value.indexOf("getname");
        const context = parseExpressionCursorContext(descriptor!, value, tokenStart + "getna".length);

        expect(context.activeToken).toBe("getname");
        expect(context.replaceFrom).toBe(tokenStart);
        expect(context.replaceTo).toBe(tokenStart + "getname".length);
    });

    it("suggests nested placeholder members from the shared schema", () => {
        const value = "prefix {getalliance.getna} suffix";
        const cursor = value.indexOf("getna") + "getna".length;
        const analysis = analyzeWithRegistry(
            "TypedFunction<DBNation,String>",
            value,
            cursor,
            {
                "placeholder:DBAlliance": {
                    status: "ready",
                    sourceKind: "placeholder",
                    typeLabel: "Alliance",
                    options: [],
                },
            },
        );

        expect(analysis.suggestions.some((suggestion) => suggestion.label === "getname")).toBe(true);
        expect(analysis.errors).toHaveLength(0);
        expect(analysis.hint?.title).toContain("getname");
    });

    it("suggests filter fields inside predicate arguments", () => {
        const value = "{getactivewarswith(filter:#vm_)}";
        const cursor = value.indexOf("#vm_") + "#vm_".length;
        const analysis = analyzeWithRegistry(
            "TypedFunction<DBNation,Double>",
            value,
            cursor,
            {
                "placeholder:DBWar": {
                    status: "ready",
                    sourceKind: "placeholder",
                    typeLabel: "War",
                    options: [],
                },
            },
        );

        expect(analysis.suggestions.some((suggestion) => suggestion.label === "#vm_turns")).toBe(true);
        expect(analysis.hint?.meta).toContain("active arg: filter");
    });

    it("uses shared option matching for map key completions", () => {
        const value = "{getrevenue.fo}";
        const cursor = value.indexOf("fo") + "fo".length;
        const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "TypedFunction<DBCity,Double>"));
        expect(descriptor).not.toBeNull();

        const context = parseExpressionCursorContext(descriptor!, value, cursor);
        expect(context.activeSourceRef).toEqual(expect.objectContaining({ kind: "map-key-options" }));

        const sourceRef = context.activeSourceRef!;
        const analysis = analyzeWithRegistry(
            "TypedFunction<DBCity,Double>",
            value,
            cursor,
            {
                [sourceRef.cacheKey]: {
                    status: "ready",
                    sourceKind: "map-key-options",
                    typeLabel: "ResourceType key",
                    options: [
                        { label: "FOOD", value: "FOOD", aliases: ["food"] },
                        { label: "COAL", value: "COAL", aliases: ["coal"] },
                    ],
                },
            },
        );

        expect(analysis.suggestions.map((suggestion) => suggestion.label)).toContain("FOOD");
        expect(analysis.hint?.detail).toContain("Pick a key");
    });

    it("requires a comparator and RHS for non-boolean, non-numeric predicate results", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getWarPolicy",
            "*,#getWarPolicy".length,
            {},
        );

        expect(analysis.errors.some((error) => error.includes("require a comparator and right-hand side"))).toBe(true);
    });

    it("suggests RHS options for enum-like predicate comparisons", () => {
        const sourceRef = getExpressionValueSourceRef("WarPolicy");
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getWarPolicy=",
            "*,#getWarPolicy=".length,
            {
                [sourceRef.cacheKey]: {
                    status: "ready",
                    sourceKind: sourceRef.kind,
                    typeLabel: "WarPolicy",
                    options: [
                        { label: "TURTLE", value: "TURTLE" },
                        { label: "BLITZKRIEG", value: "BLITZKRIEG" },
                    ],
                },
            },
        );

        expect(analysis.suggestions.map((suggestion) => suggestion.label)).toContain("TURTLE");
        expect(analysis.errors).toHaveLength(0);
    });

    it("type-checks numeric argument values", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getCity(nope)",
            "*,#getCity(nope)".length - 1,
            {},
        );

        expect(analysis.errors.some((error) => error.includes("Invalid numeric value `nope`"))).toBe(true);
    });

    it("reports missing required arguments in predicate function calls", () => {
        const analysis = analyzeWithRegistry(
            "Set<DBNation>",
            "*,#getCity().getRevenue()[FOOD]>=10",
            "*,#getCity().getRevenue()[FOOD]>=10".length,
            {},
        );

        expect(analysis.errors.some((error) => error.includes("Missing required argument `index`"))).toBe(true);
    });
});

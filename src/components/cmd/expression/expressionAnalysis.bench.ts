import { bench, describe } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";
import { getExpressionValueSourceRef } from "./expressionSchema";
import {
    analyzeExpression,
    analyzeParsedExpression,
    parseExpressionCursorContext,
} from "./expressionAnalysis";
import { getPlaceholderExpressionDescriptor } from "./expressionTypes";
import type { ExpressionValueSourceRegistry } from "./expressionValueFetcher";

const setDescriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "Set<DBNation>"));
const functionDescriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "TypedFunction<DBNation,Double>"));

if (!setDescriptor || !functionDescriptor) {
    throw new Error("Expected placeholder expression descriptors for benchmark cases");
}

const mapKeySource = getExpressionValueSourceRef("Map<ResourceType, Double>");

const registry: ExpressionValueSourceRegistry = {
    "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
    },
    "placeholder:DBCity": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "City",
        options: [],
    },
    [mapKeySource.cacheKey]: {
        status: "ready",
        sourceKind: "map-key-options",
        typeLabel: "ResourceType key",
        options: [
            { label: "MONEY", value: "MONEY" },
            { label: "FOOD", value: "FOOD" },
            { label: "COAL", value: "COAL" },
        ],
    },
};

const largeOptionRegistry: ExpressionValueSourceRegistry = {
    ...registry,
    "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: Array.from({ length: 20000 }, (_, index) => {
            const value = `Nation ${String(index).padStart(5, "0")}`;
            return {
                label: value,
                value,
                aliases: [`${index}`],
            };
        }),
    },
};

describe("placeholder expression hot path", () => {
    const predicateValue = "*,#getCity(1).getRevenue()[MONEY]/#getScore()>0";
    const predicateCursor = predicateValue.indexOf("MONEY") + "MONEY".length;

    const nestedFunctionValue = "{getactivewarswith(filter:#getCity(1).getRevenue()[MONEY]/#getScore()>0)}";
    const nestedFunctionCursor = nestedFunctionValue.indexOf("MONEY") + "MONEY".length;

    bench("parse predicate cursor context", () => {
        parseExpressionCursorContext(setDescriptor, predicateValue, predicateCursor);
    });

    bench("analyze parsed predicate context", () => {
        const context = parseExpressionCursorContext(setDescriptor, predicateValue, predicateCursor);
        analyzeParsedExpression(setDescriptor, predicateValue, context, registry);
    });

    bench("analyze predicate end-to-end", () => {
        analyzeExpression(setDescriptor, predicateValue, predicateCursor, registry);
    });

    bench("analyze nested function end-to-end", () => {
        analyzeExpression(functionDescriptor, nestedFunctionValue, nestedFunctionCursor, registry);
    });

    bench("analyze 20k root suggestions end-to-end", () => {
        analyzeExpression(setDescriptor, "nation:", "nation:".length, largeOptionRegistry);
    });

    bench("analyze 20k root suggestions with prefix", () => {
        analyzeExpression(setDescriptor, "nation:Nation 019", "nation:Nation 019".length, largeOptionRegistry);
    });
});
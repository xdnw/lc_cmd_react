import type { TypeBreakdown } from "@/utils/Command";
import { getExpressionCompletionSourceRefs, type ExpressionValueSourceRef } from "./expressionSchema";

export type PlaceholderExpressionKind = "set" | "predicate" | "function-string" | "function-double";

export type PlaceholderExpressionDescriptor = {
    kind: PlaceholderExpressionKind;
    rootType: string;
    returnType?: string;
    allowsLiteralText: boolean;
    rootValueSources: ExpressionValueSourceRef[];
    exampleMode: "selector-like" | "function-like" | "numeric";
};

export function getPlaceholderExpressionDescriptor(breakdown: TypeBreakdown): PlaceholderExpressionDescriptor | null {
    const rootType = breakdown.child?.[0]?.element;
    if (!rootType || !(rootType in breakdown.map.data.placeholders)) {
        return null;
    }

    const rootValueSources = getExpressionCompletionSourceRefs(rootType);

    if (breakdown.element === "Set") {
        return {
            kind: "set",
            rootType,
            allowsLiteralText: false,
            rootValueSources,
            exampleMode: "selector-like",
        };
    }

    if (breakdown.element === "Predicate") {
        return {
            kind: "predicate",
            rootType,
            allowsLiteralText: false,
            rootValueSources,
            exampleMode: "selector-like",
        };
    }

    if (breakdown.element !== "TypedFunction") {
        return null;
    }

    const returnType = breakdown.child?.[1]?.element;
    if (returnType === "String") {
        return {
            kind: "function-string",
            rootType,
            returnType,
            allowsLiteralText: true,
            rootValueSources,
            exampleMode: "function-like",
        };
    }

    if (returnType === "Double") {
        return {
            kind: "function-double",
            rootType,
            returnType,
            allowsLiteralText: true,
            rootValueSources,
            exampleMode: "numeric",
        };
    }

    return null;
}

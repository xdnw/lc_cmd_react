import type { TypeBreakdown } from "@/utils/Command";
import { COMMANDS } from "@/lib/commands";

export type ExpressionInputKind = "set" | "predicate" | "function-string" | "function-double";

export type ExpressionInputConfig = {
    kind: ExpressionInputKind;
    placeholderType: string;
    returnType?: string;
};

export function getExpressionInputConfig(breakdown: TypeBreakdown): ExpressionInputConfig | null {
    const placeholderType = breakdown.child?.[0]?.element;
    if (!placeholderType || !(placeholderType in COMMANDS.placeholders)) {
        return null;
    }

    if (breakdown.element === "Set") {
        return {
            kind: "set",
            placeholderType,
        };
    }

    if (breakdown.element === "Predicate") {
        return {
            kind: "predicate",
            placeholderType,
        };
    }

    if (breakdown.element !== "TypedFunction") {
        return null;
    }

    const returnType = breakdown.child?.[1]?.element;
    if (returnType === "String") {
        return {
            kind: "function-string",
            placeholderType,
            returnType,
        };
    }

    if (returnType === "Double") {
        return {
            kind: "function-double",
            placeholderType,
            returnType,
        };
    }

    return null;
}

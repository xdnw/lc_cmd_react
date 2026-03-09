import { bench, describe } from "vitest";

import type { ExpressionSuggestion } from "./expression/expressionAnalysis";
import { filterExpressionSuggestions } from "./PlaceholderSuggestionPanel";

const largeSuggestionSet: ExpressionSuggestion[] = Array.from({ length: 20000 }, (_, index) => {
    const value = `Nation ${String(index).padStart(5, "0")}`;
    return {
        label: value,
        insertText: value,
        detail: `Query option ${index}`,
        replaceFrom: 0,
        replaceTo: 0,
        caretOffset: value.length,
        kind: "option",
        sourceKind: "query-options",
    };
});

describe("placeholder suggestion panel filtering", () => {
    bench("returns all 20k suggestions without search", () => {
        filterExpressionSuggestions(largeSuggestionSet, "");
    });

    bench("filters 20k suggestions by prefix", () => {
        filterExpressionSuggestions(largeSuggestionSet, "Nation 019");
    });

    bench("filters 20k suggestions by partial detail", () => {
        filterExpressionSuggestions(largeSuggestionSet, "option 1999");
    });
});
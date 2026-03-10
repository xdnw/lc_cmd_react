import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PlaceholderSuggestionPanel from "./PlaceholderSuggestionPanel";
import type { ExpressionLazyOptionSource, ExpressionSuggestion } from "./expression/expressionAnalysis";

function createSuggestion(overrides: Partial<ExpressionSuggestion> = {}): ExpressionSuggestion {
    return {
        label: "nation:",
        insertText: "nation:",
        replaceFrom: 0,
        replaceTo: 0,
        caretOffset: "nation:".length,
        kind: "selector",
        sourceKind: "placeholder",
        ...overrides,
    };
}

function createLazyOptionSource(overrides: Partial<ExpressionLazyOptionSource> = {}): ExpressionLazyOptionSource {
    return {
        entry: {
            status: "ready",
            sourceKind: "query-options",
            typeLabel: "Nation",
            options: [],
            optionCount: 14988,
            workerDatasetId: "query:DBNation",
        },
        token: "",
        replaceFrom: 0,
        replaceTo: 0,
        minQueryLength: 1,
        ...overrides,
    };
}

describe("PlaceholderSuggestionPanel", () => {
    it("keeps eager suggestions visible while a large lazy query source still needs explicit search", () => {
        render(
            <PlaceholderSuggestionPanel
                suggestions={[
                    createSuggestion({
                        label: "nation:",
                        detail: "Select nations by name or id",
                    }),
                ]}
                lazyOptionSource={createLazyOptionSource()}
                searchValue=""
                onSearchValueChange={vi.fn()}
                onApplySuggestion={vi.fn()}
            />,
        );

        expect(screen.getByText(/Type at least 1 characters to search 14,989 options\./i)).toBeTruthy();
        expect(screen.getByRole("button", { name: "nation:" })).toBeTruthy();
    });

    it("renders eager suggestions and lazy query suggestions together when both are valid", () => {
        render(
            <PlaceholderSuggestionPanel
                suggestions={[
                    createSuggestion({
                        label: "nation:",
                        detail: "Select nations by name or id",
                    }),
                ]}
                lazyOptionSource={createLazyOptionSource({
                    token: "Bo",
                    minQueryLength: undefined,
                    entry: {
                        status: "ready",
                        sourceKind: "query-options",
                        typeLabel: "Nation",
                        optionCount: 2,
                        options: [
                            { label: "Borg", value: "Borg" },
                            { label: "Rose", value: "Rose" },
                        ],
                    },
                })}
                searchValue=""
                onSearchValueChange={vi.fn()}
                onApplySuggestion={vi.fn()}
            />,
        );

        expect(screen.getByRole("button", { name: "nation:" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Borg" })).toBeTruthy();
    });
});

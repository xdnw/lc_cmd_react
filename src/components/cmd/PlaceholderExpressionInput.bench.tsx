import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, bench, describe, vi } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";
import PlaceholderExpressionInput from "./PlaceholderExpressionInput";
import type { ExpressionValueSourceRegistry } from "./expression/expressionValueFetcher";

const registry: ExpressionValueSourceRegistry = {
    "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
    },
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

vi.mock("./expression/expressionValueFetcher", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./expression/expressionValueFetcher")>();
    return {
        ...actual,
        useExpressionValueSources: () => registry,
    };
});

afterEach(() => {
    cleanup();
});

describe("placeholder expression input interaction", () => {
    bench("render and type into 20k root suggestions", () => {
        render(
            <PlaceholderExpressionInput
                argName="value"
                initialValue="nation:"
                setOutputValue={() => {}}
                breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
            />,
        );

        const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
        act(() => {
            fireEvent.focus(textarea);
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            fireEvent.select(textarea);
            fireEvent.change(textarea, { target: { value: "nation:Nation 019" } });
        });
    });
});
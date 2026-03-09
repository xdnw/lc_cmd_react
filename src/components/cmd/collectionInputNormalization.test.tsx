import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./ArgInput", () => ({
    default: ({ argName }: { argName: string }) => <input aria-label={argName} />,
}));

import { CM, getTypeBreakdown } from "@/utils/Command";
import { DialogProvider } from "../layout/DialogContext";
import MapInput from "./MapInput";
import SetInput from "./SetInput";
import { normalizeMapEntries, normalizeSetValues } from "./collectionInputNormalization";

function makeClipboardEventPayload(text: string) {
    return {
        clipboardData: {
            getData: (type: string) => (type === "text/plain" || type === "text" ? text : ""),
        },
    };
}

describe("collection input normalization", () => {
    it("canonicalizes set values against child option metadata", () => {
        const breakdown = getTypeBreakdown(CM, "ResourceType");
        const normalized = normalizeSetValues(["mOnEy", "MONEY", "coal"], breakdown);

        expect(normalized.values).toEqual(["MONEY", "COAL"]);
        expect(normalized.notices.some((notice) => notice.message.includes("normalized to \"MONEY\""))).toBe(true);
    });

    it("canonicalizes map keys, evaluates numeric expressions, and keeps likely-invalid values with warnings", () => {
        const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
        const valueBreakdown = getTypeBreakdown(CM, "Double");
        const normalized = normalizeMapEntries([
            { mOnEy: "5*6" },
            { MONEY: "7" },
            { coal: "bar" },
        ], keyBreakdown, valueBreakdown);

        expect(normalized.entries).toEqual([
            { MONEY: "7" },
            { COAL: "bar" },
        ]);
        expect(normalized.notices.some((notice) => notice.message.includes("normalized to \"30\""))).toBe(true);
        expect(normalized.notices.some((notice) => notice.message.includes('may be invalid for Double'))).toBe(true);
    });

    it("replaces pasted map content instead of appending to existing entries", () => {
        const setOutputValue = vi.fn();
        const { container } = render(
            <DialogProvider>
                <MapInput
                    argName="resources"
                    children={[getTypeBreakdown(CM, "ResourceType"), getTypeBreakdown(CM, "Double")]}
                    initialValue="money=1,coal=2"
                    setOutputValue={setOutputValue}
                />
            </DialogProvider>,
        );

        fireEvent.paste(container.firstElementChild as HTMLElement, makeClipboardEventPayload("mOnEy=5*6"));

        expect(setOutputValue).toHaveBeenLastCalledWith("resources", "MONEY=30");
        expect(screen.queryByText("COAL: 2")).toBeNull();
        expect(screen.queryByText("MONEY: 30")).not.toBeNull();
    });

    it("replaces pasted set content instead of appending to existing values", () => {
        const setOutputValue = vi.fn();
        const { container } = render(
            <DialogProvider>
                <SetInput
                    argName="resources"
                    child={getTypeBreakdown(CM, "ResourceType")}
                    initialValue="money,coal"
                    setOutputValue={setOutputValue}
                />
            </DialogProvider>,
        );

        fireEvent.paste(container.firstElementChild as HTMLElement, makeClipboardEventPayload("mOnEy"));

        expect(setOutputValue).toHaveBeenLastCalledWith("resources", "MONEY");
        expect(screen.queryByText("COAL")).toBeNull();
        expect(screen.queryByText("MONEY")).not.toBeNull();
    });

    it("shows a non-blocking warning when a pasted map value is likely invalid", () => {
        const { container } = render(
            <DialogProvider>
                <MapInput
                    argName="resources"
                    children={[getTypeBreakdown(CM, "ResourceType"), getTypeBreakdown(CM, "Double")]}
                    initialValue=""
                    setOutputValue={vi.fn()}
                />
            </DialogProvider>,
        );

        fireEvent.paste(container.firstElementChild as HTMLElement, makeClipboardEventPayload("money=bar"));

        expect(screen.queryByText(/may be invalid for Double/i)).not.toBeNull();
        expect(screen.queryByText("MONEY: bar")).not.toBeNull();
    });
});
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./ArgInput", () => ({
    default: ({ argName, initialValue, setOutputValue }: { argName: string; initialValue?: string; setOutputValue: (name: string, value: string) => void }) => (
        <input
            aria-label={argName}
            value={initialValue ?? ""}
            onChange={(event) => setOutputValue(argName, event.target.value)}
        />
    ),
}));

import { CM, getTypeBreakdown } from "@/utils/Command";
import { DialogProvider } from "../layout/DialogContext";
import MapInput from "./MapInput";
import SetInput from "./SetInput";
import { normalizeMapEntries, normalizeSetValues, serializeMapEntries } from "./collectionInputNormalization";

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
                    preferStaticKeyLayout={false}
                />
            </DialogProvider>,
        );

        fireEvent.paste(container.firstElementChild as HTMLElement, makeClipboardEventPayload("mOnEy=5*6"));

        expect(setOutputValue).toHaveBeenLastCalledWith("resources", "MONEY=30");
        expect(screen.queryByText("COAL")).toBeNull();
        expect(screen.queryByText("30")).not.toBeNull();
    });

    it("serializes comma-separated map output when pasting multiple pairs", () => {
        const setOutputValue = vi.fn();
        const { container } = render(
            <DialogProvider>
                <MapInput
                    argName="resources"
                    children={[getTypeBreakdown(CM, "ResourceType"), getTypeBreakdown(CM, "Double")]}
                    initialValue=""
                    setOutputValue={setOutputValue}
                    preferStaticKeyLayout={false}
                />
            </DialogProvider>,
        );

        fireEvent.paste(container.firstElementChild as HTMLElement, makeClipboardEventPayload("money=1,coal=2"));
        expect(setOutputValue).toHaveBeenLastCalledWith("resources", "MONEY=1,COAL=2");
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
                    preferStaticKeyLayout={false}
                />
            </DialogProvider>,
        );

        fireEvent.paste(container.firstElementChild as HTMLElement, makeClipboardEventPayload("money=bar"));

        expect(screen.queryByText(/may be invalid for Double/i)).not.toBeNull();
        expect(screen.queryByText("bar")).not.toBeNull();
    });

    it("renders eligible static-key maps as fixed key rows with empty unset values", () => {
        const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
        const staticKeys = keyBreakdown.getOptionData().options ?? [];

        render(
            <DialogProvider>
                <MapInput
                    argName="attacks"
                    children={[keyBreakdown, getTypeBreakdown(CM, "Double")]}
                    initialValue=""
                    setOutputValue={vi.fn()}
                    preferStaticKeyLayout
                />
            </DialogProvider>,
        );

        expect(screen.queryByText("Add Pair")).toBeNull();
        expect(screen.getByText(staticKeys[0])).toBeTruthy();
        expect(screen.getByText(staticKeys[1])).toBeTruthy();
        expect((screen.getByLabelText(`value-${staticKeys[0]}`) as HTMLInputElement).value).toBe("");
        expect((screen.getByLabelText(`value-${staticKeys[1]}`) as HTMLInputElement).value).toBe("");
    });

    it("serializes only populated static-key values", () => {
        const setOutputValue = vi.fn();
        const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
        const staticKeys = keyBreakdown.getOptionData().options ?? [];

        render(
            <DialogProvider>
                <MapInput
                    argName="attacks"
                    children={[keyBreakdown, getTypeBreakdown(CM, "Double")]}
                    initialValue=""
                    setOutputValue={setOutputValue}
                    preferStaticKeyLayout
                />
            </DialogProvider>,
        );

        // set first key and verify output
        fireEvent.change(screen.getByLabelText(`value-${staticKeys[0]}`), { target: { value: "7" } });
        expect(setOutputValue).toHaveBeenLastCalledWith("attacks", `${staticKeys[0]}=7`);

        // now set second key as well; the two entries should be comma-separated
        fireEvent.change(screen.getByLabelText(`value-${staticKeys[1]}`), { target: { value: "9" } });
        expect(setOutputValue).toHaveBeenLastCalledWith("attacks", `${staticKeys[0]}=7,${staticKeys[1]}=9`);

        // clearing all entries yields an empty string again
        fireEvent.change(screen.getByLabelText(`value-${staticKeys[0]}`), { target: { value: "" } });
        fireEvent.change(screen.getByLabelText(`value-${staticKeys[1]}`), { target: { value: "" } });
        expect(setOutputValue).toHaveBeenLastCalledWith("attacks", "");
    });

    it("hydrates fixed key rows from pasted content in static-key mode", () => {
        const setOutputValue = vi.fn();
        const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
        const staticKeys = keyBreakdown.getOptionData().options ?? [];
        const { container } = render(
            <DialogProvider>
                <MapInput
                    argName="attacks"
                    children={[keyBreakdown, getTypeBreakdown(CM, "Double")]}
                    initialValue=""
                    setOutputValue={setOutputValue}
                    preferStaticKeyLayout
                />
            </DialogProvider>,
        );

        fireEvent.paste(container.firstElementChild as HTMLElement, makeClipboardEventPayload(`${staticKeys[0]}=5`));

        expect(setOutputValue).toHaveBeenLastCalledWith("attacks", `${staticKeys[0]}=5`);
        expect((screen.getByLabelText(`value-${staticKeys[0]}`) as HTMLInputElement).value).toBe("5");
        expect((screen.getByLabelText(`value-${staticKeys[1]}`) as HTMLInputElement).value).toBe("");
    });

    it("clears static-key warnings after the user fixes the value", () => {
        const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
        const staticKeys = keyBreakdown.getOptionData().options ?? [];

        render(
            <DialogProvider>
                <MapInput
                    argName="resources"
                    children={[keyBreakdown, getTypeBreakdown(CM, "Double")]}
                    initialValue={`${staticKeys[0]}=bar`}
                    setOutputValue={vi.fn()}
                    preferStaticKeyLayout
                />
            </DialogProvider>,
        );

        expect(screen.queryByText(/may be invalid for Double/i)).not.toBeNull();

        fireEvent.change(screen.getByLabelText(`value-${staticKeys[0]}`), { target: { value: "7" } });

        expect(screen.queryByText(/may be invalid for Double/i)).toBeNull();
    });
});
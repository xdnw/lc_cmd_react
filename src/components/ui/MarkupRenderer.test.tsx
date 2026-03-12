import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/cmd/useCommandExecution", () => ({
    commandButtonAction: vi.fn(),
}));

import MarkupRenderer, { Embed, canRenderPlainText, hasDiscernableMarkup } from "./MarkupRenderer";

afterEach(() => {
    cleanup();
});

describe("MarkupRenderer", () => {
    it("returns nothing for empty content", () => {
        const { container } = render(<MarkupRenderer content="" />);

        expect(container.innerHTML).toBe("");
        expect(canRenderPlainText("")).toBe(false);
    });

    it("classifies plain text, urls, and markdown consistently", () => {
        expect(canRenderPlainText("Just text")).toBe(true);
        expect(hasDiscernableMarkup("Just text")).toBe(false);

        expect(canRenderPlainText("https://example.com")).toBe(false);
        expect(hasDiscernableMarkup("**bold**")).toBe(true);
    });

    it("renders plain text without injecting html markup", () => {
        const { container } = render(<MarkupRenderer content="Simple value" />);

        expect(container.textContent).toBe("Simple value");
        expect(container.querySelector("span")).toBeNull();
    });

    it("renders markdown content as html", () => {
        render(<MarkupRenderer content="**bold** and _italic_" />);

        expect(screen.getByText("bold").tagName).toBe("STRONG");
        expect(screen.getByText("italic").tagName).toBe("EM");
    });

    it("can keep generated links out of the tab order for embedded arg descriptions", () => {
        const { container } = render(<MarkupRenderer content="https://example.com" disableLinkTabStops />);

        const anchor = container.querySelector("a");
        expect(anchor).toBeTruthy();
        expect(anchor?.getAttribute("tabindex")).toBe("-1");
    });

    it("resolves embed-aware mentions in message content and fields", () => {
        render(
            <Embed
                json={{
                    id: "embed-mentions",
                    content: "Hello <@123>",
                    users: { "123": "@Jesse" },
                    channels: { "456": "#general" },
                    embeds: [{
                        title: "Report for <@123>",
                        description: "See <#456>",
                        fields: [
                            { name: "Owner <@123>", value: "Channel <#456>", inline: true },
                        ],
                    }],
                }}
                responseRef={{ current: null }}
                showDialog={vi.fn() as never}
            />,
        );

        expect(screen.getAllByText("@Jesse").length).toBeGreaterThan(0);
        expect(screen.getAllByText("#general").length).toBeGreaterThan(0);
    });
});
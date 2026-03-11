import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../pages/command", () => ({
    commandButtonAction: vi.fn(),
}));

import MarkupRenderer, { canRenderPlainText, hasDiscernableMarkup } from "./MarkupRenderer";

afterEach(() => {
    cleanup();
});

describe("MarkupRenderer", () => {
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
});
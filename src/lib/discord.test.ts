import { describe, expect, it } from "vitest";

import { canUseFastMarkupPath, createOptions, markup, markupWithPreparedOptions } from "./discord";

describe("markup", () => {
    it("detects fast-path eligibility for representative inputs", () => {
        expect(canUseFastMarkupPath("Plain text only", false)).toBe(true);
        expect(canUseFastMarkupPath("Plain text https://example.com", false)).toBe(true);
        expect(canUseFastMarkupPath("**bold** and _italic_", false)).toBe(false);
        expect(canUseFastMarkupPath("Hello <@123>", false)).toBe(false);
        expect(canUseFastMarkupPath("> quote", false)).toBe(false);
        expect(canUseFastMarkupPath("emoji :wave:", true)).toBe(false);
        expect(canUseFastMarkupPath("emoji :wave:", false)).toBe(true);
        expect(canUseFastMarkupPath("[docs](https://example.com)", false)).toBe(false);
    });

    it("uses the fast path for plain text while preserving links and line breaks", () => {
        const html = markup({
            txt: "Plain text https://example.com\nSecond line",
            replaceEmoji: false,
        });

        expect(html).toContain('<a href="https://example.com"');
        expect(html).toContain("<br/>");
        expect(html).toContain("Plain text ");
        expect(html).toContain("Second line");
    });

    it("still runs the rich parser for markdown formatting", () => {
        const html = markup({
            txt: "**bold** and _italic_",
            replaceEmoji: false,
        });

        expect(html).toContain("<strong>bold</strong>");
        expect(html).toContain("<em>italic</em>");
    });

    it("reuses prepared embed options without changing mention rendering", () => {
        const embed = {
            id: "prepared-options",
            content: "",
            users: { "123": "@Jesse" },
            channels: { "456": "#general" },
        };

        const prepared = markupWithPreparedOptions({
            txt: "Hello <@123> in <#456>",
            replaceEmoji: true,
            options: createOptions({ embed }),
        });

        const direct = markup({
            txt: "Hello <@123> in <#456>",
            replaceEmoji: true,
            embed,
        });

        expect(prepared).toContain('@Jesse');
        expect(prepared).toContain('#general');
        expect(prepared).toBe(direct);
    });
});
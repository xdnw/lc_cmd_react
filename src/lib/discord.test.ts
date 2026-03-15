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

    it("renders slash command references as in-app command links", () => {
        const html = markup({
            txt: "Run </settings info:1481873961384935498>",
            replaceEmoji: false,
        });

        expect(html).toContain('class="command-reference"');
        expect(html).toContain('href="#/command/settings%20info"');
        expect(html).toContain('>/settings info</a>');
    });

    it("renders plain mention tokens as stub spans without embed metadata", () => {
        const html = markup({
            txt: "Hello <@123> in <#456> with <@&789>",
            replaceEmoji: false,
        });

        expect(html).toContain('class="mention user"');
        expect(html).toContain('&lt;@123&gt;');
        expect(html).toContain('class="mention channel"');
        expect(html).toContain('&lt;#456&gt;');
        expect(html).toContain('class="mention role"');
        expect(html).toContain('&lt;@&amp;789&gt;');
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
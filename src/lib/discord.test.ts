import { describe, expect, it } from "vitest";

import { markup } from "./discord";

describe("markup", () => {
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
});
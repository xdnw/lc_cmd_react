import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, bench, describe, vi } from "vitest";

vi.mock("../../pages/command", () => ({
    commandButtonAction: vi.fn(),
}));

import MarkupRenderer, { Embed, hasDiscernableMarkup, type DiscordEmbed } from "./MarkupRenderer";
import { canUseFastMarkupPath, createOptions, markup, toHTML } from "@/lib/discord";

const PLAIN_TEXT_SAMPLE = "Plain text with a link https://example.com and another line\nSecond line";
const MARKDOWN_SAMPLE = "**bold** text with _italic_, ~~strike~~, [docs](https://example.com), and `code`";
const INLINE_MARKDOWN_SAMPLE = "**bold** _italic_ ~~strike~~ and `code` with trailing text";
const LINK_HEAVY_SAMPLE = "See https://example.com/docs and https://example.com/help for more details";
const MENTION_HEAVY_SAMPLE = "Hello <@123>, check <#456> and ping @everyone before <t:1700000000:R>.";

const EMBED_SAMPLE: DiscordEmbed = {
    id: "bench-embed",
    content: "Hello <@123> and welcome to <#456>",
    embeds: [{
        title: "**Alert** for <@123>",
        description: "See [docs](https://example.com) and _status_ updates.",
        fields: [
            { name: "Region", value: "North" },
            { name: "Owner", value: "<@123>", inline: true },
            { name: "Channel", value: "<#456>", inline: true },
            { name: "Notes", value: "Plain text field value" },
        ],
    }],
    users: { "123": "@Jesse" },
    channels: { "456": "#general" },
};

const RESPONSE_REF = { current: null };
const NO_OP_DIALOG = (() => {}) as never;
const EMBED_OPTIONS = createOptions({ embed: EMBED_SAMPLE });

let uncachedSequence = 0;

function nextUncachedValue(prefix: string): string {
    uncachedSequence += 1;
    return `${prefix} ${uncachedSequence}`;
}

afterEach(() => {
    cleanup();
});

describe("markup renderer", () => {
    bench("fast-path detector (warm)", () => {
        for (let index = 0; index < 500; index++) {
            canUseFastMarkupPath(PLAIN_TEXT_SAMPLE, true);
            canUseFastMarkupPath(MARKDOWN_SAMPLE, true);
        }
    });

    bench("fast-path detector (cold)", () => {
        for (let index = 0; index < 500; index++) {
            canUseFastMarkupPath(nextUncachedValue("Plain text with a link https://example.com and another line\nSecond line"), true);
            canUseFastMarkupPath(nextUncachedValue("**bold** text with _italic_, ~~strike~~, [docs](https://example.com), and `code`"), true);
        }
    });

    bench("detect discernable markup for plain text (warm)", () => {
        for (let index = 0; index < 500; index++) {
            hasDiscernableMarkup(PLAIN_TEXT_SAMPLE);
            hasDiscernableMarkup(MARKDOWN_SAMPLE);
        }
    });

    bench("detect discernable markup for plain text (cold)", () => {
        for (let index = 0; index < 500; index++) {
            hasDiscernableMarkup(nextUncachedValue("Plain text with a link https://example.com and another line\nSecond line"));
            hasDiscernableMarkup(nextUncachedValue("**bold** text with _italic_, ~~strike~~, [docs](https://example.com), and `code`"));
        }
    });

    bench("render plain text html", () => {
        markup({ txt: PLAIN_TEXT_SAMPLE, replaceEmoji: true });
    });

    bench("render plain text html (cold)", () => {
        markup({ txt: nextUncachedValue("Plain text with a link https://example.com and another line\nSecond line"), replaceEmoji: true });
    });

    bench("render markdown html", () => {
        markup({ txt: MARKDOWN_SAMPLE, replaceEmoji: true });
    });

    bench("render markdown html (cold)", () => {
        markup({ txt: `${MARKDOWN_SAMPLE} ${nextUncachedValue("cold-markdown")}`, replaceEmoji: true });
    });

    bench("render embed-aware markup html", () => {
        markup({ txt: EMBED_SAMPLE.content, replaceEmoji: true, embed: EMBED_SAMPLE });
    });

    bench("render embed-aware markup html (cold)", () => {
        const suffix = nextUncachedValue("cold-embed");
        markup({
            txt: `${EMBED_SAMPLE.content} ${suffix}`,
            replaceEmoji: true,
            embed: { ...EMBED_SAMPLE, id: suffix, content: `${EMBED_SAMPLE.content} ${suffix}` },
        });
    });

    bench("render inline markdown parser", () => {
        toHTML(INLINE_MARKDOWN_SAMPLE, { escapeHTML: true } as never);
    });

    bench("render inline markdown parser (cold)", () => {
        toHTML(`${INLINE_MARKDOWN_SAMPLE} ${nextUncachedValue("inline-markdown")}`, { escapeHTML: true } as never);
    });

    bench("render link-heavy parser", () => {
        toHTML(LINK_HEAVY_SAMPLE, { escapeHTML: true } as never);
    });

    bench("render link-heavy parser (cold)", () => {
        toHTML(`${LINK_HEAVY_SAMPLE} ${nextUncachedValue("link-heavy")}`, { escapeHTML: true } as never);
    });

    bench("render mention-heavy parser", () => {
        toHTML(MENTION_HEAVY_SAMPLE, EMBED_OPTIONS);
    });

    bench("render mention-heavy parser (cold)", () => {
        toHTML(`${MENTION_HEAVY_SAMPLE} ${nextUncachedValue("mention-heavy")}`, EMBED_OPTIONS);
    });

    bench("mount repeated markup renderers (warm)", () => {
        render(
            <div>
                {Array.from({ length: 80 }, (_, index) => (
                    <MarkupRenderer
                        key={index}
                        content={index % 2 === 0 ? MARKDOWN_SAMPLE : PLAIN_TEXT_SAMPLE}
                        embed={index % 3 === 0 ? EMBED_SAMPLE : undefined}
                    />
                ))}
            </div>,
        );
    });

    bench("mount repeated markup renderers (cold)", () => {
        const batchSeed = nextUncachedValue("batch");

        render(
            <div>
                {Array.from({ length: 80 }, (_, index) => (
                    <MarkupRenderer
                        key={`${batchSeed}-${index}`}
                        content={index % 2 === 0
                            ? `${MARKDOWN_SAMPLE} ${batchSeed}-${index}`
                            : `${PLAIN_TEXT_SAMPLE} ${batchSeed}-${index}`}
                        embed={index % 3 === 0
                            ? { ...EMBED_SAMPLE, id: `${batchSeed}-${index}`, content: `${EMBED_SAMPLE.content} ${batchSeed}-${index}` }
                            : undefined}
                    />
                ))}
            </div>,
        );
    });

    bench("mount embed component (warm)", () => {
        render(<Embed json={EMBED_SAMPLE} responseRef={RESPONSE_REF} showDialog={NO_OP_DIALOG} />);
    });

    bench("mount embed component (cold)", () => {
        const suffix = nextUncachedValue("cold-embed-mount");
        render(
            <Embed
                json={{
                    ...EMBED_SAMPLE,
                    id: suffix,
                    content: `${EMBED_SAMPLE.content} ${suffix}`,
                    embeds: EMBED_SAMPLE.embeds?.map((embed, index) => ({
                        ...embed,
                        title: `${embed.title ?? ""} ${suffix}-${index}`,
                        description: `${embed.description ?? ""} ${suffix}-${index}`,
                        fields: embed.fields?.map((field, fieldIndex) => ({
                            ...field,
                            value: `${field.value} ${suffix}-${fieldIndex}`,
                        })),
                    })),
                }}
                responseRef={RESPONSE_REF}
                showDialog={NO_OP_DIALOG}
            />,
        );
    });
});
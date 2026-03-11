import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, bench, describe, vi } from "vitest";

vi.mock("../../pages/command", () => ({
    commandButtonAction: vi.fn(),
}));

import MarkupRenderer, { Embed, hasDiscernableMarkup, type DiscordEmbed } from "./MarkupRenderer";
import { canUseFastMarkupPath, createOptions, markup, toHTML } from "@/lib/discord";
import type { TaskSummary, WebMyWar, WebTarget } from "@/lib/apitypes";

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

// Scroll/UX invariants for later virtualization work:
// - no missing rows during fast scroll
// - no focus loss on interactive controls inside rows
// - no visible row popping beyond initial overscan fill
// - expanded/collapsed state stays stable during filtering or refetch

let uncachedSequence = 0;

function nextUncachedValue(prefix: string): string {
    uncachedSequence += 1;
    return `${prefix} ${uncachedSequence}`;
}

function createTaskSummary(index: number): TaskSummary {
    const now = Date.now();
    const unhealthy = index % 7 === 0;

    return {
        id: index + 1,
        name: `task-${index + 1}`,
        createdAtMs: now - ((index + 1) * 15_000),
        intervalMs: 30_000 + ((index % 5) * 15_000),
        running: index % 11 === 0,
        currentRunStartMs: now - 7_500,
        lastRunStartMs: now - 25_000,
        lastRunEndMs: now - ((index % 6) * 10_000),
        lastRunDurationMs: 1_200 + ((index % 9) * 300),
        lastOutcome: unhealthy ? 2 : 1,
        totalRuns: 100 + index,
        totalSuccess: 80 + index,
        totalErrors: unhealthy ? 8 : 1,
        totalInterrupts: unhealthy ? 3 : 0,
        consecutiveFailures: unhealthy ? 2 : 0,
        lastSuccessAtMs: now - 60_000,
        lastFailureAtMs: unhealthy ? now - 20_000 : 0,
        lastErrorClass: unhealthy ? "TaskFailure" : "",
        lastErrorMessage: unhealthy ? `Task ${index + 1} hit a repeated failure window.` : "",
    };
}

type BenchSettingRow = {
    key: string;
    argType: string;
    value: string;
    help: string;
    invalid: boolean;
    unsupported: boolean;
    allowed: boolean;
};

function createBenchSettingRow(index: number): BenchSettingRow {
    const useMarkup = index % 4 === 0;
    return {
        key: `settings.key.${index + 1}`,
        argType: index % 3 === 0 ? "nation" : "text",
        value: useMarkup
            ? `**Alert ${index + 1}** for <@123> in <#456>`
            : `simple-value-${index + 1}`,
        help: `Setting ${index + 1} summary\nExpanded help for setting ${index + 1} with extra notes and a few details.`,
        invalid: index % 19 === 0,
        unsupported: index % 23 === 0,
        allowed: index % 17 !== 0,
    };
}

function createBenchTarget(index: number): WebTarget {
    return {
        id: 10_000 + index,
        nation: `Nation ${index}`,
        alliance_id: 20_000 + (index % 12),
        alliance: `Alliance ${index % 12}`,
        avg_infra: 2_000,
        cities: 12 + (index % 10),
        soldier: 40_000 + (index * 100),
        tank: 2_500 + (index * 10),
        aircraft: 1_800 + (index * 4),
        ship: 220 + (index % 40),
        missile: index % 2,
        nuke: index % 3 === 0 ? 1 : 0,
        spies: 60,
        position: 1,
        active_ms: Date.now() - (index * 60_000),
        color_id: 0,
        beige_turns: 0,
        off: 5,
        def: 3,
        score: 1_800,
        expected: 0,
        actual: 0,
        strength: 120_000,
    };
}

function createBenchWar(index: number): WebMyWar {
    return {
        id: 50_000 + index,
        target: createBenchTarget(index + 1),
        beigeReasons: {},
        peace: 0,
        blockade: index % 2 === 0 ? 1 : -1,
        ac: index % 3 === 0 ? 1 : -1,
        gc: index % 4 === 0 ? 1 : -1,
        ground_str: 100_000,
        att_res: 65,
        def_res: 42,
        att_map: 7,
        def_map: 5,
        iron_dome: index % 5 === 0,
        vds: index % 7 === 0,
        att_fortified: index % 3 === 0,
        def_fortified: index % 4 === 0,
    };
}

function TaskSectionBenchFixture({ count, expandedEvery = 5 }: { count: number; expandedEvery?: number }) {
    const rows = Array.from({ length: count }, (_, index) => createTaskSummary(index));

    return (
        <div className="divide-y overflow-hidden rounded-md border bg-card/40">
            {rows.map((task, index) => {
                const open = index % expandedEvery === 0;
                return (
                    <div key={task.id} className="border-l-4 border-l-muted px-3 py-2">
                        <button type="button" className="flex w-full items-start gap-3 text-left">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background/50">
                                {open ? "v" : ">"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none">
                                        {task.lastOutcome === 1 ? "OK" : "ERROR"}
                                    </span>
                                    <div className="min-w-0 truncate text-sm font-semibold">{task.name}</div>
                                    <div className="text-xs text-muted-foreground tabular-nums">#{task.id}</div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                                    every {task.intervalMs}ms • last end {task.lastRunEndMs}
                                </div>
                                {task.lastErrorMessage ? (
                                    <div className="mt-1 truncate text-xs text-muted-foreground">{task.lastErrorMessage}</div>
                                ) : null}
                            </div>
                        </button>
                        {open ? (
                            <div className="mt-2 rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
                                <MarkupRenderer content={`**Task ${task.id}** health for <@123> in <#456>`} embed={EMBED_SAMPLE} />
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

function SettingsSectionBenchFixture({ count }: { count: number }) {
    const rows = Array.from({ length: count }, (_, index) => createBenchSettingRow(index));

    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }, (_, categoryIndex) => (
                <div key={categoryIndex} className="rounded border p-4">
                    <div className="mb-4 text-lg font-semibold">Category {categoryIndex + 1}</div>
                    <div className="space-y-4">
                        {Array.from({ length: 2 }, (_, subgroupIndex) => {
                            const start = (categoryIndex * 40) + (subgroupIndex * 20);
                            const groupRows = rows.slice(start, start + 20);

                            return (
                                <div key={`${categoryIndex}-${subgroupIndex}`} className="space-y-2">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Subgroup {subgroupIndex + 1}
                                    </div>
                                    <div className="space-y-2">
                                        {groupRows.map((row) => (
                                            <div key={row.key} className="rounded border border-border p-2 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium wrap-break-word">{row.key}</div>
                                                        <div className="text-xs text-muted-foreground wrap-break-word">{row.argType}</div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1 justify-end text-[11px]">
                                                        {row.invalid ? <span>Invalid</span> : null}
                                                        {row.unsupported ? <span>Unsupported</span> : null}
                                                        {!row.allowed ? <span>Unavailable</span> : null}
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-xs wrap-break-word">
                                                    <div className="text-muted-foreground">Value</div>
                                                    {hasDiscernableMarkup(row.value) ? (
                                                        <div className="markup messageContent text-sm text-foreground">
                                                            <MarkupRenderer content={row.value} embed={EMBED_SAMPLE} />
                                                        </div>
                                                    ) : (
                                                        <div>{row.value}</div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground wrap-break-word">{row.help}</div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button type="button" className="rounded border px-2 py-1 text-xs">Edit</button>
                                                    <button type="button" className="rounded border px-2 py-1 text-xs">Clear</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AuditSectionBenchFixture({ count }: { count: number }) {
    return (
        <div className="bg-light/10 border border-light/10 p-2 mt-2 rounded">
            <div className="p-1 relative rounded">
                {Array.from({ length: count }, (_, index) => (
                    <div key={index} className="p-0.5 mb-0.5 border bg-red-600/20 border-red-500/50 rounded-sm break-all">
                        <div className="flex justify-between items-center">
                            <span className="font-bold">Audit {index + 1}: flagged</span>
                        </div>
                        <div className="p-1 opacity-100">
                            <MarkupRenderer content={`**Audit ${index + 1}** requires review for <@123> in <#456>.\nSee https://example.com/audits/${index + 1}`} embed={EMBED_SAMPLE} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WarSectionBenchFixture({ count }: { count: number }) {
    const me = createBenchTarget(0);
    const wars = Array.from({ length: count }, (_, index) => createBenchWar(index));

    return (
        <div className="space-y-4">
            {wars.map((war, index) => {
                const isAttacker = index % 2 === 0;
                const target = war.target;
                const myMap = isAttacker ? war.att_map : war.def_map;
                const enemyMap = isAttacker ? war.def_map : war.att_map;
                const myResistance = isAttacker ? war.att_res : war.def_res;
                const enemyResistance = isAttacker ? war.def_res : war.att_res;

                return (
                    <div key={war.id} className="border-2 border-red-200 bg-slate-500/50 rounded-md overflow-hidden">
                        <div className="bg-red-200 px-3 py-2 text-sm font-semibold">
                            War {war.id} • {target.nation}
                        </div>
                        <div className="grid gap-3 p-3 md:grid-cols-2">
                            <div className="rounded border bg-background/60 p-2 text-xs space-y-1">
                                <div className="font-semibold">Enemy</div>
                                <div>{target.alliance}</div>
                                <div>cities: {target.cities}</div>
                                <div>soldiers: {target.soldier}</div>
                                <div>tanks: {target.tank}</div>
                                <div>aircraft: {target.aircraft}</div>
                                <div>ships: {target.ship}</div>
                                <div className="space-y-1 pt-1">
                                    <div className="text-[11px] text-muted-foreground">MAP</div>
                                    <div className="h-2 rounded bg-muted">
                                        <div className="h-full rounded bg-orange-500/70" style={{ width: `${Math.max(10, enemyMap * 12)}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="text-[11px] text-muted-foreground">Resistance</div>
                                    <div className="h-2 rounded bg-muted">
                                        <div className="h-full rounded bg-red-500/70" style={{ width: `${Math.max(10, enemyResistance)}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="rounded border bg-background/60 p-2 text-xs space-y-1">
                                <div className="font-semibold">Me</div>
                                <div>{me.nation}</div>
                                <div>soldiers: {me.soldier}</div>
                                <div>tanks: {me.tank}</div>
                                <div>aircraft: {me.aircraft}</div>
                                <div>ships: {me.ship}</div>
                                <div className="space-y-1 pt-1">
                                    <div className="text-[11px] text-muted-foreground">MAP</div>
                                    <div className="h-2 rounded bg-muted">
                                        <div className="h-full rounded bg-emerald-500/70" style={{ width: `${Math.max(10, myMap * 12)}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="text-[11px] text-muted-foreground">Resistance</div>
                                    <div className="h-2 rounded bg-muted">
                                        <div className="h-full rounded bg-green-500/70" style={{ width: `${Math.max(10, myResistance)}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2 border-t bg-background/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                "War Link",
                                "Ground Attack",
                                "Airstrike",
                                "Naval",
                            ].map((label) => (
                                <button key={label} type="button" className="rounded border px-2 py-1 text-xs font-medium">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
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

    bench("mount repeated embed components (warm)", () => {
        render(
            <div>
                {Array.from({ length: 24 }, (_, index) => (
                    <Embed
                        key={index}
                        json={{ ...EMBED_SAMPLE, id: `warm-embed-${index}` }}
                        responseRef={RESPONSE_REF}
                        showDialog={NO_OP_DIALOG}
                    />
                ))}
            </div>,
        );
    });

    bench("mount repeated embed components (cold)", () => {
        const batchSeed = nextUncachedValue("embed-batch");

        render(
            <div>
                {Array.from({ length: 24 }, (_, index) => (
                    <Embed
                        key={`${batchSeed}-${index}`}
                        json={{
                            ...EMBED_SAMPLE,
                            id: `${batchSeed}-${index}`,
                            content: `${EMBED_SAMPLE.content} ${batchSeed}-${index}`,
                            embeds: EMBED_SAMPLE.embeds?.map((embed, embedIndex) => ({
                                ...embed,
                                title: `${embed.title ?? ""} ${batchSeed}-${index}-${embedIndex}`,
                                description: `${embed.description ?? ""} ${batchSeed}-${index}-${embedIndex}`,
                                fields: embed.fields?.map((field, fieldIndex) => ({
                                    ...field,
                                    name: `${field.name} ${batchSeed}-${index}-${fieldIndex}`,
                                    value: `${field.value} ${batchSeed}-${index}-${fieldIndex}`,
                                })),
                            })),
                        }}
                        responseRef={RESPONSE_REF}
                        showDialog={NO_OP_DIALOG}
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

    bench("mount task row section fixture", () => {
        render(<TaskSectionBenchFixture count={160} />);
    });

    bench("mount settings row section fixture", () => {
        render(<SettingsSectionBenchFixture count={240} />);
    });

    bench("mount audit section fixture", () => {
        render(<AuditSectionBenchFixture count={120} />);
    });

    bench("mount war section fixture", () => {
        render(<WarSectionBenchFixture count={36} />);
    });
});
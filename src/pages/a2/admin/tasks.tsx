import type { JSX } from "react";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import EndpointWrapper from "@/components/api/bulkwrapper";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import { ErrorSample, TaskDetails, TaskList, TaskSummary } from "@/lib/apitypes";
import { LOCUTUS_TASK, LOCUTUS_TASKS } from "@/lib/endpoints";
import LazyIcon from "@/components/ui/LazyIcon";

const Outcome = {
    EMPTY: 0,
    SUCCESS: 1,
    ERROR: 2,
    INTERRUPTED: 3,
} as const;

type Health = "OK" | "ERROR" | "INTERRUPTED" | "STALE" | "STUCK" | "NEVER";

type HealthInfo = {
    health: Health;
    sev: number; // smaller => worse (for sorting)
    reason?: string;
};

const EMPTY_ARGS = Object.freeze({}) as Record<string, never>;
const EMPTY_TASKS: TaskSummary[] = [];
const EMPTY_ERRORS: ErrorSample[] = [];
const HISTORY_GRAPH = 1024;
const HISTORY_LIST = 25;

const DASH_REFRESH_MS = 10_000;

const HEALTH_ORDER: Health[] = ["ERROR", "STUCK", "INTERRUPTED", "STALE", "NEVER", "OK"];

function fmtMs(ms?: number) {
    if (ms === undefined || ms < 0) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
    return `${(ms / 3_600_000).toFixed(1)}h`;
}

function age(now: number | undefined, t?: number) {
    if (!now) return "—";
    if (!t || t <= 0) return "never";
    return `${fmtMs(Math.max(0, now - t))} ago`;
}

function outcomeText(code: number) {
    switch (code) {
        case Outcome.SUCCESS:
            return "SUCCESS";
        case Outcome.ERROR:
            return "ERROR";
        case Outcome.INTERRUPTED:
            return "INTERRUPTED";
        case Outcome.EMPTY:
        default:
            return "NEVER";
    }
}

function outcomeBadgeClass(code: number) {
    switch (code) {
        case Outcome.SUCCESS:
            return "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-green-500/20";
        case Outcome.ERROR:
            return "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500/20";
        case Outcome.INTERRUPTED:
            return "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20";
        case Outcome.EMPTY:
        default:
            return "bg-muted text-muted-foreground ring-1 ring-border";
    }
}

function outcomeBarClass(code: number) {
    switch (code) {
        case Outcome.SUCCESS:
            return "bg-green-500/70";
        case Outcome.ERROR:
            return "bg-red-500/70";
        case Outcome.INTERRUPTED:
            return "bg-orange-500/70";
        case Outcome.EMPTY:
        default:
            return "bg-muted-foreground/30";
    }
}

function healthOf(t: TaskSummary, now?: number): HealthInfo {
    if (t.totalRuns <= 0 || t.lastOutcome === Outcome.EMPTY) return { health: "NEVER", sev: 4 };

    const interval = Math.max(1, t.intervalMs);

    // Time-based checks require a real "now"
    if (now && t.running && t.currentRunStartMs > 0) {
        const runningFor = now - t.currentRunStartMs;
        const stuckMs = Math.max(interval * 5, 60_000);
        if (runningFor > stuckMs) {
            return { health: "STUCK", reason: `running for ${fmtMs(runningFor)}`, sev: 0 };
        }
    }

    if (t.lastOutcome === Outcome.ERROR) return { health: "ERROR", reason: t.lastErrorMessage ?? undefined, sev: 1 };
    if (t.lastOutcome === Outcome.INTERRUPTED) return { health: "INTERRUPTED", reason: "interrupted", sev: 2 };

    if (now && t.lastRunEndMs > 0) {
        const sinceEnd = now - t.lastRunEndMs;
        const staleMs = Math.max(interval * 3, 60_000);
        if (sinceEnd > staleMs) {
            return { health: "STALE", reason: `last end ${fmtMs(sinceEnd)} ago`, sev: 3 };
        }
    }

    return { health: "OK", sev: 10 };
}

function healthBadgeClass(h: Health) {
    switch (h) {
        case "OK":
            return "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-green-500/20";
        case "STALE":
            return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-1 ring-yellow-500/20";
        case "INTERRUPTED":
            return "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20";
        case "ERROR":
            return "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500/20";
        case "STUCK":
            return "bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/20";
        case "NEVER":
        default:
            return "bg-muted text-muted-foreground ring-1 ring-border";
    }
}

function healthRowClass(h: Health) {
    switch (h) {
        case "ERROR":
            return "border-l-red-500/60 bg-red-500/5 hover:bg-red-500/10";
        case "STUCK":
            return "border-l-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10";
        case "INTERRUPTED":
            return "border-l-orange-500/60 bg-orange-500/5 hover:bg-orange-500/10";
        case "STALE":
            return "border-l-yellow-500/60 bg-yellow-500/5 hover:bg-yellow-500/10";
        case "NEVER":
            return "border-l-muted bg-muted/10 hover:bg-muted/20";
        case "OK":
        default:
            return "border-l-transparent hover:bg-muted/30";
    }
}

/**
 * Updates "now" on a controlled interval to avoid recomputing/sorting every render.
 * Returns undefined until mounted (SSR-safe, avoids hydration mismatch for "ago" text).
 */
function useNow(refreshMs: number): number | undefined {
    const [now, setNow] = useState<number | undefined>(undefined);

    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();

        if (refreshMs <= 0) return;

        const id: ReturnType<typeof setInterval> = setInterval(tick, refreshMs);
        return () => clearInterval(id);
    }, [refreshMs]);

    return now;
}

/**
 * Smooth progress (0..1) + remaining time until the next `tick` (from useNow) updates again.
 * Updates locally every ~200ms, without forcing the whole dashboard to recompute.
 */
function useRefreshProgress(
    refreshMs: number,
    tick: number | undefined
): { progress: number; remainingMs?: number } {
    const [realNow, setRealNow] = useState<number | undefined>(undefined);

    useEffect(() => {
        const t = () => setRealNow(Date.now());
        t();
        const id = setInterval(t, 200);
        return () => clearInterval(id);
    }, []);

    if (!tick || !realNow || refreshMs <= 0) {
        return { progress: 0, remainingMs: undefined };
    }

    const elapsed = Math.max(0, Math.min(refreshMs, realNow - tick));
    return { progress: elapsed / refreshMs, remainingMs: refreshMs - elapsed };
}

const RefreshCountdownBar = memo(function RefreshCountdownBar({
    tick,
    refreshMs,
    active = true,
    loading = false,
}: {
    tick: number | undefined;
    refreshMs: number;
    active?: boolean;
    loading?: boolean;
}) {
    const { progress, remainingMs } = useRefreshProgress(refreshMs, tick);
    const paused = !active;

    // Label: when there's no remainingMs and we're paused, show "paused".
    // const label =
    //     remainingMs === undefined ? (paused ? (tick ? "—" : "paused") : "—") : `${Math.max(0, Math.ceil(remainingMs / 1000))}s`;
    const label = loading
        ? "loading..."
        : remainingMs === undefined
            ? (paused ? (tick ? "—" : "paused") : "—")
            : `${Math.max(0, Math.ceil(remainingMs / 1000))}s`;

    const innerClass = paused ? "bg-red-500/70" : "bg-primary/60";

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                <div
                    className={cn("h-full transition-[width] duration-150", innerClass)}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                />
            </div>
            <span className="tabular-nums">{label}</span>
        </div>
    );
});

const OutcomeBadge = memo(function OutcomeBadge({ code }: { code: number }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none tabular-nums",
                outcomeBadgeClass(code)
            )}
        >
            {outcomeText(code)}
        </span>
    );
});

const HealthCountChip = memo(function HealthCountChip({ health, count }: { health: Health; count: number }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
                healthBadgeClass(health)
            )}
            title={`${health}: ${count}`}
        >
            {health}
            <span className="text-[11px] font-medium opacity-80">{count}</span>
        </span>
    );
});

const CopyToClipboardButton = memo(function CopyToClipboardButton({
    text,
    label = "Copy",
}: {
    text: string;
    label?: string;
}) {
    const onCopy = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const t = text ?? "";
        if (!t) return;

        // Best-effort; no toast system assumed.
        void (async () => {
            try {
                if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(t);
                    return;
                }
            } catch {
                // ignore
            }

            try {
                if (typeof window !== "undefined") {
                    // fallback: lets user copy manually
                    window.prompt("Copy to clipboard:", t);
                }
            } catch {
                // ignore
            }
        })();
    }, [text]);

    return (
        <Button variant="outline" size="sm" onClick={onCopy} className="h-7 px-2 text-[11px]">
            <LazyIcon name="Copy" className="mr-1 h-3.5 w-3.5" />
            {label}
        </Button>
    );
});

type RunHistorySparklineProps = {
    startTimesMs: number[];
    durationsMs: number[];
    outcomeCodes: number[];
    from: number;
    to: number; // exclusive
};

const RunHistorySparkline = memo(function RunHistorySparkline({
    startTimesMs,
    durationsMs,
    outcomeCodes,
    from,
    to,
}: RunHistorySparklineProps) {
    const count = Math.max(0, to - from);

    const maxDur = useMemo(() => {
        let max = 0;
        for (let i = from; i < to; i++) max = Math.max(max, Number(durationsMs[i] ?? 0));
        return max;
    }, [durationsMs, from, to]);

    if (count <= 0) return null;

    const denom = maxDur || 1;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="font-medium">Recent run durations</div>
                <div className="tabular-nums">max {fmtMs(maxDur)}</div>
            </div>

            <div className="flex h-12 items-end gap-0.5 rounded-md border bg-background/40 p-1">
                {Array.from({ length: count }).map((_, idx) => {
                    const i = from + idx;
                    const start = Number(startTimesMs[i] ?? 0);
                    const dur = Math.max(0, Number(durationsMs[i] ?? 0));
                    const out = Number(outcomeCodes[i] ?? Outcome.EMPTY);

                    const heightPct = Math.max(6, Math.round((dur / denom) * 100));
                    const title = `${start ? new Date(start).toLocaleString() : "—"} • ${fmtMs(dur)} • ${outcomeText(out)}`;

                    return (
                        <div
                            key={start || i}
                            className={cn("flex-1 rounded-sm", outcomeBarClass(out))}
                            style={{ height: `${heightPct}%` }}
                            title={title}
                        />
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-green-500/70" />
                    success
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-red-500/70" />
                    error
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-orange-500/70" />
                    interrupted
                </span>
            </div>
        </div>
    );
});

type TaskDetailsInlineProps = {
    id: number;
    now: number | undefined;
};

const TaskDetailsInline = memo(function TaskDetailsInline({ id, now }: TaskDetailsInlineProps) {
    const args = useMemo(() => ({ id: String(id) }), [id]);

    const renderDetails = useCallback(
        ({
            data,
            reload,
            isRefetching,
        }: {
            data: TaskDetails;
            reload?: () => void;
            isRefetching?: boolean;
        }) => {
            if (!data.found || !data.summary) {
                return <div className="text-sm text-muted-foreground">Task not found.</div>;
            }

            const summary = data.summary;
            const errs = data.errors ?? EMPTY_ERRORS;

            const hist = data.history;
            const startTimes = hist?.startTimesMs ?? [];
            const durations = hist?.durationsMs ?? [];
            const outcomes = (hist?.outcomeCodes as number[] | undefined) ?? [];
            const n = startTimes.length;

            const fromList = Math.max(0, n - HISTORY_LIST);
            const fromGraph = Math.max(0, n - HISTORY_GRAPH);

            const runRows: JSX.Element[] = [];
            for (let i = n - 1; i >= fromList; i--) {
                const startMs = startTimes[i];
                const dur = durations[i];
                const out = Number(outcomes[i] ?? Outcome.EMPTY);

                runRows.push(
                    <div
                        key={startMs ?? i}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 text-xs tabular-nums"
                    >
                        <div className="truncate text-muted-foreground">
                            {startMs ? new Date(startMs).toLocaleString() : "—"}
                        </div>
                        <div className="text-right">{fmtMs(dur)}</div>
                        <div className="flex justify-end">
                            <OutcomeBadge code={out} />
                        </div>
                    </div>
                );
            }

            const successRate =
                summary.totalRuns > 0 ? Math.round((summary.totalSuccess / summary.totalRuns) * 100) : 0;

            return (
                <div className="space-y-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">
                            details for <span className="font-mono">#{id}</span>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={reload}
                            disabled={!reload || Boolean(isRefetching)}
                            className="h-7 px-2 text-[11px]"
                        >
                            <LazyIcon
                                name="RotateCcw"
                                className={cn("mr-1 h-3.5 w-3.5", isRefetching && "animate-spin")}
                            />
                            Reload details
                        </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-md border bg-background/40 p-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Counts
                            </div>
                            <div className="mt-1 space-y-0.5 text-xs tabular-nums">
                                <div>runs: {summary.totalRuns}</div>
                                <div>success: {summary.totalSuccess}</div>
                                <div>errors: {summary.totalErrors}</div>
                                <div>interrupts: {summary.totalInterrupts}</div>
                                <div className="text-muted-foreground">success rate: {successRate}%</div>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                                <div
                                    className="h-full bg-green-500/60"
                                    style={{ width: `${Math.max(0, Math.min(100, successRate))}%` }}
                                    aria-hidden="true"
                                />
                            </div>
                        </div>

                        <div className="rounded-md border bg-background/40 p-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Last activity
                            </div>
                            <div className="mt-1 space-y-0.5 text-xs tabular-nums">
                                <div>last end: {age(now, summary.lastRunEndMs)}</div>
                                <div>duration: {fmtMs(summary.lastRunDurationMs)}</div>
                                <div>last outcome: {outcomeText(summary.lastOutcome)}</div>
                            </div>
                        </div>

                        <div className="rounded-md border bg-background/40 p-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                History window
                            </div>
                            <div className="mt-1 space-y-0.5 text-xs">
                                <div className="text-muted-foreground">
                                    since: {data.sinceMs ? new Date(data.sinceMs).toLocaleString() : "—"}
                                </div>
                                <div className="text-muted-foreground">showing: last {Math.min(HISTORY_LIST, n)}</div>
                            </div>
                        </div>
                    </div>

                    {n > 0 ? (
                        <RunHistorySparkline
                            startTimesMs={startTimes}
                            durationsMs={durations}
                            outcomeCodes={outcomes}
                            from={fromGraph}
                            to={n}
                        />
                    ) : null}

                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Recent distinct errors
                        </div>

                        {errs.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No recorded errors.</div>
                        ) : (
                            <div className="space-y-2">
                                {errs.map((e) => (
                                    <details
                                        key={`${e.fingerprint}-${e.firstSeenAtMs}`}
                                        className="rounded-md border bg-background/40 p-2"
                                    >
                                        <summary className="cursor-pointer select-none text-sm">
                                            <span className="font-mono">{e.throwableClass}</span>
                                            {e.message ? (
                                                <span className="text-muted-foreground"> — {e.message}</span>
                                            ) : null}
                                            <span className="text-muted-foreground"> (x{e.count})</span>
                                        </summary>

                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-[11px] text-muted-foreground tabular-nums">
                                                first: {age(now, e.firstSeenAtMs)} • last: {age(now, e.lastSeenAtMs)}
                                            </div>
                                            <CopyToClipboardButton text={e.stackTrace ?? ""} label="Copy stack" />
                                        </div>

                                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
                                            {e.stackTrace}
                                        </pre>
                                    </details>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Recent runs (last {Math.min(HISTORY_LIST, n)})
                        </div>
                        {n === 0 ? (
                            <div className="text-sm text-muted-foreground">No history.</div>
                        ) : (
                            <div className="space-y-1">{runRows}</div>
                        )}
                    </div>
                </div>
            );
        },
        [id, now]
    );

    return (
        <div className="mt-2 rounded-md border bg-muted/20 px-3 py-2.5">
            <EndpointWrapper endpoint={LOCUTUS_TASK} args={args}>
                {renderDetails}
            </EndpointWrapper>
        </div>
    );
});

type TaskRowProps = {
    task: TaskSummary;
    health: HealthInfo;
    now: number | undefined;
    open: boolean;
    onToggleOpen: (taskId: number) => void;
};

const TaskRow = memo(function TaskRow({ task, health, now, open, onToggleOpen }: TaskRowProps) {
    const panelId = `task-details-${task.id}`;
    const rowDomId = `task-row-${task.id}`;

    const toggleOpen = useCallback(() => {
        onToggleOpen(task.id);
    }, [onToggleOpen, task.id]);

    const showLastError =
        (task.lastOutcome === Outcome.ERROR || task.lastOutcome === Outcome.INTERRUPTED) &&
        Boolean(task.lastErrorClass || task.lastErrorMessage);

    const runningFor =
        task.running && now && task.currentRunStartMs > 0 ? fmtMs(Math.max(0, now - task.currentRunStartMs)) : undefined;

    const secondaryLine = showLastError
        ? `${task.lastErrorClass}${task.lastErrorMessage ? `: ${task.lastErrorMessage}` : ""}`
        : health.reason;

    return (
        <div
            id={rowDomId}
            className={cn(
                "border-l-4 transition-colors",
                healthRowClass(health.health),
                open && "ring-1 ring-inset ring-border"
            )}
        >
            <button
                type="button"
                onClick={toggleOpen}
                aria-expanded={open}
                aria-controls={panelId}
                className={cn(
                    "flex w-full items-start gap-3 px-3 py-2 text-left",
                    "outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
            >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background/50">
                    <LazyIcon
                        name="ChevronDown"
                        className={cn("h-5 w-5 transition-transform duration-200", open && "rotate-180")}
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                            className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
                                healthBadgeClass(health.health)
                            )}
                        >
                            {health.health}
                        </span>

                        <div className="min-w-0 truncate text-sm font-semibold" title={task.name}>
                            {task.name}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">#{task.id}</div>

                        {task.running ? (
                            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-500/20 dark:text-blue-300">
                                RUNNING{runningFor ? ` • ${runningFor}` : ""}
                            </span>
                        ) : null}

                        {task.consecutiveFailures > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
                                fails {task.consecutiveFailures}
                            </span>
                        ) : null}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                        every {fmtMs(task.intervalMs)} • last end {age(now, task.lastRunEndMs)} • dur{" "}
                        {fmtMs(task.lastRunDurationMs)}
                    </div>

                    {secondaryLine ? (
                        <div className="mt-1 truncate text-xs text-muted-foreground" title={secondaryLine}>
                            {secondaryLine}
                        </div>
                    ) : null}
                </div>
            </button>

            {open ? (
                <div id={panelId} className="px-3 pb-2">
                    <TaskDetailsInline id={task.id} now={now} />
                </div>
            ) : null}
        </div>
    );
});

type TasksDashboardViewProps = {
    data: TaskList;
    onlyUnhealthy: boolean;
    onToggleOnlyUnhealthy: () => void;
    reload?: () => void;
    isRefetching?: boolean;
};

const TasksDashboardView = memo(function TasksDashboardView({
    data,
    onlyUnhealthy,
    onToggleOnlyUnhealthy,
    reload,
    isRefetching,
}: TasksDashboardViewProps) {
    const now = useNow(DASH_REFRESH_MS);
    const tasks = data.values ?? EMPTY_TASKS;

    const [searchParams, setSearchParams] = useSearchParams();
    const openTaskParam = searchParams.get("openTask"); // string | null

    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);

    const [runningOnly, setRunningOnly] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [tick, setTick] = useState<number | undefined>(undefined);

    const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set<number>());
    const lastAutoScrolledId = useRef<number | null>(null);

    useEffect(() => {
        if (!autoRefresh || !reload) return;

        let cancelled = false;
        let timerId: ReturnType<typeof setTimeout> | undefined;

        const run = async () => {
            while (!cancelled) {
                try {
                    await reload();           // refetch tasks
                } finally {
                    if (!cancelled) setTick(Date.now()); // start countdown for next refresh
                }

                await new Promise<void>((res) => {
                    timerId = setTimeout(() => res(), DASH_REFRESH_MS);
                });
            }
        };

        run();

        return () => {
            cancelled = true;
            if (timerId) clearTimeout(timerId);
        };
    }, [autoRefresh, reload]);

    useEffect(() => {
        if (autoRefresh) setTick(Date.now());
    }, []); // or [autoRefresh] if you want it when toggled on

    useEffect(() => {
        if (!openTaskParam) return;

        const id = Number(openTaskParam);
        if (!Number.isFinite(id)) return;

        // Only expand if the task exists in the current list
        const exists = tasks.some((t) => t.id === id);
        if (!exists) return;

        setExpanded((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });

        // prevent repeated scroll on refresh/sort
        if (lastAutoScrolledId.current === id) return;
        lastAutoScrolledId.current = id;

        const raf = window.requestAnimationFrame(() => {
            document.getElementById(`task-row-${id}`)?.scrollIntoView({
                block: "start",
                behavior: "smooth",
            });
        });

        return () => window.cancelAnimationFrame(raf);
    }, [openTaskParam, tasks]);

    const onReloadClick = useCallback(() => {
        if (reload) reload();
        setTick(Date.now());
    }, [reload]);

    // Sort/compute health independent of the filter so toggling doesn't redo the sort.
    const sorted = useMemo(() => {
        const sortClock = tick; // only changes when you reload
        const withHealth = tasks.map((task) => ({ task, health: healthOf(task, sortClock) }));
        withHealth.sort((a, b) => a.health.sev - b.health.sev || a.task.name.localeCompare(b.task.name));
        return withHealth;
    }, [tasks, tick]);

    const healthCounts = useMemo(() => {
        const counts: Record<Health, number> = {
            OK: 0,
            ERROR: 0,
            INTERRUPTED: 0,
            STALE: 0,
            STUCK: 0,
            NEVER: 0,
        };
        for (const x of sorted) counts[x.health.health] += 1;
        return counts;
    }, [sorted]);

    const rows = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();

        let r = sorted;

        if (onlyUnhealthy) r = r.filter((x) => x.health.health !== "OK");
        if (runningOnly) r = r.filter((x) => x.task.running);

        if (q) {
            r = r.filter((x) => {
                const idMatch = String(x.task.id).includes(q) || `#${x.task.id}`.includes(q);
                const nameMatch = x.task.name.toLowerCase().includes(q);
                const healthMatch = x.health.health.toLowerCase().includes(q);
                return idMatch || nameMatch || healthMatch;
            });
        }

        return r;
    }, [sorted, deferredQuery, onlyUnhealthy, runningOnly]);

    const onToggleAutoRefresh = useCallback(() => {
        setAutoRefresh((v) => {
            const next = !v;
            if (next) setTick(Date.now()); // start countdown immediately
            else setTick(undefined); // clear tick when pausing
            return next;
        });
    }, []);

    const onToggleRunningOnly = useCallback(() => {
        setRunningOnly((v) => !v);
    }, []);

    const onChangeQuery = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    }, []);

    const onClearQuery = useCallback(() => {
        setQuery("");
    }, []);

    const onToggleOpen = useCallback((taskId: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            const willOpen = !next.has(taskId);
            if (willOpen) next.add(taskId);
            else next.delete(taskId);

            setSearchParams((prevSP) => {
                const sp = new URLSearchParams(prevSP);
                if (willOpen) sp.set("openTask", String(taskId));
                else if (sp.get("openTask") === String(taskId)) sp.delete("openTask");
                return sp;
            }, { replace: true, preventScrollReset: true });

            return next;
        });
    }, [setSearchParams]);

    const collapseAll = useCallback(() => {
        setExpanded(new Set());
        setSearchParams((prevSP) => {
            const sp = new URLSearchParams(prevSP);
            sp.delete("openTask");
            return sp;
        }, { replace: true, preventScrollReset: true });
    }, [setSearchParams]);

    const expandShown = useCallback(() => {
        setExpanded(() => new Set(rows.map((x) => x.task.id)));
    }, [rows]);

    const expandedCount = expanded.size;

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <div className="text-2xl font-semibold tracking-tight">Task Health</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            {HEALTH_ORDER.map((h) => (
                                <HealthCountChip key={h} health={h} count={healthCounts[h]} />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onReloadClick}
                            disabled={!reload || Boolean(isRefetching)}
                            title="Reload tasks now"
                        >
                            <LazyIcon name="RotateCcw" className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")} />
                            Reload
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onToggleAutoRefresh}
                            aria-pressed={autoRefresh}
                            title="Toggle auto-refresh"
                        >
                            <LazyIcon name={autoRefresh ? "Pause" : "Play"} className="mr-2 h-4 w-4" />
                            Auto {autoRefresh ? "on" : "off"}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onToggleOnlyUnhealthy} aria-pressed={onlyUnhealthy}>
                            {onlyUnhealthy ? "Show all" : "Only unhealthy"}
                        </Button>

                        <Button variant="outline" size="sm" onClick={onToggleRunningOnly} aria-pressed={runningOnly}>
                            {runningOnly ? "All tasks" : "Running only"}
                        </Button>

                        <Button variant="outline" size="sm" onClick={expandShown} disabled={rows.length === 0}>
                            <LazyIcon name="ChevronDown" className="mr-2 h-4 w-4" />
                            Expand shown
                        </Button>

                        <Button variant="outline" size="sm" onClick={collapseAll} disabled={expandedCount === 0}>
                            <LazyIcon name="ChevronUp" className="mr-2 h-4 w-4" />
                            Collapse all
                        </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        showing <span className="tabular-nums">{rows.length}</span> /{" "}
                        <span className="tabular-nums">{tasks.length}</span>
                        {expandedCount > 0 ? (
                            <>
                                {" "}
                                • expanded <span className="tabular-nums">{expandedCount}</span>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor="task-search">
                        Search tasks
                    </label>
                    <div className="flex w-full max-w-md items-center gap-2">
                        <div className="relative flex-1">
                            <LazyIcon
                                name="Search"
                                className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                            />
                            <input
                                id="task-search"
                                value={query}
                                onChange={onChangeQuery}
                                placeholder="Search by name or #id…"
                                className={cn(
                                    "h-9 w-full rounded-md border bg-background px-8 text-sm",
                                    "outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                )}
                            />
                            {query ? (
                                <button
                                    type="button"
                                    onClick={onClearQuery}
                                    className={cn(
                                        "absolute right-2 top-2.5 inline-flex h-4 w-4 items-center justify-center rounded",
                                        "text-muted-foreground hover:text-foreground",
                                        "outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    )}
                                    aria-label="Clear search"
                                    title="Clear"
                                >
                                    <LazyIcon name="X" className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="ml-auto hidden text-xs text-muted-foreground md:block">
                        last tick: {tick ? new Date(tick).toLocaleTimeString() : autoRefresh ? "—" : "paused"}
                    </div>
                </div>

                <RefreshCountdownBar tick={tick} refreshMs={DASH_REFRESH_MS} active={autoRefresh && !isRefetching} loading={isRefetching} />
            </div>

            <div className="divide-y overflow-hidden rounded-md border bg-card/40">
                {rows.length === 0 ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">
                        No tasks to show{query ? " (try clearing your search)" : ""}.
                    </div>
                ) : (
                    rows.map(({ task, health }) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            health={health}
                            now={now}
                            open={expanded.has(task.id)}
                            onToggleOpen={onToggleOpen}
                        />
                    ))
                )}
            </div>
        </div>
    );
});

export default function TasksDashboard() {
    const [onlyUnhealthy, setOnlyUnhealthy] = useState(false);

    const toggleOnlyUnhealthy = useCallback(() => {
        setOnlyUnhealthy((v) => !v);
    }, []);

    const renderDashboard = useCallback(
        ({
            data,
            reload,
            isRefetching,
        }: {
            data: TaskList;
            reload?: () => void;
            isRefetching?: boolean;
        }) => (
            <TasksDashboardView
                data={data}
                onlyUnhealthy={onlyUnhealthy}
                onToggleOnlyUnhealthy={toggleOnlyUnhealthy}
                reload={reload}
                isRefetching={isRefetching}
            />
        ),
        [onlyUnhealthy, toggleOnlyUnhealthy]
    );

    return (
        <EndpointWrapper endpoint={LOCUTUS_TASKS} args={EMPTY_ARGS}>
            {renderDashboard}
        </EndpointWrapper>
    );
}
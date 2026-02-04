import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LazyIcon from "@/components/ui/LazyIcon";
import Badge from "@/components/ui/badge";

type InstatusPageStatus =
    | "UP"
    | "HASISSUES"
    | "UNDERMAINTENANCE"
    | "PARTIALOUTAGE"
    | "MAJOROUTAGE"
    | string;

type InstatusIncidentStatus =
    | "INVESTIGATING"
    | "IDENTIFIED"
    | "MONITORING"
    | "RESOLVED"
    | string;

type InstatusIncidentImpact = "MINOR" | "MAJOR" | "CRITICAL" | "MAJOROUTAGE" | "PARTIALOUTAGE" | string;

type InstatusMaintenanceStatus =
    | "NOTSTARTEDYET"
    | "INPROGRESS"
    | "COMPLETED"
    | "CANCELED"
    | string;

type InstatusSummary = {
    page: {
        name: string;
        url: string;
        status: InstatusPageStatus;
    };
    activeIncidents?: Array<{
        name: string;
        started: string;
        status: InstatusIncidentStatus;
        impact?: InstatusIncidentImpact;
        url?: string;
    }>;
    activeMaintenances?: Array<{
        name: string;
        start: string;
        status: InstatusMaintenanceStatus;
        duration?: string;
        url?: string;
    }>;
};

type FetchState =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "success"; data: InstatusSummary; fetchedAtMs: number }
    | { kind: "error"; message: string; fetchedAtMs?: number };

function getSubdomain(): string | undefined {
    // Per your requirement: assume process.env.instatus
    // In Vite, env is usually import.meta.env.VITE_*, but we follow your input.
    const v = (process as unknown as { env?: Record<string, unknown> })?.env?.instatus;
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : undefined;
}

function statusLabel(s: InstatusPageStatus) {
    const v = String(s || "").toUpperCase();
    if (v === "UP") return "Operational";
    if (v === "HASISSUES") return "Degraded performance";
    if (v === "UNDERMAINTENANCE") return "Maintenance";
    if (v === "PARTIALOUTAGE") return "Partial outage";
    if (v === "MAJOROUTAGE") return "Major outage";
    return v || "Unknown";
}

function statusDotClass(s: InstatusPageStatus) {
    const v = String(s || "").toUpperCase();
    if (v === "UP") return "bg-emerald-500";
    if (v === "HASISSUES") return "bg-yellow-500";
    if (v === "UNDERMAINTENANCE") return "bg-blue-500";
    if (v === "PARTIALOUTAGE") return "bg-orange-500";
    if (v === "MAJOROUTAGE") return "bg-red-500";
    return "bg-muted-foreground";
}

function statusBadgeVariant(s: InstatusPageStatus): "default" | "secondary" | "destructive" | "outline" {
    const v = String(s || "").toUpperCase();
    if (v === "UP") return "secondary";
    if (v === "UNDERMAINTENANCE") return "default";
    if (v === "HASISSUES" || v === "PARTIALOUTAGE") return "default";
    if (v === "MAJOROUTAGE") return "destructive";
    return "outline";
}

function impactBadge(impact?: string) {
    const v = String(impact || "").toUpperCase();
    if (v.includes("MAJOR") || v.includes("OUTAGE") || v.includes("CRITICAL")) return "destructive" as const;
    if (v.includes("PARTIAL")) return "default" as const;
    if (v.includes("MINOR")) return "secondary" as const;
    return "outline" as const;
}

function safeDate(s?: string): Date | undefined {
    if (!s) return undefined;
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : undefined;
}

function fmtWhen(d?: Date) {
    if (!d) return "—";
    return d.toLocaleString();
}

function fmtAge(nowMs: number, thenMs?: number) {
    if (!thenMs) return "—";
    const diff = Math.max(0, nowMs - thenMs);
    if (diff < 1000) return "just now";
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
}

function SkeletonLine({ className }: { className?: string }) {
    return <div className={cn("h-4 w-full animate-pulse rounded bg-muted", className)} />;
}

export function InstatusStatusCard({
    className,
    title = "Service status",
    refreshMs = 60_000,
}: {
    className?: string;
    title?: string;
    refreshMs?: number;
}) {
    const subdomain = getSubdomain();

    const url = React.useMemo(() => {
        if (!subdomain) return undefined;
        return `https://${subdomain}.instatus.com/summary.json`;
    }, [subdomain]);

    const [state, setState] = React.useState<FetchState>(() => ({ kind: "idle" }));
    const [nowMs, setNowMs] = React.useState<number>(() => Date.now());

    React.useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const doFetch = React.useCallback(async () => {
        if (!url) return;

        setState((prev) => ({ kind: "loading" }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12_000);

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: controller.signal,
                cache: "no-store",
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }

            const json = (await res.json()) as InstatusSummary;

            if (!json?.page?.status) {
                throw new Error("Unexpected response shape (missing page.status).");
            }

            setState({ kind: "success", data: json, fetchedAtMs: Date.now() });
        } catch (e) {
            const msg =
                e instanceof DOMException && e.name === "AbortError"
                    ? "Request timed out."
                    : e instanceof Error
                        ? e.message
                        : "Failed to load status.";
            setState((prev) => ({
                kind: "error",
                message: msg,
                fetchedAtMs: prev.kind === "success" ? prev.fetchedAtMs : undefined,
            }));
        } finally {
            clearTimeout(timeoutId);
        }
    }, [url]);

    // initial + polling
    React.useEffect(() => {
        if (!url) return;
        void doFetch();

        if (refreshMs <= 0) return;
        const id = setInterval(() => void doFetch(), refreshMs);
        return () => clearInterval(id);
    }, [url, refreshMs, doFetch]);

    if (!subdomain) {
        return (
            <Card className={cn("border-destructive/40 bg-destructive/5", className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
                        {title}
                    </CardTitle>
                    <CardDescription>Configuration required</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="rounded-md border border-destructive/20 bg-background/50 p-3">
                        <div className="font-semibold">Missing `process.env.instatus`</div>
                        <div className="mt-1 text-muted-foreground">
                            Set your Instatus subdomain (e.g. <span className="font-mono">"acme"</span>) so this component
                            can fetch:
                            <div className="mt-1 font-mono text-xs text-foreground/90">
                                https://acme.instatus.com/summary.json
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const fetchedAtMs = state.kind === "success" ? state.fetchedAtMs : state.kind === "error" ? state.fetchedAtMs : undefined;
    const isLoading = state.kind === "loading" || state.kind === "idle";

    const data = state.kind === "success" ? state.data : undefined;

    const overallStatus = data?.page?.status ?? "UNKNOWN";
    const incidents = data?.activeIncidents ?? [];
    const maint = data?.activeMaintenances ?? [];

    const hasActive = incidents.length > 0 || maint.length > 0;

    return (
        <Card className={cn(className)}>
            <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                            <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", statusDotClass(overallStatus))} aria-hidden="true" />
                            {title}
                            <Badge variant={statusBadgeVariant(overallStatus)} className="ml-2">
                                {statusLabel(overallStatus)}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Source:{" "}
                            <a
                                href={`https://${subdomain}.instatus.com`}
                                className="underline underline-offset-4"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {subdomain}.instatus.com
                            </a>
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={doFetch} disabled={state.kind === "loading"}>
                            <LazyIcon name="RotateCcw" className={cn("mr-2 h-4 w-4", state.kind === "loading" && "animate-spin")} />
                            Refresh
                        </Button>

                        <Button asChild variant="outline" size="sm">
                            <a href={url} target="_blank" rel="noreferrer">
                                <LazyIcon name="ExternalLink" className="mr-2 h-4 w-4" />
                                JSON
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="tabular-nums">
                        {fetchedAtMs ? `Updated ${fmtAge(nowMs, fetchedAtMs)}` : "Not updated yet"}
                        {fetchedAtMs ? ` • ${new Date(fetchedAtMs).toLocaleTimeString()}` : ""}
                    </div>
                    {state.kind === "error" ? (
                        <div className="text-destructive">Couldn’t refresh: {state.message}</div>
                    ) : null}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="space-y-2">
                        <SkeletonLine className="w-2/3" />
                        <SkeletonLine className="w-1/2" />
                        <SkeletonLine className="w-4/5" />
                    </div>
                ) : null}

                {!isLoading && state.kind === "success" ? (
                    <>
                        <div className={cn("rounded-md border p-3 text-sm", hasActive ? "bg-muted/10" : "bg-emerald-500/5")}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium truncate">{state.data!.page.name}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-1">
                                {hasActive ? (
                                    <div className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            {incidents.length > 0 && <span className="tabular-nums font-mono">{incidents.length} incident{incidents.length > 1 ? "s" : ""}</span>}
                                            {incidents.length > 0 && maint.length > 0 && <span>•</span>}
                                            {maint.length > 0 && <span className="tabular-nums font-mono">{maint.length} maintenance{maint.length > 1 ? "s" : ""}</span>}
                                            <span className="ml-2 text-xs">There are active incidents and/or maintenance items.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground">No incidents or maintenance are currently reported.</div>
                                )}
                            </div>
                        </div>

                        {maint.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold">Active maintenance</div>
                                    <Badge variant="secondary">{maint.length}</Badge>
                                </div>
                                <div className="space-y-2">
                                    {maint.map((m) => {
                                        const start = safeDate(m.start);
                                        return (
                                            <div key={`${m.url ?? m.name}-${m.start}`} className="rounded-md border bg-background/40 p-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium">{m.name}</div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Start: {fmtWhen(start)} • Status:{" "}
                                                            <span className="font-mono">{String(m.status)}</span>
                                                            {m.duration ? ` • Duration: ${m.duration}m` : ""}
                                                        </div>
                                                    </div>
                                                    {m.url ? (
                                                        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                                                            <a href={m.url} target="_blank" rel="noreferrer">
                                                                Details
                                                            </a>
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : null}

                        {incidents.length > 0 && maint.length > 0 ? <hr className="my-2 border-t border-gray-200 w-full" /> : null}

                        {incidents.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold">Active incidents</div>
                                    <Badge variant="secondary">{incidents.length}</Badge>
                                </div>
                                <div className="space-y-2">
                                    {incidents.map((i) => {
                                        const started = safeDate(i.started);
                                        return (
                                            <div key={`${i.url ?? i.name}-${i.started}`} className="rounded-md border bg-background/40 p-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="truncate font-medium">{i.name}</div>
                                                            {i.impact ? (
                                                                <Badge variant={impactBadge(i.impact)} className="font-mono text-[11px]">
                                                                    {String(i.impact)}
                                                                </Badge>
                                                            ) : null}
                                                            <Badge variant="outline" className="font-mono text-[11px]">
                                                                {String(i.status)}
                                                            </Badge>
                                                        </div>

                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Started: {fmtWhen(started)}
                                                        </div>
                                                    </div>

                                                    {i.url ? (
                                                        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                                                            <a href={i.url} target="_blank" rel="noreferrer">
                                                                Details
                                                            </a>
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : null}
                    </>
                ) : null}

                {!isLoading && state.kind === "error" ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold">Couldn’t load status</div>
                            <Button variant="outline" size="sm" onClick={doFetch} className="h-7 px-2 text-xs">
                                Try again
                            </Button>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                            {state.message}
                            <div className="mt-2 font-mono text-xs text-foreground/80 break-all">{url}</div>
                        </div>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type ResourceBreakdownEntry = {
  key: string;
  label: string;
  displayValue: string;
  value: number;
};

type ResourceBreakdownTone = "income" | "expense" | "net" | "neutral";

function getToneClassName(tone: Exclude<ResourceBreakdownTone, "net">) {
  if (tone === "income") {
    return {
      row: "border-emerald-500/18 bg-emerald-500/6",
      bar: "bg-emerald-500/18",
      value: "text-emerald-700 dark:text-emerald-300",
      title: "text-emerald-700 dark:text-emerald-300",
    };
  }

  if (tone === "expense") {
    return {
      row: "border-rose-500/18 bg-rose-500/6",
      bar: "bg-rose-500/18",
      value: "text-rose-700 dark:text-rose-300",
      title: "text-rose-700 dark:text-rose-300",
    };
  }

  return {
    row: "border-border/55 bg-muted/15",
    bar: "bg-muted/55",
    value: "text-foreground",
    title: "text-muted-foreground",
  };
}

function getEntryTone(tone: ResourceBreakdownTone, value: number) {
  if (tone !== "net") {
    return getToneClassName(tone);
  }

  if (value > 0) {
    return getToneClassName("income");
  }

  if (value < 0) {
    return getToneClassName("expense");
  }

  return getToneClassName("neutral");
}

export function ResourceBreakdownPanel({
  title,
  entries,
  tone = "neutral",
  emptyLabel = "No movement",
  compact = false,
  showEntryCount = true,
  headerActions,
  className,
}: {
  title: string;
  entries: readonly ResourceBreakdownEntry[];
  tone?: ResourceBreakdownTone;
  emptyLabel?: string;
  compact?: boolean;
  showEntryCount?: boolean;
  headerActions?: ReactNode;
  className?: string;
}) {
  const titleValue = entries.reduce((total, entry) => total + entry.value, 0);
  const headerTone = tone === "net" ? "neutral" : tone;
  const titlePalette = tone === "net"
    ? getEntryTone("net", titleValue)
    : getToneClassName(headerTone);
  const maxMagnitude = entries.reduce((currentMax, entry) => Math.max(currentMax, Math.abs(entry.value)), 0);

  return (
    <section className={cn(
      "overflow-hidden rounded-md border border-border/50 bg-background/70",
      className,
    )}>
      <div className={cn("flex items-center justify-between gap-2 border-b border-border/40 bg-muted/10", compact ? "px-2 py-1.5" : "px-3 py-2") }>
        <h3 className={cn("font-semibold uppercase tracking-[0.16em]", compact ? "text-[10px]" : "text-[11px]", titlePalette.title)}>{title}</h3>
        <div className="flex items-center gap-1">
          {showEntryCount ? (
            <span className="text-[11px] text-muted-foreground">{entries.length > 0 ? `${entries.length} resource${entries.length === 1 ? "" : "s"}` : emptyLabel}</span>
          ) : null}
          {headerActions}
        </div>
      </div>
      {entries.length === 0 ? (
        <div className={cn(
          "rounded-md border border-dashed border-border/60 text-muted-foreground",
          compact ? "m-1.5 px-2 py-2 text-xs" : "m-2 px-3 py-4 text-sm",
        )}>
          {emptyLabel}
        </div>
      ) : (
        <div className={cn(compact ? "space-y-1 p-1.5" : "space-y-1.5 p-2") }>
          {entries.map((entry) => {
            const palette = getEntryTone(tone, entry.value);
            const width = maxMagnitude > 0 && entry.value !== 0 ? Math.max((Math.abs(entry.value) / maxMagnitude) * 100, 10) : 0;
            const alignToEnd = tone === "net" && entry.value < 0;
            return (
              <div key={entry.key} className={cn(
                "relative overflow-hidden rounded-sm border",
                compact ? "px-2 py-1" : "px-2.5 py-1.5",
                palette.row,
              )}>
                {width > 0 ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-0",
                      alignToEnd ? "right-0 rounded-l-sm" : "left-0 rounded-r-sm",
                      palette.bar,
                    )}
                    style={{ width: `${width}%` }}
                  />
                ) : null}
                <div className={cn("relative grid grid-cols-[minmax(0,1fr)_auto] items-center", compact ? "gap-2" : "gap-3") }>
                  <span className={cn("truncate text-foreground", compact ? "text-[11px]" : "text-sm")}>{entry.label}</span>
                  <span className={cn("font-mono tabular-nums", compact ? "text-[11px]" : "text-sm", palette.value)}>{entry.displayValue}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

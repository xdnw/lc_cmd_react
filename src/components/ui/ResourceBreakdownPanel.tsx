import { cn } from "@/lib/utils";

export type ResourceBreakdownEntry = {
  key: string;
  label: string;
  displayValue: string;
  value: number;
};

function getToneClassName(tone: "income" | "expense" | "net" | "neutral") {
  if (tone === "income") {
    return {
      row: "border-emerald-500/20 bg-emerald-500/6",
      bar: "bg-emerald-500/16",
      value: "text-emerald-700 dark:text-emerald-300",
    };
  }

  if (tone === "expense") {
    return {
      row: "border-rose-500/20 bg-rose-500/6",
      bar: "bg-rose-500/16",
      value: "text-rose-700 dark:text-rose-300",
    };
  }

  if (tone === "net") {
    return {
      row: "border-sky-500/20 bg-sky-500/6",
      bar: "bg-sky-500/16",
      value: "text-sky-700 dark:text-sky-300",
    };
  }

  return {
    row: "border-border/60 bg-muted/20",
    bar: "bg-muted/70",
    value: "text-foreground",
  };
}

export function ResourceBreakdownPanel({
  title,
  entries,
  tone = "neutral",
  emptyLabel = "No movement",
  className,
}: {
  title: string;
  entries: readonly ResourceBreakdownEntry[];
  tone?: "income" | "expense" | "net" | "neutral";
  emptyLabel?: string;
  className?: string;
}) {
  const palette = getToneClassName(tone);
  const maxMagnitude = entries.reduce((currentMax, entry) => Math.max(currentMax, Math.abs(entry.value)), 0);

  return (
    <section className={cn("rounded-lg border border-border/60 bg-background/80 px-3 py-3", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{entries.length > 0 ? `${entries.length} resource${entries.length === 1 ? "" : "s"}` : emptyLabel}</span>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const width = maxMagnitude > 0 ? Math.max((Math.abs(entry.value) / maxMagnitude) * 100, 8) : 0;
            return (
              <div key={entry.key} className={cn("relative overflow-hidden rounded-md border px-3 py-2", palette.row)}>
                <div className={cn("pointer-events-none absolute inset-y-0 left-0 rounded-r-md", palette.bar)} style={{ width: `${width}%` }} />
                <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <span className="truncate text-sm text-foreground">{entry.label}</span>
                  <span className={cn("font-mono text-sm tabular-nums", palette.value)}>{entry.displayValue}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

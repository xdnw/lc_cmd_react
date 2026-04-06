import { cn } from "@/lib/utils";

import { formatMonetaryAmount } from "./taxExpensesState";

function clampBarWidth(value: number, total: number, minWidth = 6): number {
  if (!Number.isFinite(value) || value <= 0 || total <= 0) {
    return 0;
  }

  return Math.max((value / total) * 100, minWidth);
}

export function TaxExpenseValueStrip({
  incomeValue,
  expenseValue,
  netValue,
  onToggleBreakdown,
  breakdownOpen = false,
  className,
}: {
  incomeValue: number;
  expenseValue: number;
  netValue: number;
  onToggleBreakdown?: () => void;
  breakdownOpen?: boolean;
  className?: string;
}) {
  const totalActivity = Math.max(Math.abs(incomeValue) + Math.abs(expenseValue), Math.abs(netValue), 1);
  const incomeWidth = clampBarWidth(Math.abs(incomeValue), totalActivity);
  const expenseWidth = clampBarWidth(Math.abs(expenseValue), totalActivity);
  const netWidth = clampBarWidth(Math.abs(netValue), totalActivity, 4) / 2;
  const interactive = typeof onToggleBreakdown === "function";
  const Root = interactive ? "button" : "div";
  const netToneClassName = netValue > 0
    ? "text-emerald-700 dark:text-emerald-300"
    : netValue < 0
      ? "text-rose-700 dark:text-rose-300"
      : "text-foreground";

  return (
    <Root
      type={interactive ? "button" : undefined}
      onClick={onToggleBreakdown}
      className={cn(
        "block w-full text-left",
        interactive ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : undefined,
        className,
      )}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <div className="relative h-2.5 overflow-hidden rounded-sm border border-border/55 bg-muted/20">
              <div className="absolute inset-y-0 left-0 bg-emerald-500/75" style={{ width: `${incomeWidth}%` }} />
              <div className="absolute inset-y-0 right-0 bg-rose-500/75" style={{ width: `${expenseWidth}%` }} />
            </div>
            <div className="relative h-3 overflow-hidden rounded-sm border border-border/55 bg-muted/15">
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
              {netValue > 0 ? (
                <div className="absolute inset-y-0 left-1/2 bg-emerald-500/70" style={{ width: `${netWidth}%` }} />
              ) : null}
              {netValue < 0 ? (
                <div className="absolute inset-y-0 right-1/2 bg-rose-500/70" style={{ width: `${netWidth}%` }} />
              ) : null}
            </div>
          </div>
          {interactive ? (
            <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {breakdownOpen ? "Hide breakdown" : "Show breakdown"}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-none tabular-nums">
          <span className="text-emerald-700 dark:text-emerald-300">Income {formatMonetaryAmount(incomeValue)}</span>
          <span className="text-rose-700 dark:text-rose-300">Expense {formatMonetaryAmount(expenseValue)}</span>
          <span className={netToneClassName}>Net {formatMonetaryAmount(netValue)}</span>
        </div>
      </div>
    </Root>
  );
}

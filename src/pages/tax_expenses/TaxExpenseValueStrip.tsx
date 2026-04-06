import { cn } from "@/lib/utils";

import { formatMonetaryAmount } from "./taxExpensesState";

function clampBarWidth(value: number, total: number): number {
  if (!Number.isFinite(value) || value <= 0 || total <= 0) {
    return 0;
  }

  return Math.max((value / total) * 100, 6);
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
  const totalActivity = Math.max(Math.abs(incomeValue) + Math.abs(expenseValue), 1);
  const incomeWidth = clampBarWidth(Math.abs(incomeValue), totalActivity);
  const expenseWidth = clampBarWidth(Math.abs(expenseValue), totalActivity);
  const interactive = typeof onToggleBreakdown === "function";
  const Root = interactive ? "button" : "div";

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
      <div className="flex items-center gap-2">
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-sm border border-border/60 bg-muted/25">
          <div className="absolute inset-y-0 left-0 bg-emerald-500/75" style={{ width: `${incomeWidth}%` }} />
          <div className="absolute inset-y-0 right-0 bg-rose-500/75" style={{ width: `${expenseWidth}%` }} />
        </div>
        {interactive ? (
          <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {breakdownOpen ? "Hide breakdown" : "Show breakdown"}
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-none tabular-nums">
        <span className="text-emerald-700 dark:text-emerald-300">Income {formatMonetaryAmount(incomeValue)}</span>
        <span className="text-rose-700 dark:text-rose-300">Expense {formatMonetaryAmount(expenseValue)}</span>
        <span className={netValue > 0 ? "text-emerald-700 dark:text-emerald-300" : netValue < 0 ? "text-rose-700 dark:text-rose-300" : "text-foreground"}>
          Net {formatMonetaryAmount(netValue)}
        </span>
      </div>
    </Root>
  );
}

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatMonetaryAmount } from "./taxExpensesState";

function clampBarWidth(value: number, maxMagnitude: number, minWidth = 3): number {
  if (!Number.isFinite(value) || value <= 0 || maxMagnitude <= 0) {
    return 0;
  }

  return Math.max((value / maxMagnitude) * 50, minWidth);
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
  const sideScale = Math.max(Math.abs(incomeValue), Math.abs(expenseValue), 1);
  const incomeWidth = clampBarWidth(Math.abs(incomeValue), sideScale);
  const expenseWidth = clampBarWidth(Math.abs(expenseValue), sideScale);
  const interactive = typeof onToggleBreakdown === "function";
  const Root = interactive ? "button" : "div";
  const ToggleIcon = breakdownOpen ? ChevronUp : ChevronDown;
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
      aria-label={interactive ? (breakdownOpen ? "Hide breakdown" : "Show breakdown") : undefined}
    >
      <div className="flex items-start gap-2">
        {interactive ? (
          <span className="mt-[1px] flex size-4 shrink-0 items-center justify-center text-muted-foreground">
            <ToggleIcon className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="relative h-3 overflow-hidden rounded-sm border border-border/55 bg-muted/15">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
            {expenseWidth > 0 ? (
              <div className="absolute inset-y-[1px] right-1/2 rounded-l-sm bg-rose-500/75" style={{ width: `${expenseWidth}%` }} />
            ) : null}
            {incomeWidth > 0 ? (
              <div className="absolute inset-y-[1px] left-1/2 rounded-r-sm bg-emerald-500/75" style={{ width: `${incomeWidth}%` }} />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] leading-none tabular-nums">
            <span className="text-emerald-700 dark:text-emerald-300">Income {formatMonetaryAmount(incomeValue)}</span>
            <span className="text-rose-700 dark:text-rose-300">Expense {formatMonetaryAmount(expenseValue)}</span>
            <span className={netToneClassName}>Net {formatMonetaryAmount(netValue)}</span>
          </div>
        </div>
      </div>
    </Root>
  );
}

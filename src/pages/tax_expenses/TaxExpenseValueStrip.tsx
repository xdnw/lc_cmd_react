import { formatSignedResourceAmount } from "./taxExpensesState";

function TaxExpenseValueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "net";
}) {
  const className = tone === "income"
    ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
    : tone === "expense"
      ? "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300"
      : value > 0
        ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
        : value < 0
          ? "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300"
          : "border-border/60 bg-muted/20 text-foreground";

  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold tabular-nums">{formatSignedResourceAmount(value)}</div>
    </div>
  );
}

export function TaxExpenseValueStrip({
  incomeValue,
  expenseValue,
  netValue,
}: {
  incomeValue: number;
  expenseValue: number;
  netValue: number;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <TaxExpenseValueStat label="Income" value={incomeValue} tone="income" />
      <TaxExpenseValueStat label="Expense" value={expenseValue} tone="expense" />
      <TaxExpenseValueStat label="Net" value={netValue} tone="net" />
    </div>
  );
}

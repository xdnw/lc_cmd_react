import { useCallback, useMemo } from "react";

import ArgInput from "@/components/cmd/ArgInput";
import { ArgDescComponent } from "@/components/cmd/CommandComponent";
import ArgFieldShell from "@/components/cmd/field/ArgFieldShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Argument, type IArgument } from "@/utils/Command";

import {
  TAX_EXPENSE_DEFAULT_MOVING_AVERAGE_WINDOW,
  TAX_EXPENSE_MAX_MOVING_AVERAGE_WINDOW,
  type TaxExpenseChartMode,
} from "./taxExpensesState";

function createMovingAverageWindowArgument(): Argument {
  const arg: IArgument = {
    name: "movingAverageWindow",
    optional: true,
    desc: "Number of points used for the moving-average transform. Use 1 for raw values.",
    type: "int",
    min: 1,
    max: TAX_EXPENSE_MAX_MOVING_AVERAGE_WINDOW,
  };

  return new Argument(arg.name, arg);
}

export function TaxExpenseChartControls({
  chartMode,
  onChartModeChange,
  movingAverageWindow,
  onMovingAverageWindowChange,
}: {
  chartMode: TaxExpenseChartMode;
  onChartModeChange: (mode: TaxExpenseChartMode) => void;
  movingAverageWindow: number;
  onMovingAverageWindowChange: (value: number) => void;
}) {
  const movingAverageWindowArg = useMemo(() => createMovingAverageWindowArgument(), []);
  const handleModeChange = useCallback((value: string) => {
    if (value === "cumulative" || value === "moving-average") {
      onChartModeChange(value);
    }
  }, [onChartModeChange]);
  const handleMovingAverageOutput = useCallback((_name: string, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      onMovingAverageWindowChange(TAX_EXPENSE_DEFAULT_MOVING_AVERAGE_WINDOW);
      return;
    }

    const rounded = Math.round(parsed);
    onMovingAverageWindowChange(Math.min(Math.max(rounded, 1), TAX_EXPENSE_MAX_MOVING_AVERAGE_WINDOW));
  }, [onMovingAverageWindowChange]);

  return (
    <>
      <div className="min-w-48 flex-1 sm:max-w-sm">
        <div className="rounded-t-md border border-border/80 border-b-0 bg-muted/55 px-2 py-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-medium text-foreground">chartMode</span>
            <span className="inline-flex font-medium text-sky-700 dark:text-sky-300">optional</span>
          </div>
        </div>
        <div className="rounded-md rounded-t-none border border-border/90 border-l-[3px] border-l-primary/35 bg-muted/15 px-2 py-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
          <Tabs value={chartMode} onValueChange={handleModeChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
              <TabsTrigger value="moving-average">Moving Avg</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className={cn("min-w-36 flex-1 sm:max-w-[12rem]", chartMode !== "moving-average" && "pointer-events-none opacity-55")}>
        <ArgDescComponent arg={movingAverageWindowArg} compact />
        <ArgFieldShell className="rounded-t-none">
          <ArgInput
            argName={movingAverageWindowArg.name}
            breakdown={movingAverageWindowArg.getTypeBreakdown()}
            min={movingAverageWindowArg.arg.min}
            max={movingAverageWindowArg.arg.max}
            initialValue={String(movingAverageWindow)}
            setOutputValue={handleMovingAverageOutput}
            displayMode="focus-pane"
          />
        </ArgFieldShell>
      </div>
    </>
  );
}

import { useCallback, useState } from "react";
import ArgInput from "./ArgInput";
import { useDialog } from "../layout/DialogContext";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useSyncedStateFunc } from "@/utils/StateUtil";
import type { TypeBreakdown } from "@/utils/Command";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";

function parseSetString(input: string): string[] {
    if (!input) return [];
    return input
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values));
}

function toSetString(values: string[]): string {
    return values.join(",");
}

export default function SetInput(
    { argName, child, initialValue, setOutputValue, displayMode }:
    {
        argName: string,
        child: TypeBreakdown,
        initialValue: string,
        displayMode?: CommandInputDisplayMode,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const { showDialog } = useDialog();
    const compact = isCompactMode(displayMode);

    const [values, setValues] = useSyncedStateFunc<string[]>(initialValue, (initial) => dedupe(parseSetString(initial)));
    const [pendingValue, setPendingValue] = useState("");

    const syncValues = useCallback((nextValues: string[]) => {
        const normalized = dedupe(nextValues.map((value) => value.trim()).filter((value) => value.length > 0));
        setValues(normalized);
        setOutputValue(argName, toSetString(normalized));
    }, [argName, setOutputValue, setValues]);

    const removeValue = useCallback((valueToRemove: string) => {
        syncValues(values.filter((value) => value !== valueToRemove));
    }, [syncValues, values]);

    const addValue = useCallback(() => {
        const valueToAdd = pendingValue.trim();
        if (!valueToAdd) {
            showDialog("Value cannot be empty", <></>);
            return;
        }
        if (values.includes(valueToAdd)) {
            showDialog("Duplicate value", <>This value already exists in the set.</>);
            return;
        }

        syncValues([...values, valueToAdd]);
        setPendingValue("");
    }, [pendingValue, showDialog, syncValues, values]);

    const onPendingValueChange = useCallback((key: string, value: string) => {
        setPendingValue(value);
    }, []);

    const handleValueKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" && !event.ctrlKey && !event.shiftKey && !event.isDefaultPrevented()) {
            event.preventDefault();
            addValue();
        }
    }, [addValue]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = event.clipboardData.getData("text");
        if (!pastedText) return;

        const parsedValues = parseSetString(pastedText);
        if (parsedValues.length <= 1) return;

        event.preventDefault();
        event.stopPropagation();
        syncValues([...values, ...parsedValues]);
    }, [syncValues, values]);

    return (
        <div onPasteCapture={handlePasteCapture}>
            <div className="relative mb-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Set values</p>
                {values.length === 0 && (
                    <p className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">No values yet.</p>
                )}
                {values.map((value) => (
                    <div key={value} className={cn("mt-1 flex items-center justify-between rounded border border-border bg-background px-2", compact ? "py-1 text-xs" : "py-1.5 text-sm")}>
                        <span className="mr-4 break-all">{value}</span>
                        <Button
                            onClick={() => removeValue(value)}
                            variant="outline"
                            size="sm"
                            tabIndex={-1}
                            className={compact ? "h-6 px-2 text-xs" : ""}
                        >
                            Remove
                        </Button>
                    </div>
                ))}
            </div>

            <div className={cn("grid gap-2", compact ? "grid-cols-[1fr_auto] items-end" : "grid-cols-[1fr_auto] items-end")}>
                <div onKeyDown={handleValueKeyDown}>
                    <p className="mb-1 text-xs text-muted-foreground">Value</p>
                    <ArgInput
                        argName="value"
                        breakdown={child}
                        min={undefined}
                        max={undefined}
                        initialValue={pendingValue}
                        setOutputValue={onPendingValueChange}
                        displayMode={displayMode}
                    />
                </div>
                <div className="flex justify-end">
                    <Button size="sm" onClick={addValue} tabIndex={-1} className={compact ? "h-8 text-xs" : ""}>Add Value</Button>
                </div>
            </div>
        </div>
    );
}
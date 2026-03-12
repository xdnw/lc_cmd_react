import { useSyncedStateFunc } from "@/utils/StateUtil";
import { Input } from "../ui/input";
import React, { useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";
import { getCommandTextEntryEdges } from "./commandKeyboard";

function normalizeMmrDoubleInput(initial: string): string | null {
    const trimmed = (initial || "").trim();
    if (!trimmed) return null;
    if (/^\d{4}$/.test(trimmed)) {
        return trimmed.split("").join("/");
    }
    if (/^(?:5(?:\.0+)?|[0-4](?:\.\d+)?)(?:\/(?:5(?:\.0+)?|[0-4](?:\.\d+)?)){3}$/.test(trimmed)) {
        return trimmed;
    }
    return null;
}

function parseMmrDoubleControlValue(initial: string) {
    const trimmed = (initial || "").trim();
    const emptyValue: [number | null, number | null, number | null, number | null] = [null, null, null, null];
    if (!trimmed) {
        return acceptedParsedInput<(number | null)[]>(emptyValue);
    }

    const normalized = normalizeMmrDoubleInput(trimmed);
    if (!normalized) {
        return rejectedParsedInput<(number | null)[]>(emptyValue, "Expected 4 MMR values like 5/5/5/3 or 5553.");
    }

    return acceptedParsedInput<(number | null)[]>(normalized.split("/").map((entry) => parseFloat(entry)));
}

export default function MmrDoubleInput(
    { argName, initialValue, setOutputValue, compact }:
        {
            argName: string,
            initialValue: string,
            compact?: boolean,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue, parseMmrDoubleControlValue);
    const [value, setValue] = useSyncedStateFunc<(number | null)[]>(initialValue, () => initialResult.value);
    const slotRefs = useRef<Array<HTMLInputElement | null>>([]);

    const slotMax = useCallback((index: number) => index === 3 ? 3 : 5, []);

    const setOutputFunc = useCallback((index: number, valueStr: string) => {
        const valueFloat = valueStr ? parseFloat(valueStr) : null;
        if (valueFloat != null) {
            const max = slotMax(index);
            if (Number.isNaN(valueFloat) || valueFloat < 0 || valueFloat > max) {
                return;
            }
        }
        
        const currentValues = [...value];
        
        if (currentValues[index] !== valueFloat) {
            clearParseError();
            currentValues[index] = valueFloat;
            setValue(currentValues);
            
            const isComplete = currentValues.every((entry) => entry != null);
            const outputString = isComplete
                ? (currentValues as number[]).join("/")
                : "";
            setOutputValue(argName, outputString);
        }
    }, [value, clearParseError, setValue, argName, setOutputValue, slotMax]);

    const handleSlotChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const index = Number(event.currentTarget.dataset.index);
        const nextValue = event.currentTarget.value.trim();
        if (Number.isNaN(index)) {
            return;
        }

        if (nextValue && !/^\d*(?:\.\d*)?$/.test(nextValue)) {
            return;
        }

        setOutputFunc(index, nextValue);
    }, [setOutputFunc]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseMmrDoubleControlValue,
            applyParsedResult,
            onAccept: (next) => {
                setValue(next);
                setOutputValue(argName, next.every((entry) => entry != null) ? next.join("/") : "");
            },
        });
    }, [applyParsedResult, argName, setOutputValue, setValue]);

    const focusSlot = useCallback((index: number) => {
        slotRefs.current[index]?.focus();
    }, []);

    const handleSlotKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        const index = Number(event.currentTarget.dataset.index);
        if (Number.isNaN(index)) {
            return;
        }

        switch (event.key) {
            case "ArrowLeft": {
                const edges = getCommandTextEntryEdges(event.currentTarget);
                if (edges.atStart && index > 0) {
                    event.preventDefault();
                    focusSlot(index - 1);
                }
                return;
            }
            case "ArrowRight": {
                const edges = getCommandTextEntryEdges(event.currentTarget);
                if (edges.atEnd && index < value.length - 1) {
                    event.preventDefault();
                    focusSlot(index + 1);
                }
                return;
            }
            case "Home":
                event.preventDefault();
                focusSlot(0);
                return;
            case "End":
                event.preventDefault();
                focusSlot(value.length - 1);
                return;
            default:
                return;
        }
    }, [focusSlot, value.length]);

    const slotRefHandlers = useMemo(
        () => value.map((_, index) => (node: HTMLInputElement | null) => {
            slotRefs.current[index] = node;
        }),
        [value],
    );

    return (
        <div className="space-y-1" onPasteCapture={handlePasteCapture}>
            <div className={cn("inline-flex items-center rounded-md border border-border/70 bg-background p-1", compact ? "gap-1" : "gap-1.5")}>
                {value.map((val, index) => {
                    const max = slotMax(index);
                    return (
                        <React.Fragment key={index}>
                            {index > 0 && <span className="text-xs text-muted-foreground">/</span>}
                            <Input
                                ref={slotRefHandlers[index]}
                                type="text"
                                inputMode="decimal"
                                data-index={index}
                                value={val != null ? `${val}` : ""}
                                onChange={handleSlotChange}
                                onKeyDown={handleSlotKeyDown}
                                className={cn(
                                    "bg-background text-center font-mono",
                                    compact ? "h-6 w-9 px-1 text-[11px]" : "h-7 w-11 px-1.5 text-[13px]"
                                )}
                                placeholder={index === 3 ? "3" : "5"}
                                title={`MMR slot ${index + 1}, max ${max}`}
                                aria-label={`MMR slot ${index + 1}`}
                            />
                        </React.Fragment>
                    );
                })}
            </div>
            {!compact && <p className="text-[11px] text-muted-foreground">Slots 1-3 max at 5, slot 4 maxes at 3.</p>}
            <FieldMessage error={parseError} compact={compact} />
        </div>
    );
}
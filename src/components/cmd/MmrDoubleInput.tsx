import { useSyncedStateFunc } from "@/utils/StateUtil";
import NumberInput from "./NumberInput";
import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

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

    const setOutputFunc = useCallback((name: string, valueStr: string) => {
        const index = parseInt(name);
        const valueFloat = valueStr ? parseFloat(valueStr) : null;
        
        // Create a copy of the current value to check and modify
        const currentValues = [...value];
        
        if (currentValues[index] !== valueFloat) {
            clearParseError();
            // Update the copy with the new value
            currentValues[index] = valueFloat;
            
            // Set the new state
            setValue(currentValues);
            
            const isComplete = currentValues.every((entry) => entry != null);
            const outputString = isComplete
                ? (currentValues as number[]).join("/")
                : "";
            setOutputValue(argName, outputString);
        }
    }, [value, clearParseError, setValue, argName, setOutputValue]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseMmrDoubleControlValue,
            applyParsedResult,
            onAccept: (next) => {
                setValue(next);
                setOutputValue(argName, next.join("/"));
            },
        });
    }, [applyParsedResult, argName, setOutputValue, setValue]);

    return (
        <div onPasteCapture={handlePasteCapture}>
            <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
                {value.map((val, index) => {
                    return (
                        <React.Fragment key={index}>
                            {index > 0 && <span className="text-xs text-muted-foreground">/</span>}
                            <NumberInput
                                argName={index + ""}
                                min={0}
                                max={index == 3 ? 3 : 5}
                                initialValue={val != null ? val + "" : ""}
                                className={compact ? "h-7 text-xs w-12" : "w-16"}
                                setOutputValue={setOutputFunc}
                                isFloat={true}
                            />
                        </React.Fragment>
                    );
                })}
            </div>
            <FieldMessage error={parseError} compact={compact} />
        </div>
    );
}
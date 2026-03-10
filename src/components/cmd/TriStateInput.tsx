import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

type TriStateValue = "-1" | "0" | "1";

const TRI_STATE_OPTIONS: Array<{
    value: TriStateValue;
    label: string;
    icon: string;
    activeClass: string;
}> = [
    {
        value: "-1",
        label: "False",
        icon: "X",
        activeClass: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
    },
    {
        value: "0",
        label: "Any",
        icon: "/",
        activeClass: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    },
    {
        value: "1",
        label: "True",
        icon: "\u2714",
        activeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
];

function parseTriStateControlValue(input: string) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
        return acceptedParsedInput<TriStateValue>("0");
    }
    if (["1", "true", "yes", "y", "on", "t"].includes(trimmed)) {
        return acceptedParsedInput<TriStateValue>("1");
    }
    if (["-1", "false", "no", "n", "off", "f"].includes(trimmed)) {
        return acceptedParsedInput<TriStateValue>("-1");
    }
    if (["0", "any", "either", "all", "*"] .includes(trimmed)) {
        return acceptedParsedInput<TriStateValue>("0");
    }

    return rejectedParsedInput<TriStateValue>("0", "Expected yes/no/any, true/false, or 1/0/-1.");
}

export default function TriStateInput(
    { argName, initialValue, setOutputValue, compact }:
        {
            argName: string,
            initialValue: string,
            compact?: boolean,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue || "0", parseTriStateControlValue);
    const [value, setValue] = useSyncedState(initialResult.value);
    const normalizedValue: TriStateValue = value === "-1" || value === "1" ? value : "0";
    const segmentClass = compact ? "h-6 min-w-10 px-1.5 text-[10px]" : "h-6 min-w-11 px-2 text-[11px]";

    const handleButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const nextValue = event.currentTarget.value as TriStateValue;
        clearParseError();
        setValue(nextValue);
        setOutputValue(argName, nextValue);
    }, [argName, clearParseError, setOutputValue, setValue]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseTriStateControlValue,
            applyParsedResult,
            onAccept: (nextValue) => {
                setValue(nextValue);
                setOutputValue(argName, nextValue);
            },
        });
    }, [applyParsedResult, argName, setOutputValue, setValue]);

    return (
        <div className="space-y-1" onPasteCapture={handlePasteCapture}>
            <div
                role="radiogroup"
                aria-label={argName}
                className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/25 p-0.5"
            >
                {TRI_STATE_OPTIONS.map((option) => {
                    const isActive = normalizedValue === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            aria-label={option.label}
                            title={option.label}
                            value={option.value}
                            onClick={handleButtonClick}
                            className={cn(
                                "inline-flex items-center justify-center gap-1 rounded-sm leading-none transition-all duration-150",
                                segmentClass,
                                isActive
                                    ? `font-semibold ${option.activeClass}`
                                    : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground"
                            )}
                        >
                            {!compact && <span className="text-[10px]">{option.icon}</span>}
                            <span>{option.label}</span>
                        </button>
                    );
                })}
            </div>
            <FieldMessage error={parseError} compact={compact} />
        </div>
    );
}
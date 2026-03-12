import { useSyncedState } from "@/utils/StateUtil";
import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";
import { useSegmentedControlKeyboard, type SegmentedControlKeyBindings } from "./segmentedControl";
import { COMMAND_LOCAL_PRINTABLE_KEYS_ATTR } from "./commandKeyboard";
import { normalizeTriStateControlValue, serializeBooleanValue, type TriStateControlValue } from "./booleanValueUtils";

const TRI_STATE_OPTIONS: Array<{
    value: TriStateControlValue;
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
    const trimmed = input.trim();
    if (!trimmed) {
        return acceptedParsedInput<TriStateControlValue>("0");
    }
    if (/^(?:1|-1|0|true|false|yes|no|y|n|on|off|t|f|any|either|all|\*)$/i.test(trimmed)) {
        return acceptedParsedInput<TriStateControlValue>(normalizeTriStateControlValue(trimmed));
    }

    return rejectedParsedInput<TriStateControlValue>("0", "Expected yes/no/any, true/false, or 1/0/-1.");
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
    const normalizedValue: TriStateControlValue = value === "-1" || value === "1" ? value : "0";
    const values = useMemo(() => TRI_STATE_OPTIONS.map((option) => option.value), []);
    const segmentClass = compact ? "h-6 min-w-10 px-1.5 text-[10px]" : "h-6 min-w-11 px-2 text-[11px]";

    const selectValue = useCallback((nextValue: TriStateControlValue, focus = false) => {
        clearParseError();
        setValue(nextValue);
        setOutputValue(argName, serializeBooleanValue(nextValue, { mode: "tri-state" }));
    }, [argName, clearParseError, setOutputValue, setValue]);

    const resolveKey = useCallback((key: string): SegmentedControlKeyBindings<TriStateControlValue> | null => {
        switch (key) {
            case "ArrowLeft":
            case "ArrowUp":
                return { selectPrevious: true };
            case "ArrowRight":
            case "ArrowDown":
                return { selectNext: true };
            case "Home":
                return { selectFirst: true };
            case "End":
                return { selectLast: true };
            case " ":
            case "Spacebar": {
                const currentIndex = values.indexOf(normalizedValue);
                return { selectValue: values[(currentIndex + 1) % values.length] ?? "0" };
            }
            case "f":
            case "F":
            case "n":
            case "N":
                return { selectValue: "-1" };
            case "a":
            case "A":
                return { selectValue: "0" };
            case "t":
            case "T":
            case "y":
            case "Y":
                return { selectValue: "1" };
            default:
                return null;
        }
    }, [normalizedValue, values]);

    const { registerButtonRef, handleOptionKeyDown } = useSegmentedControlKeyboard({
        values,
        value: normalizedValue,
        onSelect: selectValue,
        resolveKey,
    });

    const optionRefs = useMemo(
        () => TRI_STATE_OPTIONS.map((_, index) => (node: HTMLButtonElement | null) => {
            registerButtonRef(index, node);
        }),
        [registerButtonRef],
    );

    const optionClickHandlers = useMemo(
        () => TRI_STATE_OPTIONS.map((option) => () => {
            selectValue(option.value);
        }),
        [selectValue],
    );

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseTriStateControlValue,
            applyParsedResult,
            onAccept: (nextValue) => {
                setValue(nextValue);
                setOutputValue(argName, serializeBooleanValue(nextValue, { mode: "tri-state" }));
            },
        });
    }, [applyParsedResult, argName, setOutputValue, setValue]);

    const renderedOptions = useMemo(() => {
        return TRI_STATE_OPTIONS.map((option, index) => {
            const isActive = normalizedValue === option.value;
            return (
                <button
                    key={option.value}
                    ref={optionRefs[index]}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={option.label}
                    title={option.label}
                    value={option.value}
                    tabIndex={isActive ? 0 : -1}
                    onClick={optionClickHandlers[index]}
                    onKeyDown={handleOptionKeyDown}
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
        });
    }, [compact, handleOptionKeyDown, normalizedValue, optionClickHandlers, optionRefs, segmentClass]);

    return (
        <div className="space-y-1" onPasteCapture={handlePasteCapture}>
            <div
                role="radiogroup"
                aria-label={argName}
                {...{ [COMMAND_LOCAL_PRINTABLE_KEYS_ATTR]: "t,y,a,f,n,space" }}
                className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/25 p-0.5"
            >
                {renderedOptions}
            </div>
            <FieldMessage error={parseError} compact={compact} />
        </div>
    );
}
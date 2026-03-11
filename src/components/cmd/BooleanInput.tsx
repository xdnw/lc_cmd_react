import { useSyncedState } from "@/utils/StateUtil";
import { cn } from "@/lib/utils";
import { useCallback, useMemo } from "react";
import { Button } from "../ui/button";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";
import { useSegmentedControlKeyboard, type SegmentedControlKeyBindings } from "./segmentedControl";
import { COMMAND_LOCAL_PRINTABLE_KEYS_ATTR } from "./commandKeyboard";
import { normalizeBooleanControlValue, serializeBooleanValue, type BooleanControlValue } from "./booleanValueUtils";

// internal options shown in the segmented control
const BOOLEAN_OPTIONS: Array<{ value: BooleanControlValue; label: string }> = [
    { value: "0", label: "False" },
    { value: "1", label: "True" },
];

// command strings should use readable booleans even though the control keeps
// numeric values internally for selection and keyboard navigation.
function parseBooleanControlValue(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
        return acceptedParsedInput<BooleanControlValue>("0");
    }
    if (/^(?:1|0|true|false|yes|no|y|n|on|off|t|f)$/i.test(trimmed)) {
        return acceptedParsedInput<BooleanControlValue>(normalizeBooleanControlValue(trimmed));
    }

    return rejectedParsedInput<BooleanControlValue>("0", "Expected a boolean value like true/false, yes/no, or 1/0.");
}

export default function BooleanInput(
    { argName, initialValue, setOutputValue }:
        {
            argName: string,
            initialValue: string,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue || "", parseBooleanControlValue);
    const [value, setValue] = useSyncedState(initialResult.value);
    const values = useMemo(() => BOOLEAN_OPTIONS.map((option) => option.value), []);

    const mapOutput = useCallback((val: BooleanControlValue) => serializeBooleanValue(val, { mode: "boolean" }), []);

    const onChange = useCallback((output: BooleanControlValue, focus = false) => {
        clearParseError();
        setValue(output);
        setOutputValue(argName, mapOutput(output));
    }, [argName, clearParseError, mapOutput, setOutputValue, setValue]);

    const resolveKey = useCallback((key: string): SegmentedControlKeyBindings<BooleanControlValue> | null => {
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
            case "Spacebar":
                return { selectValue: value === "1" ? "0" : "1" };
            case "t":
            case "T":
            case "y":
            case "Y":
                return { selectValue: "1" };
            case "f":
            case "F":
            case "n":
            case "N":
                return { selectValue: "0" };
            default:
                return null;
        }
    }, [value]);

    const { registerButtonRef, handleOptionKeyDown } = useSegmentedControlKeyboard({
        values,
        value,
        onSelect: onChange,
        resolveKey,
    });

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseBooleanControlValue,
            applyParsedResult,
            onAccept: (nextValue) => {
                setValue(nextValue);
                setOutputValue(argName, mapOutput(nextValue));
            },
        });
    }, [applyParsedResult, argName, mapOutput, setOutputValue, setValue]);

    const segmentClass = "h-6 min-w-11 rounded-sm px-2 text-[11px]";

    const renderedOptions = useMemo(() => {
        return BOOLEAN_OPTIONS.map((option, index) => {
            const isActive = value === option.value;
            return (
                <Button
                    key={option.value}
                    ref={(node) => registerButtonRef(index, node)}
                    type="button"
                    size="sm"
                    variant={isActive ? "secondary" : "ghost"}
                    role="radio"
                    aria-checked={isActive}
                    aria-label={option.label}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => onChange(option.value)}
                    onKeyDown={handleOptionKeyDown}
                    className={cn(segmentClass, !isActive && "text-muted-foreground")}
                >
                    {option.label}
                </Button>
            );
        });
    }, [handleOptionKeyDown, onChange, registerButtonRef, segmentClass, value]);

    return (
        <div className="space-y-1" onPasteCapture={handlePasteCapture}>
            <div
                role="radiogroup"
                aria-label={argName}
                {...{ [COMMAND_LOCAL_PRINTABLE_KEYS_ATTR]: "t,y,f,n,space" }}
                className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/25 p-0.5"
            >
                {renderedOptions}
            </div>
            <FieldMessage error={parseError} />
        </div>
    );
}


import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";
import { Button } from "../ui/button";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

function parseBooleanControlValue(input: string) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
        return acceptedParsedInput<"1" | "0">("0");
    }
    if (["1", "true", "yes", "y", "on", "t"].includes(trimmed)) {
        return acceptedParsedInput<"1" | "0">("1");
    }
    if (["0", "false", "no", "n", "off", "f"].includes(trimmed)) {
        return acceptedParsedInput<"1" | "0">("0");
    }

    return rejectedParsedInput<"1" | "0">("0", "Expected a boolean value like true/false, yes/no, or 1/0.");
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
    const onChange = useCallback((next: boolean) => {
        const output = next ? "1" : "0";
        clearParseError();
        setValue(output);
        setOutputValue(argName, output);
    }, [argName, clearParseError, setOutputValue, setValue]);
    const setTrue = useCallback(() => onChange(true), [onChange]);
    const setFalse = useCallback(() => onChange(false), [onChange]);
    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseBooleanControlValue,
            applyParsedResult,
            onAccept: (nextValue) => {
                setValue(nextValue);
                setOutputValue(argName, nextValue);
            },
        });
    }, [applyParsedResult, argName, setOutputValue, setValue]);

    const checked = value === "1";

    return (
        <div onPasteCapture={handlePasteCapture}>
            <div className="flex items-center gap-2">
                <Button size="sm" variant={checked ? "default" : "outline"} aria-pressed={checked} onClick={setTrue}>True</Button>
                <Button size="sm" variant={!checked ? "default" : "outline"} aria-pressed={!checked} onClick={setFalse}>False</Button>
            </div>
            <FieldMessage error={parseError} />
        </div>
    );
}


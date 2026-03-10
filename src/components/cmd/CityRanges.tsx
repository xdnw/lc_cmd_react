import { useSyncedStateFunc } from "@/utils/StateUtil";
import { useCallback } from "react";
import NumberPairInput from "./composite/NumberPairInput";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

function parseCityRangesInput(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
        return acceptedParsedInput<[number | null, number | null]>([null, null]);
    }

    const matched = trimmed.match(/^c?(\d+)(?:-(\d+)|\+)$/i);
    if (!matched) {
        return rejectedParsedInput<[number | null, number | null]>([null, null], "Expected a city range like c10-20 or c10+.");
    }

    return acceptedParsedInput<[number | null, number | null]>([
        parseInt(matched[1], 10),
        matched[2] ? parseInt(matched[2], 10) : null,
    ]);
}

export default function CityRanges(
    {argName, initialValue, setOutputValue, compact}:
    {
        argName: string,
        initialValue: string,
        compact?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue, parseCityRangesInput);
    const [value, setValue] = useSyncedStateFunc<[number | null, number | null]>(initialValue, () => initialResult.value);

    const syncValue = useCallback((next: [number | null, number | null]) => {
        clearParseError();
        setValue(next);
        if (next[0] == null) {
            setOutputValue(argName, "");
            return;
        }
        if (next[1] == null) {
            setOutputValue(argName, `c${next[0]}+`);
            return;
        }
        setOutputValue(argName, `c${next[0]}-${next[1]}`);
    }, [argName, clearParseError, setOutputValue, setValue]);

    const input1 = useCallback((_name: string, t: string) => {
        const from = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [from, value[1]];
        syncValue(next);
    }, [syncValue, value]);

    const input2 = useCallback((_name: string, t: string) => {
        const to = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [value[0], to];
        syncValue(next);
    }, [syncValue, value]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseCityRangesInput,
            applyParsedResult,
            onAccept: syncValue,
        });
    }, [applyParsedResult, syncValue]);

    return <div className="space-y-1" onPasteCapture={handlePasteCapture}><NumberPairInput
        argName={argName}
        values={value}
        delimiter="-"
        compact={compact}
        left={{ min: 0, max: 100, onChange: input1, prefix: "c", placeholder: "1" }}
        right={{ min: 0, max: 100, onChange: input2, placeholder: "+" }}
    /><FieldMessage error={parseError} compact={compact} /></div>;
}
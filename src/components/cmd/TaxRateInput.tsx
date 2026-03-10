import { useSyncedStateFunc } from "@/utils/StateUtil";
import { useCallback } from "react";
import NumberPairInput from "./composite/NumberPairInput";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

function parseTaxRateInput(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
        return acceptedParsedInput<[number | null, number | null]>([null, null]);
    }

    const matched = trimmed.match(/^(\d+)\/(\d+)$/);
    if (!matched) {
        return rejectedParsedInput<[number | null, number | null]>([null, null], "Expected a tax rate like 100/100.");
    }

    return acceptedParsedInput<[number | null, number | null]>([
        parseInt(matched[1], 10),
        parseInt(matched[2], 10),
    ]);
}

export default function TaxRateInput(
    {argName, initialValue, setOutputValue, compact}:
    {
        argName: string,
        initialValue: string,
        compact?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue, parseTaxRateInput);
    const [value, setValue] = useSyncedStateFunc<[number | null, number | null]>(initialValue, () => initialResult.value);
    
    const moneyRate = useCallback((_name: string, t: string) => {
        const money = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [money, value[1]];
        clearParseError();
        setValue(next);
        if (next[0] == null || next[1] == null) {
            setOutputValue(argName, "");
            return;
        }
        setOutputValue(argName, `${next[0]}/${next[1]}`);
    }, [argName, clearParseError, setOutputValue, setValue, value]);

    const rssRate = useCallback((_name: string, t: string) => {
        const rss = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [value[0], rss];
        clearParseError();
        setValue(next);
        if (next[0] == null || next[1] == null) {
            setOutputValue(argName, "");
            return;
        }
        setOutputValue(argName, `${next[0]}/${next[1]}`);
    }, [argName, clearParseError, setOutputValue, setValue, value]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseTaxRateInput,
            applyParsedResult,
            onAccept: (next) => {
                setValue(next);
                if (next[0] == null || next[1] == null) {
                    setOutputValue(argName, "");
                    return;
                }
                setOutputValue(argName, `${next[0]}/${next[1]}`);
            },
        });
    }, [applyParsedResult, argName, setOutputValue, setValue]);

    return <div className="space-y-1" onPasteCapture={handlePasteCapture}><NumberPairInput
        argName={argName}
        values={value}
        delimiter="/"
        compact={compact}
        left={{ min: 0, max: 100, onChange: moneyRate, placeholder: "100" }}
        right={{ min: 0, max: 100, onChange: rssRate, placeholder: "100" }}
    /><FieldMessage error={parseError} compact={compact} /></div>;
}
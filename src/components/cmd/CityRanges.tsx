import { useSyncedStateFunc } from "@/utils/StateUtil";
import { useCallback } from "react";
import NumberPairInput from "./composite/NumberPairInput";
import { getPastedText } from "./pasteUtils";

export default function CityRanges(
    {argName, initialValue, setOutputValue, compact}:
    {
        argName: string,
        initialValue: string,
        compact?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const [value, setValue] = useSyncedStateFunc<[number | null, number | null]>(initialValue, (initial) => {
        const result: [number | null, number | null] = [null, null];
        if (initial) {
            const trimmed = initial.trim();
            const matched = trimmed.match(/^c?(\d+)(?:-(\d+)|\+)$/i);
            if (matched) {
                result[0] = parseInt(matched[1], 10);
                result[1] = matched[2] ? parseInt(matched[2], 10) : null;
            }
        }
        return result;
    });

    const syncValue = useCallback((next: [number | null, number | null]) => {
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
    }, [argName, setOutputValue, setValue]);

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
        const pastedText = getPastedText(event).trim();
        if (!pastedText) return;

        const matched = pastedText.match(/^c?(\d+)(?:-(\d+)|\+)$/i);
        if (!matched) return;

        event.preventDefault();
        event.stopPropagation();
        syncValue([parseInt(matched[1], 10), matched[2] ? parseInt(matched[2], 10) : null]);
    }, [syncValue]);

    return <div onPasteCapture={handlePasteCapture}><NumberPairInput
        argName={argName}
        values={value}
        delimiter={value[1] == null ? "+" : "-"}
        compact={compact}
        left={{ min: 0, max: 100, onChange: input1, prefix: "c" }}
        right={{ min: 0, max: 100, onChange: input2 }}
    /></div>;
}
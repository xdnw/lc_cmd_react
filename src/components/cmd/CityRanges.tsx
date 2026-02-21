import { useSyncedStateFunc } from "@/utils/StateUtil";
import { useCallback } from "react";
import NumberPairInput from "./composite/NumberPairInput";

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
            const matched = trimmed.match(/^c?(\d+)-(\d+)$/i);
            if (matched) {
                result[0] = parseInt(matched[1], 10);
                result[1] = parseInt(matched[2], 10);
            }
        }
        return result;
    });

    const input1 = useCallback((_name: string, t: string) => {
        const from = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [from, value[1]];
        setValue(next);
        if (next[0] == null || next[1] == null) {
            setOutputValue(argName, "");
            return;
        }
        setOutputValue(argName, `c${next[0]}-${next[1]}`);
    }, [argName, setOutputValue, setValue, value]);

    const input2 = useCallback((_name: string, t: string) => {
        const to = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [value[0], to];
        setValue(next);
        if (next[0] == null || next[1] == null) {
            setOutputValue(argName, "");
            return;
        }
        setOutputValue(argName, `c${next[0]}-${next[1]}`);
    }, [argName, setOutputValue, setValue, value]);

    return <NumberPairInput
        argName={argName}
        values={value}
        delimiter="-"
        compact={compact}
        left={{ min: 0, max: 100, onChange: input1, prefix: "c" }}
        right={{ min: 0, max: 100, onChange: input2 }}
    />;
}
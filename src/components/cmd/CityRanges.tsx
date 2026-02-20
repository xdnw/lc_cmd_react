import { useSyncedStateFunc } from "@/utils/StateUtil";
import NumberInput from "./NumberInput";
import { useCallback } from "react";

export default function CityRanges(
    {argName, initialValue, setOutputValue}:
    {
        argName: string,
        initialValue: string,
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

    return (
        <div className="flex w-full items-center">
            <div className="flex items-center w-1/2 grow">
                <span className="mr-2">c</span>
                <NumberInput
                    argName={argName}
                    min={0}
                    max={100}
                    initialValue={value[0] != null ? value[0] + "" : ""}
                    className="grow"
                    setOutputValue={input1}
                    isFloat={false}
                />
            </div>
            <div className="flex items-center w-1/2 grow">
                <span className="mx-2">-</span>
                <NumberInput
                    argName={argName}
                    min={0}
                    max={100}
                    initialValue={value[1] != null ? value[1] + "" : ""}
                    className="grow"
                    setOutputValue={input2}
                    isFloat={false}
                />
            </div>
        </div>
    );
}
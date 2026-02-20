import { useSyncedStateFunc } from "@/utils/StateUtil";
import NumberInput from "./NumberInput";
import { useCallback } from "react";

export default function TaxRateInput(
    {argName, initialValue, setOutputValue}:
    {
        argName: string,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const [value, setValue] = useSyncedStateFunc<[number | null, number | null]>(initialValue, (initial) => {
        const result: [number | null, number | null] = [null, null];
        if (initial && initial.match(/^\d+\/\d+$/)) {
            const split = initial.split('/');
            result[0] = parseInt(split[0], 10);
            result[1] = parseInt(split[1], 10);
        }
        return result;
    });
    
    const moneyRate = useCallback((_name: string, t: string) => {
        const money = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [money, value[1]];
        setValue(next);
        if (next[0] == null || next[1] == null) {
            setOutputValue(argName, "");
            return;
        }
        setOutputValue(argName, `${next[0]}/${next[1]}`);
    }, [argName, setOutputValue, setValue, value]);

    const rssRate = useCallback((_name: string, t: string) => {
        const rss = t ? parseInt(t, 10) : null;
        const next: [number | null, number | null] = [value[0], rss];
        setValue(next);
        if (next[0] == null || next[1] == null) {
            setOutputValue(argName, "");
            return;
        }
        setOutputValue(argName, `${next[0]}/${next[1]}`);
    }, [argName, setOutputValue, setValue, value]);

    return <div className="flex items-center">
    <NumberInput argName={argName} min={0} max={100} initialValue={value[0] != null ? value[0] + "" : ""} className="w-8"
    setOutputValue={moneyRate} isFloat={false} />
    <span>/</span>
    <NumberInput argName={argName} min={0} max={100} initialValue={value[1] != null ? value[1] + "" : ""} className="w-8"
        setOutputValue={rssRate} isFloat={false} />
    </div>
}
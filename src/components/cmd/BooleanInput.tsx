import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";
import { Button } from "../ui/button";

export default function BooleanInput(
    { argName, initialValue, setOutputValue }:
        {
            argName: string,
            initialValue: string,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const [value, setValue] = useSyncedState(initialValue || '');
    const onChange = useCallback((next: boolean) => {
        const output = next ? "1" : "0";
        setValue(output);
        setOutputValue(argName, output);
    }, [argName, setOutputValue, setValue]);
    const setTrue = useCallback(() => onChange(true), [onChange]);
    const setFalse = useCallback(() => onChange(false), [onChange]);

    const checked = value === "1" || value === "true";

    return (
        <div className="flex items-center gap-2">
            <Button size="sm" variant={checked ? "default" : "outline"} onClick={setTrue}>True</Button>
            <Button size="sm" variant={!checked ? "default" : "outline"} onClick={setFalse}>False</Button>
        </div>
    );
}


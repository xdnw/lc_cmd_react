import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";
import { Button } from "../ui/button";

export default function BooleanInput(
    {argName, initialValue, setOutputValue}:
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

    const checked = value === "1" || value === "true";

    return (
        <div className="flex items-center gap-2">
            <Button size="sm" variant={checked ? "default" : "outline"} onClick={() => onChange(true)}>True</Button>
            <Button size="sm" variant={!checked ? "default" : "outline"} onClick={() => onChange(false)}>False</Button>
        </div>
    );
}


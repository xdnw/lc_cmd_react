import { useSyncedState } from "@/utils/StateUtil";
import { Input } from "../ui/input";
import { useCallback } from "react";

export default function BooleanInput(
    {argName, initialValue, setOutputValue}:
    {
        argName: string,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const [value, setValue] = useSyncedState(initialValue || '');
    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.checked ? "1" : "0");
        setOutputValue(argName, e.target.checked ? "1" : "0");
    }, [argName, setOutputValue, setValue]);
    return (
        <label>
                <Input type="checkbox" className="sr-only peer"
                    checked={value === "1" || value === "true"}
                    onChange={onChange}
                />
            </label>
    )
}


import { useSyncedState } from "@/utils/StateUtil";
import { useCallback, useState } from "react";
import { Textarea } from "../ui/textarea";

export default function TextInput(
    { argName, initialValue, filter, setOutputValue }:
        {
            argName: string,
            initialValue: string,
            filter?: string,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const [value, setValue] = useSyncedState(initialValue || '');
    const [isValid, setIsValid] = useState(true);
    const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        setOutputValue(argName, e.target.value);
        if (filter) {
            setIsValid(new RegExp(filter).test(e.target.value));
        }
    }, [filter, argName, setOutputValue, setValue]);

    return (
        <Textarea
            value={value}
            onChange={onChange}
            className={`${!isValid ? 'border-2 border-red-500 relative' : ''}`}
            placeholder="Type here..." />
    )
}
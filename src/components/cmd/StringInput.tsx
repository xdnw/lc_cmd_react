import { Input } from "../ui/input";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { validateRegexInput } from "./field/argValidation";
import { useArgFieldState } from "./field/useArgFieldState";
import FieldMessage from "./field/FieldMessage";

export default function StringInput(
    {argName, initialValue, filter, filterHelp, setOutputValue, compact, placeholder}:
    {
        argName: string,
        initialValue: string,
        filter?: string,
        filterHelp?: string,
        compact?: boolean,
        placeholder?: string,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const { value, setValue, validation, setValidation, resetValidation } = useArgFieldState(initialValue || "");

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const myValue = e.target.value;
        setValue(myValue);
        setOutputValue(argName, myValue);
        if (!myValue) {
            resetValidation();
            return;
        }

        setValidation(validateRegexInput(myValue, filter, filterHelp));
    }, [argName, filter, filterHelp, setOutputValue, setValue, setValidation, resetValidation]);

    return (
        <div>
            <Input
                type="text"
                value={value}
                onChange={onChange}
                className={cn(validation.isValid ? "" : "border-destructive", compact ? "h-8 text-xs" : "")}
                pattern={filter ? filter : ".*"}
                placeholder={placeholder || "Type here..."}
            />
            <FieldMessage error={validation.error} note={validation.note} compact={compact} />
        </div>
    );
}
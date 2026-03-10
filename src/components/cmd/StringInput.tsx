import { Input } from "../ui/input";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { validateRegexInput } from "./field/argValidation";
import { useArgFieldState } from "./field/useArgFieldState";
import FieldMessage from "./field/FieldMessage";

export default function StringInput(
    {argName, initialValue, filter, filterHelp, setOutputValue, compact, placeholder, maxLength}:
    {
        argName: string,
        initialValue: string,
        filter?: string,
        filterHelp?: string,
        compact?: boolean,
        placeholder?: string,
        maxLength?: number,
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
        <div className="space-y-1.5">
            <Input
                type="text"
                value={value}
                onChange={onChange}
                className={cn(
                    "bg-background transition-[border-color,box-shadow] duration-150",
                    validation.isValid ? "" : "border-destructive",
                    compact ? "h-6.5 px-2 text-xs" : "h-7"
                )}
                pattern={filter ? filter : ".*"}
                placeholder={placeholder || "Enter a value"}
                maxLength={maxLength}
            />
            <FieldMessage error={validation.error} note={validation.note} compact={compact} />
        </div>
    );
}
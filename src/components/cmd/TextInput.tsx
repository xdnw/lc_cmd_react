import { useCallback } from "react";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";
import { validateRegexInput } from "./field/argValidation";
import { useArgFieldState } from "./field/useArgFieldState";
import FieldMessage from "./field/FieldMessage";

export default function TextInput(
    { argName, initialValue, filter, setOutputValue, compact }:
        {
            argName: string,
            initialValue: string,
            filter?: string,
            compact?: boolean,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { value, setValue, validation, setValidation, resetValidation } = useArgFieldState(initialValue || "");

    const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        setValue(next);
        setOutputValue(argName, next);
        if (!next) {
            resetValidation();
            return;
        }
        if (filter) {
            setValidation(validateRegexInput(next, filter));
        }
    }, [filter, argName, setOutputValue, setValue, setValidation, resetValidation]);

    return (
        <div className="space-y-1.5">
            <Textarea
                value={value}
                onChange={onChange}
                className={cn(
                    "rounded-md bg-background transition-[border-color,box-shadow] duration-150",
                    validation.isValid ? "" : "border-destructive",
                    compact ? "min-h-16 px-2 py-1.5 text-xs" : "min-h-20 px-2.5 py-2"
                )}
                placeholder="Enter text"
            />
            <FieldMessage error={validation.error} note={validation.note} compact={compact} />
        </div>
    );
}
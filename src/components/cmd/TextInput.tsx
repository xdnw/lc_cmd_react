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
        <div>
            <Textarea
                value={value}
                onChange={onChange}
                className={cn(validation.isValid ? "" : "border-destructive", compact ? "min-h-[60px] text-xs" : "")}
                placeholder="Type here..."
            />
            <FieldMessage error={validation.error} note={validation.note} compact={compact} />
        </div>
    );
}
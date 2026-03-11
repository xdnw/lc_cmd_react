import { useCallback } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { validateNumberInput } from "./field/argValidation";
import { useArgFieldState } from "./field/useArgFieldState";
import FieldMessage from "./field/FieldMessage";
import type { CommandFieldState, CommandFieldStateUpdater } from "./field/commandFieldState";

export default function NumberInput(
    {argName, min, max, initialValue, setOutputValue, isFloat, className, placeholder, compact, fieldState, setFieldState}:
    {
        argName: string,
        min?: number,
        max?: number,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void,
        isFloat: boolean,
        className?: string,
        placeholder?: string,
        compact?: boolean,
        fieldState?: CommandFieldState,
        setFieldState?: (updater: CommandFieldStateUpdater) => void,
    }
) {
    const { value, setDisplayValue, validation, setValidation, resetValidation } = useArgFieldState(initialValue || '', fieldState, setFieldState);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const myStr = e.target.value;
        setDisplayValue(myStr);
        if (!myStr) {
            resetValidation();
            setOutputValue(argName, "");
            return;
        }

        const nextValidation = validateNumberInput(myStr, { isFloat, min, max });
        setValidation(nextValidation);
        if (nextValidation.isValid) {
            setOutputValue(argName, nextValidation.normalizedValue);
        }
    }, [argName, isFloat, max, min, resetValidation, setDisplayValue, setOutputValue, setValidation]);

    return (
        <div className="space-y-1.5">
            <Input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder || "Enter a number"}
                className={cn(
                    "w-full bg-background transition-[border-color,box-shadow] duration-150",
                    validation.isValid ? "" : "border-destructive",
                    className
                )}
            />
            <FieldMessage error={validation.error} note={validation.note} compact={compact} />
        </div>
    );
}
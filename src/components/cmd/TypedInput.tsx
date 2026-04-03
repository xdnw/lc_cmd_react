import { useCallback, useMemo, useState } from "react";
import { COMMANDS } from "../../lib/commands";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useArgFieldState } from "./field/useArgFieldState";
import { validateRegexInput } from "./field/argValidation";
import FieldMessage from "./field/FieldMessage";
import type { CommandFieldState, CommandFieldStateUpdater } from "./field/commandFieldState";
import PlaceholderCommandPickerDialog from "./PlaceholderCommandPickerDialog";
import CommandTextInput from "./field/CommandTextInput";

interface TypedInputProps {
    argName: string;
    initialValue: string;
    filter?: string;
    filterHelp?: string;
    placeholder: keyof typeof COMMANDS.placeholders;
    type: string;
    compact?: boolean;
    simpleInsertDelimiter?: string;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    fieldState?: CommandFieldState;
    setFieldState?: (updater: CommandFieldStateUpdater) => void;
    setOutputValue: (name: string, value: string) => void;
}

function appendTypedInputValue(currentValue: string, insertedValue: string, delimiter: string): string {
    if (!currentValue) {
        return insertedValue;
    }

    if (!delimiter) {
        return `${currentValue}${insertedValue}`;
    }

    const trimmedEnd = currentValue.replace(/[\s,\t]+$/, "");
    if (!trimmedEnd) {
        return insertedValue;
    }

    return `${trimmedEnd}${delimiter}${insertedValue}`;
}

export default function TypedInput({
    argName,
    initialValue,
    filter,
    filterHelp,
    placeholder,
    type,
    compact,
    simpleInsertDelimiter = "",
    inputProps,
    fieldState,
    setFieldState,
    setOutputValue,
}: TypedInputProps) {
    const { value, setDisplayValue, validation, setValidation, resetValidation } = useArgFieldState(initialValue || "", fieldState, setFieldState);
    const [showSimplePicker, setShowSimplePicker] = useState(false);

    // Handle input change via useCallback.
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const myValue = e.target.value;
            setDisplayValue(myValue);
            setOutputValue(argName, myValue);
            if (!myValue) {
                resetValidation();
                return;
            }

            setValidation(validateRegexInput(myValue, filter, filterHelp));
        },
        [argName, filter, filterHelp, resetValidation, setDisplayValue, setOutputValue, setValidation]
    );

    const handleInsertPlaceholder = useCallback((insertedValue: string) => {
        const nextValue = appendTypedInputValue(value, insertedValue, simpleInsertDelimiter);
        setDisplayValue(nextValue);
        setOutputValue(argName, nextValue);
        if (!nextValue) {
            resetValidation();
            return;
        }

        setValidation(validateRegexInput(nextValue, filter, filterHelp));
    }, [argName, filter, filterHelp, resetValidation, setDisplayValue, setOutputValue, setValidation, simpleInsertDelimiter, value]);

    const openSimplePicker = useCallback(() => {
        setShowSimplePicker(true);
    }, []);

    return (
        <div className="space-y-1.5">
            <InputField
                value={value}
                isValid={validation.isValid}
                validText={validation.error}
                onChange={handleInputChange}
                filter={filter}
                compact={compact}
                inputProps={inputProps}
            />
            <FieldMessage error={validation.error} note={validation.note} compact={compact} />
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 w-auto justify-between px-2 text-[11px]"
                    onClick={openSimplePicker}
                >
                    Add simple
                </Button>
                <span className="text-[11px] text-muted-foreground">
                    Browse placeholder paths and fill any required args.
                </span>
            </div>
            <PlaceholderCommandPickerDialog
                open={showSimplePicker}
                onOpenChange={setShowSimplePicker}
                placeholderType={placeholder}
                valueType={type}
                compact={compact}
                onInsert={handleInsertPlaceholder}
            />
        </div>
    );
}

interface InputFieldProps {
    value: string;
    isValid: boolean;
    validText: string;
    filter?: string;
    compact?: boolean;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

function InputField({ value, isValid, onChange, filter, compact, inputProps }: InputFieldProps) {
    const inputClass = useMemo(
        () => cn(!isValid ? "border-destructive" : "", compact ? "h-6.5 px-2 text-xs" : "h-7"),
        [isValid, compact]
    );

    return (
        <div className="flex items-center">
            <CommandTextInput
                type="text"
                value={value}
                onChange={onChange}
                className={inputClass}
                pattern={filter ? filter : ".*"}
                placeholder="Expression or token"
                {...inputProps}
            />
        </div>
    );
}

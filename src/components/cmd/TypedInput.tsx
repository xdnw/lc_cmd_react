import { Input } from "../ui/input";
import { useCallback, useMemo, useState } from "react";
import { COMMANDS } from "../../lib/commands";
import { Button } from "../ui/button";
import { getColOptions } from "@/pages/custom_table/table_util";
import LazyIcon from "../ui/LazyIcon";
import { cn } from "@/lib/utils";
import { useArgFieldState } from "./field/useArgFieldState";
import { validateRegexInput } from "./field/argValidation";
import FieldMessage from "./field/FieldMessage";

function isNumeric(str: string | undefined) {
    if (str) {
        switch (str.toLowerCase()) {
            case "boolean":
            case "int":
            case "integer":
            case "double":
            case "long":
                return true;
        }
    }
    return false;
}

interface TypedInputProps {
    argName: string;
    initialValue: string;
    filter?: string;
    filterHelp?: string;
    placeholder: keyof typeof COMMANDS.placeholders;
    type: string;
    compact?: boolean;
    setOutputValue: (name: string, value: string) => void;
}

export default function TypedInput({
    argName,
    initialValue,
    filter,
    filterHelp,
    placeholder,
    type,
    compact,
    setOutputValue,
}: TypedInputProps) {
    const { value, setValue, validation, setValidation, resetValidation } = useArgFieldState(initialValue || "");

    // Memoize colOptions based on placeholder and type.
    const colOptions = useMemo<[string, string][]>(() =>
        getColOptions(placeholder, (f) =>
            type.toLowerCase() === "double" ? isNumeric(f.command.return_type) : true
        ),
        [placeholder, type]
    );

    // Handle input change via useCallback.
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const myValue = e.target.value;
            setValue(myValue);
            setOutputValue(argName, myValue);
            if (!myValue) {
                resetValidation();
                return;
            }

            setValidation(validateRegexInput(myValue, filter, filterHelp));
        },
        [argName, filter, filterHelp, setOutputValue, setValue, setValidation, resetValidation]
    );

    return (
        <div className="space-y-1.5">
            <InputField
                value={value}
                isValid={validation.isValid}
                validText={validation.error}
                onChange={handleInputChange}
                filter={filter}
                compact={compact}
            />
            <FieldMessage error={validation.error} note={validation.note} compact={compact} />
            <OptionsSelector
                argName={argName}
                value={value}
                setValue={setValue}
                setOutputValue={setOutputValue}
                colOptions={colOptions}
                compact={compact}
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
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

function InputField({ value, isValid, onChange, filter, compact }: InputFieldProps) {
    const inputClass = useMemo(
        () => cn(!isValid ? "border-destructive" : "", compact ? "h-6.5 px-2 text-xs" : "h-7"),
        [isValid, compact]
    );

    return (
        <div className="flex items-center">
            <Input
                type="text"
                value={value}
                onChange={onChange}
                className={inputClass}
                pattern={filter ? filter : ".*"}
                placeholder="Expression or token"
            />
        </div>
    );
}

interface OptionsSelectorProps {
    argName: string;
    value: string;
    setValue: (value: string) => void;
    setOutputValue: (name: string, value: string) => void;
    colOptions: [string, string][];
    compact?: boolean;
}

function OptionsSelector({
    argName,
    value,
    setValue,
    setOutputValue,
    colOptions,
    compact,
}: OptionsSelectorProps) {
    const [collapseColOptions, setCollapseColOptions] = useState(true);
    const [colFilter, setColFilter] = useState("");

    const toggleCollapse = useCallback(() => {
        setCollapseColOptions((prev) => !prev);
    }, []);

    const handleColFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setColFilter(e.target.value.toLowerCase());
    }, []);

    const filteredOptions = useMemo(
        () =>
            colOptions.filter(
                ([key, val]) =>
                    !colFilter ||
                    key.toLowerCase().includes(colFilter) ||
                    val.toLowerCase().includes(colFilter)
            ),
        [colOptions, colFilter]
    );

    const collapseIcon = useMemo(
        () =>
            collapseColOptions ? (
                <LazyIcon name="ChevronDown" />
            ) : (
                <LazyIcon name="ChevronUp" />
            ),
        [collapseColOptions]
    );

    const handleOptionClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            const optionKey = e.currentTarget.dataset.key;
            const newValue = `{${optionKey}}`;
            setOutputValue(argName, newValue);
            setValue(newValue);
        },
        [argName, setOutputValue, setValue]
    );


    return (
        <div className="space-y-1.5">
            <Button
                variant="outline"
                size="sm"
                className="h-6 w-auto justify-between px-2 text-[11px]"
                onClick={toggleCollapse}
            >
                <span className="truncate">Simple placeholders</span>
                {collapseIcon}
            </Button>
            {!collapseColOptions && (
                <div className="max-h-56 rounded-md border border-border/60 bg-muted/15 p-2">
                    <Input
                        type="text"
                        className={cn("mb-2 w-full bg-background", compact ? "h-6.5 px-2 text-xs" : "h-7")}
                        placeholder="Filter"
                        value={colFilter}
                        onChange={handleColFilterChange}
                    />
                    <div className="flex flex-wrap gap-1.5">
                        {filteredOptions.map(([key, desc]) => {
                            const newValue = `{${key}}`;
                            return (
                                <Button
                                    key={key}
                                    variant={value === newValue ? "secondary" : "outline"}
                                    size="sm"
                                    data-key={key}
                                    className={cn("max-w-full", compact ? "h-6 text-[10px]" : "h-6 text-[11px]")}
                                    onClick={handleOptionClick}
                                >
                                    <span className="truncate font-mono">{key}</span>
                                    {!compact && <span className="truncate text-[10px] opacity-60">{desc}</span>}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
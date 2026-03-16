import React from "react";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DataAttributes = {
    [key: `data-${string}`]: string | number | boolean | undefined;
};

type Props = {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
    hint?: React.ReactNode;
    hintClassName?: string;
    inputProps?: Omit<InputProps, "value" | "onChange" | "onKeyDown" | "placeholder" | "className"> & DataAttributes;
};

const SearchBar = React.forwardRef<HTMLInputElement, Props>(
    ({ value, onChange, onClear, onKeyDown, placeholder, className, hint, hintClassName, inputProps }, ref) => {
        const hintId = React.useId();
        const describedBy = [inputProps?.["aria-describedby"], hint ? hintId : null].filter(Boolean).join(" ");

        return (
            <div className="space-y-1">
                <div className="relative w-full">
                    <Input
                        ref={ref}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        {...inputProps}
                        aria-describedby={describedBy || undefined}
                        className={cn("h-7 w-full pr-8", className)}
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        onKeyDown={onKeyDown}
                    />

                    {value.trim().length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="iconSm"
                            onClick={onClear}
                            className="absolute right-1 top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
                            aria-label="Clear search"
                            title="Clear search (Esc)"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>

                {hint ? (
                    <div id={hintId} className={cn("text-[11px] leading-4 text-muted-foreground", hintClassName)}>
                        {hint}
                    </div>
                ) : null}
            </div>
        );
    }
);

SearchBar.displayName = "SearchBar";

export default SearchBar;

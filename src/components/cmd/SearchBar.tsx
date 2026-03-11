import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
};

const SearchBar = React.forwardRef<HTMLInputElement, Props>(
    ({ value, onChange, onClear, onKeyDown, placeholder, className }, ref) => {
        const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") {
                onClear();
            }
            onKeyDown?.(e);
        }, [onClear, onKeyDown]);

        return (
            <div className="relative w-full">
                <Input
                    ref={ref}
                    className={cn("h-7 w-full pr-8", className)}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    spellCheck={false}
                />

                {value.trim().length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="iconSm"
                        onClick={onClear}
                        className="absolute right-0.5 top-1/2 -translate-y-1/2"
                        aria-label="Clear search"
                        title="Clear search (Esc)"
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        );
    }
);

SearchBar.displayName = "SearchBar";

export default SearchBar;

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

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
                    className={["w-full pr-10 h-10", className ?? ""].join(" ")}
                    type="search"
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
                        size="icon"
                        onClick={onClear}
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        aria-label="Clear search"
                        title="Clear search (Esc)"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    }
);

SearchBar.displayName = "SearchBar";

export default SearchBar;

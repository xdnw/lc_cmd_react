import { useCallback, useMemo } from "react";

import { useSegmentedControlKeyboard, type SegmentedControlKeyBindings } from "@/components/cmd/segmentedControl";
import { cn } from "@/lib/utils";

export type CompactSegmentedOption<T extends string> = {
    value: T;
    label: string;
    activeClassName?: string;
    title?: string;
};

export function CompactSegmentedControl<T extends string>({
    ariaLabel,
    value,
    options,
    onChange,
    className,
    optionClassName,
}: {
    ariaLabel: string;
    value: T;
    options: readonly CompactSegmentedOption<T>[];
    onChange: (value: T) => void;
    className?: string;
    optionClassName?: string;
}) {
    const values = useMemo(() => options.map((option) => option.value), [options]);
    const optionClickHandlers = useMemo(
        () => options.map((option) => () => onChange(option.value)),
        [onChange, options],
    );
    const resolveKey = useCallback((key: string): SegmentedControlKeyBindings<T> | null => {
        switch (key) {
            case "ArrowLeft":
            case "ArrowUp":
                return { selectPrevious: true };
            case "ArrowRight":
            case "ArrowDown":
                return { selectNext: true };
            case "Home":
                return { selectFirst: true };
            case "End":
                return { selectLast: true };
            default:
                return null;
        }
    }, []);
    const { registerButtonRef, handleOptionKeyDown } = useSegmentedControlKeyboard({
        values,
        value,
        onSelect: (nextValue) => onChange(nextValue),
        resolveKey,
    });
    const optionRefHandlers = useMemo(
        () => options.map((_, index) => (node: HTMLButtonElement | null) => registerButtonRef(index, node)),
        [options, registerButtonRef],
    );

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={cn(
                "inline-flex w-fit max-w-full items-center gap-0.5 rounded-sm border border-border/80 bg-muted/20 p-0.5",
                className,
            )}
        >
            {options.map((option, index) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={option.value}
                        ref={optionRefHandlers[index]}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        tabIndex={isActive ? 0 : -1}
                        title={option.title ?? option.label}
                        onClick={optionClickHandlers[index]}
                        onKeyDown={handleOptionKeyDown}
                        className={cn(
                            "inline-flex h-5 shrink-0 items-center justify-center rounded-sm px-1.5 text-[10px] font-medium leading-none transition-colors",
                            isActive
                                ? cn("border border-border/70 bg-background text-foreground shadow-xs", option.activeClassName)
                                : "text-foreground/70 hover:bg-background hover:text-foreground",
                            optionClassName,
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

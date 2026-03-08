import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { getPastedText } from "./pasteUtils";

type TriStateValue = "-1" | "0" | "1";

function normalizeTriStateValue(value: string): TriStateValue {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on", "t"].includes(normalized)) {
        return "1";
    }
    if (["-1", "false", "no", "n", "off", "f"].includes(normalized)) {
        return "-1";
    }
    return "0";
}

const TRI_STATE_OPTIONS: Array<{
    value: TriStateValue;
    label: string;
    icon: string;
    activeClass: string;
}> = [
    {
        value: "-1",
        label: "No",
        icon: "X",
        activeClass: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
    },
    {
        value: "0",
        label: "Any",
        icon: "/",
        activeClass: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    },
    {
        value: "1",
        label: "Yes",
        icon: "\u2714",
        activeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
];

export default function TriStateInput(
    { argName, initialValue, setOutputValue, compact }:
        {
            argName: string,
            initialValue: string,
            compact?: boolean,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const [value, setValue] = useSyncedState(normalizeTriStateValue(initialValue || "0"));
    const normalizedValue: TriStateValue = value === "-1" || value === "1" ? value : "0";

    const handleButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const nextValue = event.currentTarget.value as TriStateValue;
        setValue(nextValue);
        setOutputValue(argName, nextValue);
    }, [argName, setOutputValue, setValue]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = getPastedText(event);
        if (!pastedText.trim()) return;

        const nextValue = normalizeTriStateValue(pastedText);
        event.preventDefault();
        event.stopPropagation();
        setValue(nextValue);
        setOutputValue(argName, nextValue);
    }, [argName, setOutputValue, setValue]);

    return (
        <div
            role="radiogroup"
            aria-label={argName}
            onPasteCapture={handlePasteCapture}
            className={cn(
                "inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/55 p-0.5",
                compact ? "h-6.5" : "h-7"
            )}
        >
            {TRI_STATE_OPTIONS.map((option) => {
                const isActive = normalizedValue === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        aria-label={option.label}
                        title={option.label}
                        value={option.value}
                        onClick={handleButtonClick}
                        className={cn(
                            "inline-flex items-center justify-center rounded-sm border text-[11px] leading-none transition-all duration-150",
                            compact ? "h-5.5 w-5.5" : "h-6 w-6",
                            isActive
                                ? `font-semibold shadow-sm ${option.activeClass}`
                                : "border-transparent text-muted-foreground hover:bg-background/80 hover:text-foreground"
                        )}
                    >
                        {option.icon}
                    </button>
                );
            })}
        </div>
    );
}
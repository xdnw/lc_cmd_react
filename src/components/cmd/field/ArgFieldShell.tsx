import { cn } from "@/lib/utils";
import { useCallback, type ReactNode } from "react";
import type { CommandInputDisplayMode } from "./fieldTypes";

const INTERACTIVE_DESCENDANT_SELECTOR = [
    "input",
    "textarea",
    "select",
    "button",
    "[contenteditable='true']",
    "[contenteditable='plaintext-only']",
    "[role='textbox']",
].join(", ");

const PRIMARY_FOCUS_TARGET_SELECTOR = [
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "[contenteditable='true']",
    "[contenteditable='plaintext-only']",
    "[role='textbox']",
].join(", ");

const FALLBACK_FOCUS_TARGET_SELECTOR = [
    PRIMARY_FOCUS_TARGET_SELECTOR,
    "button:not([disabled])",
].join(", ");

export default function ArgFieldShell({
    children,
    displayMode,
    className,
    isOptional,
}: {
    children: ReactNode;
    displayMode?: CommandInputDisplayMode;
    className?: string;
    isOptional?: boolean;
}) {
    const isFocusPane = displayMode === "focus-pane";

    const handleShellClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (!target.closest(INTERACTIVE_DESCENDANT_SELECTOR)) {
            const primaryTarget = e.currentTarget.querySelector(PRIMARY_FOCUS_TARGET_SELECTOR) as HTMLElement | null;
            const fallbackTarget = e.currentTarget.querySelector(FALLBACK_FOCUS_TARGET_SELECTOR) as HTMLElement | null;
            (primaryTarget ?? fallbackTarget)?.focus();
        }
    }, []);

    return (
        <div
            className={cn(
                "group/arg-field relative rounded-md border bg-background transition-colors duration-150 hover:border-border focus-within:z-30 focus-within:border-primary/55 focus-within:ring-1 focus-within:ring-primary/25 shadow-[0_1px_0_rgba(0,0,0,0.03)]",
                isOptional ? "border-dashed border-border/70 border-l-[3px] border-l-sky-500/45" : "border-solid border-border/90 border-l-[3px] border-l-primary/35",
                isFocusPane && (isOptional
                    ? "bg-muted/10"
                    : "bg-background"),
                isFocusPane ? "flex flex-row items-center gap-1.5 px-1 py-0.75" : "px-2 py-1.5",
                className,
            )}
            onClick={handleShellClick}
        >
            {children}
        </div>
    );
}

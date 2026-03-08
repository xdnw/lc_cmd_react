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
                "rounded border bg-accent/40",
                isOptional ? "border-dashed border-border/60" : "border-solid border-border",
                isFocusPane && (isOptional
                    ? "border-l-border bg-muted/30"
                    : "border-l-primary/80 bg-primary/10"),
                isFocusPane ? "px-1.5 py-0.5 flex flex-row items-center gap-2" : "px-1.5 py-0.5",
                className,
            )}
            onClick={handleShellClick}
        >
            {children}
        </div>
    );
}

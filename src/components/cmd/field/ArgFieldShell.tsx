import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { CommandInputDisplayMode } from "./fieldTypes";

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
    return (
        <div
            className={cn(
                "rounded border bg-accent/40",
                isOptional ? "border-dashed border-border/60" : "border-solid border-border",
                displayMode === "focus-pane" ? "px-2 py-1 flex flex-row items-center gap-2" : "px-2 py-1",
                className,
            )}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('input, textarea, select, button')) {
                    const input = e.currentTarget.querySelector('input, textarea, select, button') as HTMLElement;
                    if (input) {
                        input.focus();
                    }
                }
            }}
        >
            {children}
        </div>
    );
}

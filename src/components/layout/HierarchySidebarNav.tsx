import { useEffect, useMemo, useRef, useCallback } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HierarchySidebarStatus = "default" | "set" | "unset" | "warning" | "error" | "disabled";

export type HierarchySidebarItemQuickAction = {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
};

export type HierarchySidebarItem = {
    id: string;
    label: string;
    level: number;
    title?: string;
    meta?: ReactNode;
    active?: boolean;
    inActivePath?: boolean;
    disabled?: boolean;
    status?: HierarchySidebarStatus;
    tone?: "section" | "subsection" | "item";
    onSelect?: () => void;
    quickAction?: HierarchySidebarItemQuickAction;
};

function getStatusClasses(status: HierarchySidebarStatus | undefined): string {
    switch (status) {
        case "set":
            return "bg-emerald-500/80 ring-1 ring-emerald-500/20";
        case "unset":
            return "bg-transparent ring-1 ring-border/90";
        case "warning":
            return "bg-amber-500/80 ring-1 ring-amber-500/25";
        case "error":
            return "bg-destructive ring-1 ring-destructive/25";
        case "disabled":
            return "bg-muted-foreground/35 ring-1 ring-muted-foreground/15";
        default:
            return "bg-muted-foreground/60 ring-1 ring-muted-foreground/10";
    }
}

function getToneClasses(tone: HierarchySidebarItem["tone"]): string {
    switch (tone) {
        case "section":
            return "text-[11px] font-semibold tracking-tight";
        case "subsection":
            return "text-[11px] font-medium";
        default:
            return "text-[12px]";
    }
}

function HierarchySidebarNavRow({
    item,
    registerItemRef,
}: {
    item: HierarchySidebarItem;
    registerItemRef: (id: string, node: HTMLButtonElement | null) => void;
}) {
    const isCurrent = Boolean(item.active);
    const isCurrentPath = Boolean(item.inActivePath);
    const indent = `${item.level * 10}px`;

    const handleRef = useCallback(
        (node: HTMLButtonElement | null) => {
            registerItemRef(item.id, node);
        },
        [item.id, registerItemRef],
    );

    const handleQuickActionClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            item.quickAction?.onClick();
        },
        [item.quickAction],
    );

    return (
        <div
            className={cn(
                "group flex min-w-0 items-center gap-1",
                item.level === 0 ? "pt-0.5 first:pt-0" : "",
            )}
            style={{ paddingLeft: indent }}
        >
            <button
                ref={handleRef}
                type="button"
                title={item.title ?? item.label}
                aria-current={isCurrent ? "location" : undefined}
                disabled={item.disabled}
                onClick={item.onSelect}
                className={cn(
                    "flex h-6 min-w-0 flex-1 items-center gap-1.5 px-1 text-left transition-colors",
                    getToneClasses(item.tone),
                    isCurrent
                        ? "bg-accent text-foreground"
                        : isCurrentPath
                            ? "bg-muted/35 text-foreground"
                            : "text-muted-foreground hover:bg-accent/55 hover:text-foreground",
                    item.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                )}
            >
                <span
                    aria-hidden="true"
                    className={cn("h-1.5 w-1.5 shrink-0 rounded-full", getStatusClasses(item.status))}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.meta && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">{item.meta}</span>
                )}
            </button>

            {item.quickAction && (
                <Button
                    type="button"
                    variant="ghost"
                    size="iconSm"
                    title={item.quickAction.label}
                    aria-label={item.quickAction.label}
                    disabled={item.quickAction.disabled}
                    onClick={handleQuickActionClick}
                    className={cn(
                        "h-5 w-5 rounded-sm text-muted-foreground transition-opacity",
                        isCurrent || isCurrentPath ? "opacity-100" : "opacity-55 hover:opacity-100",
                    )}
                >
                    {item.quickAction.icon}
                </Button>
            )}
        </div>
    );
}

export default function HierarchySidebarNav({
    ariaLabel,
    title,
    subtitle,
    items,
    className,
    contentClassName,
    showHeader = true,
}: {
    ariaLabel?: string;
    title?: string;
    subtitle?: ReactNode;
    items: HierarchySidebarItem[];
    className?: string;
    contentClassName?: string;
    showHeader?: boolean;
}) {
    const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const registerItemRef = useCallback(
        (id: string, node: HTMLButtonElement | null) => {
            itemRefs.current[id] = node;
        },
        [],
    );
    const activeId = useMemo(
        () => items.find((item) => item.active)?.id ?? items.find((item) => item.inActivePath)?.id ?? null,
        [items],
    );

    useEffect(() => {
        if (!activeId) {
            return;
        }

        itemRefs.current[activeId]?.scrollIntoView({ block: "nearest" });
    }, [activeId]);

    return (
        <nav
            aria-label={ariaLabel ?? title ?? "Section navigation"}
            className={cn(
                "flex h-full min-h-0 w-full flex-col border border-border/70 bg-background/92 backdrop-blur supports-backdrop-filter:bg-background/78",
                className,
            )}
        >
            {showHeader && (title || subtitle) && (
                <div className="border-b border-border/70 px-2 py-1.5">
                    {title && <div className="text-[11px] font-semibold tracking-[0.08em] text-foreground/90 uppercase">{title}</div>}
                    {subtitle && <div className="pt-1 text-[11px] leading-4 text-muted-foreground">{subtitle}</div>}
                </div>
            )}

            <div className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-0.5 py-0.5",
                showHeader && (title || subtitle)
                    ? "max-h-[calc(100vh-7.75rem)]"
                    : "max-h-[calc(100vh-1.5rem)]",
                contentClassName,
            )}>
                {items.length > 0 ? (
                    <div className="space-y-0.5">
                        {items.map((item) => (
                            <HierarchySidebarNavRow
                                key={item.id}
                                item={item}
                                registerItemRef={registerItemRef}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="px-1 py-2 text-[11px] text-muted-foreground">No sections available.</div>
                )}
            </div>
        </nav>
    );
}

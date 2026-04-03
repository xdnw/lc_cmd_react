import { cn } from "@/lib/utils";
import { memo, useCallback } from "react";

import { Button } from "../ui/button";

type KeyValueListEntry = {
    key: string;
    value: string;
};

const KeyValueEntryRow = memo(function KeyValueEntryRow({
    item,
    compact,
    onRemove,
    removeButtonTabIndex,
}: {
    item: KeyValueListEntry;
    compact?: boolean;
    onRemove: (key: string) => void;
    removeButtonTabIndex?: number;
}) {
    const handleRemoveClick = useCallback(() => {
        onRemove(item.key);
    }, [item.key, onRemove]);

    return (
        <div
            className={cn(
                "grid min-w-0 grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/60 bg-muted/10 px-2",
                compact ? "py-1 text-xs" : "py-1.5 text-[13px]",
            )}
        >
            <div className="truncate text-[11px] font-medium text-muted-foreground">{item.key}</div>
            <div className="min-w-0 wrap-break-word font-mono text-foreground/90">{item.value}</div>
            <Button
                type="button"
                onClick={handleRemoveClick}
                variant="ghost"
                size="sm"
                tabIndex={removeButtonTabIndex}
                aria-label={`Remove ${item.key}`}
                className="h-5 px-1.5 text-[10px]"
            >
                Remove
            </Button>
        </div>
    );
});

export default function KeyValueEntryList({
    items,
    emptyText,
    compact,
    onRemove,
    removeButtonTabIndex,
}: {
    items: KeyValueListEntry[];
    emptyText: string;
    compact?: boolean;
    onRemove: (key: string) => void;
    removeButtonTabIndex?: number;
}) {
    return (
        <div className="space-y-1.5">
            {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border/70 bg-muted/10 px-2 py-1.5 text-xs text-muted-foreground">{emptyText}</p>
            )}
            {items.map((item) => (
                <KeyValueEntryRow
                    key={item.key}
                    item={item}
                    compact={compact}
                    onRemove={onRemove}
                    removeButtonTabIndex={removeButtonTabIndex}
                />
            ))}
        </div>
    );
}

import { cn } from "@/lib/utils";

import { Button } from "../ui/button";

type KeyValueListEntry = {
    key: string;
    value: string;
};

export default function KeyValueEntryList({
    items,
    emptyText,
    compact,
    onRemove,
}: {
    items: KeyValueListEntry[];
    emptyText: string;
    compact?: boolean;
    onRemove: (key: string) => void;
}) {
    return (
        <>
            {items.length === 0 && (
                <p className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">{emptyText}</p>
            )}
            {items.map((item) => (
                <div
                    key={item.key}
                    className={cn(
                        "mt-1 flex items-center justify-between rounded border border-border bg-background px-2",
                        compact ? "py-1 text-xs" : "py-1.5 text-sm",
                    )}
                >
                    <span className="mr-4 break-all">{item.key}: {item.value}</span>
                    <Button
                        onClick={() => onRemove(item.key)}
                        variant="outline"
                        size="sm"
                        tabIndex={-1}
                        className={compact ? "h-6 px-2 text-xs" : undefined}
                    >
                        Remove
                    </Button>
                </div>
            ))}
        </>
    );
}

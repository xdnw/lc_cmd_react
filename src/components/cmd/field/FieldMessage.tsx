import { cn } from "@/lib/utils";

export default function FieldMessage({
    error,
    note,
    compact,
}: {
    error?: string;
    note?: string;
    compact?: boolean;
}) {
    if (!error && !note) return null;

    return (
        <div className={cn("mt-1 text-xs", compact ? "leading-tight" : "leading-normal")}>
            {error && <p className="font-medium text-destructive">{error}</p>}
            {!error && note && <p className="text-muted-foreground">{note}</p>}
        </div>
    );
}

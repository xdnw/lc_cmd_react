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
        <div className={cn("mt-1 text-[11px]", compact ? "leading-tight" : "leading-normal")}>
            {error && (
                <p className="border-l-2 border-destructive/60 pl-2 font-medium text-destructive">
                    {error}
                </p>
            )}
            {!error && note && (
                <p className="border-l-2 border-border/60 pl-2 text-muted-foreground">
                    {note}
                </p>
            )}
        </div>
    );
}

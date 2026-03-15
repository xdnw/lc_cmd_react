import { cn } from "@/lib/utils"

export default function Badge({
    variant = "default",
    className,
    children,
}: {
    variant?: "default" | "secondary" | "destructive" | "outline" | string;
    className?: string;
    children?: React.ReactNode;
}) {
    const base = "inline-flex items-center gap-1 rounded-sm px-1.5 py-0 text-[11px] font-medium leading-5 align-middle";
    let variantClass = "bg-secondary/70 text-secondary-foreground";

    if (variant === "secondary") variantClass = "bg-muted/80 text-muted-foreground";
    else if (variant === "destructive") variantClass = "bg-destructive/10 text-destructive";
    else if (variant === "outline") variantClass = "border border-border/70 bg-muted/15 text-foreground/80";

    return <span className={cn(base, variantClass, className)}>{children}</span>;
}
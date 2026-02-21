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
    const base = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium";
    let variantClass = "bg-secondary text-secondary-foreground";

    if (variant === "secondary") variantClass = "bg-muted text-muted-foreground";
    else if (variant === "destructive") variantClass = "bg-destructive/10 text-destructive";
    else if (variant === "outline") variantClass = "border border-border bg-transparent text-foreground";

    return <span className={cn(base, variantClass, className)}>{children}</span>;
}
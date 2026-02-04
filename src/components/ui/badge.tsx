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
    let variantClass = "bg-slate-100 text-slate-800";

    if (variant === "secondary") variantClass = "bg-gray-100 text-gray-800";
    else if (variant === "destructive") variantClass = "bg-red-50 text-red-700";
    else if (variant === "outline") variantClass = "border border-gray-200 bg-transparent text-gray-700";

    return <span className={cn(base, variantClass, className)}>{children}</span>;
}
import { BlockCopyButton } from "@/components/ui/block-copy-button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function CommandStringPreview({
    text,
    getText,
    className,
}: {
    text: string;
    getText: () => string;
    className?: string;
}) {
    return (
        <div className={cn("grid min-w-0 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5", className)}>
            <TooltipProvider>
                <BlockCopyButton
                    className="rounded-[5px] [&_svg]:size-3.5"
                    size="sm"
                    left={true}
                    getText={getText}
                    tabIndex={-1}
                />
            </TooltipProvider>
            <p className="block min-w-0 truncate rounded-md border border-input/80 bg-accent/45 px-2 py-1 font-mono text-[11px] text-foreground/90">
                {text}
            </p>
        </div>
    );
}

import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface LazyExpanderProps {
    children: ReactNode;
    content: ReactNode;
    className?: string;
}

const LazyExpander = ({ children, content, className = "" }: LazyExpanderProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const toggleExpand = useCallback(() => {
        if (!isExpanded && !hasLoaded) {
            setHasLoaded(true);
        }
        setIsExpanded(!isExpanded);
    }, [isExpanded, hasLoaded]);

    const expandedContent = useMemo(() => {
        if (!isExpanded) return null;
        return (
            <div className="mt-1 p-3 border border-slate-300 dark:border-slate-600 rounded-md shadow-md bg-white dark:bg-slate-800 w-full animate-in fade-in duration-200">
                {hasLoaded && content}
            </div>
        );
    }, [isExpanded, hasLoaded, content]);

    const chevronIcon = useMemo(() => (
        <span className="ml-2 text-slate-500 flex-shrink-0">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
    ), [isExpanded]);

    return (
        <div className="flex flex-col w-full">
            <Button variant="outline" size="sm" className={cn("w-full cursor-pointer", className)}
                onClick={toggleExpand}
                role="button"
                aria-expanded={isExpanded}
            >
                <div className="flex-grow">{children}</div>
                {chevronIcon}
            </Button>
            {expandedContent && (
                <div className="relative">
                    {expandedContent}
                </div>
            )}
        </div>
    );
};

export default LazyExpander;
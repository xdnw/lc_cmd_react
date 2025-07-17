import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Button } from "./button";

interface ExpandableTableRowProps {
    id: number;
    label: string | null;
    value?: ReactNode;
    expandedContent?: ReactNode;
    buttons?: React.ReactNode;
    className?: string;
    isEven?: boolean;
}

const ExpandableTableRow = ({
    id,
    label,
    value,
    expandedContent,
    buttons,
    className = "",
    isEven = false,
}: ExpandableTableRowProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const toggleExpand = useCallback(() => {
        if (!isExpanded && !hasLoaded) {
            setHasLoaded(true);
        }
        setIsExpanded(!isExpanded);
    }, [isExpanded, hasLoaded]);

    // Base row styling
    const rowClassNames = useMemo(() =>
        `divide-x divide-primary/5 ${isEven ? "bg-primary/5" : ""} ${className}`,
        [isEven, className]
    );

    // Only show toggle button if there's expandable content
    const showToggle = !!expandedContent;

    // Toggle button with or without value
    const toggleButton = useMemo(() => {
        if (!showToggle) return null;

        return (
            <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 p-2"
                onClick={toggleExpand}
            >
                <span>{value}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
        );
    }, [showToggle, value, isExpanded, toggleExpand]);

    // Expanded content row
    const expandedRow = useMemo(() => {
        if (!isExpanded) return null;

        return (
            <tr key={`expanded-${id}`} className={isEven ? "bg-primary/5" : ""}>
                <td colSpan={2} className="p-0">
                    <div className="p-3 border-t border-primary/10 animate-in fade-in duration-200">
                        {hasLoaded && expandedContent}
                    </div>
                </td>
            </tr>
        );
    }, [isExpanded, hasLoaded, expandedContent, id, isEven]);

    return (
        <>
            <tr key={`row-${id}`} className={rowClassNames}>
                {label && <td className="p-1 min-w-fit whitespace-nowrap font-medium text-right pr-3">{label}</td>}
                <td className="p-1 w-full" colSpan={label ? 1 : 2}>
                    <div className="flex">
                        <div>
                            {showToggle ? toggleButton : value}
                        </div>
                        {buttons && <div className="">{buttons}</div>}
                    </div>
                </td>
            </tr>
            {expandedRow}
        </>
    );
};

export default ExpandableTableRow;
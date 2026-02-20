import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCallback, useRef, type ChangeEvent, type MouseEvent } from "react";

export default function SelectionCellButton({
    id,
    isSelected,
    onToggle,
    label,
    debugTag,
    rowNumber,
}: {
    id: number;
    isSelected: boolean;
    onToggle: (id: number, shiftKey: boolean) => void;
    label?: string;
    debugTag?: string;
    rowNumber?: number;
}) {
    const shiftRef = useRef(false);

    const onMouseDown = useCallback((event: MouseEvent<HTMLInputElement>) => {
        const nativeEvent = event.nativeEvent as globalThis.MouseEvent;
        shiftRef.current = nativeEvent.shiftKey;
        event.stopPropagation();
    }, []);

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const shiftKey = shiftRef.current;
        onToggle(id, shiftKey);
        shiftRef.current = false;
        event.stopPropagation();
    }, [id, onToggle]);

    return (
        <label className={cn("inline-flex items-center gap-2", isSelected ? "text-blue-600" : undefined)}>
            <Input
                type="checkbox"
                className="h-4 w-4"
                checked={isSelected}
                onMouseDown={onMouseDown}
                onChange={onChange}
                aria-label={label ?? `Toggle selection for ${id}`}
                title={label ?? `Toggle selection for ${id}`}
                data-debug={debugTag}
            />
            {typeof rowNumber === "number" && (
                <span className="text-xs text-muted-foreground select-none">{rowNumber}</span>
            )}
        </label>
    );
}

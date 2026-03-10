import NumberInput from "../NumberInput";
import { cn } from "@/lib/utils";

export default function NumberPairInput({
    argName,
    values,
    left,
    right,
    delimiter,
    compact,
}: {
    argName: string;
    values: [number | null, number | null];
    left: {
        min?: number;
        max?: number;
        onChange: (name: string, value: string) => void;
        prefix?: string;
        placeholder?: string;
    };
    right: {
        min?: number;
        max?: number;
        onChange: (name: string, value: string) => void;
        prefix?: string;
        placeholder?: string;
    };
    delimiter: string;
    compact?: boolean;
}) {
    return (
        <div className={cn("flex items-center", compact ? "gap-1" : "gap-1.5")}>
            <div className="flex items-center gap-1">
                {left.prefix ? <span className="text-xs text-muted-foreground">{left.prefix}</span> : null}
                <NumberInput
                    argName={argName}
                    min={left.min}
                    max={left.max}
                    initialValue={values[0] != null ? `${values[0]}` : ""}
                    className={cn(compact ? "h-6 w-11 text-xs" : "h-7 w-14 text-[13px]")}
                    placeholder={left.placeholder}
                    setOutputValue={left.onChange}
                    isFloat={false}
                    compact={compact}
                />
            </div>
            <span className="text-xs text-muted-foreground">{delimiter}</span>
            <div className="flex items-center gap-1">
                {right.prefix ? <span className="text-xs text-muted-foreground">{right.prefix}</span> : null}
                <NumberInput
                    argName={argName}
                    min={right.min}
                    max={right.max}
                    initialValue={values[1] != null ? `${values[1]}` : ""}
                    className={cn(compact ? "h-6 w-11 text-xs" : "h-7 w-14 text-[13px]")}
                    placeholder={right.placeholder}
                    setOutputValue={right.onChange}
                    isFloat={false}
                    compact={compact}
                />
            </div>
        </div>
    );
}

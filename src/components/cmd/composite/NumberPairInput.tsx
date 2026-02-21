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
    };
    right: {
        min?: number;
        max?: number;
        onChange: (name: string, value: string) => void;
        prefix?: string;
    };
    delimiter: string;
    compact?: boolean;
}) {
    return (
        <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
            <div className="flex items-center gap-1">
                {left.prefix ? <span className="text-xs text-muted-foreground">{left.prefix}</span> : null}
                <NumberInput
                    argName={argName}
                    min={left.min}
                    max={left.max}
                    initialValue={values[0] != null ? `${values[0]}` : ""}
                    className={cn(compact ? "h-8 text-xs" : "", "w-20")}
                    setOutputValue={left.onChange}
                    isFloat={false}
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
                    className={cn(compact ? "h-8 text-xs" : "", "w-20")}
                    setOutputValue={right.onChange}
                    isFloat={false}
                />
            </div>
        </div>
    );
}

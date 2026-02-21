import { useSyncedState } from "@/utils/StateUtil";
import { Input } from '../ui/input';
import { Button } from '../ui/button.tsx';
import { useCallback } from "react";

export default function ColorInput(
    {argName, initialValue, setOutputValue, compact}:
    {
        argName: string,
        initialValue: string,
        compact?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const [value, setValue] = useSyncedState(initialValue || '');

    const handleClear = useCallback(() => {
        setValue('');
        setOutputValue(argName, '');
    }, [argName, setOutputValue, setValue]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue); 
        setOutputValue(argName, newValue);
    }, [argName, setOutputValue, setValue]);

    return (
        <div className='flex items-center gap-2'>
            <Input type="color"
                   className={compact ? "h-8 w-10" : "h-9 w-12"}
                   value={value}
                   onChange={handleChange} />
            <Button onClick={handleClear} variant="outline" size="sm" disabled={!value}>Clear</Button>
            <span className="text-xs text-muted-foreground">{value || "No color set"}</span>
        </div>
    );
}
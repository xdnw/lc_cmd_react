import { useSyncedState } from "@/utils/StateUtil";
import { Input } from '../ui/input';
import { Button } from '../ui/button.tsx';
import { useCallback, useMemo } from "react";
import { getPastedText } from "./pasteUtils";
import { normalizeColorValue } from "./scalarInputNormalization";
import CommandTextInput from "./field/CommandTextInput";

export default function ColorInput(
    {argName, initialValue, setOutputValue, compact}:
    {
        argName: string,
        initialValue: string,
        compact?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const initialTextValue = initialValue || '';
    const [textValue, setTextValue] = useSyncedState(initialTextValue);
    const [pickerValue, setPickerValue] = useSyncedState(normalizeColorValue(initialTextValue));

    const handleClear = useCallback(() => {
        setTextValue('');
        setPickerValue('');
        setOutputValue(argName, '');
    }, [argName, setOutputValue, setPickerValue, setTextValue]);

    const handlePickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setTextValue(newValue);
        setPickerValue(newValue);
        setOutputValue(argName, newValue);
    }, [argName, setOutputValue, setPickerValue, setTextValue]);

    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const normalized = normalizeColorValue(newValue);
        setTextValue(newValue);
        setPickerValue(normalized);
        setOutputValue(argName, normalized ? newValue : '');
    }, [argName, setOutputValue, setPickerValue, setTextValue]);

    const handleTextPaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = getPastedText(event).trim();
        if (!pastedText) return;

        const normalized = normalizeColorValue(pastedText);
        if (!normalized) return;

        event.preventDefault();
        setTextValue(pastedText);
        setPickerValue(normalized);
        setOutputValue(argName, pastedText);
    }, [argName, setOutputValue, setPickerValue, setTextValue]);

    return (
        <div className='flex items-center gap-1.5'>
                 <CommandTextInput
                     type="text"
                     className={compact ? "h-6.5 w-24 px-2 text-xs" : "h-7 w-32 text-[13px]"}
                     value={textValue}
                     placeholder="#420420 or red"
                     onChange={handleTextChange}
                     onPaste={handleTextPaste} />
            <Input type="color"
                   className={compact ? "h-6.5 w-8 p-0.5" : "h-7 w-9 p-0.5"}
                   value={pickerValue || "#000000"}
                   onChange={handlePickerChange} />
            <Button onClick={handleClear} variant="ghost" size="sm" disabled={!textValue} className="h-6 px-1.5 text-[10px]">Clear</Button>
        </div>
    );
}
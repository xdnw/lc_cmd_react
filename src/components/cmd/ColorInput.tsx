import { useSyncedState } from "@/utils/StateUtil";
import { Input } from '../ui/input';
import { Button } from '../ui/button.tsx';
import { useCallback, useMemo } from "react";
import { getPastedText } from "./pasteUtils";

function normalizeColorValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed || typeof document === "undefined") return "";

    const probe = document.createElement("div");
    probe.style.color = "";
    probe.style.color = trimmed;
    if (!probe.style.color) return "";

    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    document.body.removeChild(probe);

    const matched = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (!matched) return "";

    return `#${[matched[1], matched[2], matched[3]]
        .map((component) => Number(component).toString(16).padStart(2, "0"))
        .join("")}`;
}

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

    const displayValue = useMemo(() => textValue || "No color set", [textValue]);

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
        <div className='flex items-center gap-2'>
            <Input
                   type="text"
                   className={compact ? "h-8 text-xs w-28" : "h-9 w-36"}
                   value={textValue}
                   placeholder="#420420 or red"
                   onChange={handleTextChange}
                   onPaste={handleTextPaste} />
            <Input type="color"
                   className={compact ? "h-8 w-10" : "h-9 w-12"}
                   value={pickerValue || "#000000"}
                   onChange={handlePickerChange} />
            <Button onClick={handleClear} variant="outline" size="sm" disabled={!textValue}>Clear</Button>
            <span className="text-xs text-muted-foreground">{displayValue}</span>
        </div>
    );
}
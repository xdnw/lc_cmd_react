import { useSyncedState } from "@/utils/StateUtil";
import { useCallback } from "react";
import { Button } from "../ui/button";
import { getPastedText } from "./pasteUtils";
import { normalizeBooleanValue } from "./scalarInputNormalization";

export default function BooleanInput(
    { argName, initialValue, setOutputValue }:
        {
            argName: string,
            initialValue: string,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const [value, setValue] = useSyncedState(normalizeBooleanValue(initialValue || ''));
    const onChange = useCallback((next: boolean) => {
        const output = next ? "1" : "0";
        setValue(output);
        setOutputValue(argName, output);
    }, [argName, setOutputValue, setValue]);
    const setTrue = useCallback(() => onChange(true), [onChange]);
    const setFalse = useCallback(() => onChange(false), [onChange]);
    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = getPastedText(event);
        if (!pastedText.trim()) return;

        event.preventDefault();
        event.stopPropagation();
        onChange(normalizeBooleanValue(pastedText) === "1");
    }, [onChange]);

    const checked = value === "1";

    return (
        <div className="flex items-center gap-2" onPasteCapture={handlePasteCapture}>
            <Button size="sm" variant={checked ? "default" : "outline"} aria-pressed={checked} onClick={setTrue}>True</Button>
            <Button size="sm" variant={!checked ? "default" : "outline"} aria-pressed={!checked} onClick={setFalse}>False</Button>
        </div>
    );
}


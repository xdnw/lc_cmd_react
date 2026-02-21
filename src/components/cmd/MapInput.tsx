import { useSyncedStateFunc } from "@/utils/StateUtil";
import { TypeBreakdown } from "@/utils/Command";
import ArgInput from "./ArgInput";
import { useCallback, useState } from "react";
import { Button } from "../ui/button.tsx";
import { useDialog } from "../layout/DialogContext";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import { cn } from "@/lib/utils";
import { parseMapString } from "@/utils/MapParser";

function toMapString(value: { [key: string]: string }[]) {
    return value.map((v) => Object.keys(v)[0] + "=" + Object.values(v)[0]).join('\n');
}

export default function MapInput(
    { argName, children, initialValue, setOutputValue, displayMode }:
        {
            argName: string,
            children: TypeBreakdown[],
            initialValue: string,
            displayMode?: CommandInputDisplayMode,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { showDialog } = useDialog();
    const compact = isCompactMode(displayMode);
    const [value, setValue] = useSyncedStateFunc<{ [key: string]: string }[]>(initialValue, (initial) => {
        // split by newline, have empty string be empty map
        const result: { [key: string]: string }[] = [];
        if (initial) {
            const split = initial.split('\n');
            for (const s of split) {
                const equalsIdx = s.indexOf('=');
                if (equalsIdx > 0) {
                    const key = s.slice(0, equalsIdx);
                    const mappedValue = s.slice(equalsIdx + 1);
                    result.push({ [key]: mappedValue });
                }
            }
        }
        return result;
    });

    const [addKey, setAddKey] = useState("");
    const [addValue, setAddValue] = useState("");

    const removeMapValue = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const keyToRemove = e.currentTarget.dataset.key; // Extract the key from the button's data attribute
        if (!keyToRemove) return;

        const newValue = value.filter((v) => Object.keys(v)[0] !== keyToRemove);
        setValue(newValue);
        setOutputValue(argName, toMapString(newValue));
    }, [argName, setOutputValue, setValue, value]);

    const addKeyFunc = useCallback((key: string, value: string) => {
        setAddKey(value);
    }, [setAddKey]);

    const addValueFunc = useCallback((key: string, value: string) => {
        setAddValue(value);
    }, [setAddValue]);

    const addPairFunc = useCallback(() => {
            const keyCopy = addKey;
            const valueCopy = addValue;
            if (keyCopy === "") {
                showDialog("Key cannot be empty", <></>);
                return;
            }
            if (valueCopy === "") {
                showDialog("Value cannot be empty", <></>);
                return;
            }
            const newValue = [...value, { [keyCopy]: valueCopy }];
            setValue(newValue);
            setOutputValue(argName, toMapString(newValue));
            setAddKey("");
            setAddValue("");
    }, [argName, setOutputValue, setValue, addKey, addValue, showDialog, value]);

    const handleKeyKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.isDefaultPrevented()) {
            e.preventDefault();
            // Focus the value input
            const container = e.currentTarget.closest('.grid');
            if (container) {
                const valueInput = container.querySelector('div:nth-child(2) input, div:nth-child(2) select') as HTMLElement;
                if (valueInput) valueInput.focus();
            }
        }
    }, []);

    const handleValueKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.isDefaultPrevented()) {
            e.preventDefault();
            addPairFunc();
            // Focus the key input
            const container = e.currentTarget.closest('.grid');
            if (container) {
                const keyInput = container.querySelector('div:nth-child(1) input, div:nth-child(1) select') as HTMLElement;
                if (keyInput) keyInput.focus();
            }
        }
    }, [addPairFunc]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = event.clipboardData.getData('text');
        if (!pastedText) return;

        const parsed = parseMapString(pastedText);
        if (parsed) {
            event.preventDefault();
            event.stopPropagation();
            
            // Merge with existing values, avoiding duplicate keys
            const existingKeys = new Set(value.map(v => Object.keys(v)[0]));
            const newEntries = parsed.filter(v => !existingKeys.has(Object.keys(v)[0]));
            
            if (newEntries.length > 0) {
                const newValue = [...value, ...newEntries];
                setValue(newValue);
                setOutputValue(argName, toMapString(newValue));
            }
        }
    }, [argName, setOutputValue, setValue, value]);

    return (
        <div onPasteCapture={handlePasteCapture}>
            <div className="relative mb-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Map entries</p>
                {value.length === 0 && (
                    <p className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">No entries yet.</p>
                )}
                {value.map((v) => {
                    const key = Object.keys(v)[0];
                    const val = v[key];
                    return (
                        <div key={key} className={cn("mt-1 flex items-center justify-between rounded border border-border bg-background px-2", compact ? "py-1 text-xs" : "py-1.5 text-sm")}>
                            <span className="mr-4 break-all">{key}: {val}</span>
                            <Button
                                data-key={key}
                                onClick={removeMapValue}
                                variant="outline"
                                size="sm"
                                tabIndex={-1}
                                className={compact ? "h-6 px-2 text-xs" : ""}
                            >
                                Remove
                            </Button>
                        </div>
                    );
                })}
            </div>
            <div className={cn("grid gap-2", compact ? "grid-cols-[1fr_1fr_auto] items-end" : "grid-cols-[1fr_1fr_auto] items-end")}>
                <div onKeyDown={handleKeyKeyDown}>
                    <p className="mb-1 text-xs text-muted-foreground">Key</p>
                    <ArgInput argName="key" breakdown={children[0]} min={undefined} max={undefined} initialValue={addKey} displayMode={displayMode} setOutputValue={addKeyFunc} />
                </div>
                <div onKeyDown={handleValueKeyDown}>
                    <p className="mb-1 text-xs text-muted-foreground">Value</p>
                    <ArgInput argName="value" breakdown={children[1]} min={undefined} max={undefined}
                        initialValue={addValue} displayMode={displayMode} setOutputValue={addValueFunc} />
                </div>
                <div className="flex justify-end">
                    <Button size="sm" onClick={addPairFunc} tabIndex={-1} className={compact ? "h-8 text-xs" : ""}>Add Pair</Button>
                </div>
            </div>
        </div>
    );
}
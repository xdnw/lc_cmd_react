import { useSyncedState } from "@/utils/StateUtil";
import { TypeBreakdown } from "@/utils/Command";
import ArgInput from "./ArgInput";
import { useCallback, useMemo, useState } from "react";
import { Button } from "../ui/button.tsx";
import { useDialog } from "../layout/DialogContext";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import { cn } from "@/lib/utils";
import { parseMapString } from "@/utils/MapParser";
import FieldMessage from "./field/FieldMessage";
import { normalizeCollectionScalar, normalizeMapEntries, serializeMapEntries } from "./collectionInputNormalization";

export default function MapInput(
    { argName, children, initialValue, setOutputValue, displayMode }:
        {
            argName: string,
            children: TypeBreakdown[],
            initialValue?: string,
            displayMode?: CommandInputDisplayMode,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { showDialog } = useDialog();
    const compact = isCompactMode(displayMode);
    const initialNormalized = useMemo(
        () => normalizeMapEntries(parseMapString(initialValue) ?? [], children[0], children[1]),
        [children, initialValue],
    );
    const [value, setValue] = useSyncedState<{ [key: string]: string }[]>(initialNormalized.entries);
    const [notices, setNotices] = useSyncedState(initialNormalized.notices);

    const [addKey, setAddKey] = useState("");
    const [addValue, setAddValue] = useState("");

    const syncEntries = useCallback((nextEntries: { [key: string]: string }[]) => {
        const normalized = normalizeMapEntries(nextEntries, children[0], children[1]);
        setValue(normalized.entries);
        setNotices(normalized.notices);
        setOutputValue(argName, serializeMapEntries(normalized.entries));
    }, [argName, children, setNotices, setOutputValue, setValue]);

    const removeMapValue = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const keyToRemove = e.currentTarget.dataset.key; // Extract the key from the button's data attribute
        if (!keyToRemove) return;

        const newValue = value.filter((v) => Object.keys(v)[0] !== keyToRemove);
        syncEntries(newValue);
    }, [syncEntries, value]);

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
            const normalizedKey = normalizeCollectionScalar(keyCopy, children[0], "Key");
            if (!normalizedKey.value) {
                showDialog("Key cannot be empty", <></>);
                return;
            }

            const newValue = [...value, { [keyCopy]: valueCopy }];
            syncEntries(newValue);
            setAddKey("");
            setAddValue("");
    }, [addKey, addValue, children, showDialog, syncEntries, value]);

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

            syncEntries(parsed);
        }
    }, [syncEntries]);

    const warningText = notices.filter((notice) => notice.severity === "warning").map((notice) => notice.message).join(" ");
    const noteText = notices.filter((notice) => notice.severity === "note").map((notice) => notice.message).join(" ");

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
            <FieldMessage error={warningText} compact={compact} />
            <FieldMessage note={noteText} compact={compact} />
        </div>
    );
}
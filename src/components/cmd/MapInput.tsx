import { useSyncedState } from "@/utils/StateUtil";
import { TypeBreakdown } from "@/utils/Command";
import ArgInput from "./ArgInput";
import { memo, useCallback, useMemo, useState } from "react";
import { Button } from "../ui/button.tsx";
import { useDialog } from "../layout/DialogContext";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import { cn } from "@/lib/utils";
import { parseMapStringDetailed } from "@/utils/MapParser";
import FieldMessage from "./field/FieldMessage";
import KeyValueEntryList from "./KeyValueEntryList";
import type { CollectionNotice } from "./collectionInputNormalization";
import { normalizeCollectionScalar, normalizeMapEntries, serializeMapEntries, summarizeCollectionNotices } from "./collectionInputNormalization";

type MapEntry = { [key: string]: string };

type NormalizedMapState = {
    entries: MapEntry[];
    notices: CollectionNotice[];
};

type StaticMapState = {
    keyedValues: Record<string, string>;
    extraEntries: MapEntry[];
    notices: CollectionNotice[];
};

const STATIC_KEY_COUNT_LIMIT = 25;
const STATIC_KEY_LABEL_LENGTH_LIMIT = 25;

function hasStructuredMapInput(input?: string): boolean {
    return Boolean(input?.trim()) && /[=:{}\n,]|[^\x20-\x7e]/.test(input ?? "");
}

function getStaticMapKeys(children: TypeBreakdown[], preferStaticKeyLayout?: boolean): string[] | null {
    if (!preferStaticKeyLayout) {
        return null;
    }

    const keyOptions = children[0]?.getOptionData().options;
    if (!keyOptions || keyOptions.length === 0 || keyOptions.length > STATIC_KEY_COUNT_LIMIT) {
        return null;
    }

    if (keyOptions.some((option) => option.length > STATIC_KEY_LABEL_LENGTH_LIMIT)) {
        return null;
    }

    return keyOptions;
}

function normalizeParsedEntries(
    initialValue: string | undefined,
    keyBreakdown: TypeBreakdown,
    valueBreakdown: TypeBreakdown,
): NormalizedMapState {
    const initialParseResult = parseMapStringDetailed(initialValue, keyBreakdown, valueBreakdown);
    const initialNormalized = normalizeMapEntries(initialParseResult.entries ?? [], keyBreakdown, valueBreakdown);

    if (!initialParseResult.error || !hasStructuredMapInput(initialValue)) {
        return {
            entries: initialNormalized.entries,
            notices: initialNormalized.notices,
        };
    }

    return {
        entries: initialNormalized.entries,
        notices: [
            {
                severity: "warning",
                message: initialParseResult.error,
            },
            ...initialNormalized.notices,
        ],
    };
}

function toEntryItems(entries: MapEntry[]): { key: string; value: string }[] {
    return entries.map((entry) => {
        const key = Object.keys(entry)[0] ?? "";
        return {
            key,
            value: key ? entry[key] ?? "" : "",
        };
    });
}

function partitionStaticEntries(entries: MapEntry[], staticKeys: readonly string[]): Omit<StaticMapState, "notices"> {
    const staticKeySet = new Set(staticKeys);
    const keyedValues: Record<string, string> = {};
    const extraEntries: MapEntry[] = [];

    for (const entry of entries) {
        const key = Object.keys(entry)[0] ?? "";
        if (!key) {
            continue;
        }

        const value = entry[key] ?? "";
        if (staticKeySet.has(key)) {
            keyedValues[key] = value;
            continue;
        }

        extraEntries.push(entry);
    }

    return {
        keyedValues,
        extraEntries,
    };
}

function buildStaticMapState(
    initialValue: string | undefined,
    keyBreakdown: TypeBreakdown,
    valueBreakdown: TypeBreakdown,
    staticKeys: readonly string[],
): StaticMapState {
    const normalized = normalizeParsedEntries(initialValue, keyBreakdown, valueBreakdown);
    const partitioned = partitionStaticEntries(normalized.entries, staticKeys);

    return {
        ...partitioned,
        notices: normalized.notices,
    };
}

function buildStaticEntries(
    staticKeys: readonly string[],
    keyedValues: Record<string, string>,
    extraEntries: MapEntry[],
): MapEntry[] {
    const staticEntries: MapEntry[] = [];
    for (const key of staticKeys) {
        const value = keyedValues[key] ?? "";
        if (value === "") {
            continue;
        }

        staticEntries.push({ [key]: value });
    }

    return [...staticEntries, ...extraEntries];
}

function serializeStaticMapEntries(
    staticKeys: readonly string[],
    keyedValues: Record<string, string>,
    extraEntries: MapEntry[],
): string {
    return serializeMapEntries(buildStaticEntries(staticKeys, keyedValues, extraEntries));
}

const StaticMapRow = memo(function StaticMapRow(
    { mapKey, value, valueBreakdown, displayMode, compact, onValueChange }:
        {
            mapKey: string,
            value: string,
            valueBreakdown: TypeBreakdown,
            displayMode?: CommandInputDisplayMode,
            compact: boolean,
            onValueChange: (key: string, value: string) => void,
        }
) {
    const handleValueChange = useCallback((_: string, nextValue: string) => {
        onValueChange(mapKey, nextValue);
    }, [mapKey, onValueChange]);

    return (
        <div className={cn("grid gap-2", compact ? "grid-cols-[minmax(0,9rem)_1fr] items-center" : "grid-cols-[minmax(0,12rem)_1fr] items-center")}>
            <div className={cn("truncate text-xs font-medium text-muted-foreground", compact ? "pr-1" : "pr-2")}>{mapKey}</div>
            <ArgInput
                argName={`value-${mapKey}`}
                breakdown={valueBreakdown}
                min={undefined}
                max={undefined}
                initialValue={value}
                displayMode={displayMode}
                setOutputValue={handleValueChange}
            />
        </div>
    );
});

function StaticKeyMapInput(
    { argName, children, initialValue, setOutputValue, displayMode, compact, staticKeys }:
        {
            argName: string,
            children: TypeBreakdown[],
            initialValue?: string,
            displayMode?: CommandInputDisplayMode,
            compact: boolean,
            staticKeys: readonly string[],
            setOutputValue: (name: string, value: string) => void,
        }
) {
    const { showDialog } = useDialog();
    const initialState = useMemo(
        () => buildStaticMapState(initialValue, children[0], children[1], staticKeys),
        [children, initialValue, staticKeys],
    );
    const [state, setState] = useSyncedState<StaticMapState>(initialState);

    const syncStaticEntries = useCallback((nextEntries: MapEntry[], emitOutput: boolean) => {
        const normalized = normalizeMapEntries(nextEntries, children[0], children[1]);
        const partitioned = partitionStaticEntries(normalized.entries, staticKeys);
        const nextState: StaticMapState = {
            ...partitioned,
            notices: normalized.notices,
        };

        setState(nextState);

        if (emitOutput) {
            setOutputValue(argName, serializeStaticMapEntries(staticKeys, nextState.keyedValues, nextState.extraEntries));
        }
    }, [argName, children, setOutputValue, setState, staticKeys]);

    const handleValueChange = useCallback((key: string, value: string) => {
        if ((state.keyedValues[key] ?? "") === value) {
            return;
        }

        const nextKeyedValues = { ...state.keyedValues };
        if (value === "") {
            delete nextKeyedValues[key];
        } else {
            nextKeyedValues[key] = value;
        }

        syncStaticEntries(buildStaticEntries(staticKeys, nextKeyedValues, state.extraEntries), true);
    }, [state.extraEntries, state.keyedValues, staticKeys, syncStaticEntries]);

    const removeExtraEntry = useCallback((keyToRemove: string) => {
        const nextExtraEntries = state.extraEntries.filter((entry) => (Object.keys(entry)[0] ?? "") !== keyToRemove);
        if (nextExtraEntries.length === state.extraEntries.length) {
            return;
        }

        syncStaticEntries(buildStaticEntries(staticKeys, state.keyedValues, nextExtraEntries), true);
    }, [state.extraEntries, state.keyedValues, staticKeys, syncStaticEntries]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = event.clipboardData.getData("text");
        if (!pastedText) {
            return;
        }

        const parsed = parseMapStringDetailed(pastedText, children[0], children[1]);
        if (parsed.entries) {
            event.preventDefault();
            event.stopPropagation();
            syncStaticEntries(parsed.entries, true);
            return;
        }

        if (hasStructuredMapInput(pastedText) && parsed.error) {
            event.preventDefault();
            event.stopPropagation();
            showDialog("Unable to parse pasted map", <>{parsed.error}</>);
        }
    }, [children, showDialog, syncStaticEntries]);

    const { warningText, noteText } = useMemo(() => summarizeCollectionNotices(state.notices), [state.notices]);
    const extraItems = useMemo(() => toEntryItems(state.extraEntries), [state.extraEntries]);

    return (
        <div onPasteCapture={handlePasteCapture}>
            <div className="mb-2">
                <div className={cn("mb-1 grid gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", compact ? "grid-cols-[minmax(0,9rem)_1fr]" : "grid-cols-[minmax(0,12rem)_1fr]")}>
                    <span>Key</span>
                    <span>Value</span>
                </div>
                <div className="space-y-2">
                    {staticKeys.map((key) => (
                        <StaticMapRow
                            key={key}
                            mapKey={key}
                            value={state.keyedValues[key] ?? ""}
                            valueBreakdown={children[1]}
                            displayMode={displayMode}
                            compact={compact}
                            onValueChange={handleValueChange}
                        />
                    ))}
                </div>
            </div>
            {extraItems.length > 0 && (
                <div className="relative mb-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Additional entries</p>
                    <KeyValueEntryList
                        items={extraItems}
                        emptyText=""
                        compact={compact}
                        onRemove={removeExtraEntry}
                    />
                </div>
            )}
            <FieldMessage error={warningText} compact={compact} />
            <FieldMessage note={noteText} compact={compact} />
        </div>
    );
}

function DynamicMapInput(
    { argName, children, initialValue, setOutputValue, displayMode, compact }:
        {
            argName: string,
            children: TypeBreakdown[],
            initialValue?: string,
            displayMode?: CommandInputDisplayMode,
            compact: boolean,
            setOutputValue: (name: string, value: string) => void,
        }
) {
    const { showDialog } = useDialog();
    const initialNormalized = useMemo(
        () => normalizeParsedEntries(initialValue, children[0], children[1]),
        [children, initialValue],
    );

    const [value, setValue] = useSyncedState<MapEntry[]>(initialNormalized.entries);
    const [notices, setNotices] = useSyncedState(initialNormalized.notices);
    const [addKey, setAddKey] = useState("");
    const [addValue, setAddValue] = useState("");

    const syncEntries = useCallback((nextEntries: MapEntry[]) => {
        const normalized = normalizeMapEntries(nextEntries, children[0], children[1]);
        setValue(normalized.entries);
        setNotices(normalized.notices);
        setOutputValue(argName, serializeMapEntries(normalized.entries));
    }, [argName, children, setNotices, setOutputValue, setValue]);

    const removeMapValue = useCallback((keyToRemove: string) => {
        const newValue = value.filter((entry) => Object.keys(entry)[0] !== keyToRemove);
        syncEntries(newValue);
    }, [syncEntries, value]);

    const addKeyFunc = useCallback((_: string, nextValue: string) => {
        setAddKey(nextValue);
    }, []);

    const addValueFunc = useCallback((_: string, nextValue: string) => {
        setAddValue(nextValue);
    }, []);

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

        syncEntries([...value, { [keyCopy]: valueCopy }]);
        setAddKey("");
        setAddValue("");
    }, [addKey, addValue, children, showDialog, syncEntries, value]);

    const handleKeyKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey && !e.isDefaultPrevented()) {
            e.preventDefault();
            const container = e.currentTarget.closest(".grid");
            if (container) {
                const valueInput = container.querySelector("div:nth-child(2) input, div:nth-child(2) select") as HTMLElement | null;
                valueInput?.focus();
            }
        }
    }, []);

    const handleValueKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey && !e.isDefaultPrevented()) {
            e.preventDefault();
            addPairFunc();
            const container = e.currentTarget.closest(".grid");
            if (container) {
                const keyInput = container.querySelector("div:nth-child(1) input, div:nth-child(1) select") as HTMLElement | null;
                keyInput?.focus();
            }
        }
    }, [addPairFunc]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = event.clipboardData.getData("text");
        if (!pastedText) {
            return;
        }

        const parsed = parseMapStringDetailed(pastedText, children[0], children[1]);
        if (parsed.entries) {
            event.preventDefault();
            event.stopPropagation();
            syncEntries(parsed.entries);
            return;
        }

        if (hasStructuredMapInput(pastedText) && parsed.error) {
            event.preventDefault();
            event.stopPropagation();
            showDialog("Unable to parse pasted map", <>{parsed.error}</>);
        }
    }, [children, showDialog, syncEntries]);

    const { warningText, noteText } = useMemo(() => summarizeCollectionNotices(notices), [notices]);

    return (
        <div onPasteCapture={handlePasteCapture}>
            <div className="relative mb-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Map entries</p>
                <KeyValueEntryList
                    items={toEntryItems(value)}
                    emptyText="No entries yet."
                    compact={compact}
                    onRemove={removeMapValue}
                />
            </div>
            <div className={cn("grid gap-2", compact ? "grid-cols-[1fr_1fr_auto] items-end" : "grid-cols-[1fr_1fr_auto] items-end")}>
                <div onKeyDown={handleKeyKeyDown}>
                    <p className="mb-1 text-xs text-muted-foreground">Key</p>
                    <ArgInput argName="key" breakdown={children[0]} min={undefined} max={undefined} initialValue={addKey} displayMode={displayMode} setOutputValue={addKeyFunc} />
                </div>
                <div onKeyDown={handleValueKeyDown}>
                    <p className="mb-1 text-xs text-muted-foreground">Value</p>
                    <ArgInput argName="value" breakdown={children[1]} min={undefined} max={undefined} initialValue={addValue} displayMode={displayMode} setOutputValue={addValueFunc} />
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

export default function MapInput(
    { argName, children, initialValue, setOutputValue, displayMode, preferStaticKeyLayout = true }:
        {
            argName: string,
            children: TypeBreakdown[],
            initialValue?: string,
            displayMode?: CommandInputDisplayMode,
            preferStaticKeyLayout?: boolean,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const compact = isCompactMode(displayMode);
    const staticKeys = useMemo(() => getStaticMapKeys(children, preferStaticKeyLayout), [children, preferStaticKeyLayout]);

    if (staticKeys) {
        return (
            <StaticKeyMapInput
                argName={argName}
                children={children}
                initialValue={initialValue}
                setOutputValue={setOutputValue}
                displayMode={displayMode}
                compact={compact}
                staticKeys={staticKeys}
            />
        );
    }

    return (
        <DynamicMapInput
            argName={argName}
            children={children}
            initialValue={initialValue}
            setOutputValue={setOutputValue}
            displayMode={displayMode}
            compact={compact}
        />
    );
}
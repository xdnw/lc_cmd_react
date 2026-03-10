import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { useSyncedState } from "@/utils/StateUtil";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import KeyValueEntryList from "./KeyValueEntryList";
import { ListComponentOptions } from "./ListComponent";
import { summarizeCollectionNotices, type CollectionNotice } from "./collectionInputNormalization";
import {
    CITY_BUILD_ALLOWED_KEYS,
    type CityBuildModifier,
    formatCityBuildCityId,
    normalizeCityBuildModifierKey,
    normalizeCityBuildModifiers,
    parseCityBuildInput,
    parseCityBuildCityInput,
    serializeParsedCityBuildValue,
} from "./cityBuildInputUtils";
import { validateNumberInput } from "./field/argValidation";
import FieldMessage from "./field/FieldMessage";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";

export default function CityBuildInput({
    argName,
    initialValue,
    setOutputValue,
    displayMode,
}: {
    argName: string;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
    displayMode?: CommandInputDisplayMode;
}) {
    const compact = isCompactMode(displayMode);
    const initialParsed = useMemo(() => parseCityBuildInput(initialValue), [initialValue]);
    const [cityText, setCityText] = useSyncedState(formatCityBuildCityId(initialParsed.cityId));
    const [modifiers, setModifiers] = useSyncedState(initialParsed.modifiers);
    const [notices, setNotices] = useSyncedState<CollectionNotice[]>(initialParsed.notices ?? []);
    const [addKey, setAddKey] = useState("");
    const [addValue, setAddValue] = useState("");

    const allowedKeysText = useMemo(
        () => `Allowed keys: ${CITY_BUILD_ALLOWED_KEYS.join(", ")}. \`imp_total\` is ignored if pasted.`,
        [],
    );

    const syncValue = useCallback((nextCityText: string, nextModifiers: CityBuildModifier[], extraNotices: CollectionNotice[] = []) => {
        const normalized = normalizeCityBuildModifiers(nextModifiers);
        const parsedCity = parseCityBuildCityInput(nextCityText);
        const cityNotices = nextCityText.trim() && parsedCity.error
            ? [{ severity: "warning", message: parsedCity.error } satisfies CollectionNotice]
            : [];

        setCityText(nextCityText);
        setModifiers(normalized.modifiers);
        setNotices([...cityNotices, ...extraNotices, ...normalized.notices]);

        if (!parsedCity.error) {
            const serializedValue = serializeParsedCityBuildValue({
                cityId: parsedCity.cityId,
                modifiers: normalized.modifiers,
            });
            setOutputValue(argName, serializedValue);
        }
    }, [argName, setCityText, setModifiers, setNotices, setOutputValue]);

    const handleCityChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        syncValue(event.target.value, modifiers);
    }, [modifiers, syncValue]);

    const handleAddKeyChange = useCallback((_name: string, value: string) => {
        setAddKey(value);
    }, []);

    const handleAddValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setAddValue(event.target.value);
    }, []);

    const removeModifier = useCallback((key: string) => {
        syncValue(cityText, modifiers.filter((modifier) => modifier.key !== key));
    }, [cityText, modifiers, syncValue]);

    const handleAddModifier = useCallback(() => {
        if (!addKey.trim()) {
            syncValue(cityText, modifiers, [{ severity: "warning", message: "Modifier key cannot be empty." }]);
            return;
        }
        if (!addValue.trim()) {
            syncValue(cityText, modifiers, [{ severity: "warning", message: "Modifier value cannot be empty." }]);
            return;
        }

        const normalizedKey = normalizeCityBuildModifierKey(addKey);
        if (normalizedKey.ignored) {
            setAddKey("");
            setAddValue("");
            syncValue(cityText, modifiers, [{ severity: "note", message: "Ignored imp_total." }]);
            return;
        }
        if (normalizedKey.error || !normalizedKey.key) {
            syncValue(cityText, modifiers, [{ severity: "warning", message: normalizedKey.error || "Unknown city build modifier." }]);
            return;
        }

        const normalizedValue = validateNumberInput(addValue, { isFloat: true });
        if (!normalizedValue.isValid) {
            syncValue(cityText, modifiers, [{ severity: "warning", message: normalizedValue.error || "Modifier value must be numeric." }]);
            return;
        }

        setAddKey("");
        setAddValue("");
        syncValue(cityText, [
            ...modifiers,
            {
                key: normalizedKey.key,
                value: normalizedValue.normalizedValue,
            },
        ]);
    }, [addKey, addValue, cityText, modifiers, syncValue]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-citybuild-add-row='true']")) {
            return;
        }

        const pastedText = event.clipboardData.getData("text") || event.clipboardData.getData("text/plain");
        if (!pastedText.trim()) {
            return;
        }

        const parsed = parseCityBuildInput(pastedText);
        if (parsed.error) {
            event.preventDefault();
            event.stopPropagation();
            setNotices(parsed.notices ?? [{ severity: "warning", message: parsed.error }]);
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        syncValue(formatCityBuildCityId(parsed.cityId), parsed.modifiers, parsed.notices ?? []);
    }, [setNotices, syncValue]);

    const { warningText, noteText } = useMemo(() => summarizeCollectionNotices(notices), [notices]);

    return (
        <div onPasteCapture={handlePasteCapture}>
            <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">DBCity</p>
                <Input
                    type="text"
                    value={cityText}
                    onChange={handleCityChange}
                    placeholder="city/id=123 or https://politicsandwar.com/city/id=123"
                    className={compact ? "h-8 text-xs" : undefined}
                    data-citybuild-field="city"
                />
            </div>

            <div className="relative mb-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">City build modifiers</p>
                <KeyValueEntryList
                    items={modifiers}
                    emptyText="No modifiers yet."
                    compact={compact}
                    onRemove={removeModifier}
                />
            </div>

            <div
                className={cn("grid gap-2", compact ? "grid-cols-[1.4fr_1fr_auto] items-end" : "grid-cols-[1.4fr_1fr_auto] items-end")}
                data-citybuild-add-row="true"
            >
                <div>
                    <p className="mb-1 text-xs text-muted-foreground">Key</p>
                    <ListComponentOptions
                        options={CITY_BUILD_ALLOWED_KEYS as unknown as string[]}
                        argName={`${argName}-citybuild-key`}
                        isMulti={false}
                        initialValue={addKey}
                        setOutputValue={handleAddKeyChange}
                    />
                </div>
                <div>
                    <p className="mb-1 text-xs text-muted-foreground">Value</p>
                    <Input
                        type="text"
                        value={addValue}
                        onChange={handleAddValueChange}
                        placeholder="1234"
                        className={compact ? "h-8 text-xs" : undefined}
                    />
                </div>
                <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddModifier} tabIndex={-1} className={compact ? "h-8 text-xs" : undefined}>
                        Add Pair
                    </Button>
                </div>
            </div>

            <FieldMessage error={warningText} compact={compact} />
            <FieldMessage note={noteText || allowedKeysText} compact={compact} />
        </div>
    );
}

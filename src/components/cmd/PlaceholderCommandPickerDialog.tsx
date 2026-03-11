import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type UIEvent } from "react";

import ArgInput from "@/components/cmd/ArgInput";
import { ArgDescComponent } from "@/components/cmd/CommandComponent";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DIALOG_LOCAL_ESCAPE_ATTR,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    applyCommandFieldStateUpdater,
    createCommandFieldState,
    type CommandFieldState,
    type CommandFieldStateUpdater,
} from "./field/commandFieldState";
import { CM, placeholderMention, type Argument, type BaseCommand } from "@/utils/Command";
import { focusPrimaryCommandTarget } from "./commandKeyboard";
import {
    getFixedRowWindow,
    getSearchListKeyboardAction,
    getSearchListOptionId,
    rankSearchMatches,
    scrollFixedRowListToIndex,
    SearchMatchText,
    useSearchListActiveNavigation,
} from "./searchListPrimitives";
import { useCommandEscapeArming } from "./useCommandShellKeyboard";

const LIST_ROW_HEIGHT = 40;
const LIST_VISIBLE_ROWS = 9;
const LIST_OVERSCAN = 4;

type PlaceholderCommandEntry = {
    id: string;
    command: BaseCommand;
    path: string[];
    pathString: string;
    description: string;
    searchText: string;
    args: Argument[];
    requiredArgCount: number;
};

type PlaceholderCommandPickerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    placeholderType: string;
    valueType: string;
    compact?: boolean;
    onInsert: (value: string) => void;
};

const placeholderCommandEntryCache = new Map<string, readonly PlaceholderCommandEntry[]>();

function isNumericReturnType(type: string | undefined): boolean {
    if (!type) {
        return false;
    }

    switch (type.toLowerCase()) {
        case "boolean":
        case "int":
        case "integer":
        case "double":
        case "long":
            return true;
        default:
            return false;
    }
}

function getPlaceholderCommandEntries(
    placeholderType: string,
    valueType: string,
): readonly PlaceholderCommandEntry[] {
    const cacheKey = `${placeholderType}:${valueType.toLowerCase()}`;
    const cached = placeholderCommandEntryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const onlyNumeric = valueType.toLowerCase() === "double";
    const entries = CM.placeholders(placeholderType as never)
        .getCommands()
        .filter((command) => !onlyNumeric || isNumericReturnType(command.command.return_type))
        .map<PlaceholderCommandEntry>((command) => {
            const args = command.getArguments();
            const pathString = command.getPathString();
            const description = command.getDescShort();

            return {
                id: pathString,
                command,
                path: [...command.path],
                pathString,
                description,
                searchText: [
                    pathString,
                    description,
                    ...args.map((arg) => `${arg.name} ${arg.arg.type} ${arg.arg.desc ?? ""}`),
                ].join(" ").toLowerCase(),
                args,
                requiredArgCount: args.reduce((count, arg) => count + (arg.arg.optional ? 0 : 1), 0),
            };
        })
        .sort((left, right) => left.pathString.localeCompare(right.pathString));

    placeholderCommandEntryCache.set(cacheKey, entries);
    return entries;
}

function filterCommandEntries(
    entries: readonly PlaceholderCommandEntry[],
    query: string,
): readonly PlaceholderCommandEntry[] {
    return rankSearchMatches(
        entries,
        query,
        (entry) => entry.searchText,
        (entry) => [entry.pathString, ...entry.args.map((arg) => arg.name)],
    );
}

function buildInitialFieldStates(args: readonly Argument[]): Record<string, CommandFieldState> {
    return args.reduce<Record<string, CommandFieldState>>((accumulator, arg) => {
        accumulator[arg.name] = createCommandFieldState(arg.arg.def ?? "");
        return accumulator;
    }, {});
}

function buildPlaceholderValue(
    placeholderType: string,
    entry: PlaceholderCommandEntry,
    fieldStates: Record<string, CommandFieldState>,
): string {
    const args = entry.args.reduce<Record<string, string>>((accumulator, arg) => {
        const value = fieldStates[arg.name]?.displayValue ?? "";
        if (!value.trim()) {
            return accumulator;
        }

        accumulator[arg.name] = value;
        return accumulator;
    }, {});

    return placeholderMention({
        type: placeholderType as never,
        command: entry.path as never,
        ...(Object.keys(args).length > 0 ? { args: args as never } : {}),
    } as never);
}

function hasInvalidRequiredArgs(
    entry: PlaceholderCommandEntry,
    fieldStates: Record<string, CommandFieldState>,
): boolean {
    return entry.args.some((arg) => {
        const state = fieldStates[arg.name] ?? createCommandFieldState(arg.arg.def ?? "");
        if (!state.validation.isValid) {
            return true;
        }

        return !arg.arg.optional && !state.displayValue.trim();
    });
}

const PlaceholderCommandPickerDialog = memo(function PlaceholderCommandPickerDialog({
    open,
    onOpenChange,
    placeholderType,
    valueType,
    compact,
    onInsert,
}: PlaceholderCommandPickerDialogProps) {
    const [searchValue, setSearchValue] = useState("");
    const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
    const [fieldStates, setFieldStates] = useState<Record<string, CommandFieldState>>({});
    const [scrollTop, setScrollTop] = useState(0);
    const deferredSearchValue = useDeferredValue(searchValue);
    const listRef = useRef<HTMLDivElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const argShellRef = useRef<HTMLDivElement | null>(null);
    const backButtonRef = useRef<HTMLButtonElement | null>(null);
    const listboxId = useId();

    const commandEntries = useMemo(
        () => getPlaceholderCommandEntries(placeholderType, valueType),
        [placeholderType, valueType],
    );

    const filteredEntries = useMemo(
        () => filterCommandEntries(commandEntries, deferredSearchValue),
        [commandEntries, deferredSearchValue],
    );

    const selectedEntry = useMemo(
        () => commandEntries.find((entry) => entry.id === selectedCommandId) ?? null,
        [commandEntries, selectedCommandId],
    );
    const scrollToActiveEntry = useCallback((index: number, align: "start" | "center" | "end") => {
        scrollFixedRowListToIndex({
            container: listRef.current,
            index,
            rowHeight: LIST_ROW_HEIGHT,
            viewportHeight: LIST_VISIBLE_ROWS * LIST_ROW_HEIGHT,
            align,
        });
    }, []);
    const {
        activeIndex,
        setActiveIndex,
        moveActiveIndex,
        resetActiveIndex,
    } = useSearchListActiveNavigation({
        itemCount: filteredEntries.length,
        scrollToIndex: scrollToActiveEntry,
    });
    const activeEntry = filteredEntries[activeIndex] ?? null;
    const activeDescendantId = activeEntry ? getSearchListOptionId(listboxId, activeEntry.id) : undefined;
    const commandEntriesById = useMemo(() => {
        return commandEntries.reduce<Map<string, PlaceholderCommandEntry>>((accumulator, entry) => {
            accumulator.set(entry.id, entry);
            return accumulator;
        }, new Map());
    }, [commandEntries]);

    const focusSearchInput = useCallback(() => {
        requestAnimationFrame(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
        });
    }, []);

    const closeDialog = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    const {
        rootRef,
        escapeHint,
        escapeArmedUntil,
        clearEscapeArming,
        handleBlurCapture,
        triggerEscapeArmOrBack,
    } = useCommandEscapeArming({
        onRequestBack: selectedEntry
            ? () => {
                setSelectedCommandId(null);
                setFieldStates({});
                focusSearchInput();
            }
            : closeDialog,
        backHint: selectedEntry ? "Press Esc again to return to search" : "Press Esc again to close placeholder picker",
        getReturnFocusTarget: () => selectedEntry ? backButtonRef.current : searchRef.current,
    });

    useEffect(() => {
        if (!open) {
            setSelectedCommandId(null);
            setFieldStates({});
            setSearchValue("");
            setScrollTop(0);
            resetActiveIndex();
            clearEscapeArming();
            return;
        }

        focusSearchInput();
        requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: 0 });
        });
    }, [clearEscapeArming, focusSearchInput, open, resetActiveIndex]);

    useEffect(() => {
        setScrollTop(0);
        resetActiveIndex("start");
        if (listRef.current) {
            listRef.current.scrollTop = 0;
        }
    }, [deferredSearchValue, resetActiveIndex]);

    useEffect(() => {
        if (!selectedEntry) {
            return;
        }

        requestAnimationFrame(() => {
            if (!focusPrimaryCommandTarget(argShellRef.current)) {
                backButtonRef.current?.focus();
            }
        });
    }, [selectedEntry]);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        clearEscapeArming();
        setSearchValue(event.currentTarget.value);
    }, [clearEscapeArming]);

    const handleSelectEntry = useCallback((entry: PlaceholderCommandEntry) => {
        clearEscapeArming();
        if (entry.args.length === 0) {
            onInsert(buildPlaceholderValue(placeholderType, entry, {}));
            onOpenChange(false);
            return;
        }

        setSelectedCommandId(entry.id);
        setFieldStates(buildInitialFieldStates(entry.args));
    }, [clearEscapeArming, onInsert, onOpenChange, placeholderType]);

    const handleEntryClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const entryId = event.currentTarget.dataset.entryId;
        if (!entryId) {
            return;
        }

        const entry = commandEntriesById.get(entryId);
        if (!entry) {
            return;
        }

        handleSelectEntry(entry);
    }, [commandEntriesById, handleSelectEntry]);

    const handleBack = useCallback(() => {
        setSelectedCommandId(null);
        setFieldStates({});
        clearEscapeArming();
        focusSearchInput();
    }, [clearEscapeArming, focusSearchInput]);

    const updateFieldState = useCallback((argName: string, updater: CommandFieldStateUpdater) => {
        setFieldStates((currentStates) => {
            const previousState = currentStates[argName] ?? createCommandFieldState("");
            const nextState = applyCommandFieldStateUpdater(previousState, updater);
            if (
                previousState.displayValue === nextState.displayValue
                && previousState.committedValue === nextState.committedValue
                && previousState.validation.isValid === nextState.validation.isValid
                && previousState.validation.error === nextState.validation.error
                && previousState.validation.note === nextState.validation.note
            ) {
                return currentStates;
            }

            return {
                ...currentStates,
                [argName]: nextState,
            };
        });
    }, []);

    const handleArgOutput = useCallback((argName: string, value: string) => {
        setFieldStates((currentStates) => {
            const previousState = currentStates[argName] ?? createCommandFieldState("");
            if (previousState.displayValue === value && previousState.committedValue === value) {
                return currentStates;
            }

            return {
                ...currentStates,
                [argName]: {
                    ...previousState,
                    displayValue: value,
                    committedValue: value,
                },
            };
        });
    }, []);

    const handleInsertSelected = useCallback(() => {
        if (!selectedEntry || hasInvalidRequiredArgs(selectedEntry, fieldStates)) {
            return;
        }

        clearEscapeArming();
        onInsert(buildPlaceholderValue(placeholderType, selectedEntry, fieldStates));
        onOpenChange(false);
    }, [clearEscapeArming, fieldStates, onInsert, onOpenChange, placeholderType, selectedEntry]);

    const handleListScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);

    const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Escape" && escapeArmedUntil != null) {
            clearEscapeArming();
        }

        const action = getSearchListKeyboardAction({
            key: event.key,
            itemCount: filteredEntries.length,
            activeIndex,
            hasQuery: searchValue.trim().length > 0,
            pageSize: LIST_VISIBLE_ROWS,
            wrapArrowUp: true,
            wrapArrowDown: true,
        });

        switch (action.type) {
            case "move":
                event.preventDefault();
                clearEscapeArming();
                moveActiveIndex(action.nextIndex, action.align);
                return;
            case "activate":
                if (!activeEntry) {
                    return;
                }
                event.preventDefault();
                handleSelectEntry(activeEntry);
                return;
            case "clear-query":
                event.preventDefault();
                setSearchValue("");
                clearEscapeArming();
                return;
            case "escape":
                event.preventDefault();
                triggerEscapeArmOrBack();
                return;
            default:
                return;
        }
    }, [activeEntry, activeIndex, clearEscapeArming, escapeArmedUntil, filteredEntries.length, handleSelectEntry, moveActiveIndex, searchValue, triggerEscapeArmOrBack]);

    const handleSelectedShellKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.defaultPrevented) {
            return;
        }

        if (event.key !== "Escape" && escapeArmedUntil != null) {
            clearEscapeArming();
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            triggerEscapeArmOrBack();
        }
    }, [clearEscapeArming, escapeArmedUntil, triggerEscapeArmOrBack]);

    const viewportHeight = LIST_VISIBLE_ROWS * LIST_ROW_HEIGHT;
    const totalHeight = filteredEntries.length * LIST_ROW_HEIGHT;
    const windowState = getFixedRowWindow(filteredEntries.length, scrollTop, LIST_ROW_HEIGHT, viewportHeight, LIST_OVERSCAN);
    const startIndex = windowState.startIndex;
    const endIndex = windowState.endIndex;
    const visibleEntries = filteredEntries.slice(startIndex, endIndex);
    const selectedInvalid = selectedEntry ? hasInvalidRequiredArgs(selectedEntry, fieldStates) : false;
    const selectedFieldStateUpdaters = useMemo(() => {
        if (!selectedEntry) {
            return {} as Record<string, (updater: CommandFieldStateUpdater) => void>;
        }

        return selectedEntry.args.reduce<Record<string, (updater: CommandFieldStateUpdater) => void>>((accumulator, arg) => {
            accumulator[arg.name] = (updater) => updateFieldState(arg.name, updater);
            return accumulator;
        }, {});
    }, [selectedEntry, updateFieldState]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl gap-3 p-0 sm:max-h-[85vh]">
                <div ref={rootRef} {...{ [DIALOG_LOCAL_ESCAPE_ATTR]: "true" }} onBlurCapture={handleBlurCapture} className="contents">
                    <DialogHeader className="border-b border-border/60 px-5 pt-5">
                        <DialogTitle>{selectedEntry ? `Configure ${selectedEntry.pathString}` : `Add simple ${placeholderType} placeholder`}</DialogTitle>
                        <DialogDescription>
                            {selectedEntry
                                ? "Fill the placeholder arguments, then insert the generated placeholder token."
                                : "Search the available placeholder paths. Zero-argument placeholders insert immediately; placeholders with arguments open a shared arg form first."}
                        </DialogDescription>
                    </DialogHeader>

                    {!selectedEntry ? (
                    <div className="flex min-h-0 flex-col gap-3 px-5 pb-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                ref={searchRef}
                                value={searchValue}
                                onChange={handleSearchChange}
                                onKeyDown={handleSearchKeyDown}
                                role="combobox"
                                aria-autocomplete="list"
                                aria-expanded={true}
                                aria-haspopup="listbox"
                                aria-controls={listboxId}
                                aria-activedescendant={activeDescendantId}
                                placeholder="Search placeholder path, description, or arg name"
                                className={cn("bg-background", compact ? "h-8 text-xs" : "h-9")}
                            />
                            <Badge variant="secondary" className="font-mono text-[10px]">
                                {filteredEntries.length.toLocaleString()} results
                            </Badge>
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {valueType}
                            </Badge>
                            {escapeHint && (
                                <span role="status" aria-live="polite" className="text-[11px] text-muted-foreground">{escapeHint}</span>
                            )}
                        </div>

                        <div
                            id={listboxId}
                            role="listbox"
                            aria-label="Placeholder commands"
                            ref={listRef}
                            className="overflow-y-auto rounded-md border border-border/60"
                            style={{ maxHeight: `${viewportHeight}px` }}
                            onScroll={handleListScroll}
                        >
                            {filteredEntries.length === 0 ? (
                                <div className="px-4 py-8 text-sm text-muted-foreground">
                                    No placeholders match the current search.
                                </div>
                            ) : (
                                <div style={{ height: `${totalHeight}px`, position: "relative" }}>
                                    {visibleEntries.map((entry, index) => {
                                        const top = (startIndex + index) * LIST_ROW_HEIGHT;
                                        const argCount = entry.args.length;
                                        const requiredBadge = entry.requiredArgCount > 0
                                            ? `${entry.requiredArgCount} required`
                                            : argCount > 0
                                                ? `${argCount} optional`
                                                : "0 args";

                                        return (
                                            <button
                                                key={entry.id}
                                                type="button"
                                                data-entry-id={entry.id}
                                                id={getSearchListOptionId(listboxId, entry.id)}
                                                role="option"
                                                aria-selected={startIndex + index === activeIndex}
                                                tabIndex={-1}
                                                className="absolute left-0 right-0 flex h-10 flex-col items-start justify-center gap-0.5 border-b border-border/50 px-3 text-left transition-colors hover:bg-muted/40"
                                                style={{ top: `${top}px` }}
                                                onClick={handleEntryClick}
                                                onMouseMove={() => setActiveIndex(startIndex + index)}
                                                title={entry.description}
                                            >
                                                <div className="flex w-full items-center gap-2">
                                                    <span className="truncate font-mono text-[11px] text-foreground">
                                                        <SearchMatchText text={entry.pathString} query={deferredSearchValue} />
                                                    </span>
                                                    <Badge variant={argCount === 0 ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                                                        {requiredBadge}
                                                    </Badge>
                                                </div>
                                                <span className="truncate text-[10px] text-muted-foreground">
                                                    <SearchMatchText text={entry.description || "No description available."} query={deferredSearchValue} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-col gap-3 px-5 pb-5" onKeyDownCapture={handleSelectedShellKeyDownCapture}>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button ref={backButtonRef} type="button" variant="outline" size="sm" onClick={handleBack}>
                                Back
                            </Button>
                            <Badge variant="secondary" className="font-mono text-[10px]">
                                {selectedEntry.pathString}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                                {selectedEntry.args.length} args
                            </Badge>
                            {escapeHint && (
                                <span role="status" aria-live="polite" className="text-[11px] text-muted-foreground">{escapeHint}</span>
                            )}
                        </div>

                        <div ref={argShellRef} className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                            {selectedEntry.args.map((arg) => {
                                const fieldState = fieldStates[arg.name] ?? createCommandFieldState(arg.arg.def ?? "");
                                return (
                                    <div key={arg.name} className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 p-2">
                                        <ArgDescComponent arg={arg} includeType includeDesc includeExamples compact={compact ?? false} />
                                        <ArgInput
                                            argName={arg.name}
                                            breakdown={arg.getTypeBreakdown()}
                                            min={arg.arg.min}
                                            max={arg.arg.max}
                                            initialValue={fieldState.displayValue}
                                            fieldState={fieldState}
                                            setFieldState={selectedFieldStateUpdaters[arg.name]}
                                            setOutputValue={handleArgOutput}
                                            setCommittedValue={handleArgOutput}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {selectedEntry && (
                    <DialogFooter className="border-t border-border/60 px-5 py-4">
                        <Button type="button" variant="outline" onClick={handleBack}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleInsertSelected} disabled={selectedInvalid}>
                            Insert placeholder
                        </Button>
                    </DialogFooter>
                )}
                </div>
            </DialogContent>
        </Dialog>
    );
});

export default PlaceholderCommandPickerDialog;
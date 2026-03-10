import React, { useDeferredValue, useRef, useState, useMemo, KeyboardEventHandler, useEffect, useCallback, useLayoutEffect, memo } from "react";
import { createPortal } from "react-dom";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useDialog } from "../layout/DialogContext";
import { Button } from "../ui/button";
import { TypeBreakdown } from "../../utils/Command";
import Loading from "../ui/loading";
import { useSyncedState } from "@/utils/StateUtil";
import { cn } from "@/lib/utils";
import {
    toPlainSelectOptions,
    dedupeByValue,
    resolveInitialSelection,
    resolveOptionMatch,
    resolveSelectionInput,
    serializeSelection,
    summarizeOptions,
    type SelectOption,
} from "./selectValueUtils";
import { buildPlaceholderTypeOptions } from "./argInputMetadata";

// ----------------------------------------------------------------------
// Sub-Components (Extracted to prevent inline JSX functions)
// ----------------------------------------------------------------------

interface SelectedChipProps {
    option: SelectOption;
    onRemove: (option: SelectOption) => void;
}

const SelectedChip = memo(function SelectedChip({ option, onRemove }: SelectedChipProps) {
    const handleRemoveClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onRemove(option);
    }, [option, onRemove]);

    return (
        <span className="flex max-w-full items-center gap-1 rounded-sm border border-border/60 bg-muted/15 px-1.5 py-0.5 text-[11px]">
            {option.icon && (
                <img src={option.icon} alt="" className="w-3.5 h-3.5 object-contain inline-block" />
            )}
            <span className="truncate">{option.label || option.value}</span>
            <button
                type="button"
                className="font-bold text-muted-foreground transition-colors hover:text-destructive focus:outline-none"
                onClick={handleRemoveClick}
            >
                &times;
            </button>
        </span>
    );
});

interface DropdownItemProps {
    option: SelectOption;
    index: number;
    isHighlighted: boolean;
    isSelected: boolean;
    onToggle: (option: SelectOption) => void;
    onHover: (index: number) => void;
}

const DropdownItem = memo(function DropdownItem({
    option,
    index,
    isHighlighted,
    isSelected,
    onToggle,
    onHover,
}: DropdownItemProps) {
    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onToggle(option);
    }, [option, onToggle]);

    const handleMouseEnter = useCallback(() => {
        onHover(index);
    }, [index, onHover]);

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onClick={handleClick}
            className={`
                flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-[13px] select-none transition-colors
                ${isHighlighted ? 'bg-accent/70' : 'bg-transparent'}
                ${isSelected ? 'bg-primary/8 font-medium text-foreground' : 'text-foreground'}
      `}
        >
            {option.icon && (
                <img src={option.icon} loading="lazy" alt="" className="w-4 h-4 mr-2 object-contain inline-block" />
            )}
            <div className="min-w-0 flex-1 truncate">{option.label || option.value}</div>
        </div>
    );
});

// ----------------------------------------------------------------------
// Wrapper Components
// ----------------------------------------------------------------------

export function ListComponentBreakdown({ breakdown, argName, isMulti, initialValue, setOutputValue }: {
    breakdown: TypeBreakdown;
    argName: string;
    isMulti: boolean;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
}) {
    const labelled = useMemo(() => buildPlaceholderTypeOptions(breakdown), [breakdown]);

    return <ListComponent argName={argName} options={labelled} isMulti={isMulti} initialValue={initialValue} setOutputValue={setOutputValue} />;
}

export function ListComponentOptions({ options, argName, isMulti, initialValue, setOutputValue }: {
    options: string[];
    argName: string;
    isMulti: boolean;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
}) {
    const labelled = useMemo(() => toPlainSelectOptions(options), [options]);

    return <ListComponent argName={argName} options={labelled} isMulti={isMulti} initialValue={initialValue} setOutputValue={setOutputValue} />;
}

type ListComponentProps = {
    argName: string;
    options: SelectOption[];
    isMulti: boolean;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
    onSearchValueChange?: (value: string) => void;
    optionsArePrefiltered?: boolean;
    loadingOptions?: boolean;
    emptyMessage?: string;
};

type SearchIndexEntry = {
    option: SelectOption;
    labelLower: string;
    valueLower: string;
    aliasLower: string[];
};

function useFilteredOptions({
    options,
    optionsArePrefiltered,
    isOpen,
    inputValue,
}: {
    options: SelectOption[];
    optionsArePrefiltered: boolean;
    isOpen: boolean;
    inputValue: string;
}) {
    const deferredInputValue = useDeferredValue(inputValue);
    const normalizedSearchValue = deferredInputValue.trim().toLowerCase();
    const shouldBuildSearchIndex = !optionsArePrefiltered && isOpen && normalizedSearchValue.length > 0;
    const searchIndex = useMemo<SearchIndexEntry[]>(() => {
        if (!shouldBuildSearchIndex) {
            return [];
        }

        return options.map((option) => ({
            option,
            labelLower: (option.label || option.value).toLowerCase(),
            valueLower: option.value.toLowerCase(),
            aliasLower: (option.aliases ?? []).map((alias) => alias.toLowerCase()),
        }));
    }, [options, shouldBuildSearchIndex]);

    return useMemo(() => {
        if (!isOpen) return [] as SelectOption[];
        if (optionsArePrefiltered) {
            return options;
        }
        if (!normalizedSearchValue) {
            return options;
        }

        const exactMatches: SelectOption[] = [];
        const partialMatches: SelectOption[] = [];

        for (const entry of searchIndex) {
            const { option, labelLower, valueLower, aliasLower } = entry;
            const isMatch = labelLower.includes(normalizedSearchValue)
                || valueLower.includes(normalizedSearchValue)
                || aliasLower.some((alias) => alias.includes(normalizedSearchValue));

            if (!isMatch) {
                continue;
            }

            if (labelLower === normalizedSearchValue || valueLower === normalizedSearchValue || aliasLower.some((alias) => alias === normalizedSearchValue)) {
                exactMatches.push(option);
            } else {
                partialMatches.push(option);
            }
        }

        return exactMatches.concat(partialMatches);
    }, [isOpen, normalizedSearchValue, options, optionsArePrefiltered, searchIndex]);
}

function DropdownPanel({
    isOpen,
    filteredOptions,
    loadingOptions,
    emptyMessage,
    anchorRef,
    virtuosoRef,
    renderItem,
}: {
    isOpen: boolean;
    filteredOptions: SelectOption[];
    loadingOptions: boolean;
    emptyMessage?: string;
    anchorRef: React.RefObject<HTMLElement | null>;
    virtuosoRef: React.RefObject<VirtuosoHandle | null>;
    renderItem: (index: number, option: SelectOption) => React.ReactNode;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({
        position: "fixed",
        top: -9999,
        left: -9999,
        width: 0,
        maxHeight: 300,
        visibility: "hidden",
        zIndex: 90,
    });

    const updatePosition = useCallback(() => {
        const anchor = anchorRef.current;
        const panel = panelRef.current;
        if (!anchor || !panel) {
            return;
        }

        const anchorRect = anchor.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const viewportPadding = 8;
        const desiredTop = anchorRect.bottom + 4;
        const availableBelow = window.innerHeight - desiredTop - viewportPadding;
        const availableAbove = anchorRect.top - viewportPadding - 4;
        const shouldOpenAbove = availableBelow < 180 && availableAbove > availableBelow;
        const maxHeight = Math.max(120, Math.min(300, shouldOpenAbove ? availableAbove : availableBelow));
        const measuredHeight = Math.min(panelRect.height || maxHeight, maxHeight);
        const top = shouldOpenAbove
            ? Math.max(viewportPadding, anchorRect.top - measuredHeight - 4)
            : Math.min(desiredTop, window.innerHeight - measuredHeight - viewportPadding);
        const width = Math.max(anchorRect.width, 160);
        const left = Math.min(
            Math.max(viewportPadding, anchorRect.left),
            Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
        );

        setStyle({
            position: "fixed",
            top,
            left,
            width,
            maxHeight,
            visibility: "visible",
            zIndex: 90,
        });
    }, [anchorRef]);

    useLayoutEffect(() => {
        if (!isOpen) {
            return;
        }

        updatePosition();

        const handleWindowChange = () => updatePosition();
        window.addEventListener("resize", handleWindowChange);
        window.addEventListener("scroll", handleWindowChange, true);
        return () => {
            window.removeEventListener("resize", handleWindowChange);
            window.removeEventListener("scroll", handleWindowChange, true);
        };
    }, [isOpen, updatePosition]);

    const virtuosoStyle = useMemo(() => ({
        height: `${Math.min(filteredOptions.length * 36, 300)}px`
    }), [filteredOptions.length]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            ref={panelRef}
            style={style}
            className="overflow-hidden rounded-md border border-border/70 bg-background shadow-lg"
            onMouseDown={(event) => {
                event.preventDefault();
            }}
        >
            {loadingOptions ? (
                <div className="p-4 flex justify-center"><Loading /></div>
            ) : filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">{emptyMessage ?? "No matching options."}</div>
            ) : (
                <Virtuoso
                    ref={virtuosoRef}
                    style={virtuosoStyle}
                    totalCount={filteredOptions.length}
                    data={filteredOptions}
                    itemContent={renderItem}
                />
            )}
        </div>,
        document.body,
    );
}

function useCloseOnBlur(containerRef: React.RefObject<HTMLDivElement | null>, setIsOpen: (next: boolean) => void) {
    return useCallback((e: React.FocusEvent<HTMLDivElement>) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
        }
    }, [containerRef, setIsOpen]);
}

function SingleSelectListComponent({ argName, options, initialValue, setOutputValue, onSearchValueChange, optionsArePrefiltered = false, loadingOptions = false, emptyMessage }: Omit<ListComponentProps, "isMulti">) {
    const { showDialog } = useDialog();
    const normalizedInitialSelection = useMemo(() => resolveInitialSelection(initialValue || '', options, false)[0] ?? null, [initialValue, options]);
    const [value, setValue] = useSyncedState<SelectOption | null>(normalizedInitialSelection);
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const filteredOptions = useFilteredOptions({ options, optionsArePrefiltered, isOpen, inputValue });

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    useEffect(() => {
        setHighlightedIndex(0);
        if (isOpen && virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({ index: 0, align: 'start' });
        }
    }, [filteredOptions.length, isOpen]);

    const syncOutput = useCallback((selection: SelectOption | null) => {
        setOutputValue(argName, selection?.value ?? '');
    }, [argName, setOutputValue]);

    const selectOption = useCallback((option: SelectOption | undefined, inputString?: string) => {
        if (!option) {
            showDialog("Invalid value", <>The value <kbd className='bg-secondary rounded px-0.5'>{inputString}</kbd> is not a valid option.</>);
            return;
        }

        const nextSelection = value?.value === option.value ? null : option;
        setValue(nextSelection);
        syncOutput(nextSelection);
        setInputValue('');
        setIsOpen(false);
    }, [showDialog, syncOutput, setValue, value?.value]);

    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback((event) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
            return;
        }

        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
                event.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setHighlightedIndex((prev) => {
                    const next = Math.min(prev + 1, filteredOptions.length - 1);
                    virtuosoRef.current?.scrollIntoView({ index: next, align: 'center' });
                    return next;
                });
                break;
            case 'ArrowUp':
                event.preventDefault();
                setHighlightedIndex((prev) => {
                    const next = Math.max(prev - 1, 0);
                    virtuosoRef.current?.scrollIntoView({ index: next, align: 'center' });
                    return next;
                });
                break;
            case 'Enter':
            case 'Tab':
                if (filteredOptions.length > 0) {
                    selectOption(filteredOptions[highlightedIndex], inputValue);
                } else if (inputValue) {
                    selectOption(undefined, inputValue);
                }
                break;
        }
    }, [filteredOptions, highlightedIndex, inputValue, isOpen, selectOption]);

    const handleBlur = useCloseOnBlur(containerRef, setIsOpen);

    const handleContainerClick = useCallback(() => {
        setIsOpen(true);
        onSearchValueChange?.(inputValue);
        inputRef.current?.focus();
    }, [inputValue, onSearchValueChange]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = e.target.value;
        setInputValue(nextValue);
        setIsOpen(true);
        onSearchValueChange?.(nextValue);
    }, [onSearchValueChange]);

    const handleInputFocus = useCallback(() => {
        setIsOpen(true);
        onSearchValueChange?.(inputValue);
    }, [inputValue, onSearchValueChange]);

    const handleInputPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (!pastedText) return;

        const match = resolveOptionMatch(pastedText.trim(), options);
        if (match.option) {
            e.preventDefault();
            setValue(match.option);
            syncOutput(match.option);
            setIsOpen(false);
            inputRef.current?.blur();
            return;
        }

        showDialog(
            "Invalid value",
            <>
                The value <kbd className='bg-secondary rounded px-0.5'>{pastedText.trim()}</kbd> did not match any option.
                <div className="mt-2 text-xs text-muted-foreground">Available options: {summarizeOptions(options)}</div>
            </>,
        );
    }, [options, setValue, showDialog, syncOutput]);

    const handleInputCopy = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        if (inputRef.current && inputRef.current.selectionStart !== inputRef.current.selectionEnd) {
            return;
        }

        if (value) {
            e.preventDefault();
            e.clipboardData.setData('text/plain', value.label || value.value);
        }
    }, [value]);

    const handleItemHover = useCallback((index: number) => {
        setHighlightedIndex(index);
    }, []);

    const renderItem = useCallback((index: number, option: SelectOption) => (
        <DropdownItem
            option={option}
            index={index}
            isHighlighted={index === highlightedIndex}
            isSelected={value?.value === option.value}
            onToggle={selectOption}
            onHover={handleItemHover}
        />
    ), [handleItemHover, highlightedIndex, selectOption, value?.value]);

    const placeholderText = value && !inputValue
        ? (value.label || value.value)
        : "Search...";

    return (
        <div
            className={cn("relative flex flex-col gap-2", isOpen && "z-40")}
            ref={containerRef}
            onBlur={handleBlur}
        >
            <div
                className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border/70 bg-background p-1 transition-all focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 cursor-text"
                onClick={handleContainerClick}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onPaste={handleInputPaste}
                    onCopy={handleInputCopy}
                    placeholder={placeholderText}
                    className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                />
            </div>

            <DropdownPanel
                isOpen={isOpen}
                filteredOptions={filteredOptions}
                loadingOptions={loadingOptions}
                emptyMessage={emptyMessage}
                anchorRef={containerRef}
                virtuosoRef={virtuosoRef}
                renderItem={renderItem}
            />
        </div>
    );
}

function MultiSelectListComponent({ argName, options, initialValue, setOutputValue, onSearchValueChange, optionsArePrefiltered = false, loadingOptions = false, emptyMessage }: Omit<ListComponentProps, "isMulti">) {
    const { showDialog } = useDialog();

    const normalizedInitialSelection = useMemo(() => {
        return resolveInitialSelection(initialValue || '', options, true);
    }, [initialValue, options]);

    const [value, setValue] = useSyncedState<SelectOption[]>(normalizedInitialSelection);
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const filteredOptions = useFilteredOptions({ options, optionsArePrefiltered, isOpen, inputValue });

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const selectedValueSet = useMemo(() => new Set(value.map((v) => v.value)), [value]);

    const syncOutput = useCallback((selection: SelectOption[]) => {
        setOutputValue(argName, serializeSelection(selection, true));
    }, [argName, setOutputValue]);

    useEffect(() => {
        setHighlightedIndex(0);
        if (isOpen && virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({ index: 0, align: 'start' });
        }
    }, [filteredOptions.length, isOpen]);

    const toggleOption = useCallback((option: SelectOption | undefined, inputString?: string) => {
        if (!option) {
            showDialog("Invalid value", <>The value <kbd className='bg-secondary rounded px-0.5'>{inputString}</kbd> is not a valid option.</>);
            return;
        }

        const isSelected = selectedValueSet.has(option.value);
        let nextSelection: SelectOption[];

        if (isSelected) nextSelection = value.filter(v => v.value !== option.value);
        else nextSelection = dedupeByValue([...value, option]);

        setValue(nextSelection);
        syncOutput(nextSelection);

        setInputValue('');
        inputRef.current?.focus();
    }, [value, selectedValueSet, setValue, syncOutput, showDialog]);

    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback((event) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
            return;
        }

        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
                event.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setHighlightedIndex((prev) => {
                    const next = Math.min(prev + 1, filteredOptions.length - 1);
                    virtuosoRef.current?.scrollIntoView({ index: next, align: 'center' });
                    return next;
                });
                break;
            case 'ArrowUp':
                event.preventDefault();
                setHighlightedIndex((prev) => {
                    const next = Math.max(prev - 1, 0);
                    virtuosoRef.current?.scrollIntoView({ index: next, align: 'center' });
                    return next;
                });
                break;
            case 'Enter':
            case 'Tab': {
                event.preventDefault();
                if (filteredOptions.length > 0) {
                    toggleOption(filteredOptions[highlightedIndex], inputValue);
                } else if (inputValue) {
                    toggleOption(undefined, inputValue);
                }
                break;
            }
            case 'Backspace': {
                if (!inputValue && value.length > 0) {
                    const nextSelection = value.slice(0, -1);
                    setValue(nextSelection);
                    syncOutput(nextSelection);
                }
                break;
            }
        }
    }, [isOpen, filteredOptions, highlightedIndex, inputValue, value, toggleOption, setValue, syncOutput]);

    const handleBlur = useCloseOnBlur(containerRef, setIsOpen);

    const selectAll = useCallback(() => {
        setValue(options);
        syncOutput(options);
    }, [options, setValue, syncOutput]);

    const clearAll = useCallback(() => {
        setValue([]);
        syncOutput([]);
        setInputValue('');
    }, [setValue, syncOutput]);

    // Stable handlers to avoid inline functions in JSX
    const handleContainerClick = useCallback(() => {
        setIsOpen(true);
        onSearchValueChange?.(inputValue);
        inputRef.current?.focus();
    }, [inputValue, onSearchValueChange]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = e.target.value;
        setInputValue(nextValue);
        setIsOpen(true);
        onSearchValueChange?.(nextValue);
    }, [onSearchValueChange]);

    const handleInputFocus = useCallback(() => {
        setIsOpen(true);
        onSearchValueChange?.(inputValue);
    }, [inputValue, onSearchValueChange]);

    const handleInputPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (!pastedText) return;

        const resolution = resolveSelectionInput(pastedText, options, true, value);
        if (resolution.unmatchedTokens.length > 0) {
            showDialog(
                "Invalid value",
                <>
                    Could not match: <kbd className='bg-secondary rounded px-0.5'>{resolution.unmatchedTokens.join(", ")}</kbd>
                    <div className="mt-2 text-xs text-muted-foreground">Available options: {summarizeOptions(options)}</div>
                </>,
            );
        }

        if (serializeSelection(resolution.selection, true) !== serializeSelection(value, true)) {
            e.preventDefault();
            setValue(resolution.selection);
            syncOutput(resolution.selection);
        }
    }, [options, setValue, showDialog, syncOutput, value]);

    const handleInputCopy = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        // If there's text selected in the input, let the default copy behavior happen
        if (inputRef.current && inputRef.current.selectionStart !== inputRef.current.selectionEnd) {
            return;
        }
        
        if (value.length > 0) {
            e.preventDefault();
            // Copy the labels if available, otherwise values
            const textToCopy = value.map(v => v.label || v.value).join(', ');
            e.clipboardData.setData('text/plain', textToCopy);
        }
    }, [value]);

    const handleRemoveOption = useCallback((option: SelectOption) => {
        toggleOption(option);
    }, [toggleOption]);

    const handleItemHover = useCallback((index: number) => {
        setHighlightedIndex(index);
    }, []);

    // Virtuoso Render Prop
    const renderItem = useCallback((index: number, option: SelectOption) => {
        const isSelected = selectedValueSet.has(option.value);
        const isHighlighted = index === highlightedIndex;

        return (
            <DropdownItem
                option={option}
                index={index}
                isHighlighted={isHighlighted}
                isSelected={isSelected}
                onToggle={toggleOption}
                onHover={handleItemHover}
            />
        );
    }, [selectedValueSet, highlightedIndex, toggleOption, handleItemHover]);

    return (
        <div
            className={cn("relative flex flex-col gap-2", isOpen && "z-40")}
            ref={containerRef}
            onBlur={handleBlur}
        >
            <div
                className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border/70 bg-background p-1 transition-all focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 cursor-text"
                onClick={handleContainerClick}
            >
                {value.map((v) => (
                    <SelectedChip
                        key={v.value}
                        option={v}
                        onRemove={handleRemoveOption}
                    />
                ))}

                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onPaste={handleInputPaste}
                    onCopy={handleInputCopy}
                    placeholder="Search..."
                    className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                {options.length > 0 && (
                    <div className="ml-auto flex items-center gap-1 border-l border-border/60 pl-1">
                        {value.length < options.length && (
                            <Button variant="ghost" size="sm" onClick={selectAll} className="h-5 px-1.5 text-[10px]">All</Button>
                        )}
                        {value.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearAll} className="h-5 px-1.5 text-[10px]">Clear</Button>
                        )}
                    </div>
                )}
            </div>

            <DropdownPanel
                isOpen={isOpen}
                filteredOptions={filteredOptions}
                loadingOptions={loadingOptions}
                emptyMessage={emptyMessage}
                anchorRef={containerRef}
                virtuosoRef={virtuosoRef}
                renderItem={renderItem}
            />
        </div>
    );
}

// ----------------------------------------------------------------------
// Main List Component
// ----------------------------------------------------------------------

export default function ListComponent(props: ListComponentProps) {
    if (props.isMulti) {
        return <MultiSelectListComponent {...props} />;
    }

    return <SingleSelectListComponent {...props} />;
}
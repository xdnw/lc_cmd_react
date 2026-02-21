import React, { useRef, useState, useMemo, KeyboardEventHandler, useEffect, useCallback, memo } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useDialog } from "../layout/DialogContext";
import { Button } from "../ui/button";
import { TypeBreakdown } from "../../utils/Command";
import Loading from "../ui/loading";
import { useSyncedState } from "@/utils/StateUtil";
import {
    dedupeByValue,
    resolveInitialSelection,
    serializeSelection,
    type SelectOption,
} from "./selectValueUtils";

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
        <span className="flex items-center gap-1 px-2 py-0.5 text-sm bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white rounded-sm">
            {option.icon && (
                <img src={option.icon} alt="" className="w-3.5 h-3.5 object-contain inline-block" />
            )}
            {option.label || option.value}
            <button
                type="button"
                className="hover:text-red-500 dark:hover:text-red-400 focus:outline-none font-bold"
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
        flex items-center px-3 py-2 cursor-pointer text-sm select-none transition-colors
        ${isHighlighted ? 'bg-slate-100 dark:bg-slate-800' : 'bg-transparent'}
        ${isSelected ? 'bg-slate-200 dark:bg-slate-900 font-medium' : ''}
        text-slate-900 dark:text-white
      `}
        >
            {option.icon && (
                <img src={option.icon} loading="lazy" alt="" className="w-4 h-4 mr-2 object-contain inline-block" />
            )}
            {option.label || option.value}
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
    const labelled = useMemo(() => {
        const types = breakdown.map.getPlaceholderTypes(true);
        return types.map((o) => ({ label: o, value: o }));
    }, [breakdown]);

    return <ListComponent argName={argName} options={labelled} isMulti={isMulti} initialValue={initialValue} setOutputValue={setOutputValue} />;
}

export function ListComponentOptions({ options, argName, isMulti, initialValue, setOutputValue }: {
    options: string[];
    argName: string;
    isMulti: boolean;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
}) {
    const labelled = useMemo(() => {
        return options.map((o) => ({ label: o, value: o }));
    }, [options]);

    return <ListComponent argName={argName} options={labelled} isMulti={isMulti} initialValue={initialValue} setOutputValue={setOutputValue} />;
}

// ----------------------------------------------------------------------
// Main List Component
// ----------------------------------------------------------------------

export default function ListComponent({ argName, options, isMulti, initialValue, setOutputValue }: {
    argName: string;
    options: SelectOption[];
    isMulti: boolean;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
}) {
    const { showDialog } = useDialog();

    const normalizedInitialSelection = useMemo(() => {
        return resolveInitialSelection(initialValue || '', options, isMulti);
    }, [initialValue, isMulti, options]);

    const [value, setValue] = useSyncedState<SelectOption[]>(normalizedInitialSelection);
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const selectedValueSet = useMemo(() => new Set(value.map((v) => v.value)), [value]);

    const syncOutput = useCallback((selection: SelectOption[]) => {
        setOutputValue(argName, serializeSelection(selection, isMulti));
    }, [argName, isMulti, setOutputValue]);

    const filteredOptions = useMemo(() => {
        if (!options) return [];
        if (!inputValue) return options;

        const exactMatches: SelectOption[] = [];
        const partialMatches: SelectOption[] = [];
        const inputLower = inputValue.toLowerCase();

        for (const option of options) {
            const checkAgainst = option.label || option.value;
            const checkLower = checkAgainst.toLowerCase();

            if (checkLower.includes(inputLower)) {
                if (checkLower === inputLower) exactMatches.push(option);
                else partialMatches.push(option);
            }
        }
        return exactMatches.concat(partialMatches);
    }, [options, inputValue]);

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

        if (isMulti) {
            if (isSelected) nextSelection = value.filter(v => v.value !== option.value);
            else nextSelection = dedupeByValue([...value, option]);
        } else {
            nextSelection = isSelected ? [] : [option];
        }

        setValue(nextSelection);
        syncOutput(nextSelection);

        if (!isMulti) setIsOpen(false);
        setInputValue('');
        // Don't force focus back if we're closing, let the browser or parent handle it
        if (isMulti) {
            inputRef.current?.focus();
        }
    }, [isMulti, value, selectedValueSet, setValue, syncOutput, showDialog]);

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
                if (isMulti) {
                    event.preventDefault();
                }
                if (filteredOptions.length > 0) {
                    toggleOption(filteredOptions[highlightedIndex], inputValue);
                } else if (inputValue) {
                    toggleOption(undefined, inputValue);
                }
                break;
            }
            case 'Backspace': {
                if (!inputValue && isMulti && value.length > 0) {
                    const nextSelection = value.slice(0, -1);
                    setValue(nextSelection);
                    syncOutput(nextSelection);
                }
                break;
            }
        }
    }, [isOpen, filteredOptions, highlightedIndex, inputValue, isMulti, value, toggleOption, setValue, syncOutput]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
        }
    }, []);

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
        inputRef.current?.focus();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setIsOpen(true);
    }, []);

    const handleInputFocus = useCallback(() => {
        setIsOpen(true);
    }, []);

    const handleInputPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (!pastedText) return;

        if (isMulti) {
            // Try to split by comma or newline
            const parts = pastedText.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
            if (parts.length > 1) {
                e.preventDefault();
                
                const newSelection = [...value];
                let changed = false;
                
                for (const part of parts) {
                    // Find matching option by value or label
                    const option = options.find(o => 
                        o.value.toLowerCase() === part.toLowerCase() || 
                        (o.label && o.label.toLowerCase() === part.toLowerCase())
                    );
                    
                    if (option && !newSelection.some(v => v.value === option.value)) {
                        newSelection.push(option);
                        changed = true;
                    }
                }
                
                if (changed) {
                    setValue(newSelection);
                    syncOutput(newSelection);
                }
            }
        } else {
            // Single select: try to find exact match
            const part = pastedText.trim();
            const option = options.find(o => 
                o.value.toLowerCase() === part.toLowerCase() || 
                (o.label && o.label.toLowerCase() === part.toLowerCase())
            );
            
            if (option) {
                e.preventDefault();
                setValue([option]);
                syncOutput([option]);
                setIsOpen(false);
                inputRef.current?.blur();
            }
        }
    }, [isMulti, options, value, setValue, syncOutput]);

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

    const placeholderText = !isMulti && value.length === 1 && !inputValue
        ? (value[0].label || value[0].value)
        : "Type something and press enter...";

    // Memoize style object to avoid inline object allocation
    const virtuosoStyle = useMemo(() => ({
        height: `${Math.min(filteredOptions.length * 36, 300)}px`
    }), [filteredOptions.length]);

    return (
        <div
            className="relative flex flex-col gap-2"
            ref={containerRef}
            onBlur={handleBlur}
        >
            <div
                className="flex flex-wrap items-center gap-1.5 p-1.5 border rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent min-h-[38px] cursor-text transition-all"
                onClick={handleContainerClick}
            >
                {isMulti && value.map((v) => (
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
                    placeholder={placeholderText}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-slate-900 dark:text-white text-sm px-1 py-0.5 placeholder:text-slate-400 dark:placeholder:text-slate-400"
                />
            </div>

            {isMulti && (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={clearAll}>Clear</Button>
                </div>
            )}

            {isOpen && (
                <div className="absolute top-[42px] left-0 right-0 z-50 bg-white dark:bg-slate-700 shadow-xl border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden">
                    {!options ? (
                        <div className="p-4 flex justify-center"><Loading /></div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">No options found.</div>
                    ) : (
                        <Virtuoso
                            ref={virtuosoRef}
                            style={virtuosoStyle}
                            totalCount={filteredOptions.length}
                            data={filteredOptions}
                            itemContent={renderItem}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
import React, { useRef, useEffect, KeyboardEventHandler, useState, useMemo } from "react";
// @ts-expect-error Clusterize is not typed
import Clusterize from 'clusterize.js';
import 'clusterize.js/clusterize.css';
import CreatableSelect from 'react-select/creatable';
import './list.css';
import { useSyncedStateFunc } from "@/utils/StateUtil";
import Select from "react-select/base";
import { useDialog } from "../layout/DialogContext";
import { Button } from "../ui/button";
import { TypeBreakdown } from "../../utils/Command";
import { InputActionMeta } from "react-select";
import Loading from "../ui/loading";

export function ListComponentBreakdown({ breakdown, argName, isMulti, initialValue, setOutputValue }: {
    breakdown: TypeBreakdown,
    argName: string,
    isMulti: boolean,
    initialValue: string,
    setOutputValue: (name: string, value: string) => void
}) {
    const labelled = useMemo(() => {
        const types = breakdown.map.getPlaceholderTypes(true);
        return types.map((o) => ({ label: o, value: o }));
    }, [breakdown]);

    return <ListComponent argName={argName} options={labelled} isMulti={isMulti} initialValue={initialValue} setOutputValue={setOutputValue} />
}

export function ListComponentOptions({ options, argName, isMulti, initialValue, setOutputValue }: {
    options: string[],
    argName: string,
    isMulti: boolean,
    initialValue: string,
    setOutputValue: (name: string, value: string) => void
}) {
    const labelled = useMemo(() => {
        return options.map((o) => ({ label: o, value: o }))
    }, [options]);

    return <ListComponent argName={argName} options={labelled} isMulti={isMulti} initialValue={initialValue} setOutputValue={setOutputValue} />
}

export default function ListComponent(
    { argName, options, isMulti, initialValue, setOutputValue }:
        {
            argName: string,
            options: { label: string, value: string, subtext?: string, color?: string, icon?: string }[],
            isMulti: boolean,
            initialValue: string,
            setOutputValue: (name: string, value: string) => void
        }
) {
    const { showDialog } = useDialog();

    const [inputValue, setInputValue] = React.useState('');
    const [value, setValue] = useSyncedStateFunc(initialValue || '', (v) => v ? v.split(',').map((v) => ({ label: v, value: v })) : []);
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLOListElement>(null);
    const selectRef = useRef<Select>(null);
    const [clusterize, setClusterize] = useState<Clusterize | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const selectedValueSet = useMemo(() => {
        return new Set(value.map((v) => v.value));
    }, [value]);

    const addValue = React.useCallback((option: { label: string, value: string } | undefined, input: string) => {
        if (option) {
            const newValue = (prevValue => {
                if (!prevValue.find((v) => v.value === option.value)) {
                    if (isMulti) {
                        return [...prevValue, option];
                    } else {
                        return [option];
                    }
                }
                return prevValue;
            })(value);

            // Only update if there's a change
            if (newValue !== value) {
                setValue(newValue);
                // Update output value after state is set
                if (isMulti) {
                    const valueStr = newValue.map((v) => v.value).join(',');
                    console.log('Add value multi');
                    setOutputValue(argName, valueStr);
                } else {
                    console.log('Add value single');
                    setOutputValue(argName, option.value);
                }
            }
            setInputValue('');
        } else {
            showDialog("Invalid value", <>The value <kbd className='bg-secondary rounded px-0.5'>{input}</kbd> is not a valid option.</>);
        }
    }, [isMulti, argName, setOutputValue, showDialog, setValue, value]);

    const handleKeyDown: KeyboardEventHandler = React.useCallback((event) => {
        switch (event.key) {
            case 'Escape': {
                setIsFocused(false);
                break;
            }
            default: {
                if (!isFocused) {
                    setIsFocused(true);
                }
            }
        }
        if (!inputValue) return;
        switch (event.key) {
            case 'Enter':
            case 'Tab': {
                const option = options.find((o) => o.label === inputValue || o.value === inputValue);
                console.log('Add value enter');
                addValue(option, inputValue);
                event.preventDefault();
                break;
            }
        }
    }, [isFocused, inputValue, options, addValue]);

    useEffect(() => {
        if (scrollRef.current && contentRef.current && options) {
            const exactMatches: string[] = [];
            const partialMatches: string[] = [];
            const inputLower = inputValue.toLowerCase();

            for (const option of options) {
                const checkAgainst = option.label ? option.label : option.value;
                const checkLower = checkAgainst.toLowerCase();

                if (checkLower.includes(inputLower)) {
                    // Build an inline icon (lazy-loading) if option.icon is present.
                    const iconHtml = option.icon ? `<img src="${option.icon}" loading="lazy" class="list-icon" alt="" />` : '';
                    let li;
                    if (selectedValueSet.has(option.value)) {
                        li = `<li class='bg-input dark:bg-slate-700 p-0.5'>${iconHtml}${option.label}</li>`;
                    } else {
                        li = `<li class='p-0.5'>${iconHtml}${option.label}</li>`;
                    }

                    if (checkLower === inputLower) {
                        exactMatches.push(li);
                    } else {
                        partialMatches.push(li);
                    }
                }
            }

            const filteredOptions = exactMatches.concat(partialMatches);

            if (clusterize) {
                clusterize.update(filteredOptions);
            } else {
                const newClusterize = new Clusterize({
                    rows: filteredOptions,
                    scrollElem: scrollRef.current,
                    contentElem: contentRef.current,
                    tag: 'ol',
                });
                setClusterize(newClusterize);
            }
        }
    }, [inputValue, value, clusterize, options, selectedValueSet]);

    useEffect(() => {
        return () => {
            if (clusterize) clusterize.destroy(true);
        };
    }, [clusterize]);

    const handleBlur = React.useCallback(() => {
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (scrollRef.current && (scrollRef.current === activeElement || scrollRef.current.contains(activeElement))) {
                return;
            }
            const selectControlElement = selectRef.current?.controlRef;
            if (selectControlElement && (selectControlElement === activeElement || selectControlElement.contains(activeElement))) {
                return;
            }
            setIsFocused(false);
        }, 0);
    }, [scrollRef, selectRef]);

    const focusTriggered = useRef(false);

    const handleFocus = React.useCallback(() => {
        focusTriggered.current = true;
        setIsFocused(true);
        setTimeout(() => {
            console.log('focus reset');
            focusTriggered.current = false;
        }, 200);
    }, []);

    const handleClick = React.useCallback(() => {
        if (!focusTriggered.current) {
            setIsFocused(f => !f);
        }
        focusTriggered.current = false;
    }, [setIsFocused, focusTriggered]);

    useEffect(() => {
        const scrollElement = scrollRef.current;
        const selectElement = selectRef.current?.controlRef;
        scrollElement?.addEventListener('focus', handleFocus, true);
        scrollElement?.addEventListener('blur', handleBlur, true);
        selectElement?.addEventListener('mousedown', handleClick);

        return () => {
            scrollElement?.removeEventListener('focus', handleFocus, true);
            scrollElement?.removeEventListener('blur', handleBlur, true);
            selectElement?.removeEventListener('mousedown', handleClick);
        };
    }, [scrollRef, selectRef, handleFocus, handleBlur, handleClick]);

    const selectAll = React.useCallback(() => {
        setValue(options);
        const valueStr = options.map((v) => v.value).join(',');
        console.log('Add value selectAll');
        setOutputValue(argName, valueStr);
    }, [options, argName, setOutputValue, setValue]);

    const clearAll = React.useCallback(() => {
        setValue([]);
        console.log('Add value clear all');
        setOutputValue(argName, '');
    }, [argName, setOutputValue, setValue]);

    const handleChange = React.useCallback((newValue: unknown) => {
        setValue(newValue as { label: string, value: string }[]);
        const valueStr = (newValue as { label: string, value: string }[]).map((v) => v.value).join(',');
        console.log('Add value handleChange');
        setOutputValue(argName, valueStr);
    }, [argName, setOutputValue, setValue]);

    const handleInputChange = React.useCallback((newValue: string, actionMeta: InputActionMeta) => {
        if (actionMeta.action !== 'input-blur' && actionMeta.action !== 'set-value' && actionMeta.action !== 'menu-close') {
            setInputValue(newValue);
        }
    }, []);

    const handleListClick = React.useCallback((e: React.MouseEvent<HTMLOListElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName.toLowerCase() === 'li') {
            const option = options.find((o) => o.label === target.innerText);
            if (option) {
                if (value.find((v) => v.value === option.value)) {
                    const newValue = value.filter((v) => v.value !== option.value);
                    setValue(newValue);
                    const valueStr = (newValue as { label: string, value: string }[]).map((v) => v.value).join(',');
                    console.log('Add value handleListClick');
                    setOutputValue(argName, valueStr);
                } else {
                    const labelOrValue = option.label ? option.label : option.value;
                    console.log('Add value click');
                    addValue(option, labelOrValue);
                }
            }
        }
    }, [options, value, setValue, setOutputValue, argName, addValue]);

    return (
        <div className="relative">
            <CreatableSelect
                ref={selectRef}
                className="react-select-container"
                classNamePrefix="react-select"
                inputValue={inputValue}
                isClearable={false}
                isMulti={isMulti}
                menuIsOpen={false}
                onChange={handleChange}
                onInputChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type something and press enter..."
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
            <div
                className={`absolute z-10 ${isFocused ? '' : 'invisible'} inset-x-0 bg-gray-50 dark:bg-gray-600 drop-shadow-2xl shadow-2xl border border-slate-400 dark:border-slate-400 rounded-sm p-0 clusterize-scroll`}
                ref={scrollRef}
            >
                <ul className="clusterize-content" ref={contentRef} onClick={handleListClick}>
                    <Loading />
                </ul>
            </div>
            {isMulti && (
                <>
                    <Button variant="outline" className="me-1" size="sm" onClick={selectAll}>
                        Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAll}>
                        Clear
                    </Button>
                </>
            )}
        </div>
    );
}
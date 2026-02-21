/**
 * MyTable - raw table wrapper that accepts data and column info
 * CustomTable - No args, page view of custom tables
 * AbstractTableWithButtons
 * StaticTable - Memoized AbstractTableWithButtons
 * PlaceholderTabs - Buttons for placeholders
 *
 * getTypeFromUrl - parse the types from query string
 * getSelectionFromUrl - parse the types from query string
 * getColumnsFromUrl - parse the types from query string
 * getSortFromUrl - parse the types from query string
 * getUrl - get a full url from the type values
 * getQueryString - get the query string from the type values
 *

 */
import { useDebounce, useDebouncedCallback } from 'use-debounce';
import { Virtuoso } from 'react-virtuoso';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { COMMANDS } from "../../lib/commands";
import { Command, CM, toPlaceholderName, AnyCommandPath, BaseCommand } from "../../utils/Command";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { BlockCopyButton } from "../../components/ui/block-copy-button";
import { TooltipProvider } from "../../components/ui/tooltip";
import { useDialog } from "../../components/layout/DialogContext";
import { DEFAULT_TABS } from "../../lib/layouts";
import CommandComponent from "../../components/cmd/CommandComponent";
import { Input } from "@/components/ui/input";
import { getColOptions, getQueryString } from "./table_util";
import { useDeepState } from "@/utils/StateUtil";
import LazyIcon from '@/components/ui/LazyIcon';
import { OrderIdx } from './DataTable';
import { deepEqual } from '@/lib/utils';

export interface PlaceholderTabsHandle {
    getType: () => keyof typeof COMMANDS.placeholders;
    getSelection: () => { [key: string]: string };
    getColumns: () => Map<string, string | null>;
    getSort: () => OrderIdx | OrderIdx[] | undefined;
}

export const PlaceholderTabs = forwardRef<PlaceholderTabsHandle, {
    defType: keyof typeof COMMANDS.placeholders,
    defSelection: { [key: string]: string },
    defColumns: Map<string, string | null>,
    defSort: OrderIdx | OrderIdx[] | undefined,
}>(function PlaceholderTabs({ defType, defSelection, defColumns, defSort }, ref) {
    const { showDialog } = useDialog();
    const [type, setType] = useDeepState(defType);
    const [selection, setSelection] = useDeepState(defSelection);
    const [columns, setColumns] = useState(defColumns);
    const [sort, setSort] = useDeepState(defSort);

    // Expose internal state through the ref
    useImperativeHandle(ref, () => ({
        getType: () => type,
        getSelection: () => selection,
        getColumns: () => columns,
        getSort: () => sort,
    }), [type, selection, columns, sort]);

    // Memoized values
    const phTypes = useMemo(() => CM.getPlaceholderTypes(false), []);

    // Update query parameters based on current state
    const setQueryParam = useCallback(() => {
        const params = getQueryString({
            type: type,
            selAndModifiers: selection,
            columns: columns,
            sort: sort
        });
        const currentHash = window.location.hash;
        const [basePath] = currentHash.split('?');
        const newHash = `${basePath}?${params}`;
        window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
    }, [type, selection, columns, sort]);

    // Effect to update query params when state changes
    useEffect(() => {
        setQueryParam();
    }, [type, selection, columns, sort, setQueryParam]);

    // Handle tab selection change
    const setSelectedTab = useCallback((valueStr: string) => {
        const value = valueStr as keyof typeof COMMANDS.placeholders;
        setType(value);
        const selOptions = DEFAULT_TABS[value]?.selections;
        const colOptions = DEFAULT_TABS[value]?.columns;
        if (selOptions && Object.keys(selOptions).length > 0) {
            setSelection({ "": selOptions[Object.keys(selOptions)[0]] });
        }
        if (colOptions && Object.keys(colOptions).length > 0) {
            const colOption = colOptions[Object.keys(colOptions)[0]];
            setColumns(new Map((colOption.value).map(col => {
                if (Array.isArray(col)) {
                    return [col[0], col[1]];
                } else {
                    return [col, null];
                }
            })));
            setSort(f => deepEqual(f, colOption.sort) ? f : colOption.sort);
        }
    }, [setType, setSelection, setColumns, setSort]);

    const createTabsTrigger = useCallback((index: number) => {
        return <TabsTrigger key={phTypes[index]} value={phTypes[index]} className='w-auto px-3'>
            {toPlaceholderName(phTypes[index])}
        </TabsTrigger>
    }, [phTypes]);

    const tabList = useMemo(() => {
        return (
            <TabsList className="min-w-full rounded-lg border border-border bg-card" style={{ overflow: 'hidden' }}>
                <Virtuoso
                    totalCount={phTypes.length}
                    style={{ height: '36px', width: '100%' }}
                    horizontalDirection
                    itemContent={createTabsTrigger}
                />
            </TabsList>
        );
    }, [phTypes, createTabsTrigger]);

    const tabs = useMemo(() => {
        return (
            <Tabs defaultValue={defType} className="w-full" onValueChange={setSelectedTab}>
                <div className="w-full overflow-x-auto">
                    {tabList}
                </div>
            </Tabs>
        );
    }, [setSelectedTab, tabList, defType]);

    const selectionSection = useMemo(() => {
        return <SelectionSection
            type={type}
            selection={selection}
            setSelection={setSelection}
            selectedTab={type}
        />;
    }, [type, selection, setSelection]);

    const columnsSection = useMemo(() => {
        return <ColumnsSection
            type={type}
            columns={columns}
            setColumns={setColumns}
            sort={sort}
            setSort={setSort}
            showDialog={showDialog}
        />;
    }, [type, columns, setColumns, sort, setSort, showDialog]);

    return (
        <>
            {tabs}
            {selectionSection}
            {columnsSection}
        </>
    );
});

export function ColumnsSection({
    type,
    columns,
    setColumns,
    sort,
    setSort,
    showDialog
}: {
    type: keyof typeof COMMANDS.placeholders,
    columns: Map<string, string | null>,
    setColumns: (columns: Map<string, string | null>) => void,
    sort: OrderIdx | OrderIdx[] | undefined,
    setSort: (sort: OrderIdx | OrderIdx[] | undefined) => void,
    showDialog: (title: string, message: string) => void,
}) {
    const [collapseColumns, setCollapseColumns] = useState(false);

    // Data refs that need to persist but don't affect rendering directly
    const [colTemplates, setColTemplates] = useDeepState(Object.keys(DEFAULT_TABS[type]?.columns ?? {}));

    useEffect(() => {
        setColTemplates(Object.keys(DEFAULT_TABS[type]?.columns ?? {}));
    }, [type, setColTemplates]);

    // Refs for DOM elements
    const addButton = useRef<HTMLButtonElement | null>(null);
    const colInputRef = useRef<HTMLInputElement | null>(null);


    // Move a column in the column list
    const moveColumn = useCallback((from: number, to: number) => {
        console.log("Moving column from", from, "to", to);
        const columnsArray = Array.from(columns);

        // Check if the move is within bounds
        if (to < 0 || to >= columnsArray.length) {
            return;
        }

        // Move the column
        const [movedColumn] = columnsArray.splice(from, 1);
        columnsArray.splice(to, 0, movedColumn);
        const newColumns = new Map(columnsArray);

        // Update sort indices
        let newSort;
        if (Array.isArray(sort)) {
            newSort = sort.map(sortItem => {
                if (sortItem.idx === from) {
                    return { ...sortItem, idx: to };
                } else if (sortItem.idx === to) {
                    return { ...sortItem, idx: from };
                } else if (sortItem.idx > from && sortItem.idx <= to) {
                    return { ...sortItem, idx: sortItem.idx - 1 };
                } else if (sortItem.idx < from && sortItem.idx >= to) {
                    return { ...sortItem, idx: sortItem.idx + 1 };
                }
                return sortItem;
            });
        } else if (sort) {
            const singleSort = { ...sort };
            if (singleSort.idx === from) {
                singleSort.idx = to;
            } else if (singleSort.idx === to) {
                singleSort.idx = from;
            } else if (singleSort.idx > from && singleSort.idx <= to) {
                singleSort.idx = singleSort.idx - 1;
            } else if (singleSort.idx < from && singleSort.idx >= to) {
                singleSort.idx = singleSort.idx + 1;
            }
            newSort = singleSort;
        } else {
            newSort = undefined;
        }

        setColumns(newColumns);
        setSort(newSort);
    }, [columns, sort, setColumns, setSort]);

    // Handle paste events in the column input
    const handlePaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        const text = event.clipboardData.getData('text');
        const sanitizedText = text.replace(/\r?\n|\r/g, '\t');
        if (colInputRef.current) {
            const { selectionStart, selectionEnd, value } = colInputRef.current;
            const newValue = value.slice(0, selectionStart!) + sanitizedText + value.slice(selectionEnd!);
            colInputRef.current.value = newValue;
        }
    }, []);

    // Handle keyboard input for column alias editing
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key.length === 1 || event.key === "Backspace") {
            const element = document.activeElement as HTMLElement;
            const id = element.id.startsWith("btn-") ? element.id.split("-")[1] : "";
            if (!id) return;

            const span = element.querySelector("span") as HTMLElement;
            const key = event.key;
            const currentValue = columns.get(id) || "";

            const newColumns = new Map(columns);

            if (key === "Backspace") {
                const newValue = currentValue.slice(0, -1);
                newColumns.set(id, newValue || null);
                span.firstChild!.textContent = newValue.trim() ? `\u00A0as ${newValue}` : "​";
            } else {
                if (event.key === " ") {
                    event.preventDefault();
                }
                const newValue = currentValue.trim() + key;
                newColumns.set(id, newValue);
                span.firstChild!.textContent = `\u00A0as ${newValue}`;
            }

            setColumns(newColumns);
        }
    }, [columns, setColumns]);

    // Add keyboard event listeners
    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown]);

    // Handle adding a new column
    const handleAddColumn = useCallback(() => {
        const elem = colInputRef.current;
        if (!elem) return;

        const value = elem.value;
        if (value === "") {
            showDialog("Column name cannot be empty", "Please enter a column name before adding");
            return;
        }

        // Split by tab for multiple columns
        const values = value.split("\t");
        const errors = [];
        const newColumns = new Map(columns);

        for (const val of values) {
            if (val === "") continue;
            const aliasSplit = val.split(";");
            if (!aliasSplit[0]) continue;

            let columnKey = aliasSplit[0];
            if (!columnKey.includes("{") && !columnKey.includes("}")) {
                columnKey = "{" + columnKey + "}";
            }

            if (newColumns.has(columnKey) && newColumns.get(columnKey) === (aliasSplit[1] ?? null)) {
                errors.push("Column `" + val + "` is already added");
                continue;
            }

            newColumns.set(columnKey, aliasSplit[1] || null);
        }

        elem.value = "";
        if (errors.length > 0) {
            showDialog("Errors adding columns", errors.join("\n"));
        }

        setColumns(newColumns);
    }, [columns, showDialog, setColumns]);

    // Handle template selection
    const selectColumnTemplate = useCallback((templateName: string) => {
        const colInfo = DEFAULT_TABS[type]?.columns[templateName];
        const newColumns = new Map((colInfo?.value || ["{id}"]).map(col => {
            if (Array.isArray(col)) {
                return [col[0], col[1]];
            } else {
                return [col, null];
            }
        }));
        const newSort = colInfo?.sort || { idx: 0, dir: 'asc' };

        setColumns(newColumns);
        setSort(newSort);
    }, [type, setColumns, setSort]);

    // Handle column removal
    const removeColumn = useCallback((colInfo: [string, string | null], index: number) => {
        const newColumns = new Map(columns);
        newColumns.delete(colInfo[0]);

        let newSort = sort;
        if (Array.isArray(sort)) {
            newSort = sort
                .filter(sortItem => sortItem.idx !== index)
                .map(sortItem => ({
                    ...sortItem,
                    idx: sortItem.idx > index ? sortItem.idx - 1 : sortItem.idx
                }));
        } else if (sort) {
            const singleSort = { ...sort };
            if (singleSort.idx === index) {
                singleSort.idx = 0;
            } else if (singleSort.idx > index) {
                singleSort.idx = singleSort.idx - 1;
            }
            newSort = singleSort;
        } else {
            newSort = undefined;
        }

        setColumns(newColumns);
        setSort(newSort);
    }, [columns, sort, setColumns, setSort]);

    // Handle column sorting
    const handleColumnSort = useCallback((index: number, shiftKey: boolean) => {
        let newSort: OrderIdx | OrderIdx[] | undefined = undefined;
        if (Array.isArray(sort)) {
            const sortIndex = sort.findIndex(sortItem => sortItem.idx === index);
            if (sortIndex !== -1) {
                const sortArray = [...sort];
                if (sortArray[sortIndex].dir === 'asc') {
                    sortArray[sortIndex].dir = 'desc';
                } else {
                    sortArray.splice(sortIndex, 1);
                }
                newSort = sortArray;
            } else {
                if (shiftKey && sort.length > 0) {
                    newSort = [...sort, { idx: index, dir: 'asc' }];
                } else {
                    newSort = { idx: index, dir: 'asc' };
                }
            }
        } else if (sort) {
            if (sort.idx !== index) {
                if (shiftKey && sort.idx !== 0) {
                    newSort = [{ idx: sort.idx, dir: sort.dir }, { idx: index, dir: 'asc' }];
                } else {
                    newSort = { idx: index, dir: 'asc' };
                }
            } else if (sort.dir === 'asc') {
                newSort = { idx: index, dir: 'desc' };
            } else {
                newSort = undefined;
            }
        } else {
            newSort = { idx: index, dir: 'asc' };
        }

        setSort(newSort);
    }, [sort, setSort]);

    // Handle clearing all columns
    const clearAllColumns = useCallback(() => {
        setColumns(new Map());
        setSort({ idx: 0, dir: 'asc' });
    }, [setColumns, setSort]);

    // Handle adding a column from the simple list
    const addSimpleColumn = useCallback((option: [string, string]) => {
        const columnKey = "{" + option[0] + "}";
        const newColumns = new Map(columns);
        newColumns.set(columnKey, null);
        setColumns(newColumns);
    }, [columns, setColumns]);

    const toggleColumns = useCallback(() => {
        setCollapseColumns(f => !f);
    }, [setCollapseColumns])

    const addButtonFunc = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const column = e.currentTarget.dataset.key;
        if (!column) return;
        selectColumnTemplate(column);
    }, [selectColumnTemplate]);

    return (
        <div className="themeDiv mt-2 overflow-hidden">
            <Button
                variant="ghost"
                size="md"
                className="h-9 text-sm font-semibold w-full border-b border-border px-2 bg-muted/40 rounded-none justify-start"
                onClick={toggleColumns}
            >
                Columns {collapseColumns ? <LazyIcon name="ChevronDown" /> : <LazyIcon name="ChevronUp" />}
            </Button>
            <div className={`transition-all duration-200 ease-in-out ${collapseColumns ? 'max-h-0 opacity-0 overflow-hidden' : 'p-2 opacity-100 space-y-2'}`}>
                <h2 className="text-lg mb-1">Templates</h2>
                {colTemplates.map((column) => (
                    <Button
                        key={column}
                        variant="outline"
                        size="sm"
                        className="me-1"
                        data-key={column}
                        onClick={addButtonFunc}
                    >
                        {column}
                    </Button>
                ))}

                <ColumnList
                    columns={columns}
                    sort={sort}
                    moveColumn={moveColumn}
                    removeColumn={removeColumn}
                    handleColumnSort={handleColumnSort}
                    clearAllColumns={clearAllColumns}
                />

                <AddCustomColumn
                    colInputRef={colInputRef}
                    addButton={addButton}
                    handlePaste={handlePaste}
                    handleAddColumn={handleAddColumn}
                    type={type}
                />

                <SimpleColumnOptions
                    type={type}
                    columns={columns}
                    addSimpleColumn={addSimpleColumn}
                />
            </div>
        </div>
    );
}

function ColumnList({
    columns,
    sort,
    moveColumn,
    removeColumn,
    handleColumnSort,
    clearAllColumns
}: {
    columns: Map<string, string | null>,
    sort: OrderIdx | OrderIdx[] | undefined,
    moveColumn: (from: number, to: number) => void,
    removeColumn: (colInfo: [string, string | null], index: number) => void,
    handleColumnSort: (index: number, shiftKey: boolean) => void,
    clearAllColumns: () => void
}) {

    const columnContext = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.focus();
    }, []);

    const toggleSort = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (e.button === 1) {
            const index = parseInt(e.currentTarget.dataset.key || "0", 10);
            e.preventDefault();
            handleColumnSort(index, e.shiftKey);
            return false;
        }
    }, [handleColumnSort]);

    const copyText = useCallback(() => {
        return Array.from(columns).map(([key, value]) =>
            value ? `${key};${value}` : key).join("\n");
    }, [columns]);

    const moveFunc = useCallback((e: React.MouseEvent<SVGElement, MouseEvent>) => {
        console.log("Moving column", e.currentTarget.dataset.from, "to", e.currentTarget.dataset.to);
        const from = parseInt(e.currentTarget.dataset.from ?? "0", 10);
        const to = parseInt(e.currentTarget.dataset.to ?? "0", 10);
        e.preventDefault();
        if (from !== to) {
            moveColumn(from, to);
        }
    }, [moveColumn]);

    const removeFunc = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const index = parseInt(e.currentTarget.dataset.key ?? "0", 10);
        const column = e.currentTarget.dataset.column!;
        const colInfo = [column, columns.get(column) ?? null] as [string, string | null];
        e.preventDefault();
        removeColumn(colInfo, index);
    }, [columns, removeColumn]);

    return (
        <>
            <h2 className="text-lg mt-1 pb-0 mb-0">Current Columns</h2>
            <span className="text-sm opacity-50 p-0 m-0">
                left-click to remove | middle-click to sort | shift+middle to sort by multiple |
                right click and type/backspace to edit alias | clipboard button to copy
            </span><br />

            <div className="inline-flex flex-wrap items-center gap-1">
                {Array.from(columns).map((colInfo, index) => (
                    <span key={`spw-${index}`} className="inline-flex items-center bg-background rounded me-1 mb-1">
                        <LazyIcon name="ChevronLeft"
                            className="cursor-pointer w-4 h-6 rounded-s hover:bg-accent"
                            data-from={index}
                            data-to={index - 1}
                            onClick={moveFunc}
                        />
                        <Button
                            key={colInfo[0]}
                            data-key={index}
                            id={"btn-" + colInfo[0]}
                            variant="outline"
                            size="sm"
                            className="rounded-none border-r-input/50 border-l-input/50 inline-block"
                            onContextMenu={columnContext}

                            data-column={colInfo[0]}
                            data-index={index}
                            onClick={removeFunc}
                            onMouseDown={toggleSort}
                        >
                            {colInfo[0]}
                            <span key={`colspan-${index}`} className="text-xs opacity-50">
                                {colInfo[1] && colInfo[1] !== colInfo[0] ? `\u00A0as ${colInfo[1]}` : "​"}
                            </span>
                            {sort && (Array.isArray(sort) ? (
                                sort.map((sortItem, sortIndex) => (
                                    sortItem.idx === index && (
                                        <span key={`sort-${index}-${sortIndex}`} className="bg-red-400 dark:bg-red-900 text-xs ml-1">
                                            {sortItem.dir} ({sortIndex + 1})
                                        </span>
                                    )
                                ))
                            ) : (
                                sort.idx === index && (
                                    <span key={`sort-${index}`} className="bg-red-400 dark:bg-red-900 text-xs ml-1">
                                        {sort.dir}
                                    </span>
                                )
                            ))}
                        </Button>
                        <LazyIcon name="ChevronRight"
                            className="cursor-pointer inline-block w-4 rounded-e hover:bg-accent align-middle"
                            data-from={index}
                            data-to={index + 1}
                            onClick={moveFunc}
                        />
                    </span>
                ))}

                <TooltipProvider>
                    <BlockCopyButton
                        getText={copyText}
                        className="rounded [&_svg]:size-3.5 me-1"
                        size="sm"
                    />
                </TooltipProvider>

                <Button
                    variant="destructive"
                    size="sm"
                    className="rounded"
                    onClick={clearAllColumns}
                >
                    X
                </Button>
            </div>
        </>
    );
}

function AddCustomColumn({ colInputRef, addButton, handleAddColumn, handlePaste, type }: {
    colInputRef: React.RefObject<HTMLInputElement | null>,
    addButton: React.RefObject<HTMLButtonElement | null>,
    handleAddColumn: () => void,
    handlePaste: (event: React.ClipboardEvent<HTMLInputElement>) => void,
    type: keyof typeof COMMANDS.placeholders
}) {
    const [inputValue, setInputValue] = useState("");
    // Cache the latest input value to use in our onKeyDown handler without making it a dependency
    const inputValueRef = useRef(inputValue);
    useEffect(() => {
        inputValueRef.current = inputValue;
    }, [inputValue]);

    // onKeyDown uses the ref so it does not have to update whenever inputValue changes.
    const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (inputValueRef.current) {
                handleAddColumn();
                setInputValue("");
            }
        } else if (event.key === "Tab") {
            event.preventDefault();
            const input = colInputRef.current;
            if (input) {
                const start = input.selectionStart;
                const end = input.selectionEnd;
                if (start !== null && end !== null) {
                    // Use the ref value so onKeyDown does not depend on inputValue
                    const currentValue = inputValueRef.current;
                    const newValue = currentValue.slice(0, start) + "\t" + currentValue.slice(end);
                    setInputValue(newValue);
                    // Set the cursor position after state update on a new tick
                    setTimeout(() => {
                        input.setSelectionRange(start + 1, start + 1);
                    }, 0);
                }
            }
        }
    }, [colInputRef, handleAddColumn]);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    }, []);

    // Memoize static header content.
    const headerContent = useMemo(() => (
        <>
            <h2 className="text-lg mt-1 mb-0 p-0">Add Custom</h2>
            <span className="text-sm opacity-50">
                type or paste in the placeholder, then press Enter | Use tab for multiple |
                Use semicolon ;BLAH for column alias
            </span>
        </>
    ), []);

    // Memoize the input area so it only recomputes when its dependencies change.
    // Separate memoization of the input field.
    const inputField = useMemo(() => (
        <Input
            type="text"
            className="relative px-1 grow"
            placeholder="Custom column placeholders..."
            ref={colInputRef}
            onPaste={handlePaste}
            onKeyDown={onKeyDown}
            onChange={onChange}
            value={inputValue}
        />
    ), [inputValue, colInputRef, handlePaste, onKeyDown, onChange]);

    // In AddCustomColumn component, add:
    const handleAddClick = useCallback(() => {
        if (inputValue) {
            handleAddColumn();
            setInputValue("");
        }
    }, [inputValue, handleAddColumn]);
    // Replace inline onClick in addButtonComponent:
    const addButtonComponent = useMemo(() => (
        <Button
            variant="outline"
            ref={addButton}
            size="sm"
            className="bg-destructive ml-2"
            onClick={handleAddClick}
        >
            Add
        </Button>
    ), [addButton, handleAddClick]);

    // Combine the two memoized components.
    const inputArea = useMemo(() => (
        <div className="flex w-full">
            {inputField}
            {addButtonComponent}
        </div>
    ), [inputField, addButtonComponent]);

    // Memoize the footer link.
    const footerLink = useMemo(() => (
        <a
            href={`https://github.com/xdnw/locutus/wiki/${type}_placeholders`}
            className="text-xs text-blue-800 dark:text-blue-400 underline hover:no-underline active:underline"
            target="_blank"
            rel="noreferrer"
        >
            View All {type} Placeholders
        </a>
    ), [type]);

    return (
        <>
            {headerContent}
            {inputArea}
            {footerLink}
        </>
    );
}

// Create a memoized button component to prevent unnecessary re-renders
const OptionButton = React.memo(({ option, isHidden, onClick }: {
    option: [string, string],
    isHidden: boolean,
    onClick: (option: [string, string]) => void
}) => {
    if (isHidden) return null;

    const handleClick = useCallback(() => {
        onClick(option);
    }, [option, onClick]);

    return (
        <Button
            variant="outline"
            size="sm"
            className="me-1 mb-1"
            onClick={handleClick}
        >
            {option[0]}:&nbsp;<span className="text-xs opacity-50">{option[1]}</span>
        </Button>
    );
});

function SimpleColumnOptions({
    type,
    columns,
    addSimpleColumn
}: {
    type: keyof typeof COMMANDS.placeholders,
    columns: Map<string, string | null>,
    addSimpleColumn: (option: [string, string]) => void
}) {
    const [collapseColOptions, setCollapseColOptions] = useState(true);
    const filterRef = useRef<HTMLInputElement>(null);
    const [filter, setFilter] = useState("");
    const [debouncedFilter] = useDebounce(filter, 150);
    const containerRef = useRef<HTMLDivElement>(null);

    // Only load options data when section is expanded
    const colOptionsData = useMemo(
        () => collapseColOptions ? [] : getColOptions(type),
        [type, collapseColOptions]
    );

    // Apply filtering with debounced value
    const filteredOptions = useMemo(() =>
        colOptionsData.filter(([key, value]) =>
            !debouncedFilter ||
            key.toLowerCase().includes(debouncedFilter.toLowerCase()) ||
            value.toLowerCase().includes(debouncedFilter.toLowerCase())
        ),
        [colOptionsData, debouncedFilter]
    );

    // Group options into rows of approximately 100px each for virtualization
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (!collapseColOptions && containerRef.current) {
            const resizeObserver = new ResizeObserver(entries => {
                const { width } = entries[0].contentRect;
                setContainerWidth(width);
            });

            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }
    }, [collapseColOptions]);

    // Memoized handler for adding columns
    const handleAddSimpleColumn = useCallback(
        (option: [string, string]) => addSimpleColumn(option),
        [addSimpleColumn]
    );

    // Group options into chunks for better virtualization
    const CHUNK_SIZE = 15; // Adjust based on average number of buttons per row
    const chunkedOptions = useMemo(() => {
        const chunks = [];
        for (let i = 0; i < filteredOptions.length; i += CHUNK_SIZE) {
            chunks.push(filteredOptions.slice(i, i + CHUNK_SIZE));
        }
        return chunks;
    }, [filteredOptions]);

    const updateFilter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value.toLowerCase());
    }, [])

    const toggleCollapse = useCallback(() => {
        setCollapseColOptions(f => !f);
    }, [setCollapseColOptions]);

    const addSimpleContent = useCallback((index: number) => {
        const chunk = chunkedOptions[index];
        return (
            <div className="flex flex-wrap">
                {chunk.map((option, i) => {
                    const isHidden = columns.has("{" + option[0] + "}");
                    if (isHidden) return null;

                    // Create a key for this option
                    const optionKey = `${index}-${i}`;

                    return (
                        <OptionButton
                            key={optionKey}
                            option={option}
                            isHidden={false}
                            onClick={handleAddSimpleColumn}
                        />
                    );
                })}
            </div>
        );
    }, [chunkedOptions, columns, handleAddSimpleColumn]);

    return (
        <div className="mt-2 rounded-md border border-border bg-card/60">
            <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm font-semibold w-full border-b border-border px-2 bg-muted/40 rounded-none justify-start"
                onClick={toggleCollapse}
            >
                Add Simple {collapseColOptions ? <LazyIcon name="ChevronDown" /> : <LazyIcon name="ChevronUp" />}
            </Button>

            <div className={`transition-all duration-200 ease-in-out ${collapseColOptions ? 'max-h-0 opacity-0 overflow-hidden' : 'p-2 opacity-100'}`}>
                <Input
                    ref={filterRef}
                    type="text"
                    className="w-full mb-2"
                    placeholder="Filter options"
                    value={filter}
                    onChange={updateFilter}
                />

                <div ref={containerRef} className="w-full">
                    {!collapseColOptions && chunkedOptions.length > 0 && (
                        <Virtuoso
                            style={{ height: Math.min(400, chunkedOptions.length * 40) }}
                            totalCount={chunkedOptions.length}
                            itemContent={addSimpleContent}
                        />
                    )}

                    {!collapseColOptions && filteredOptions.length === 0 && (
                        <div className="py-2 text-center text-muted-foreground">
                            No matching options found
                        </div>
                    )}
                </div>

                {filteredOptions.length > 100 && (
                    <div className="text-center text-xs text-muted-foreground">
                        Showing all {filteredOptions.length} options
                    </div>
                )}
            </div>
        </div>
    );
}

export function SelectionSection({
    type,
    selection,
    setSelection,
    selectedTab
}: {
    type: keyof typeof COMMANDS.placeholders,
    selection: { [key: string]: string },
    setSelection: (selection: { [key: string]: string }) => void,
    selectedTab: keyof typeof COMMANDS.placeholders,
}) {
    const [collapsed, setCollapsed] = useState(false);
    const [selInputValue, setSelInputValue] = useState(selection[""]);
    const selTemplates = useMemo(() => Object.keys(DEFAULT_TABS[type]?.selections ?? {}), [type]);

    // Update local input value when selection changes from parent
    useEffect(() => {
        setSelInputValue(f => f !== selection[""] ? selection[""] : f);
    }, [selection, setSelInputValue]);

    // Create a debounced version of the selection update
    const debouncedSetSelection = useDebouncedCallback(
        (newValue: string) => {
            setSelection({ ...selection, "": newValue });
        },
        150 // 150ms debounce
    );

    // Update the handler to call both functions
    const handleSelectionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSelInputValue(newValue); // Update local state immediately for responsive UI
        debouncedSetSelection(newValue); // Debounce the parent update
    }, [debouncedSetSelection]);

    const toggleCollapse = useCallback(() => {
        setCollapsed(f => !f);
    }, [setCollapsed]);


    // Memoized component parts
    const headerButton = useMemo(() => (
        <Button
            variant="ghost"
            size="md"
            className="h-9 text-sm font-semibold w-full border-b border-border px-2 bg-muted/40 rounded-none justify-start"
            onClick={toggleCollapse}
        >
            Selection {collapsed ? <LazyIcon name="ChevronDown" /> : <LazyIcon name="ChevronUp" />}
        </Button>
    ), [collapsed, toggleCollapse]);

    const selectTemplate = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const templateName = e.currentTarget.dataset.key;
        if (!templateName) return;
        const templateValue = DEFAULT_TABS[type]?.selections[templateName] || "*";
        setSelInputValue(templateValue);
        setSelection({ ...selection, "": templateValue });
    }, [type, selection, setSelection]);

    const templatesSection = useMemo(() => (
        <>
            <h2 className="text-lg mb-1">Templates</h2>
            {selTemplates.map((selectionTemplate) => (
                <Button
                    key={selectionTemplate}
                    variant="outline"
                    size="sm"
                    className="me-1"
                    data-key={selectionTemplate}
                    onClick={selectTemplate}
                >
                    {selectionTemplate}
                </Button>
            ))}
        </>
    ), [selTemplates, selectTemplate]);

    const getSelectionText = useCallback(() => selInputValue, [selInputValue]);

    const inputSection = useMemo(() => (
        <>
            <h2 className="text-lg my-1">Current Selection</h2>
            <div className="flex items-center">
                <Input
                    className="relative px-1 w-full"
                    type="text"
                    value={selInputValue}
                    onChange={handleSelectionChange}
                />
                <TooltipProvider>
                    <BlockCopyButton
                        getText={getSelectionText}
                        className="rounded-[6px] [&_svg]:size-3.5 ml-1"
                        size="sm"
                    />
                </TooltipProvider>
            </div>
        </>
    ), [selInputValue, handleSelectionChange, getSelectionText]);

    const modifierComponent = useMemo(() => (
        CM.placeholders(type).getCreate() && (
            <ModifierComponent
                modifier={CM.placeholders(type).getCreate()!}
                selection={selection}
                setSelection={setSelection}
            />
        )
    ), [type, selection, setSelection]);

    const footerLink = useMemo(() => (
        <a
            href={`https://github.com/xdnw/locutus/wiki/${toPlaceholderName(type)}_placeholders`}
            className="text-xs text-blue-800 dark:text-blue-400 underline hover:no-underline active:underline"
            target="_blank"
            rel="noreferrer"
        >
            View All {toPlaceholderName(type)} Filters
        </a>
    ), [type]);

    // Main container - only re-renders when collapsed state changes
    const contentContainerClass = useMemo(() =>
        `transition-all duration-200 ease-in-out ${collapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'p-2 opacity-100 space-y-2'}`,
        [collapsed]);

    return (
        <div className="themeDiv mt-2 overflow-hidden">
            {headerButton}
            <div className={contentContainerClass}>
                {templatesSection}
                {inputSection}
                {modifierComponent}
                {footerLink}
            </div>
        </div>
    );
}

export function ModifierComponent({
    modifier,
    selection,
    setSelection
}: {
    modifier: BaseCommand,
    selection: { [key: string]: string },
    setSelection: (selection: { [key: string]: string }) => void,
}) {
    const setOuput = useCallback((key: string, value: string) => {
        if (!value) {
            if (selection[key] === undefined) return;
            const copy = { ...selection };
            delete copy[key];
            setSelection(copy);
        } else {
            if (selection[key] === value) return;
            setSelection(({
                ...selection,
                [key]: value
            }));
        }
    }, [selection, setSelection]);

    const alwaysTrue = useCallback(() => true, []);

    return (
        <CommandComponent
            overrideName={"Modifier"}
            command={modifier}
            filterArguments={alwaysTrue}
            initialValues={selection}
            setOutput={setOuput}
        />
    );
}
import React, { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TABLE } from "../../lib/endpoints";
import { Button } from "../../components/ui/button";
import { CopyToClipboardTextArea } from "../../components/ui/copytoclipboard";
import { WebTable, WebTableError } from "../../lib/apitypes";
import { useDialog } from "../../components/layout/DialogContext";
import { Link } from "react-router-dom";
import {
    createTableInfo,
    getConfigColumnId,
    getQueryString,
    formatColName,
    normalizePlaceholderColumnExpression,
    remapSortByColumnIds,
    toPlaceholderColumnId,
    toSelAndModifierString,
    type PlaceholderType,
} from "./table_util";
import { useQueryClient, useSuspenseQuery, UseSuspenseQueryOptions } from "@tanstack/react-query";
import { singleQueryOptions, suspenseQueryOptions } from "@/lib/queries";
import { ClientColumnOverlay, ConfigColumns, DataTable, ObjectColumnRender, OrderIdx, TableRowSelection } from "./DataTable";
import { DataGridHandle } from "react-data-grid";
import { JSONValue } from "@/lib/internaltypes";
import { GoogleSheets } from "./TableWithExports";
import { TableToolbar, type TableColumnCustomization, type TableColumnCustomizationItem } from "./TableToolbar";
import { useDeepState } from "@/utils/StateUtil";
import { QueryResult } from "@/lib/BulkQuery";
import Loading from "@/components/ui/loading";
import { renderEndpointFallback } from "@/components/api/bulkwrapper";
import { ErrorBoundary } from "react-error-boundary";

export type TableInfo = {
    data: JSONValue[][],
    visibleColumns: number[],
    searchSet: Set<number>,
    columnsInfo: ConfigColumns[],
    errors: WebTableError[],
    sort: OrderIdx | OrderIdx[] | undefined,
}

export type TableProps = {
    type: string,
    selection: { [key: string]: string },
    columns: Map<string, string | null>,
    sort: OrderIdx | OrderIdx[] | undefined,
    clientColumns?: ClientColumnOverlay[],
    columnRenderers?: Record<string, string | ObjectColumnRender>,
    transformTableInfo?: (info: TableInfo) => TableInfo,
    rowClassName?: (row: JSONValue[], rowIdx: number) => string | undefined,
    indexCellRenderer?: (context: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => ReactNode,
    indexColumnWidth?: number,
    onRowsRendered?: (rows: JSONValue[][]) => void,
    onColumnsLoaded?: (columns: ConfigColumns[]) => void,
    rowSelection?: TableRowSelection,
}

export function AbstractTableWithButtons({ getTableProps, load }: {
    getTableProps: () => TableProps,
    load: boolean
}) {
    const table = useRef<DataGridHandle>(null);
    const { showDialog } = useDialog();

    const initialTablePropsRef = useRef<TableProps | null>(null);
    if (initialTablePropsRef.current === null) {
        initialTablePropsRef.current = getTableProps();
    }
    const initialTableProps = initialTablePropsRef.current;

    const [type, setType] = useDeepState<string | null>(initialTableProps.type);
    const [selection, setSelection] = useDeepState<{ [key: string]: string }>(initialTableProps.selection);
    const [columns, setColumns] = useDeepState<Map<string, string | null>>(initialTableProps.columns);
    const [sortState, setSortState] = useDeepState<OrderIdx | OrderIdx[] | undefined>(initialTableProps.sort);
    const [clientColumns, setClientColumns] = useState<ClientColumnOverlay[]>(initialTableProps.clientColumns ?? []);
    const [columnRenderers, setColumnRenderers] = useState<TableProps['columnRenderers']>(() => initialTableProps.columnRenderers);
    const [transformTableInfo, setTransformTableInfo] = useState<TableProps['transformTableInfo']>(() => initialTableProps.transformTableInfo);
    const [rowClassName, setRowClassName] = useState<TableProps['rowClassName']>(() => initialTableProps.rowClassName);
    const [indexCellRenderer, setIndexCellRenderer] = useState<TableProps['indexCellRenderer']>(() => initialTableProps.indexCellRenderer);
    const [indexColumnWidth, setIndexColumnWidth] = useState<TableProps['indexColumnWidth']>(() => initialTableProps.indexColumnWidth);
    const [onRowsRendered, setOnRowsRendered] = useState<TableProps['onRowsRendered']>(() => initialTableProps.onRowsRendered);
    const [onColumnsLoaded, setOnColumnsLoaded] = useState<TableProps['onColumnsLoaded']>(() => initialTableProps.onColumnsLoaded);
    const [rowSelection, setRowSelection] = useState<TableProps['rowSelection']>(() => initialTableProps.rowSelection);
    const [columnOrder, setColumnOrder] = useState<string[] | undefined>(undefined);
    const committedColumnsReorderRef = useRef<((nextColumns: ConfigColumns[]) => void) | null>(null);
    const loadSourceSignatureRef = useRef<string | null>(null);

    const getLoadSourceSignature = useCallback((props: TableProps) => JSON.stringify({
        type: props.type,
        selection: toSelAndModifierString(props.selection),
        columns: Array.from(props.columns.entries()),
        sort: props.sort,
    }), []);

    if (loadSourceSignatureRef.current === null) {
        loadSourceSignatureRef.current = getLoadSourceSignature(initialTableProps);
    }

    const applyDynamicTableProps = useCallback((props: TableProps) => {
        setClientColumns(props.clientColumns ?? []);
        setColumnRenderers(props.columnRenderers);
        setTransformTableInfo(() => props.transformTableInfo);
        setRowClassName(() => props.rowClassName);
        setIndexCellRenderer(() => props.indexCellRenderer);
        setIndexColumnWidth(props.indexColumnWidth);
        setOnRowsRendered(() => props.onRowsRendered);
        setOnColumnsLoaded(() => props.onColumnsLoaded);
        setRowSelection(() => props.rowSelection);
    }, []);

    const applyTableProps = useCallback((props: TableProps) => {
        setType(props.type);
        setSelection(props.selection);
        setColumns(props.columns);
        setSortState(props.sort);
        applyDynamicTableProps(props);
    }, [applyDynamicTableProps, setType, setSelection, setColumns, setSortState]);

    const captureLiveTableProps = useCallback(() => {
        const props = getTableProps();
        applyTableProps(props);
        return props;
    }, [applyTableProps, getTableProps]);

    useEffect(() => {
        if (!load) return;
        const props = getTableProps();
        applyDynamicTableProps(props);

        const nextSourceSignature = getLoadSourceSignature(props);
        if (nextSourceSignature === loadSourceSignatureRef.current) {
            return;
        }

        loadSourceSignatureRef.current = nextSourceSignature;
        setType(props.type);
        setSelection(props.selection);
        setColumns(props.columns);
        setSortState(props.sort);
        setColumnOrder(undefined);
    }, [
        applyDynamicTableProps,
        getLoadSourceSignature,
        load,
        getTableProps,
        setColumns,
        setSelection,
        setSortState,
        setType,
    ]);
    const highlightRowOrColumn = useCallback((col?: number, row?: number) => {
        const tableElem = table.current?.element;
        // remove all bg-red-500 from table th and td
        const elemsWithRed = tableElem?.querySelectorAll('.bg-red-500') || [];
        for (const elem of elemsWithRed) {
            elem.classList.remove('bg-red-500');
        }
        console.log("Highlighting row", row, "and column", col);
        // if (row !== undefined && row !== null) {
        //     const rawRowAtIndexRow = api.rows().data()[row];
        //     const displayedRowIndex = api.rows((idx, data, node) => {
        //         return data === rawRowAtIndexRow;
        //     }).indexes()[0];

        //     if (displayedRowIndex !== undefined) {
        //         // Navigate to the page containing the row
        //         const page = Math.floor(displayedRowIndex / api.page.len());
        //         // if not current page
        //         if (api.page() !== page) {
        //             api.page(page).draw(false);
        //         }

        //         const rowInCurrentPage = displayedRowIndex % api.page.len();
        //         const rowElem = tableElem.querySelector(`tbody tr:nth-child(${rowInCurrentPage + 1})`);
        //         if (rowElem) {
        //             if (col !== undefined && col !== null) {
        //                 const td = rowElem.querySelector(`td:nth-child(${col + 2})`);
        //                 if (td) {
        //                     td.classList.add('bg-red-500');
        //                 }
        //             } else {
        //                 const tds = rowElem.querySelectorAll('td');
        //                 for (const td of tds) {
        //                     td.classList.add('bg-red-500');
        //                 }
        //             }
        //         }
        //     }
        // } else if (col !== undefined && col !== null) {
        //     const th = tableElem.querySelector(`thead th:nth-child(${col + 2})`);
        //     if (th) {
        //         th.classList.add('bg-red-500');
        //     }
        // }
    }, [table]);

    const copy = useCallback(() => {
        const current = { type, selection, columns, sort: sortState };

        if (!current.type) {
            showDialog("Failed to copy URL", "Table type is missing.", true);
            return;
        }

        console.log("COLS ", current.columns);
        const baseUrlWithoutPath = window.location.protocol + "//" + window.location.host;
        const url = (`${baseUrlWithoutPath}${process.env.BASE_PATH}#/view_table?${encodeURIComponent(getQueryString({
            type: current.type,
            selAndModifiers: current.selection,
            columns: current.columns,
            sort: current.sort
        }))}`);
        navigator.clipboard.writeText(url).then(() => {
            showDialog("URL copied to clipboard", url, true);
        }).catch((err) => {
            showDialog("Failed to copy URL to clipboard", err + "", true);
        });
    }, [type, selection, columns, sortState, showDialog]);

    const exportsComponent = useMemo(() => {
        const currentToolbarTable = { type, selection, columns };

        if (!currentToolbarTable.type || !currentToolbarTable.selection || !currentToolbarTable.columns) return null;
        return (
            <GoogleSheets
                type={currentToolbarTable.type}
                selection={currentToolbarTable.selection}
                columns={currentToolbarTable.columns}
            />
        );
    }, [type, selection, columns]);

    const sourceSelection = useMemo(() => {
        const selectionText = toSelAndModifierString(selection);
        if (!selectionText) {
            return undefined;
        }

        return {
            value: selectionText,
            label: "Copy source selection",
        };
    }, [selection]);

    const shareButton = useMemo(() => {
        return (
            <Button
                variant="outline"
                size="sm"
                className="me-1"
                onClick={copy}>
                Share
            </Button>
        );
    }, [copy]);

    const handleColumnsReorderCommitted = useCallback((_sourceColumnId: string, _targetColumnId: string, nextColumns: ConfigColumns[]) => {
        committedColumnsReorderRef.current?.(nextColumns);
    }, []);

    const highlightError = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const col = parseInt(e.currentTarget.dataset.col ?? "0") - 1;
        const row = parseInt(e.currentTarget.dataset.row ?? "0") - 1;
        highlightRowOrColumn(col, row);
    }, [highlightRowOrColumn]);

    const showErrorsProvided = useCallback((errors: WebTableError[]) => {
        const title = errors.length > 0 ? "Errors updating table" : "No errors";
        const body = errors.length > 0 ? <>
            Errors updating the table may prevent some data from being displayed.
            Click the buttons below to highlight the errors in the table.
            {errors.map((error, index) => (
                <Button key={index} data-col={error.col} data-row={error.row} variant="destructive" className="my-1 h-auto wrap-break-word w-full justify-start size-sm whitespace-normal" onClick={highlightError}>
                    [col:{(error.col ?? 0) + 1}{error.row ? `row:${error.row + 1}` : ""}] {error.msg}
                </Button>
            ))}
        </> : "No errors";
        showDialog(title, body);
    }, [showDialog, highlightError]);

    const renderChildren = useCallback((errorsButton: ReactNode, data: JSONValue[][], tableColumnsInfo: ConfigColumns[], searchSet: Set<number>, visibleColumns: number[], setColumnsInfo: (columnsInfo: ConfigColumns[]) => void, setData: (data: JSONValue[][]) => void, currentRowClassName?: TableProps['rowClassName'], currentIndexCellRenderer?: TableProps['indexCellRenderer'], currentIndexColumnWidth?: TableProps['indexColumnWidth'], currentOnRowsRendered?: TableProps['onRowsRendered'], currentRowSelection?: TableProps['rowSelection']) => {
        const placeholderType = type as PlaceholderType;
        const buildCustomizationItems = (columnsInfo: ConfigColumns[]): TableColumnCustomizationItem[] => columnsInfo
            .map<TableColumnCustomizationItem | null>((column) => {
                const columnId = getConfigColumnId(column);
                if (!columnId) {
                    return null;
                }

                const isPlaceholderColumn = column.source !== "client";
                const rawTitle = isPlaceholderColumn
                    ? (column.key ? (columns.get(column.key) ?? null) : null)
                    : column.title;

                return {
                    id: columnId,
                    source: isPlaceholderColumn ? "placeholder" : "client",
                    title: column.title,
                    rawTitle,
                    value: column.key,
                    valueEditable: isPlaceholderColumn,
                    titleEditable: isPlaceholderColumn,
                    removable: isPlaceholderColumn,
                };
            })
            .filter((column): column is TableColumnCustomizationItem => Boolean(column));

        const currentCustomizationItems = buildCustomizationItems(tableColumnsInfo);
        const commitCustomization = (nextItems: TableColumnCustomizationItem[]) => {
            const previousPlaceholderItems = currentCustomizationItems.filter((item) => item.source === "placeholder");
            const nextPlaceholderItems = nextItems.filter((item) => item.source === "placeholder");
            const nextPlaceholderDrafts = nextPlaceholderItems
                .map((item) => {
                    const normalizedValue = normalizePlaceholderColumnExpression(item.value ?? "");
                    if (!normalizedValue) {
                        return null;
                    }

                    const rawTitle = item.rawTitle?.trim() ?? "";
                    const alias = rawTitle.length > 0 && rawTitle !== formatColName(normalizedValue)
                        ? rawTitle
                        : null;
                    return {
                        itemId: item.id,
                        persistedId: toPlaceholderColumnId(normalizedValue),
                        value: normalizedValue,
                        alias,
                    };
                })
                .filter((entry): entry is { itemId: string; persistedId: string; value: string; alias: string | null } => Boolean(entry));

            const nextColumns = new Map<string, string | null>(nextPlaceholderDrafts.map((entry) => [entry.value, entry.alias]));
            const previousPlaceholderKeys = Array.from(columns.keys());
            const nextPlaceholderKeys = Array.from(nextColumns.keys());
            const placeholderStructureChanged = previousPlaceholderKeys.length !== nextPlaceholderKeys.length
                || previousPlaceholderKeys.some((key, index) => nextPlaceholderKeys[index] !== key);
            const nextSort = remapSortByColumnIds(
                sortState,
                previousPlaceholderItems.map((item) => item.id),
                nextPlaceholderItems.map((item) => item.id),
            );
            const persistedIdByDraftId = new Map(nextPlaceholderDrafts.map((entry) => [entry.itemId, entry.persistedId]));
            const nextColumnOrder = nextItems.map((item) => {
                if (item.source !== "placeholder") {
                    return item.id;
                }

                return persistedIdByDraftId.get(item.id) ?? item.id;
            });

            setColumns(nextColumns);
            setColumnOrder(nextColumnOrder);
            setSortState(nextSort);

            if (placeholderStructureChanged) {
                setColumnRenderers(undefined);
                return;
            }

            const currentColumnsById = new Map(tableColumnsInfo.map((column) => [getConfigColumnId(column), column]));
            const nextColumnsInfo = nextItems
                .map((item) => {
                    const column = currentColumnsById.get(item.id);
                    if (!column) {
                        return null;
                    }

                    const nextTitle = item.source === "placeholder"
                        ? (item.rawTitle?.trim() || formatColName(item.value ?? column.key ?? column.title))
                        : column.title;

                    return {
                        ...column,
                        title: nextTitle,
                    } satisfies ConfigColumns;
                })
                .filter((column): column is ConfigColumns => Boolean(column));

            setColumnsInfo(nextColumnsInfo);
        };

        const columnCustomization: TableColumnCustomization | undefined = load ? {
            items: currentCustomizationItems,
            composer: {
                placeholderType,
            },
            onApply: commitCustomization,
        } : undefined;
        committedColumnsReorderRef.current = columnCustomization
            ? (nextColumns: ConfigColumns[]) => {
                commitCustomization(buildCustomizationItems(nextColumns));
            }
            : null;
        const handleSetData = setData as (data: JSONValue[][]) => void;

        return <>
            <TableToolbar
                data={data}
                columns={tableColumnsInfo}
                sourceSelection={sourceSelection}
                rowSelection={currentRowSelection}
                columnCustomization={columnCustomization}
                leadingActions={<>{exportsComponent}{shareButton}{errorsButton}</>}
            />
            <DataTable
                table={table}
                data={data}
                columnsInfo={tableColumnsInfo}
                sort={sortState}
                searchSet={searchSet}
                rowClassName={currentRowClassName}
                indexCellRenderer={currentIndexCellRenderer}
                indexColumnWidth={currentIndexColumnWidth}
                onRowsRendered={currentOnRowsRendered}
                rowSelection={currentRowSelection}
                visibleColumns={visibleColumns}

                setColumns={setColumnsInfo}
                setData={handleSetData}
                setSort={setSortState}
                onColumnsReorderCommitted={columnCustomization ? handleColumnsReorderCommitted : undefined}
            />
        </>;
    }, [columns, exportsComponent, handleColumnsReorderCommitted, load, setColumns, setColumnRenderers, setSortState, shareButton, sortState, sourceSelection, type]);

    if (load) {
        return <LoadTable
            type={type!}
            selection={selection}
            columns={columns}
            sort={sortState}
            clientColumns={clientColumns}
            columnRenderers={columnRenderers}
            transformTableInfo={transformTableInfo}
            rowClassName={rowClassName}
            indexCellRenderer={indexCellRenderer}
            indexColumnWidth={indexColumnWidth}
            onRowsRendered={onRowsRendered}
            onColumnsLoaded={onColumnsLoaded}
            rowSelection={rowSelection}
            columnOrder={columnOrder}
            showErrorsProvided={showErrorsProvided}
        >
            {renderChildren}
        </LoadTable>;
    } else {
        return <DeferTable
            table={table}
            getTableProps={captureLiveTableProps}
            type={type ?? ""}
            selection={selection}
            columns={columns}
            sort={sortState}
            clientColumns={clientColumns}
            columnRenderers={columnRenderers}
            transformTableInfo={transformTableInfo}
            setSortState={setSortState}
            showErrorsProvided={showErrorsProvided}
            rowClassName={rowClassName}
            indexCellRenderer={indexCellRenderer}
            indexColumnWidth={indexColumnWidth}
            onRowsRendered={onRowsRendered}
            onColumnsLoaded={onColumnsLoaded}
            rowSelection={rowSelection}
            columnOrder={columnOrder}
        >
            {renderChildren}
        </DeferTable>;
    }
}

function LoadTable({ type, selection, columns, sort, clientColumns, columnRenderers, transformTableInfo, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded, rowSelection, columnOrder, showErrorsProvided, children }: {
    type: string,
    selection: { [key: string]: string },
    columns: Map<string, string | null>,
    sort: OrderIdx | OrderIdx[] | undefined,
    clientColumns?: ClientColumnOverlay[],
    columnRenderers?: TableProps['columnRenderers'],
    transformTableInfo?: TableProps['transformTableInfo'],
    rowClassName?: TableProps['rowClassName'],
    indexCellRenderer?: TableProps['indexCellRenderer'],
    indexColumnWidth?: TableProps['indexColumnWidth'],
    onRowsRendered?: TableProps['onRowsRendered'],
    onColumnsLoaded?: TableProps['onColumnsLoaded'],
    rowSelection?: TableProps['rowSelection'],
    columnOrder?: string[],
    showErrorsProvided: (errors: WebTableError[]) => void,
    children: (errorsButton: ReactNode, data: JSONValue[][], columnsInfo: ConfigColumns[], searchSet: Set<number>, visibleColumns: number[], setColumnsInfo: (columnsInfo: ConfigColumns[]) => void, setData: (data: JSONValue[][]) => void, rowClassName?: TableProps['rowClassName'], indexCellRenderer?: TableProps['indexCellRenderer'], indexColumnWidth?: TableProps['indexColumnWidth'], onRowsRendered?: TableProps['onRowsRendered'], rowSelection?: TableProps['rowSelection']) => ReactNode
}) {
    const tableQuery = useMemo(() => {
        return {
            type,
            selection_str: toSelAndModifierString(selection)!,
            columns: Array.from(columns.keys()),
        };
    }, [type, selection, columns]);

    const fallbackRender = useCallback(
        (fallbackProps: { error: unknown; resetErrorBoundary: () => void }) =>
            renderEndpointFallback({
                ...fallbackProps,
                endpoint: TABLE.endpoint.name,
                query: tableQuery,
            }),
        [tableQuery]
    );

    const resetKey = useMemo(() => {
        return `${type}|${tableQuery.selection_str}|${tableQuery.columns.join("|")}`;
    }, [tableQuery.columns, tableQuery.selection_str, type]);

    return (
        <ErrorBoundary
            fallbackRender={fallbackRender}
            onError={console.error}
            resetKeys={[resetKey]}
        >
            <Suspense fallback={<div className="flex min-h-40 items-center justify-center"><Loading variant="ripple" /></div>}>
                <LoadTableContent
                    type={type}
                    selection={selection}
                    columns={columns}
                    sort={sort}
                    clientColumns={clientColumns}
                    columnRenderers={columnRenderers}
                    transformTableInfo={transformTableInfo}
                    rowClassName={rowClassName}
                    indexCellRenderer={indexCellRenderer}
                    indexColumnWidth={indexColumnWidth}
                    onRowsRendered={onRowsRendered}
                    onColumnsLoaded={onColumnsLoaded}
                    rowSelection={rowSelection}
                    columnOrder={columnOrder}
                    showErrorsProvided={showErrorsProvided}
                    children={children}
                    tableQuery={tableQuery}
                />
            </Suspense>
        </ErrorBoundary>
    );
}

function LoadTableContent({ type, selection, columns, sort, clientColumns, columnRenderers, transformTableInfo, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded, rowSelection, columnOrder, showErrorsProvided, children, tableQuery }: {
    type: string,
    selection: { [key: string]: string },
    columns: Map<string, string | null>,
    sort: OrderIdx | OrderIdx[] | undefined,
    clientColumns?: ClientColumnOverlay[],
    columnRenderers?: TableProps['columnRenderers'],
    transformTableInfo?: TableProps['transformTableInfo'],
    rowClassName?: TableProps['rowClassName'],
    indexCellRenderer?: TableProps['indexCellRenderer'],
    indexColumnWidth?: TableProps['indexColumnWidth'],
    onRowsRendered?: TableProps['onRowsRendered'],
    onColumnsLoaded?: TableProps['onColumnsLoaded'],
    rowSelection?: TableProps['rowSelection'],
    columnOrder?: string[],
    showErrorsProvided: (errors: WebTableError[]) => void,
    children: (errorsButton: ReactNode, data: JSONValue[][], columnsInfo: ConfigColumns[], searchSet: Set<number>, visibleColumns: number[], setColumnsInfo: (columnsInfo: ConfigColumns[]) => void, setData: (data: JSONValue[][]) => void, rowClassName?: TableProps['rowClassName'], indexCellRenderer?: TableProps['indexCellRenderer'], indexColumnWidth?: TableProps['indexColumnWidth'], onRowsRendered?: TableProps['onRowsRendered'], rowSelection?: TableProps['rowSelection']) => ReactNode,
    tableQuery: { type: string; selection_str: string; columns: string[] },
}) {
    const { showDialog } = useDialog();

    const queryOptions: UseSuspenseQueryOptions<QueryResult<WebTable>, Error, QueryResult<WebTable>, readonly unknown[]> = useMemo(() => {
        return {
            ...suspenseQueryOptions(TABLE.endpoint, tableQuery, undefined, 10),
            // LoadTable is the eager/static mode, so the query must run on mount.
            enabled: true,
        }
    }, [tableQuery]);
    const { data: queryData } = useSuspenseQuery(queryOptions);

    // unused
    const [visibleColumns, setVisibleColumns] = useState<number[]>([]);
    const [searchSet, setSearchSet] = useState<Set<number>>(new Set<number>());
    // end unused

    const webTable = queryData.data as WebTable;
    const initialTableInfo = useMemo(() => {
        try {
            const baseInfo = createTableInfo(webTable, sort, columns, clientColumns ?? [], columnRenderers, columnOrder);
            return transformTableInfo ? transformTableInfo(baseInfo) : baseInfo;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }, [columnOrder, sort, columns, webTable, clientColumns, columnRenderers, transformTableInfo]);

    const [data, setData] = useState<JSONValue[][]>(initialTableInfo?.data as JSONValue[][]);
    const [columnsInfo, setColumnsInfo] = useState<ConfigColumns[]>(initialTableInfo?.columnsInfo || []);
    const [errors, setErrors] = useState<WebTableError[]>(initialTableInfo?.errors || []);

    useEffect(() => {
        if (!initialTableInfo) {
            return;
        }

        setData(initialTableInfo.data as JSONValue[][]);
        setColumnsInfo(initialTableInfo.columnsInfo);
        setErrors(initialTableInfo.errors);
        setVisibleColumns(initialTableInfo.visibleColumns);
        setSearchSet(initialTableInfo.searchSet);
    }, [initialTableInfo, setData, setColumnsInfo, setErrors, setSearchSet, setVisibleColumns]);

    useEffect(() => {
        if (columnsInfo && columnsInfo.length > 0) {
            onColumnsLoaded?.(columnsInfo);
        }
    }, [columnsInfo, onColumnsLoaded]);

    if (queryData.error) {
        return <div className="text-red-500">Error: {queryData.error}</div>;
    }
    if (!queryData.data) {
        return <div className="text-red-500">No data</div>;
    }
    if (!initialTableInfo) {
        return <div className="text-red-500">Error: No data</div>;
    }

    const showErrors = useCallback(() => {
        if (errors.length > 0) {
            showErrorsProvided(errors);
        } else {
            showDialog("No errors", "No errors to display", true);
        }
    }, [errors, showErrorsProvided, showDialog]);

    /*
${process.env.BASE_PATH}custom_table?${getQueryString({
        type: type.current,
        selAndModifiers: selection.current,
        columns: columns.current,
        sort: sort.current
    })}
    */

    const url = useMemo(() => {
        return `${process.env.BASE_PATH}custom_table?${getQueryString({
            type: type,
            selAndModifiers: selection,
            columns: columns,
            sort: sort
        })}`;
    }, [type, selection, columns, sort]);

    const errorsButton = useMemo(() => {
        return (
            <Button
                variant="outline"
                size="sm"
                className={`me-1 ${errors.length == 0 ? "hidden" : ""}`}
                onClick={showErrors}>
                View {errors.length} Errors
            </Button>
        );
    }, [errors.length, showErrors]);

    return <>
        <Button variant="outline"
            size="sm"
            className="me-1"
            asChild><Link to={url}>Edit Table</Link></Button>
        {children(errorsButton, data, columnsInfo, searchSet, visibleColumns, setColumnsInfo, setData, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, rowSelection)}
    </>;
}

/**
 * A table with a button to fetch and render the data
 * @param type
 * @param selection
 * @param columns
 * @param errors
 * @param table
 * @param data
 * @param columnsInfo
 * @param sort
 * @param searchSet
 * @param visibleColumns
 * @param setRerender
 * @constructor
 */
function DeferTable(
    { table, getTableProps, type, selection, columns, sort, clientColumns, columnRenderers, transformTableInfo, setSortState, showErrorsProvided, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded, rowSelection, columnOrder, children }:
        {
            table: React.RefObject<DataGridHandle | null>,
            getTableProps: () => TableProps,
            type: string,
            selection: { [key: string]: string },
            columns: Map<string, string | null>,
            sort: OrderIdx | OrderIdx[] | undefined,
            clientColumns?: ClientColumnOverlay[],
            columnRenderers?: TableProps['columnRenderers'],
            transformTableInfo?: TableProps['transformTableInfo'],
            setSortState: (sort: OrderIdx | OrderIdx[] | undefined) => void,
            showErrorsProvided: (errors: WebTableError[]) => void,
            rowClassName?: TableProps['rowClassName'],
            indexCellRenderer?: TableProps['indexCellRenderer'],
            indexColumnWidth?: TableProps['indexColumnWidth'],
            onRowsRendered?: TableProps['onRowsRendered'],
            onColumnsLoaded?: TableProps['onColumnsLoaded'],
            rowSelection?: TableProps['rowSelection'],
            columnOrder?: string[],
            children: (errorsButton: ReactNode, data: JSONValue[][], columnsInfo: ConfigColumns[], searchSet: Set<number>, visibleColumns: number[], setColumnsInfo: (columnsInfo: ConfigColumns[]) => void, setData: (data: JSONValue[][]) => void, rowClassName?: TableProps['rowClassName'], indexCellRenderer?: TableProps['indexCellRenderer'], indexColumnWidth?: TableProps['indexColumnWidth'], onRowsRendered?: TableProps['onRowsRendered'], rowSelection?: TableProps['rowSelection']) => ReactNode
        }
) {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();

    const [data, setData] = useState<JSONValue[][]>([]);
    const [visibleColumns, setVisibleColumns] = useState<number[]>([]);
    const [searchSet, setSearchSet] = useState<Set<number>>(new Set<number>());
    const [columnsInfo, setColumnsInfo] = useState<ConfigColumns[]>([]);
    const [errors, setErrors] = useState<WebTableError[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [lastWebTable, setLastWebTable] = useState<WebTable | null>(null);
    const lastBackendSignatureRef = useRef<string | null>(null);

    const activeTableProps = useMemo<TableProps>(() => ({
        type,
        selection,
        columns,
        sort,
        clientColumns,
        columnRenderers,
        transformTableInfo,
        rowClassName,
        indexCellRenderer,
        indexColumnWidth,
        onRowsRendered,
        onColumnsLoaded,
        rowSelection,
    }), [type, selection, columns, sort, clientColumns, columnRenderers, transformTableInfo, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded, rowSelection]);

    useEffect(() => {
        if (columnsInfo && columnsInfo.length > 0) {
            onColumnsLoaded?.(columnsInfo);
        }
    }, [columnsInfo, onColumnsLoaded]);

    const showErrors = useCallback(() => {
        if (errors.length > 0) {
            showErrorsProvided(errors);
        } else {
            showDialog("No errors", "No errors to display", true);
        }
    }, [errors, showErrorsProvided, showDialog]);

    const updateTable: (data: TableInfo) => void = useCallback((data: TableInfo) => {
        setData(data.data);
        setColumnsInfo(data.columnsInfo);
        setVisibleColumns(data.visibleColumns);
        setSearchSet(data.searchSet);
        setErrors(data.errors);
        setSortState(data.sort);
    }, [setData, setColumnsInfo, setVisibleColumns, setSearchSet, setErrors, setSortState]);

    const errorsButton = useMemo(() => {
        return (
            <Button
                variant="outline"
                size="sm"
                className={`me-1 ${errors.length == 0 ? "hidden" : ""}`}
                onClick={showErrors}>
                View {errors.length} Errors
            </Button>
        );
    }, [errors.length, showErrors]);

    const onErrorOrNull = useCallback((e: string | Error) => {
        console.error(e);
        const errorMessage = e instanceof Error ? <>
            {e.message}
            <CopyToClipboardTextArea text={e.stack + ""} />
        </> : e + "";
        showDialog("Failed to update table", errorMessage, true);
    }, [showDialog]);

    const applyWebTable = useCallback((webTable: WebTable, tableProps: TableProps) => {
        try {
            const info: TableInfo = createTableInfo(
                webTable,
                tableProps.sort,
                tableProps.columns,
                tableProps.clientColumns ?? [],
                tableProps.columnRenderers,
                columnOrder,
            );
            updateTable(tableProps.transformTableInfo ? tableProps.transformTableInfo(info) : info);
        } catch (e) {
            onErrorOrNull(e as (string | Error));
        }
    }, [columnOrder, updateTable, onErrorOrNull]);

    const getBackendSignature = useCallback((tableProps: Pick<TableProps, 'type' | 'selection' | 'columns'>) => {
        return JSON.stringify({
            type: tableProps.type,
            selection: toSelAndModifierString(tableProps.selection),
            columns: Array.from(tableProps.columns.keys()),
        });
    }, []);

    const fetchTable = useCallback((tableProps: TableProps) => {
        const params = {
            type: tableProps.type,
            selection_str: toSelAndModifierString(tableProps.selection),
            columns: Array.from(tableProps.columns.keys()),
        } as { type?: string, selection_str?: string, columns?: string[] | string };
        const backendSignature = getBackendSignature(tableProps);

        setIsFetching(true);
        queryClient.fetchQuery(singleQueryOptions(TABLE.endpoint, params, 0)).then(({ data }) => {
            if (!data) {
                onErrorOrNull("No data returned from server");
                return;
            }

            setLastWebTable(data);
            lastBackendSignatureRef.current = backendSignature;
            applyWebTable(data, tableProps);
        }).catch((error) => {
            onErrorOrNull(error);
        }).finally(() => {
            setIsFetching(false);
        });
    }, [applyWebTable, getBackendSignature, onErrorOrNull, queryClient]);

    const submit = useCallback(() => {
        fetchTable(getTableProps());
    }, [fetchTable, getTableProps]);

    useEffect(() => {
        if (!lastWebTable) {
            return;
        }

        const backendSignature = getBackendSignature(activeTableProps);
        if (backendSignature === lastBackendSignatureRef.current) {
            applyWebTable(lastWebTable, activeTableProps);
            return;
        }

        fetchTable(activeTableProps);
    }, [activeTableProps, applyWebTable, fetchTable, getBackendSignature, lastWebTable]);

    const label = "Generate Table";

    const submitButton = useMemo(() => {
        return (
            <Button
                variant="destructive"
                size="sm"
                className="me-1 relative"
                onClick={submit}
                disabled={isFetching}
            >
                <span className="flex items-center justify-center w-full">
                    <span className={isFetching ? "invisible" : "visible"}>
                        {label}
                    </span>
                    {isFetching && (
                        <span className="absolute inset-0 flex items-center justify-center">
                            <Loading size={3} variant="ripple" />
                        </span>
                    )}
                </span>
            </Button>
        );
    }, [isFetching, submit, label]);

    return <>
        {submitButton}
        {children(errorsButton, data, columnsInfo, searchSet, visibleColumns, setColumnsInfo, setData, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, rowSelection)}
    </>
}
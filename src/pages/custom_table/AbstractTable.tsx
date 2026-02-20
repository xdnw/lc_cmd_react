import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TABLE } from "../../lib/endpoints";
import { Button } from "../../components/ui/button";
import { CopyToClipboardTextArea } from "../../components/ui/copytoclipboard";
import { WebTable, WebTableError } from "../../lib/apitypes";
import { useDialog } from "../../components/layout/DialogContext";
import { Link } from "react-router-dom";
import { getQueryString, createTableInfo, toSelAndModifierString } from "./table_util";
import { useQueryClient, useSuspenseQuery, UseSuspenseQueryOptions } from "@tanstack/react-query";
import { singleQueryOptions, suspenseQueryOptions } from "@/lib/queries";
import { ClientColumnOverlay, ConfigColumns, DataTable, OrderIdx } from "./DataTable";
import { DataGridHandle } from "react-data-grid";
import { JSONValue } from "@/lib/internaltypes";
import { GoogleSheets } from "./TableWithExports";
import { useDeepState } from "@/utils/StateUtil";
import { QueryResult } from "@/lib/BulkQuery";
import Loading from "@/components/ui/loading";

export type TableInfo = {
    data: (string | number | number[])[][],
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
    rowClassName?: (row: JSONValue[], rowIdx: number) => string | undefined,
    indexCellRenderer?: (context: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => ReactNode,
    indexColumnWidth?: number,
    onRowsRendered?: (rows: JSONValue[][]) => void,
    onColumnsLoaded?: (columns: ConfigColumns[]) => void,
}

export function AbstractTableWithButtons({ getTableProps, load }: {
    getTableProps: () => TableProps,
    load: boolean
}) {
    const table = useRef<DataGridHandle>(null);
    const { showDialog } = useDialog();

    const [type, setType] = useDeepState<string | null>(load ? getTableProps().type : null);
    const [selection, setSelection] = useDeepState<{ [key: string]: string }>(load ? getTableProps().selection : {});
    const [columns, setColumns] = useDeepState<Map<string, string | null>>(load ? getTableProps().columns : new Map<string, string | null>());
    const [sortState, setSortState] = useDeepState<OrderIdx | OrderIdx[] | undefined>(load ? getTableProps().sort : undefined);
    const [clientColumns, setClientColumns] = useState<ClientColumnOverlay[]>(load ? (getTableProps().clientColumns ?? []) : []);
    const [rowClassName, setRowClassName] = useState<TableProps['rowClassName']>(() => load ? getTableProps().rowClassName : undefined);
    const [indexCellRenderer, setIndexCellRenderer] = useState<TableProps['indexCellRenderer']>(() => load ? getTableProps().indexCellRenderer : undefined);
    const [indexColumnWidth, setIndexColumnWidth] = useState<TableProps['indexColumnWidth']>(() => load ? getTableProps().indexColumnWidth : undefined);
    const [onRowsRendered, setOnRowsRendered] = useState<TableProps['onRowsRendered']>(() => load ? getTableProps().onRowsRendered : undefined);
    const [onColumnsLoaded, setOnColumnsLoaded] = useState<TableProps['onColumnsLoaded']>(() => load ? getTableProps().onColumnsLoaded : undefined);

    const getTablePropsFinal = useCallback(() => {
        const props = getTableProps();
        setType(props.type);
        setSelection(props.selection);
        setColumns(props.columns);
        setSortState(props.sort);
        setClientColumns(props.clientColumns ?? []);
        setRowClassName(() => props.rowClassName);
        setIndexCellRenderer(() => props.indexCellRenderer);
        setIndexColumnWidth(props.indexColumnWidth);
        setOnRowsRendered(() => props.onRowsRendered);
        setOnColumnsLoaded(() => props.onColumnsLoaded);
        return props;
    }, [getTableProps, setType, setSelection, setColumns, setSortState, setClientColumns, setRowClassName, setIndexCellRenderer, setIndexColumnWidth, setOnRowsRendered, setOnColumnsLoaded]);

    useEffect(() => {
        if (!load) return;
        const props = getTableProps();
        setType(props.type);
        setSelection(props.selection);
        setColumns(props.columns);
        setSortState(props.sort);
        setClientColumns(props.clientColumns ?? []);
        setRowClassName(() => props.rowClassName);
        setIndexCellRenderer(() => props.indexCellRenderer);
        setIndexColumnWidth(props.indexColumnWidth);
        setOnRowsRendered(() => props.onRowsRendered);
        setOnColumnsLoaded(() => props.onColumnsLoaded);
    }, [
        load,
        getTableProps,
        setType,
        setSelection,
        setColumns,
        setSortState,
        setClientColumns,
        setRowClassName,
        setIndexCellRenderer,
        setIndexColumnWidth,
        setOnRowsRendered,
        setOnColumnsLoaded,
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
        console.log("COLS ", columns);
        const baseUrlWithoutPath = window.location.protocol + "//" + window.location.host;
        const url = (`${baseUrlWithoutPath}${process.env.BASE_PATH}#/view_table?${encodeURIComponent(getQueryString({
            type: type!,
            selAndModifiers: selection,
            columns: columns,
            sort: sortState
        }))}`);
        navigator.clipboard.writeText(url).then(() => {
            showDialog("URL copied to clipboard", url, true);
        }).catch((err) => {
            showDialog("Failed to copy URL to clipboard", err + "", true);
        });
    }, [type, selection, columns, sortState, showDialog]);

    const exportsComponent = useMemo(() => {
        if (!type || !selection || !columns) return null;
        return (
            <GoogleSheets
                type={type}
                selection={selection}
                columns={columns}
            />
        );
    }, [type, selection, columns]);

    const shareButton = useMemo(() => {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={copy}>
                Share
            </Button>
        );
    }, [copy]);

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
                <Button key={index} data-col={error.col} data-row={error.row} variant="destructive" className="my-1 h-auto break-words w-full justify-start size-sm whitespace-normal" onClick={highlightError}>
                    [col:{(error.col ?? 0) + 1}{error.row ? `row:${error.row + 1}` : ""}] {error.msg}
                </Button>
            ))}
        </> : "No errors";
        showDialog(title, body);
    }, [showDialog, highlightError]);

    const renderChildren = useCallback((errorsButton: ReactNode, data: JSONValue[][], columnsInfo: ConfigColumns[], searchSet: Set<number>, visibleColumns: number[], setColumnsInfo: (columnsInfo: ConfigColumns[]) => void, setData: (data: JSONValue[][]) => void, currentRowClassName?: TableProps['rowClassName'], currentIndexCellRenderer?: TableProps['indexCellRenderer'], currentIndexColumnWidth?: TableProps['indexColumnWidth'], currentOnRowsRendered?: TableProps['onRowsRendered']) => {
        return <>
            {exportsComponent}
            {shareButton}
            {errorsButton}
            <DataTable
                table={table}
                data={data}
                columnsInfo={columnsInfo}
                sort={sortState}
                searchSet={searchSet}
                rowClassName={currentRowClassName}
                indexCellRenderer={currentIndexCellRenderer}
                indexColumnWidth={currentIndexColumnWidth}
                onRowsRendered={currentOnRowsRendered}
                visibleColumns={visibleColumns}
                showExports={true}

                setColumns={setColumnsInfo}
                setData={setData as (data: JSONValue[][]) => void}
                setSort={setSortState}
            />
        </>;
    }, [exportsComponent, shareButton, sortState, setSortState]);

    if (load) {
        return <LoadTable
            type={type!}
            selection={selection}
            columns={columns}
            sort={sortState}
            clientColumns={clientColumns}
            rowClassName={rowClassName}
            indexCellRenderer={indexCellRenderer}
            indexColumnWidth={indexColumnWidth}
            onRowsRendered={onRowsRendered}
            onColumnsLoaded={onColumnsLoaded}
            showErrorsProvided={showErrorsProvided}
        >
            {renderChildren}
        </LoadTable>;
    } else {
        return <DeferTable
            table={table}
            getTableProps={getTablePropsFinal}
            setSortState={setSortState}
            showErrorsProvided={showErrorsProvided}
            rowClassName={rowClassName}
            indexCellRenderer={indexCellRenderer}
            indexColumnWidth={indexColumnWidth}
            onRowsRendered={onRowsRendered}
        >
            {renderChildren}
        </DeferTable>;
    }
}

function LoadTable({ type, selection, columns, sort, clientColumns, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded, showErrorsProvided, children }: {
    type: string,
    selection: { [key: string]: string },
    columns: Map<string, string | null>,
    sort: OrderIdx | OrderIdx[] | undefined,
    clientColumns?: ClientColumnOverlay[],
    rowClassName?: TableProps['rowClassName'],
    indexCellRenderer?: TableProps['indexCellRenderer'],
    indexColumnWidth?: TableProps['indexColumnWidth'],
    onRowsRendered?: TableProps['onRowsRendered'],
    onColumnsLoaded?: TableProps['onColumnsLoaded'],
    showErrorsProvided: (errors: WebTableError[]) => void,
    children: (errorsButton: ReactNode, data: JSONValue[][], columnsInfo: ConfigColumns[], searchSet: Set<number>, visibleColumns: number[], setColumnsInfo: (columnsInfo: ConfigColumns[]) => void, setData: (data: JSONValue[][]) => void, rowClassName?: TableProps['rowClassName'], indexCellRenderer?: TableProps['indexCellRenderer'], indexColumnWidth?: TableProps['indexColumnWidth'], onRowsRendered?: TableProps['onRowsRendered']) => ReactNode
}) {
    const { showDialog } = useDialog();

    const queryOptions: UseSuspenseQueryOptions<QueryResult<WebTable>, Error, QueryResult<WebTable>, readonly unknown[]> = useMemo(() => {
        return {
            ...suspenseQueryOptions(TABLE.endpoint, {
                type: type!,
                selection_str: toSelAndModifierString(selection)!,
                columns: Array.from(columns.keys()),
            }, undefined, 10),
            enabled: false, // Prevent automatic fetching on mount
        }
    }, [type, selection, columns]);
    const { data: queryData } = useSuspenseQuery(queryOptions);

    // unused
    const [visibleColumns, setVisibleColumns] = useState<number[]>([]);
    const [searchSet, setSearchSet] = useState<Set<number>>(new Set<number>());
    // end unused

    const webTable = queryData.data as WebTable;
    const initialTableInfo = useMemo(() => {
        try {
            return createTableInfo(webTable, sort, columns, clientColumns ?? []);
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }, [sort, columns, webTable, clientColumns]);

    const [data, setData] = useState<JSONValue[][]>(initialTableInfo?.data as JSONValue[][]);
    const [columnsInfo, setColumnsInfo] = useState<ConfigColumns[]>(initialTableInfo?.columnsInfo || []);
    const [errors, setErrors] = useState<WebTableError[]>(initialTableInfo?.errors || []);

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
                className={`ms-1 bg-destructive ${errors.length == 0 ? "hidden" : ""}`}
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
        {children(errorsButton, data, columnsInfo, searchSet, visibleColumns, setColumnsInfo, setData, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered)}
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
    { table, getTableProps, setSortState, showErrorsProvided, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, children }:
        {
            table: React.RefObject<DataGridHandle | null>,
            getTableProps: () => TableProps,
            setSortState: (sort: OrderIdx | OrderIdx[] | undefined) => void,
            showErrorsProvided: (errors: WebTableError[]) => void,
            rowClassName?: TableProps['rowClassName'],
            indexCellRenderer?: TableProps['indexCellRenderer'],
            indexColumnWidth?: TableProps['indexColumnWidth'],
            onRowsRendered?: TableProps['onRowsRendered'],
            children: (errorsButton: ReactNode, data: JSONValue[][], columnsInfo: ConfigColumns[], searchSet: Set<number>, visibleColumns: number[], setColumnsInfo: (columnsInfo: ConfigColumns[]) => void, setData: (data: JSONValue[][]) => void, rowClassName?: TableProps['rowClassName'], indexCellRenderer?: TableProps['indexCellRenderer'], indexColumnWidth?: TableProps['indexColumnWidth'], onRowsRendered?: TableProps['onRowsRendered']) => ReactNode
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

    const onColumnsLoadedFn = getTableProps?.()?.onColumnsLoaded;
    useEffect(() => {
        if (columnsInfo && columnsInfo.length > 0) {
            onColumnsLoadedFn?.(columnsInfo);
        }
    }, [columnsInfo, onColumnsLoadedFn]);

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
                className={`ms-1 bg-destructive ${errors.length == 0 ? "hidden" : ""}`}
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

    const onSuccess = useCallback((data: WebTable, sort: OrderIdx | OrderIdx[] | undefined, columns: Map<string, string | null>) => {
        try {
            const info: TableInfo = createTableInfo(data, sort, columns, getTableProps().clientColumns ?? []);
            updateTable(info);
        } catch (e) {
            onErrorOrNull(e as (string | Error));
        }
    }, [updateTable, onErrorOrNull, getTableProps]);

    const submit = useCallback(() => {
        const { type, selection, columns, sort } = getTableProps();

        const params = {
            type: type,
            selection_str: toSelAndModifierString(selection),
            columns: Array.from(columns.keys()),
        } as { type?: string, selection_str?: string, columns?: string[] | string };

        console.log("Params", params);

        // Call tanstack query refetch with params
        // Fetch directly with the queryClient using the new params
        setIsFetching(true);
        queryClient.fetchQuery(singleQueryOptions(TABLE.endpoint, params, 0)).then(({ data }) => {
            if (data) {
                console.log("Data received from server", data);
                onSuccess(data, sort, columns);
            }
            else onErrorOrNull("No data returned from server");
        }).catch((error) => {
            onErrorOrNull(error);
        }).finally(() => {
            setIsFetching(false);
        });
    }, [getTableProps, onSuccess, queryClient, onErrorOrNull]);
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
        {children(errorsButton, data, columnsInfo, searchSet, visibleColumns, setColumnsInfo, setData, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered)}
    </>
}
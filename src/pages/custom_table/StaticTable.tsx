import { ReactNode, useCallback, useMemo } from "react";
import { ClientColumnOverlay, ConfigColumns, OrderIdx } from './DataTable';
import { AbstractTableWithButtons, TableProps } from "./AbstractTable";
import { JSONValue } from "@/lib/internaltypes";

export function StaticTable({ type, selection, columns, sort, clientColumns, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded }: { type: string, selection: { [key: string]: string }, columns: (string | [string, string])[], sort?: OrderIdx | OrderIdx[] | undefined, clientColumns?: ClientColumnOverlay[], rowClassName?: (row: JSONValue[], rowIdx: number) => string | undefined, indexCellRenderer?: (context: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => ReactNode, indexColumnWidth?: number, onRowsRendered?: (rows: JSONValue[][]) => void, onColumnsLoaded?: (columns: ConfigColumns[]) => void }) {
    const getTableProps = useCallback((): TableProps => {
        return {
            type: type,
            selection: selection,
            columns: new Map(columns.map(col => {
                return Array.isArray(col)
                    ? [col[0], col[1]]
                    : [col, null];
            })),
            sort: sort,
            clientColumns: clientColumns,
            rowClassName,
            indexCellRenderer,
            indexColumnWidth,
            onRowsRendered,
            onColumnsLoaded,
        };
    }, [type, selection, columns, sort, clientColumns, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered]);

    return useMemo(() => (
        <AbstractTableWithButtons getTableProps={getTableProps} load={true} />
    ), [getTableProps]);
}
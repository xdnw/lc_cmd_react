import { ReactNode, useCallback, useMemo } from "react";
import { ClientColumnOverlay, ConfigColumns, ObjectColumnRender, OrderIdx, TableRowSelection } from './DataTable';
import { AbstractTableWithButtons, TableProps } from "./AbstractTable";
import { JSONValue } from "@/lib/internaltypes";

export function StaticTable({ type, selection, columns, sort, clientColumns, columnRenderers, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded, rowSelection }: { type: string, selection: { [key: string]: string }, columns: (string | [string, string])[], sort?: OrderIdx | OrderIdx[] | undefined, clientColumns?: ClientColumnOverlay[], columnRenderers?: Record<string, string | ObjectColumnRender>, rowClassName?: (row: JSONValue[], rowIdx: number) => string | undefined, indexCellRenderer?: (context: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => ReactNode, indexColumnWidth?: number, onRowsRendered?: (rows: JSONValue[][]) => void, onColumnsLoaded?: (columns: ConfigColumns[]) => void, rowSelection?: TableRowSelection }) {
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
            columnRenderers,
            rowClassName,
            indexCellRenderer,
            indexColumnWidth,
            onRowsRendered,
            onColumnsLoaded,
            rowSelection,
        };
    }, [type, selection, columns, sort, clientColumns, columnRenderers, rowClassName, indexCellRenderer, indexColumnWidth, onRowsRendered, onColumnsLoaded, rowSelection]);

    return useMemo(() => (
        <AbstractTableWithButtons getTableProps={getTableProps} load={true} />
    ), [getTableProps]);
}
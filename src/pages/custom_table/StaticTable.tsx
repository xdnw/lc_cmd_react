import { useCallback, useMemo } from "react";
import { ClientColumnOverlay, OrderIdx } from './DataTable';
import { AbstractTableWithButtons, TableProps } from "./AbstractTable";

export function StaticTable({ type, selection, columns, sort, clientColumns }: { type: string, selection: { [key: string]: string }, columns: (string | [string, string])[], sort?: OrderIdx | OrderIdx[] | undefined, clientColumns?: ClientColumnOverlay[] }) {
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
        };
    }, [type, selection, columns, sort, clientColumns]);

    return useMemo(() => (
        <AbstractTableWithButtons getTableProps={getTableProps} load={true} />
    ), [getTableProps]);
}
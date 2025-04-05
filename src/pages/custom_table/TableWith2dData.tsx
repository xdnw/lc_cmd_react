import React, { useMemo, useRef, useState } from "react";
import { getRenderer } from "../../components/ui/renderers";
import { ConfigColumns, DataTable, OrderIdx } from "./DataTable";
import { DataGridHandle } from "react-data-grid";
import { JSONValue } from "@/lib/internaltypes";

export function TableWith2DData({ columns, data, renderers, sort }: { columns: string[], data: (string | number | number[] | boolean)[][], renderers?: (string | undefined)[], sort?: OrderIdx | OrderIdx[] }) {
    const table = useRef<DataGridHandle>(null);

    const visibleColumns = useMemo(() => Array.from(Array(columns.length).keys()), [columns]);
    const searchSet = useMemo(() => new Set<number>(), []);

    // const sortFinal = useMemo<OrderIdx | OrderIdx[]>(() => sort ?? { idx: 0, dir: "asc" }, [sort]);
    // const columnsInfo = useMemo(() => columns.map((col, index) => ({
    //     title: col,
    //     index: index,
    //     render: renderers && renderers[index] ? getRenderer(renderers[index] as string) : undefined
    // })), [columns, renderers]);

    const [dataState, setDataState] = useState(data);
    const [columnsInfo, setColumnsInfo] = useState<ConfigColumns[]>(
        columns.map((col, index) => ({
            title: col,
            index: index,
            render: renderers && renderers[index] ? getRenderer(renderers[index] as string) : undefined
        }))
    );

    const [sortState, setSortState] = useState<OrderIdx | OrderIdx[] | undefined>(sort);

    return useMemo(() => (
        <DataTable
            table={table}
            data={dataState}
            columnsInfo={columnsInfo}
            sort={sortState}
            searchSet={searchSet}
            visibleColumns={visibleColumns}
            setColumns={setColumnsInfo}
            setData={setDataState as (data: JSONValue[][]) => void}
            setSort={setSortState}
            showExports={true}
        />
    ), [data, dataState, columnsInfo, sortState, searchSet, visibleColumns, table]);
}

// export function MyTable({ table, data, columnsInfo, sort, searchSet, visibleColumns }:
//     {
//         table: React.RefObject<DataGridHandle | null>,
//         data: (string | number | boolean | number[])[][],
//         columnsInfo: ConfigColumns[],
//         sort: OrderIdx | OrderIdx[],
//         searchSet: Set<number>,
//         visibleColumns: number[],
//     }) {

//     console.log("Table data", data, "columns info", columnsInfo, "visible", visibleColumns);

//     return (
//         <DataTable
//             slots={getReactSlots(columnsInfo)}
//             ref={table}
//             data={data}
//             columns={[{ data: null, title: "#", orderable: false, searchable: false, className: 'dt-center' },
//             ...columnsInfo]}
//             options={{
//                 paging: true,
//                 lengthMenu: [[15, 25, 50, 100, -1], [15, 25, 50, 100, "All"]],
//                 deferRender: true,
//                 orderClasses: false,
//                 order: sort,
//                 autoWidth: false,
//                 info: false,
//                 processing: false,
//                 stateSave: false,
//                 scrollX: false,
//                 rowCallback: function (row: Node, data: (string | number)[] | object, index: number, displayIndexFull: number) {
//                     const firstCell = (row as HTMLElement).querySelector('td:nth-child(1)');
//                     if (firstCell) {
//                         firstCell.textContent = (displayIndexFull + 1).toString();
//                     }
//                 } as (row: Node, data: (string | number)[] | object, index: number) => void,
//             }}
//             className="display table-auto divide-y w-full border-separate border-spacing-y-1 text-xs compact font-mono" />
//     );
// }
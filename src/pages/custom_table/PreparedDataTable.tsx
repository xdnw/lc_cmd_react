import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DataGridHandle } from "react-data-grid";

import type { JSONValue } from "@/lib/internaltypes";

import { DataTable, type ConfigColumns, type OrderIdx, type TableRowSelection } from "./DataTable";

export function PreparedDataTable({
  columnsInfo,
  data,
  sort,
  showExports = true,
  showIndexColumn = true,
  highlightedRowIndexes,
  rowClassName,
  indexCellRenderer,
  indexColumnWidth,
  onRowsRendered,
  rowSelection,
}: {
  columnsInfo: ConfigColumns[];
  data: JSONValue[][];
  sort?: OrderIdx | OrderIdx[];
  showExports?: boolean;
  showIndexColumn?: boolean;
  highlightedRowIndexes?: ReadonlySet<number> | readonly number[];
  rowClassName?: (row: JSONValue[], rowIdx: number) => string | undefined;
  indexCellRenderer?: (context: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => ReactNode;
  indexColumnWidth?: number;
  onRowsRendered?: (rows: JSONValue[][]) => void;
  rowSelection?: TableRowSelection;
}) {
  const table = useRef<DataGridHandle>(null);
  const [dataState, setDataState] = useState(data);
  const [columnsState, setColumnsState] = useState(columnsInfo);
  const [sortState, setSortState] = useState<OrderIdx | OrderIdx[] | undefined>(sort);

  useEffect(() => {
    setDataState(data);
  }, [data]);

  useEffect(() => {
    setColumnsState(columnsInfo);
  }, [columnsInfo]);

  useEffect(() => {
    setSortState(sort);
  }, [sort]);

  const visibleColumns = useMemo(() => columnsState.map((column) => column.index), [columnsState]);
  const searchSet = useMemo(
    () => new Set<number>(highlightedRowIndexes ? Array.from(highlightedRowIndexes) : []),
    [highlightedRowIndexes],
  );

  return (
    <DataTable
      table={table}
      data={dataState}
      columnsInfo={columnsState}
      sort={sortState}
      searchSet={searchSet}
      rowClassName={rowClassName}
      showIndexColumn={showIndexColumn}
      indexCellRenderer={indexCellRenderer}
      indexColumnWidth={indexColumnWidth}
      onRowsRendered={onRowsRendered}
      rowSelection={rowSelection}
      visibleColumns={visibleColumns}
      setColumns={setColumnsState}
      setData={setDataState}
      setSort={setSortState}
      showExports={showExports}
    />
  );
}
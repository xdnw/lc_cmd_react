import React, { ReactNode, useCallback, useMemo, useState } from "react";
import {
  DataGrid,
  SortColumn,
  Column,
  DataGridHandle,
  RenderCellProps,
  textEditor
} from "react-data-grid";
import { JSONValue } from "@/lib/internaltypes";
import { sortData } from "./sort";
import { cn } from "@/lib/utils";
import { ExportTable } from "./TableWithExports";

// Types
export type OrderIdx = {
  idx: number;
  dir: "asc" | "desc";
};

export type ColumnType = 'string' | 'number' | 'boolean' | 'mixed';

export type ConfigColumns = {
  title: string;
  index: number;
  key?: string;
  render?: ObjectColumnRender;
  sorted?: ['asc' | 'desc', number];
  type?: ColumnType;
  sortable?: boolean;
  exportable?: boolean;
  editable?: boolean;
  draggable?: boolean;
  width?: number;
  cellClassName?: string;
  headerCellClassName?: string;
};

export interface RenderContext {
  row: JSONValue[];
  rowIdx: number;
  column: ConfigColumns;
}

export interface ObjectColumnRender<T = JSONValue> {
  display(value: T, context?: RenderContext): React.ReactNode;
  isHtml?: boolean;
  isEnum?: boolean;
  options?: string[];
}

export type ClientColumnOverlay = {
  id: string;
  title: string;
  value?: (row: JSONValue[], rowIdx: number) => JSONValue;
  render?: ObjectColumnRender;
  sortable?: boolean;
  exportable?: boolean;
  editable?: boolean;
  draggable?: boolean;
  width?: number;
  position?: 'start' | 'end' | number;
  cellClassName?: string;
  headerCellClassName?: string;
};

interface ReactDataGridTableProps {
  table: React.RefObject<DataGridHandle | null>;
  columnsInfo: ConfigColumns[];
  data: JSONValue[][];
  sort?: OrderIdx | OrderIdx[];
  searchSet: Set<number>;
  visibleColumns?: number[];
  setColumns: (columns: ConfigColumns[]) => void;
  setData: (data: JSONValue[][]) => void;
  setSort: (sort: OrderIdx | OrderIdx[] | undefined) => void;
  showExports: boolean;
}

export function DataTable({
  table,
  columnsInfo,
  data,
  sort,
  searchSet,
  visibleColumns, // TODO
  setColumns,
  setData,
  setSort,
  showExports,
}: ReactDataGridTableProps) {
  const initialSort = useMemo<OrderIdx[] | null>(() => {
    if (!sort) return null;
    return Array.isArray(sort) ? sort : [sort];
  }, [sort]);

  // Create column definitions for DataGrid
  const gridColumns: Column<JSONValue[]>[] = useMemo(() => {
    const gridCols: Column<JSONValue[]>[] = [];
    gridCols.push({
      key: "index", name: "#", width: columnsInfo.length === 0 ? undefined : 50, sortable: false,
      cellClass: cn("ps-1", columnsInfo.length === 0 ? "w-full" : undefined),
      headerCellClass: "ps-1 text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-gray-600",
      renderCell:
        (props: RenderCellProps<JSONValue[], unknown>): ReactNode => {
          const rowIndex = props.rowIdx + 1;
          return String(rowIndex)
        },
    });

    columnsInfo.forEach((colInfo, colIndex) => {
      const dataIndex = colInfo.index;
      const renderer = colInfo.render?.display;
      gridCols.push({
        key: String(dataIndex),
        name: colInfo.title,
        sortable: colInfo.sortable ?? true,
        resizable: true,
        draggable: colInfo.draggable ?? true,
        width: colInfo.width,
        cellClass: cn("px-1", colInfo.cellClassName),
        headerCellClass: cn("px-1 text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 text-xs", colInfo.headerCellClassName),
        renderCell: renderer ? (props: RenderCellProps<JSONValue[], unknown>): ReactNode => {
          const value = props.row[dataIndex];
          return renderer(value, {
            row: props.row,
            rowIdx: props.rowIdx,
            column: colInfo,
          });
        } : (props: RenderCellProps<JSONValue[], unknown>): ReactNode => {
          const value = props.row[dataIndex];
          return String(value);
        },
        renderEditCell: colInfo.editable === false ? undefined : textEditor,
        editable: colInfo.editable ?? true,
      });
    });

    return gridCols;
  }, [columnsInfo]);

  const noRowsFallback = useMemo(() => {
    return <div className="flex items-center justify-center h-full text-xl text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 w-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-default">No data to display</div>;
  }, []);


  const onColumnsReorder = useCallback((sourceKey: string, targetKey: string) => {
    // Skip if we're trying to reorder the index column
    if (sourceKey === "index" || targetKey === "index") return;

    // Convert keys to data indices
    const sourceDataIndex = Number(sourceKey);
    const targetDataIndex = Number(targetKey);
    if (Number.isNaN(sourceDataIndex) || Number.isNaN(targetDataIndex)) return;

    // Find positions in columnsInfo that have these data indices
    const sourceVisualIndex = columnsInfo.findIndex(col => col.index === sourceDataIndex);
    const targetVisualIndex = columnsInfo.findIndex(col => col.index === targetDataIndex);

    // If either index is not found, return
    if (sourceVisualIndex === -1 || targetVisualIndex === -1) return;

    // Create a new array and swap the columns
    const newColumns = [...columnsInfo];
    const sourceColumn = newColumns[sourceVisualIndex];
    const targetColumn = newColumns[targetVisualIndex];
    newColumns[sourceVisualIndex] = targetColumn;
    newColumns[targetVisualIndex] = sourceColumn;

    setColumns(newColumns);
  }, [columnsInfo, setColumns]);

  // Sorting state using SortColumn[] type
  const [sortColumns, setSortColumns] = useState<SortColumn[] | undefined>(() => {
    return initialSort ? initialSort.map((s) => ({ columnKey: String(s.idx), direction: s.dir === "asc" ? "ASC" : "DESC" })) : undefined;
  });

  // Handle sort changes triggered by clicking on column headers
  const handleSort = useCallback((newSort: SortColumn[] | undefined): void => {
    if (newSort && newSort.length > 0) {
      const validSort = newSort.filter((s) => !Number.isNaN(Number(s.columnKey)));
      const sortOrder: OrderIdx[] = validSort.map((s) => ({
        idx: Number(s.columnKey),
        dir: s.direction === "ASC" ? "asc" : "desc",
      }));

      const sortResult = sortData(data, validSort, columnsInfo);

      if (sortResult) {
        setColumns(sortResult.columns);
        setData(sortResult.data);
        setSort(sortOrder);
        setSortColumns(newSort);
      }

    } else {
      setSortColumns(undefined);
      setSort(undefined);
    }
  }, [data, columnsInfo, setColumns, setData, setSort, setSortColumns]);

  const exportButton = useMemo(() => (
    showExports && <ExportTable data={data} columns={columnsInfo} />
  ), [showExports, data, columnsInfo]);

  const evenClass = useMemo(() => {
    return cn(
      "text-gray-900 dark:text-gray-200 w-full hover:bg-black/20 dark:hover:bg-white/20",
      "bg-black/5 dark:bg-white/5"
    );
  }, []);

  const oddClass = useMemo(() => {
    return cn(
      "text-gray-900 dark:text-gray-200 w-full hover:bg-black/20 dark:hover:bg-white/20",
      "bg-transparent"
    );
  }, []);

  // todo use the above even/odd
  const rowClass = useCallback((row: JSONValue[], rowIdx: number) => {
    const isSelected = searchSet.has(rowIdx);
    return cn(
      rowIdx % 2 === 0 ? evenClass : oddClass,
      isSelected ? "bg-blue-100 dark:bg-blue-700" : ""
    );
  }, [searchSet, evenClass, oddClass]);

  const dataGrid = useMemo(() => {
    return <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden text-xs">
      <DataGrid
        key={columnsInfo.length}
        className={`bg-transparent text-xs`}
        style={{ height: '70vh', maxHeight: '70vh', flex: '1 1 auto' }}
        ref={table}
        columns={gridColumns}
        rows={data}
        sortColumns={sortColumns}
        onSortColumnsChange={handleSort}
        onColumnsReorder={onColumnsReorder}
        rowClass={rowClass}
        rowHeight={24}
        renderers={{ noRowsFallback }}
        enableVirtualization={true}
        onRowsChange={setData}
      />
    </div>;
  }, [columnsInfo, data, sortColumns, handleSort, onColumnsReorder, table, gridColumns, noRowsFallback, rowClass, setData]);

  return (
    <>
      {exportButton}
      {dataGrid}
    </>
  );
}
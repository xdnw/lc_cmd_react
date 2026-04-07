import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import "react-data-grid/lib/styles.css";
import {
  DataGrid,
  SortColumn,
  Column,
  DataGridHandle,
  RenderCellProps,
  renderTextEditor
} from "react-data-grid";
import { JSONValue } from "@/lib/internaltypes";
import { sortData } from "./sort";
import { cn } from "@/lib/utils";
import { ExportTable } from "./TableWithExports";
import SelectionCellButton from "./actions/SelectionCellButton";

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
  hideOnMobile?: boolean;
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

function formatTableCellText(value: JSONValue): string {
  if (value === null) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function TableTextCell({ text }: { text: string }) {
  return (
    <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={text}>
      {text}
    </span>
  );
}

export function renderTableCellValue(value: JSONValue, context: RenderContext): ReactNode {
  const renderer = context.column.render?.display;
  if (renderer) {
    const rendered = renderer(value, context);
    if (typeof rendered === "string" || typeof rendered === "number") {
      return <TableTextCell text={String(rendered)} />;
    }
    return rendered;
  }
  return <TableTextCell text={formatTableCellText(value)} />;
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
  hideOnMobile?: boolean;
  cellClassName?: string;
  headerCellClassName?: string;
};

export type TableRowSelectionId = number | string;

export type TableRowSelection<IdT extends TableRowSelectionId = TableRowSelectionId> = {
  getRowId: (row: JSONValue[], rowIdx: number) => IdT | null | undefined;
  selectedIds: ReadonlySet<IdT>;
  onSelectedIdsChange: (selectedIds: Set<IdT>) => void;
  onVisibleIdsChange?: (ids: IdT[]) => void;
  getLabel?: (id: IdT, rowIdx: number) => string;
  selectedRowClassName?: string;
  showRowNumber?: boolean;
  debugTagPrefix?: string;
};

function SelectionIndexCell({
  rowId,
  rowIdx,
  rowNumber,
  rowSelection,
  onToggleRowSelection,
}: {
  rowId: TableRowSelectionId;
  rowIdx: number;
  rowNumber: number;
  rowSelection: TableRowSelection;
  onToggleRowSelection: (id: TableRowSelectionId, rowIdx: number, shiftKey: boolean) => void;
}) {
  const handleToggle = useCallback((toggledId: number | string, shiftKey: boolean) => {
    onToggleRowSelection(toggledId, rowIdx, shiftKey);
  }, [onToggleRowSelection, rowIdx]);

  return (
    <SelectionCellButton
      id={rowId}
      isSelected={rowSelection.selectedIds.has(rowId)}
      onToggle={handleToggle}
      label={rowSelection.getLabel?.(rowId, rowIdx) ?? `Toggle selection for ${rowId}`}
      debugTag={rowSelection.debugTagPrefix ? `${rowSelection.debugTagPrefix}-${rowId}` : undefined}
      rowNumber={rowSelection.showRowNumber === false ? undefined : rowNumber}
    />
  );
}

interface ReactDataGridTableProps {
  table: React.RefObject<DataGridHandle | null>;
  columnsInfo: ConfigColumns[];
  data: JSONValue[][];
  sort?: OrderIdx | OrderIdx[];
  searchSet: Set<number>;
  rowClassName?: (row: JSONValue[], rowIdx: number) => string | undefined;
  showIndexColumn?: boolean;
  indexCellRenderer?: (context: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => ReactNode;
  indexColumnWidth?: number;
  onRowsRendered?: (rows: JSONValue[][]) => void;
  rowSelection?: TableRowSelection;
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
  rowClassName,
  showIndexColumn = true,
  indexCellRenderer,
  indexColumnWidth,
  onRowsRendered,
  rowSelection,
  visibleColumns, // TODO
  setColumns,
  setData,
  setSort,
  showExports,
}: ReactDataGridTableProps) {
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = viewportWidth < 768;

  const { visibleColumnsInfo, hiddenColumnsInfo } = useMemo(() => {
    if (!isMobile) {
      return {
        visibleColumnsInfo: columnsInfo,
        hiddenColumnsInfo: [] as ConfigColumns[],
      };
    }

    const explicitVisible = columnsInfo.filter((col) => col.hideOnMobile !== true);
    if (explicitVisible.length > 0) {
      return {
        visibleColumnsInfo: explicitVisible,
        hiddenColumnsInfo: columnsInfo.filter((col) => col.hideOnMobile === true),
      };
    }

    const hardLimit = 4;
    return {
      visibleColumnsInfo: columnsInfo.slice(0, hardLimit),
      hiddenColumnsInfo: columnsInfo.slice(hardLimit),
    };
  }, [columnsInfo, isMobile]);

  const initialSort = useMemo<OrderIdx[] | null>(() => {
    if (!sort) return null;
    return Array.isArray(sort) ? sort : [sort];
  }, [sort]);

  useEffect(() => {
    onRowsRendered?.(data);
  }, [data, onRowsRendered]);

  const [lastSelectedRowIdx, setLastSelectedRowIdx] = useState<number | null>(null);

  const selectableRowIds = useMemo(
    () => rowSelection
      ? data.map((row, rowIdx) => rowSelection.getRowId(row, rowIdx))
      : [],
    [data, rowSelection],
  );

  const visibleSelectableRowIds = useMemo(() => {
    if (!rowSelection) {
      return [] as TableRowSelectionId[];
    }

    return selectableRowIds.filter((id): id is TableRowSelectionId => id !== null && id !== undefined);
  }, [rowSelection, selectableRowIds]);

  useEffect(() => {
    if (!rowSelection?.onVisibleIdsChange) {
      return;
    }

    rowSelection.onVisibleIdsChange(visibleSelectableRowIds);
  }, [rowSelection, visibleSelectableRowIds]);

  const handleSelectionToggle = useCallback((id: TableRowSelectionId, rowIdx: number, shiftKey: boolean) => {
    if (!rowSelection) {
      return;
    }

    const shouldSelect = !rowSelection.selectedIds.has(id);
    const nextSelectedIds = new Set(rowSelection.selectedIds);

    if (shiftKey && lastSelectedRowIdx !== null && visibleSelectableRowIds.length > 0) {
      const start = Math.max(0, Math.min(lastSelectedRowIdx, rowIdx));
      const end = Math.min(visibleSelectableRowIds.length - 1, Math.max(lastSelectedRowIdx, rowIdx));
      const rangeIds = visibleSelectableRowIds.slice(start, end + 1);

      rangeIds.forEach((rangeId) => {
        if (shouldSelect) {
          nextSelectedIds.add(rangeId);
        } else {
          nextSelectedIds.delete(rangeId);
        }
      });
    } else if (shouldSelect) {
      nextSelectedIds.add(id);
    } else {
      nextSelectedIds.delete(id);
    }

    rowSelection.onSelectedIdsChange(nextSelectedIds);
    setLastSelectedRowIdx(rowIdx);
  }, [lastSelectedRowIdx, rowSelection, visibleSelectableRowIds]);

  // Create column definitions for DataGrid
  const gridColumns: Column<JSONValue[]>[] = useMemo(() => {
    const gridCols: Column<JSONValue[]>[] = [];
    if (showIndexColumn) {
      gridCols.push({
        key: "index", name: "#", width: columnsInfo.length === 0 ? undefined : (indexColumnWidth ?? 36), sortable: false,
        cellClass: cn("ps-1", columnsInfo.length === 0 ? "w-full" : undefined),
        headerCellClass: "ps-1 text-foreground bg-muted",
        renderCell:
          (props: RenderCellProps<JSONValue[], unknown>): ReactNode => {
            const rowIndex = props.rowIdx + 1;
            const rowId = rowSelection?.getRowId(props.row, props.rowIdx);

            if (indexCellRenderer) {
              return indexCellRenderer({
                row: props.row,
                rowIdx: props.rowIdx,
                rowNumber: rowIndex,
              });
            }

            if (rowSelection && rowId !== null && rowId !== undefined) {
              return (
                <SelectionIndexCell
                  rowId={rowId}
                  rowIdx={props.rowIdx}
                  rowNumber={rowIndex}
                  rowSelection={rowSelection}
                  onToggleRowSelection={handleSelectionToggle}
                />
              );
            }

            return String(rowIndex)
          },
      });
    }

    visibleColumnsInfo.forEach((colInfo, colIndex) => {
      const dataIndex = colInfo.index;
      const renderer = colInfo.render?.display;
      gridCols.push({
        key: String(dataIndex),
        name: colInfo.title,
        sortable: colInfo.sortable ?? true,
        resizable: true,
        draggable: colInfo.draggable ?? true,
        width: colInfo.width ?? undefined,
        minWidth: Math.max(60, Math.min(180, colInfo.title.length * 9 + 30)),
        maxWidth: 800,
        cellClass: cn("px-1 overflow-hidden", colInfo.cellClassName),
        headerCellClass: cn("px-1 text-foreground bg-muted text-xs", colInfo.headerCellClassName),
        renderCell: (props: RenderCellProps<JSONValue[], unknown>): ReactNode => {
          const value = props.row[dataIndex];
          return renderTableCellValue(value, {
            row: props.row,
            rowIdx: props.rowIdx,
            column: colInfo,
          });
        },
        renderEditCell: colInfo.editable === false ? undefined : renderTextEditor,
        editable: colInfo.editable ?? true,
      });
    });

    if (isMobile && hiddenColumnsInfo.length > 0) {
      gridCols.push({
        key: "__details",
        name: "More",
        sortable: false,
        resizable: false,
        draggable: false,
        width: 84,
        cellClass: "px-1",
        headerCellClass: "px-1 text-foreground bg-muted text-xs",
        renderCell: (props: RenderCellProps<JSONValue[], unknown>): ReactNode => {
          return (
            <details className="text-[10px]">
              <summary className="cursor-pointer select-none">More</summary>
              <div className="mt-1 max-h-36 overflow-auto rounded border border-border bg-background p-1">
                {hiddenColumnsInfo.map((hiddenCol) => {
                  const rawValue = props.row[hiddenCol.index];
                  return (
                    <div key={`${hiddenCol.index}-${props.rowIdx}`} className="mb-1">
                      <span className="font-semibold">{hiddenCol.title}:</span>{" "}
                      <span>{String(rawValue ?? "-")}</span>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        },
      });
    }

    return gridCols;
  }, [visibleColumnsInfo, isMobile, hiddenColumnsInfo, columnsInfo.length, handleSelectionToggle, indexCellRenderer, indexColumnWidth, rowSelection, showIndexColumn]);

  const noRowsFallback = useMemo(() => {
    return <div className="flex items-center justify-center h-full text-xl text-center bg-background text-foreground w-full cursor-default">No data to display</div>;
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
      "text-foreground w-full hover:bg-muted/60",
      "bg-muted/30"
    );
  }, []);

  const oddClass = useMemo(() => {
    return cn(
      "text-foreground w-full hover:bg-muted/60",
      "bg-transparent"
    );
  }, []);

  // todo use the above even/odd
  const rowClass = useCallback((row: JSONValue[], rowIdx: number) => {
    const isSelected = searchSet.has(rowIdx);
    const rowId = rowSelection?.getRowId(row, rowIdx);
    const isRowSelected = rowId !== null && rowId !== undefined && rowSelection?.selectedIds.has(rowId);
    const customRowClass = rowClassName?.(row, rowIdx);
    return cn(
      rowIdx % 2 === 0 ? evenClass : oddClass,
      isSelected ? "bg-blue-100 dark:bg-blue-700" : "",
      isRowSelected ? (rowSelection?.selectedRowClassName ?? "bg-blue-100/80 dark:bg-blue-900/30") : "",
      customRowClass
    );
  }, [searchSet, rowSelection, evenClass, oddClass, rowClassName]);

  const dataGrid = useMemo(() => {
    return <div className="border border-border rounded-md overflow-x-auto overflow-y-hidden text-xs bg-background">
      <DataGrid
        key={columnsInfo.length}
        className={`bg-transparent text-xs min-w-200`}
        style={{ height: '70vh', maxHeight: '70vh', flex: '1 1 auto' }}
        ref={table}
        columns={gridColumns}
        rows={data}
        sortColumns={sortColumns}
        onSortColumnsChange={handleSort}
        onColumnsReorder={onColumnsReorder}
        rowClass={rowClass}
        rowHeight={28}
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
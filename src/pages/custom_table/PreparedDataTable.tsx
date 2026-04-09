import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DataGridHandle } from "react-data-grid";

import type { JSONValue } from "@/lib/internaltypes";

import { DataTable, type ConfigColumns, type OrderIdx, type TableRowSelection } from "./DataTable";
import { TableToolbar, type TableColumnCustomization, type TableColumnCustomizationItem, type TableSourceSelectionCopy } from "./TableToolbar";
import { applyGenericColumnCustomization, createGenericColumnCustomizationItems, ensureConfigColumnIds, getStableConfigColumnId } from "./table_util";

function areRowsEquivalent(left: JSONValue[][], right: JSONValue[][]): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, index) => row === right[index]);
}

function areSortsEquivalent(left: OrderIdx | OrderIdx[] | undefined, right: OrderIdx | OrderIdx[] | undefined): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  const leftItems = Array.isArray(left) ? left : [left];
  const rightItems = Array.isArray(right) ? right : [right];
  if (leftItems.length !== rightItems.length) {
    return false;
  }

  return leftItems.every((item, index) => item.idx === rightItems[index]?.idx && item.dir === rightItems[index]?.dir);
}

function areColumnsEquivalent(left: ConfigColumns[], right: ConfigColumns[]): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((column, index) => {
    const other = right[index];
    return getStableConfigColumnId(column) === getStableConfigColumnId(other)
      && column.title === other.title
      && column.index === other.index
      && column.key === other.key
      && column.source === other.source
      && column.width === other.width
      && column.sortable === other.sortable
      && column.editable === other.editable
      && column.draggable === other.draggable
      && column.exportable === other.exportable
      && column.hideOnMobile === other.hideOnMobile
      && column.cellClassName === other.cellClassName
      && column.headerCellClassName === other.headerCellClassName
      && column.render === other.render;
  });
}

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
  sourceSelection,
  columnCustomization,
  showCustomize = showExports,
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
  sourceSelection?: TableSourceSelectionCopy;
  columnCustomization?: TableColumnCustomization;
  showCustomize?: boolean;
}) {
  const table = useRef<DataGridHandle>(null);
  const [dataState, setDataState] = useState(data);
  const [columnsState, setColumnsState] = useState(() => ensureConfigColumnIds(columnsInfo));
  const [sortState, setSortState] = useState<OrderIdx | OrderIdx[] | undefined>(sort);

  useEffect(() => {
    setDataState((current) => areRowsEquivalent(current, data) ? current : data);
  }, [data]);

  useEffect(() => {
    const nextColumns = ensureConfigColumnIds(columnsInfo);
    setColumnsState((current) => areColumnsEquivalent(current, nextColumns) ? current : nextColumns);
  }, [columnsInfo]);

  useEffect(() => {
    setSortState((current) => areSortsEquivalent(current, sort) ? current : sort);
  }, [sort]);

  const visibleColumns = useMemo(() => columnsState.map((column) => column.index), [columnsState]);
  const searchSet = useMemo(
    () => new Set<number>(highlightedRowIndexes ? Array.from(highlightedRowIndexes) : []),
    [highlightedRowIndexes],
  );
  const applyBasicCustomization = useCallback((items: TableColumnCustomizationItem[]) => {
    const nextColumns = applyGenericColumnCustomization(columnsState, items);
    setColumnsState((current) => areColumnsEquivalent(current, nextColumns) ? current : nextColumns);
  }, [columnsState]);

  const basicColumnCustomization = useMemo<TableColumnCustomization>(() => ({
    items: createGenericColumnCustomizationItems(columnsState),
    onApply: applyBasicCustomization,
  }), [applyBasicCustomization, columnsState]);
  const effectiveColumnCustomization = showCustomize
    ? (columnCustomization ?? basicColumnCustomization)
    : undefined;
  const getCustomizationItemsForColumns = useCallback((nextColumns: ConfigColumns[]) => {
    const defaultItems = createGenericColumnCustomizationItems(nextColumns);
    const currentItemsById = new Map((effectiveColumnCustomization?.items ?? []).map((item) => [item.id, item]));
    return defaultItems.map<TableColumnCustomizationItem>((item) => {
      const currentItem = currentItemsById.get(item.id);
      return currentItem ? {
        ...item,
        ...currentItem,
      } : item;
    });
  }, [effectiveColumnCustomization?.items]);
  const handleColumnsReorderCommitted = useCallback((_sourceColumnId: string, _targetColumnId: string, nextColumns: ConfigColumns[]) => {
    if (!effectiveColumnCustomization) {
      return;
    }

    effectiveColumnCustomization.onApply(getCustomizationItemsForColumns(nextColumns));
  }, [effectiveColumnCustomization, getCustomizationItemsForColumns]);
  const columnsReorderHandler = effectiveColumnCustomization ? handleColumnsReorderCommitted : undefined;

  return (
    <>
      <TableToolbar
        data={dataState}
        columns={columnsState}
        showCopy={showExports}
        sourceSelection={sourceSelection}
        rowSelection={rowSelection}
        columnCustomization={effectiveColumnCustomization}
      />
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
        onColumnsReorderCommitted={effectiveColumnCustomization ? columnsReorderHandler : undefined}
      />
    </>
  );
}
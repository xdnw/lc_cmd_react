import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useDialog, type ShowDialogArg } from "@/components/layout/DialogContext";
import Loading from "@/components/ui/loading";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { WebTable } from "@/lib/apitypes";
import { TABLE } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ClientColumnOverlay, ConfigColumns, ObjectColumnRender, OrderIdx } from "@/pages/custom_table/DataTable";
import type { TableColumnCustomization, TableColumnCustomizationItem } from "@/pages/custom_table/TableToolbar";
import { createTableInfo, formatColName, getStableConfigColumnId, normalizePlaceholderColumnExpression, toColumnMap, toPlaceholderColumnId, type TableUrlColumnInput, type PlaceholderType } from "@/pages/custom_table/table_util";

const DEFAULT_DIALOG_OPTIONS: ShowDialogArg = {
  openInNewTab: true,
  focusNewTab: true,
  replaceActive: false,
};

function areCustomizationItemsEqual(
  left: readonly TableColumnCustomizationItem[],
  right: readonly TableColumnCustomizationItem[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const other = right[index];
    return item.id === other.id
      && item.source === other.source
      && item.title === other.title
      && (item.rawTitle ?? null) === (other.rawTitle ?? null)
      && (item.value ?? "") === (other.value ?? "")
      && (item.valueEditable ?? false) === (other.valueEditable ?? false)
      && (item.titleEditable ?? false) === (other.titleEditable ?? false)
      && (item.removable ?? true) === (other.removable ?? true);
  });
}

function createPlaceholderTableDefaultItems(
  columnsInfo: readonly ConfigColumns[],
  hiddenColumnKeys: ReadonlySet<string>,
): TableColumnCustomizationItem[] {
  return columnsInfo
    .filter((column) => !hiddenColumnKeys.has((column.key ?? "").toLowerCase().trim()))
    .map<TableColumnCustomizationItem>((column) => {
      const columnId = getStableConfigColumnId(column);
      const isPlaceholder = column.source !== "client";
      return {
        id: columnId,
        source: isPlaceholder ? "placeholder" : "client",
        title: column.title,
        rawTitle: column.title,
        value: isPlaceholder ? column.key : undefined,
        valueEditable: isPlaceholder,
        titleEditable: true,
        removable: true,
      };
    });
}

function normalizePlaceholderTableCustomizationItems(
  items: readonly TableColumnCustomizationItem[],
  columnsInfo: readonly ConfigColumns[],
  defaultVisibleItems: readonly TableColumnCustomizationItem[],
): TableColumnCustomizationItem[] {
  const knownColumnsById = new Map(columnsInfo.map((column) => [getStableConfigColumnId(column), column]));
  const defaultItemsById = new Map(defaultVisibleItems.map((item) => [item.id, item]));
  const nextItems: TableColumnCustomizationItem[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    const normalizedValue = normalizePlaceholderColumnExpression(item.value ?? "");
    const normalizedId = knownColumnsById.has(item.id)
      ? item.id
      : normalizedValue
        ? toPlaceholderColumnId(normalizedValue)
        : item.id;

    if (seenIds.has(normalizedId)) {
      continue;
    }

    const knownColumn = knownColumnsById.get(normalizedId);
    if (knownColumn) {
      const defaultItem = defaultItemsById.get(normalizedId);
      const fallbackTitle = defaultItem?.title ?? knownColumn.title;
      const isPlaceholder = knownColumn.source !== "client";
      nextItems.push({
        id: normalizedId,
        source: isPlaceholder ? "placeholder" : "client",
        title: fallbackTitle,
        rawTitle: (item.rawTitle ?? item.title ?? fallbackTitle).trim() || fallbackTitle,
        value: isPlaceholder ? knownColumn.key : undefined,
        valueEditable: isPlaceholder,
        titleEditable: true,
        removable: true,
      });
      seenIds.add(normalizedId);
      continue;
    }

    if (!normalizedValue) {
      continue;
    }

    const fallbackTitle = formatColName(normalizedValue);
    nextItems.push({
      id: toPlaceholderColumnId(normalizedValue),
      source: "placeholder",
      title: fallbackTitle,
      rawTitle: (item.rawTitle ?? item.title ?? fallbackTitle).trim() || fallbackTitle,
      value: normalizedValue,
      valueEditable: true,
      titleEditable: true,
      removable: true,
    });
    seenIds.add(toPlaceholderColumnId(normalizedValue));
  }

  return nextItems;
}

function resolveCustomizationItemTitle(item: TableColumnCustomizationItem, fallback: string): string {
  const title = (item.rawTitle ?? item.title).trim();
  return title || fallback;
}

function PlaceholderTableDialogContent({
  type,
  selection,
  columns,
  sort,
  showIndexColumn,
  columnRenderers,
  clientColumns,
  hiddenColumns,
}: {
  type: PlaceholderType;
  selection: string;
  columns: readonly TableUrlColumnInput[];
  sort?: OrderIdx | OrderIdx[];
  showIndexColumn: boolean;
  columnRenderers?: Record<string, string | ObjectColumnRender>;
  clientColumns?: ClientColumnOverlay[];
  hiddenColumns?: readonly string[];
}) {
  const [customizationItems, setCustomizationItems] = useState<TableColumnCustomizationItem[] | null>(null);
  const hiddenColumnKeys = useMemo(
    () => new Set((hiddenColumns ?? []).map((column) => column.toLowerCase().trim())),
    [hiddenColumns],
  );
  const baseColumns = useMemo(() => toColumnMap(columns), [columns]);
  const extraPlaceholderColumns = useMemo(() => {
    if (!customizationItems) {
      return [] as string[];
    }

    const nextColumns: string[] = [];
    const seen = new Set<string>();
    for (const item of customizationItems) {
      if (item.source !== "placeholder") {
        continue;
      }

      const normalizedValue = normalizePlaceholderColumnExpression(item.value ?? "");
      if (!normalizedValue || baseColumns.has(normalizedValue) || seen.has(normalizedValue)) {
        continue;
      }

      seen.add(normalizedValue);
      nextColumns.push(normalizedValue);
    }

    return nextColumns;
  }, [baseColumns, customizationItems]);
  const requestedColumns = useMemo(() => {
    const nextColumns = new Map(baseColumns);
    for (const column of extraPlaceholderColumns) {
      if (!nextColumns.has(column)) {
        nextColumns.set(column, null);
      }
    }
    return nextColumns;
  }, [baseColumns, extraPlaceholderColumns]);
  const queryArgs = useMemo(() => ({
    type,
    selection_str: selection,
    columns: Array.from(requestedColumns.keys()),
  }), [requestedColumns, selection, type]);

  const tableQuery = useQuery({
    ...bulkQueryOptions(TABLE.endpoint, queryArgs),
    enabled: selection.trim().length > 0,
  });

  const tableInfo = useMemo(() => {
    const table = tableQuery.data?.data as WebTable | null | undefined;
    if (!table) {
      return null;
    }

    return createTableInfo(table, sort, requestedColumns, clientColumns ?? [], columnRenderers);
  }, [clientColumns, columnRenderers, requestedColumns, sort, tableQuery.data?.data]);
  const allColumnsInfo = useMemo(() => tableInfo?.columnsInfo ?? [], [tableInfo]);
  const defaultCustomizationItems = useMemo(
    () => createPlaceholderTableDefaultItems(allColumnsInfo, hiddenColumnKeys),
    [allColumnsInfo, hiddenColumnKeys],
  );

  useEffect(() => {
    if (allColumnsInfo.length === 0) {
      return;
    }

    setCustomizationItems((current) => {
      const nextItems = current
        ? normalizePlaceholderTableCustomizationItems(current, allColumnsInfo, defaultCustomizationItems)
        : defaultCustomizationItems;

      if (current && areCustomizationItemsEqual(current, nextItems)) {
        return current;
      }

      return nextItems;
    });
  }, [allColumnsInfo, defaultCustomizationItems]);

  const effectiveCustomizationItems = customizationItems ?? defaultCustomizationItems;
  const columnsById = useMemo(
    () => new Map(allColumnsInfo.map((column) => [getStableConfigColumnId(column), column])),
    [allColumnsInfo],
  );
  const displayedColumns = useMemo(() => effectiveCustomizationItems
    .map<ConfigColumns | null>((item) => {
      const normalizedValue = normalizePlaceholderColumnExpression(item.value ?? "");
      const column = columnsById.get(item.id)
        ?? (normalizedValue ? columnsById.get(toPlaceholderColumnId(normalizedValue)) : undefined);
      if (!column) {
        return null;
      }

      return {
        ...column,
        title: resolveCustomizationItemTitle(item, column.title),
      } satisfies ConfigColumns;
    })
    .filter((column): column is ConfigColumns => Boolean(column)), [columnsById, effectiveCustomizationItems]);
  const handleApplyCustomization = useCallback((nextItems: TableColumnCustomizationItem[]) => {
    setCustomizationItems((current) => {
      const normalizedItems = normalizePlaceholderTableCustomizationItems(nextItems, allColumnsInfo, defaultCustomizationItems);
      return current && areCustomizationItemsEqual(current, normalizedItems) ? current : normalizedItems;
    });
  }, [allColumnsInfo, defaultCustomizationItems]);
  const columnCustomization = useMemo<TableColumnCustomization>(() => ({
    items: effectiveCustomizationItems,
    composer: {
      placeholderType: type,
    },
    onApply: handleApplyCustomization,
  }), [effectiveCustomizationItems, handleApplyCustomization, type]);

  if (tableQuery.isLoading) {
    return (
      <div className="py-8">
        <Loading variant="ripple" />
      </div>
    );
  }

  if (tableQuery.error || !tableInfo) {
    return <div className="text-sm text-destructive">Failed to load table data.</div>;
  }

  if (tableInfo.data.length === 0) {
    return <div className="text-sm text-muted-foreground">No rows matched this selection.</div>;
  }

  return (
    <PreparedDataTable
      columnsInfo={displayedColumns}
      data={tableInfo.data}
      sort={sort}
      showExports={false}
      showIndexColumn={showIndexColumn}
      columnCustomization={columnCustomization}
    />
  );
}

type PlaceholderTableDialogButtonProps = Omit<ButtonProps, "children"> & {
  title: string;
  typeName: PlaceholderType;
  selection: string;
  columns: readonly TableUrlColumnInput[];
  sort?: OrderIdx | OrderIdx[];
  dialogOptions?: ShowDialogArg;
  showIndexColumn?: boolean;
  columnRenderers?: Record<string, string | ObjectColumnRender>;
  clientColumns?: ClientColumnOverlay[];
  hiddenColumns?: readonly string[];
  children: ButtonProps["children"];
};

export default function PlaceholderTableDialogButton({
  title,
  typeName,
  selection,
  columns,
  sort,
  dialogOptions = DEFAULT_DIALOG_OPTIONS,
  showIndexColumn = false,
  columnRenderers,
  clientColumns,
  hiddenColumns,
  children,
  type = "button",
  onClick,
  ...buttonProps
}: PlaceholderTableDialogButtonProps) {
  const { showDialog } = useDialog();
  const handleClick = useCallback<NonNullable<ButtonProps["onClick"]>>((event) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    showDialog(
      title,
      <PlaceholderTableDialogContent
        type={typeName}
        selection={selection}
        columns={columns}
        sort={sort}
        showIndexColumn={showIndexColumn}
        columnRenderers={columnRenderers}
        clientColumns={clientColumns}
        hiddenColumns={hiddenColumns}
      />,
      dialogOptions,
    );
  }, [clientColumns, columnRenderers, columns, dialogOptions, hiddenColumns, onClick, selection, showDialog, showIndexColumn, sort, title, typeName]);

  return (
    <Button
      type={type}
      onClick={handleClick}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}

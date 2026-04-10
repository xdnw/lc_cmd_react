import { downloadCells, ExportType } from "../../utils/StringUtil";
import { DEFAULT_TABS } from "../../lib/layouts";
import { WebTable, WebTableError } from '@/lib/apitypes';
import { getRenderer, isHtmlRenderer } from '@/components/ui/renderers';
import { ReactNode } from 'react';
import { CM, STRIP_PREFIXES, getTypeBreakdown, type TypeBreakdown } from '@/utils/Command';
import { TableInfo } from './AbstractTable';
import type { ClientColumnOverlay, ConfigColumns, ObjectColumnRender, OrderIdx } from "./DataTable";
import type { TableColumnCustomizationItem } from "./TableToolbar";
import { JSONValue } from "@/lib/internaltypes";
import { sortData, toSortColumns } from "./sort";
import { toSelAndModifierString } from "@/lib/selection";

export type PlaceholderType = Parameters<typeof CM.placeholders>[0];
export type TableUrlColumnInput = string | readonly [string, string];

const PLACEHOLDER_COLUMN_ID_PREFIX = "placeholder:";
const CLIENT_COLUMN_ID_PREFIX = "client:";

type TableUrlColumnsInput = Map<string, string | null> | readonly TableUrlColumnInput[];

type TablePageUrlOptions = {
    type: string;
    columns: TableUrlColumnsInput;
    sort?: OrderIdx | OrderIdx[];
    sel?: string;
    selAndModifiers?: { [key: string]: string };
};

function parseUrlColumn(column: TableUrlColumnInput): [string, string | null] {
    if (typeof column !== "string") {
        return [column[0], column[1] || null];
    }

    const separatorIndex = column.indexOf(";");
    if (separatorIndex < 0) {
        return [column, null];
    }

    const key = column.slice(0, separatorIndex);
    const value = column.slice(separatorIndex + 1);
    return [key, value || null];
}

export function toColumnMap(columns: TableUrlColumnsInput): Map<string, string | null> {
    if (columns instanceof Map) {
        return new Map(columns);
    }

    return new Map(columns.map((column) => parseUrlColumn(column)));
}

function getTablePageUrl(page: "custom_table" | "view_table", { type, sel, selAndModifiers, columns, sort }: TablePageUrlOptions): string {
    return `${process.env.BASE_PATH}${page}?${getQueryString({
        type,
        sel,
        selAndModifiers,
        columns: toColumnMap(columns),
        sort,
    })}`;
}

export function createTableInfo(
    newData: WebTable,
    sort: OrderIdx | OrderIdx[] | undefined,
    columns: Map<string, string | null>,
    clientColumns: ClientColumnOverlay[] = [],
    columnRenderers?: Record<string, string | ObjectColumnRender>,
    columnOrder?: readonly string[],
): TableInfo {
    const errors: WebTableError[] = newData.errors ?? [];
    const sortColumns = toSortColumns(sort);

    const header: string[] = columns.size > 0 ? Array.from(columns).map(([key, value]) => value ?? key) : newData.cells[0] as string[];
    let data = newData.cells.slice(1);
    const renderFuncNames = newData.renderers;
    const columnKeys = Array.from(columns.keys());
    let columnsInfo: ConfigColumns[] = header.map((col: string, index: number) => {
        const overrideRenderer = resolveColumnRendererOverride(columnRenderers, columnKeys[index], col);
        const backendRenderer = renderFuncNames ? getRenderer(renderFuncNames[index]) : undefined;

        return {
            title: formatColName(col),
            index: index,
            key: columnKeys[index],
            columnId: columnKeys[index] ? toPlaceholderColumnId(columnKeys[index]) : undefined,
            source: "placeholder",
            // Explicit client renderer overrides backend renderer metadata when provided.
            render: overrideRenderer ?? backendRenderer,
        };
    });

    const sorted = (!sort || (Array.isArray(sort) && sort.length === 0) || data.length <= 1) ? undefined : sortData(data, sortColumns, columnsInfo);
    if (sorted) {
        data = sorted.data;
        columnsInfo = sorted.columns;
    }

    const withClientColumns = applyClientColumns(data, columnsInfo, clientColumns);
    data = withClientColumns.data;
    columnsInfo = applyColumnOrder(withClientColumns.columnsInfo, columnOrder);

    const visibleColumns = Array.from(Array(columnsInfo.length).keys());
    // searchSet
    const searchSet: Set<number> = new Set<number>();

    return {
        errors: errors,
        columnsInfo: columnsInfo,
        data: data,
        visibleColumns: visibleColumns,
        searchSet: searchSet,
        sort: sort
    };
}

export function toPlaceholderColumnId(key: string): string {
    return `${PLACEHOLDER_COLUMN_ID_PREFIX}${key}`;
}

export function toClientColumnId(id: string): string {
    return `${CLIENT_COLUMN_ID_PREFIX}${id}`;
}

export function getConfigColumnId(column: ConfigColumns): string | undefined {
    if (column.columnId) {
        return column.columnId;
    }

    if (column.key) {
        return toPlaceholderColumnId(column.key);
    }

    return undefined;
}

export function getStableConfigColumnId(column: ConfigColumns): string {
    return getConfigColumnId(column) ?? `column:${column.index}`;
}

export function ensureConfigColumnIds(columnsInfo: ConfigColumns[]): ConfigColumns[] {
    return columnsInfo.map((column) => {
        const columnId = getStableConfigColumnId(column);
        if (column.columnId === columnId) {
            return column;
        }

        return {
            ...column,
            columnId,
        };
    });
}

export function createGenericColumnCustomizationItems(columnsInfo: readonly ConfigColumns[]): TableColumnCustomizationItem[] {
    return columnsInfo.map<TableColumnCustomizationItem>((column) => ({
        id: getStableConfigColumnId(column),
        source: column.source ?? "column",
        title: column.title,
        rawTitle: column.title,
        value: column.key,
        titleEditable: true,
        removable: true,
    }));
}

export function normalizeGenericColumnCustomizationItems(
    items: readonly TableColumnCustomizationItem[],
    availableColumnsInfo: readonly ConfigColumns[],
    defaultVisibleItems: readonly TableColumnCustomizationItem[],
): TableColumnCustomizationItem[] {
    const availableItems = createGenericColumnCustomizationItems(availableColumnsInfo);
    const availableItemsById = new Map(availableItems.map((item) => [item.id, item]));
    const normalizedItems: TableColumnCustomizationItem[] = [];
    const seenIds = new Set<string>();

    for (const item of items) {
        const availableItem = availableItemsById.get(item.id);
        if (!availableItem || seenIds.has(availableItem.id)) {
            continue;
        }

        seenIds.add(availableItem.id);
        normalizedItems.push({
            ...availableItem,
            rawTitle: (item.rawTitle ?? item.title ?? availableItem.rawTitle ?? availableItem.title).trim() || availableItem.title,
        });
    }

    if (normalizedItems.length > 0) {
        return normalizedItems;
    }

    return defaultVisibleItems.map((item) => ({ ...item }));
}

export function applyGenericColumnCustomization(
    columnsInfo: readonly ConfigColumns[],
    items: readonly TableColumnCustomizationItem[],
    availableColumnsInfo: readonly ConfigColumns[] = columnsInfo,
): ConfigColumns[] {
    const currentColumnsById = new Map(availableColumnsInfo.map((column) => [getStableConfigColumnId(column), column]));
    const nextColumns = items
        .map((item) => {
            const column = currentColumnsById.get(item.id);
            if (!column) {
                return null;
            }

            const nextTitle = (item.rawTitle ?? item.title).trim();
            return {
                ...column,
                title: nextTitle || column.title,
            } satisfies ConfigColumns;
        })
        .filter((column): column is ConfigColumns => Boolean(column));

    return ensureConfigColumnIds(nextColumns);
}

export function normalizePlaceholderColumnExpression(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    if (trimmed.includes("{") || trimmed.includes("}")) {
        return trimmed;
    }

    return `{${trimmed}}`;
}

export function getPlaceholderStringFunctionType(placeholderType: PlaceholderType): string {
    return `TypedFunction<${placeholderType},String>`;
}

export function getExpressionBreakdown(type: string): TypeBreakdown {
    return getTypeBreakdown(CM, type);
}

export function getPlaceholderStringFunctionBreakdown(placeholderType: PlaceholderType): TypeBreakdown {
    return getExpressionBreakdown(getPlaceholderStringFunctionType(placeholderType));
}

export function applyColumnOrder(columnsInfo: ConfigColumns[], columnOrder?: readonly string[]): ConfigColumns[] {
    if (!columnOrder || columnOrder.length === 0) {
        return columnsInfo;
    }

    const columnsById = new Map<string, ConfigColumns>();
    for (const column of columnsInfo) {
        const columnId = getConfigColumnId(column);
        if (!columnId) {
            continue;
        }
        columnsById.set(columnId, column);
    }

    if (columnsById.size === 0) {
        return columnsInfo;
    }

    const orderedColumns: ConfigColumns[] = [];
    const usedColumnIds = new Set<string>();

    for (const columnId of columnOrder) {
        const column = columnsById.get(columnId);
        if (!column) {
            continue;
        }

        orderedColumns.push(column);
        usedColumnIds.add(columnId);
    }

    for (const column of columnsInfo) {
        const columnId = getConfigColumnId(column);
        if (columnId && usedColumnIds.has(columnId)) {
            continue;
        }
        orderedColumns.push(column);
    }

    return orderedColumns;
}

export function moveColumnOrderItem(columnOrder: readonly string[], sourceId: string, targetId: string): string[] {
    const next = [...columnOrder];
    const sourceIndex = next.indexOf(sourceId);
    const targetIndex = next.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return next;
    }

    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
}

export function remapSortByColumnIds(
    sort: OrderIdx | OrderIdx[] | undefined,
    previousColumnIds: readonly string[],
    nextColumnIds: readonly string[],
): OrderIdx | OrderIdx[] | undefined {
    if (!sort) {
        return undefined;
    }

    const previousIdByIndex = new Map<number, string>();
    previousColumnIds.forEach((columnId, index) => {
        previousIdByIndex.set(index, columnId);
    });

    const nextIndexById = new Map<string, number>();
    nextColumnIds.forEach((columnId, index) => {
        nextIndexById.set(columnId, index);
    });

    const sortItems = Array.isArray(sort) ? sort : [sort];
    const nextSortItems = sortItems
        .map((sortItem) => {
            const columnId = previousIdByIndex.get(sortItem.idx);
            if (!columnId) {
                return null;
            }

            const nextIndex = nextIndexById.get(columnId);
            if (nextIndex === undefined) {
                return null;
            }

            return {
                idx: nextIndex,
                dir: sortItem.dir,
            } satisfies OrderIdx;
        })
        .filter((sortItem): sortItem is OrderIdx => Boolean(sortItem));

    if (nextSortItems.length === 0) {
        return undefined;
    }

    if (Array.isArray(sort)) {
        return nextSortItems;
    }

    return nextSortItems[0];
}

export function reorderColumnMap(columns: Map<string, string | null>, orderedColumnIds: readonly string[]): Map<string, string | null> {
    if (orderedColumnIds.length === 0 || columns.size === 0) {
        return columns;
    }

    const orderedEntries: Array<[string, string | null]> = [];
    const usedKeys = new Set<string>();

    for (const columnId of orderedColumnIds) {
        if (!columnId.startsWith(PLACEHOLDER_COLUMN_ID_PREFIX)) {
            continue;
        }

        const key = columnId.slice(PLACEHOLDER_COLUMN_ID_PREFIX.length);
        if (!columns.has(key)) {
            continue;
        }

        orderedEntries.push([key, columns.get(key) ?? null]);
        usedKeys.add(key);
    }

    if (orderedEntries.length === 0) {
        return columns;
    }

    for (const [key, value] of columns) {
        if (usedKeys.has(key)) {
            continue;
        }
        orderedEntries.push([key, value]);
    }

    return new Map(orderedEntries);
}

export function getColumnOrder(columnsInfo: readonly ConfigColumns[]): string[] {
    return columnsInfo
        .map((column) => getConfigColumnId(column))
        .filter((columnId): columnId is string => Boolean(columnId));
}

export function getReactSlots(columnsInfo: ConfigColumns[]): { [key: number]: ((data: unknown, row: unknown, rowData: object[]) => ReactNode) } | undefined {
    const reactSlots: { [key: number]: (data: unknown, row: unknown, rowData: object[]) => ReactNode } = {};
    for (let i = 0; i < columnsInfo.length; i++) {
        const col = columnsInfo[i];
        if (col.render && isHtmlRenderer(col.render as ObjectColumnRender)) {
            const tmpRender = ((col.render as ObjectColumnRender).display) as ((data: object) => ReactNode);
            col.render = undefined;
            reactSlots[i + 1] = (data, row, rowData: object[]) => tmpRender(rowData[i]);
        }
    }
    return reactSlots ? reactSlots : undefined;
}

export function formatColName(str: string): string {
    if (str.includes("{")) {
        for (const prefix of STRIP_PREFIXES) {
            if (str.includes("{" + prefix)) {
                str = str.replace("{" + prefix, "{");
            }
        }
        return str.replace("{", "").replace("}", "");
    } else {
        return str;
    }
}

export function downloadTableData(data: JSONValue[][], columns: ConfigColumns[], useClipboard: boolean, type: ExportType): [string, string] {
    const exportableColumns = columns.filter((col) => col.exportable !== false);
    const columnsToExport = exportableColumns.length > 0 ? exportableColumns : columns;
    const header = columnsToExport.map((col) => col.title);
    const rows = data.map((row) => {
        return columnsToExport.map((col) => row[col.index]);
    });
    const combinedData = [header, ...rows];
    return downloadCells(combinedData as (string | number)[][], useClipboard, type);
}

export function getTypeFromUrl(params: URLSearchParams): PlaceholderType | undefined {
    const rawType = params.get('type');
    if (!rawType) return undefined;
    if (!(rawType in CM.data.placeholders)) return undefined;
    return rawType as PlaceholderType;
}

export function getSelectionFromUrl(params: URLSearchParams, current: PlaceholderType | undefined): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    const defaultSelections = current ? DEFAULT_TABS[current]?.selections : undefined;
    const fallbackSelection = defaultSelections?.All ?? Object.values(defaultSelections ?? {})[0];
    result[""] = params.get('sel') ?? fallbackSelection ?? "*";
    const ignore: Set<string> = new Set(["type", "sel", "col", "sort"]);
    for (const [key, value] of params.entries()) {
        if (!ignore.has(key) && key) {
            result[key] = value;
        }
    }
    return result;
}

export function getColumnsFromUrl(params: URLSearchParams): Map<string, string | null> | undefined {
    const urlCols: { [key: string]: string | null } = Object.fromEntries(
        params.getAll('col').map(colParam => {
            const [key, value] = colParam.split(';');
            return [key, value || null];
        })
    );
    return Object.keys(urlCols).length > 0 ? new Map(Object.entries(urlCols)) : undefined;
}

export function getSortFromUrl(params: URLSearchParams): OrderIdx | OrderIdx[] | undefined {
    const urlSort = params.getAll('sort').map(sortParam => {
        const [idx, dir] = sortParam.split(';');
        return { idx: parseInt(idx, 10), dir: dir as 'asc' | 'desc' };
    });
    return urlSort.length > 0 ? urlSort : undefined;
}

export function getUrl(type: string, selection: string, columns: string[], sort?: OrderIdx | OrderIdx[]): string {
    return getTablePageUrl("custom_table", {
        type,
        sel: selection,
        columns,
        sort: sort ?? { idx: 0, dir: "asc" },
    });
}

export function getViewTableUrl({ type, sel, selAndModifiers, columns, sort }: TablePageUrlOptions): string {
    return getTablePageUrl("view_table", {
        type,
        sel,
        selAndModifiers,
        columns,
        sort,
    });
}

export function toLegacySelection(type: string, selection: { [key: string]: string }): string {
    const baseSelection = selection[""] ?? "";
    const modifiers = Object.entries(selection)
        .filter(([key]) => key !== "")
        .map(([key, value]) => `${key}:${value}`)
        .join(",");

    return modifiers ? `${type}(${modifiers}):${baseSelection}` : `${type}:${baseSelection}`;
}

export { toSelAndModifierString };

export function getQueryString(
    { type, sel, selAndModifiers, columns, sort }: {
        type: string,
        sel?: string,
        selAndModifiers?: { [key: string]: string },
        columns: Map<string, string | null>,
        sort: OrderIdx | OrderIdx[] | undefined
    }
) {
    const params = new URLSearchParams();
    params.set('type', type);
    if (sel) params.set('sel', sel);
    else if (selAndModifiers) {
        for (const [key, value] of Object.entries(selAndModifiers)) {
            if (value) {
                params.append(key === "" ? "sel" : key, value);
            } else {
                // sel = value
                params.set('sel', value);
            }
        }
    }
    columns.forEach((value, key) => {
        params.append('col', value ? `${key};${value}` : key);
    });
    if (sort) {
        if (Array.isArray(sort)) {
            for (const sortItem of sort) {
                params.append('sort', `${sortItem.idx};${sortItem.dir}`);
            }
        } else {
            params.append('sort', `${sort.idx};${sort.dir}`);
        }
    }
    return params.toString();
}

function applyClientColumns(
    data: JSONValue[][],
    columnsInfo: ConfigColumns[],
    clientColumns: ClientColumnOverlay[]
): { data: JSONValue[][], columnsInfo: ConfigColumns[] } {
    if (!clientColumns.length) {
        return { data, columnsInfo };
    }

    const baseIndex = columnsInfo.length > 0
        ? Math.max(...columnsInfo.map((c) => c.index)) + 1
        : 0;

    const overlayColumns: ConfigColumns[] = clientColumns.map((overlay, index) => ({
        title: overlay.title,
        index: baseIndex + index,
        key: overlay.id,
        columnId: toClientColumnId(overlay.id),
        source: "client",
        render: overlay.render,
        sortable: overlay.sortable ?? false,
        exportable: overlay.exportable ?? false,
        editable: overlay.editable ?? false,
        draggable: overlay.draggable ?? false,
        width: overlay.width,
        hideOnMobile: overlay.hideOnMobile,
        cellClassName: overlay.cellClassName,
        headerCellClassName: overlay.headerCellClassName,
    }));

    const dataWithOverlays = data.map((row, rowIdx) => {
        const next = [...row];
        for (const overlay of clientColumns) {
            next.push(overlay.value ? overlay.value(row, rowIdx) : null);
        }
        return next;
    });

    const startColumns: ConfigColumns[] = [];
    const endColumns: ConfigColumns[] = [];
    const positionedColumns: Array<{ at: number, col: ConfigColumns }> = [];

    overlayColumns.forEach((col, idx) => {
        const pos = clientColumns[idx].position;
        if (pos === 'start') {
            startColumns.push(col);
        } else if (typeof pos === 'number' && Number.isFinite(pos)) {
            positionedColumns.push({ at: Math.max(0, Math.floor(pos)), col });
        } else {
            endColumns.push(col);
        }
    });

    let merged = [...startColumns, ...columnsInfo, ...endColumns];
    if (positionedColumns.length > 0) {
        positionedColumns.sort((a, b) => a.at - b.at);
        let offset = 0;
        for (const { at, col } of positionedColumns) {
            const insertAt = Math.min(merged.length, at + offset);
            merged = [...merged.slice(0, insertAt), col, ...merged.slice(insertAt)];
            offset += 1;
        }
    }

    return {
        data: dataWithOverlays,
        columnsInfo: merged,
    };
}

function resolveColumnRendererOverride(
    columnRenderers: Record<string, string | ObjectColumnRender> | undefined,
    columnKey: string | undefined,
    columnTitle: string | undefined,
): ObjectColumnRender | undefined {
    if (!columnRenderers) return undefined;
    const candidateKeys = [columnKey, columnTitle]
        .filter((value): value is string => Boolean(value))
        .map((value) => normalizeRendererLookupKey(value));
    if (candidateKeys.length === 0) return undefined;

    const entries = Object.entries(columnRenderers);
    const match = entries.find(([rendererKey]) => {
        const normalizedRendererKey = normalizeRendererLookupKey(rendererKey);
        return candidateKeys.includes(normalizedRendererKey);
    });
    if (!match) return undefined;

    const override = match[1];
    if (typeof override === "string") {
        return getRenderer(override);
    }
    return override;
}

function normalizeRendererLookupKey(value: string): string {
    const normalized = value.toLowerCase().trim();

    // For placeholder mentions, normalize away wrapping braces and argument lists.
    if (normalized.startsWith('{') && normalized.endsWith('}')) {
        const mention = normalized.slice(1, -1);
        return mention.replace(/\(.+\)$/, '');
    }

    // Keep aliases/titles intact so "Name (delta)" stays distinct.
    return normalized;
}

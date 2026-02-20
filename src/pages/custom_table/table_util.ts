import { COMMANDS } from "../../lib/commands";
import { downloadCells, ExportType } from "../../utils/StringUtil";
import { DEFAULT_TABS } from "../../lib/layouts";
import { WebTable, WebTableError } from '@/lib/apitypes';
import { getRenderer, isHtmlRenderer } from '@/components/ui/renderers';
import { ReactNode } from 'react';
import { AnyCommandPath, BaseCommand, CM, Command, STRIP_PREFIXES } from '@/utils/Command';
import { TableInfo } from './AbstractTable';
import { ClientColumnOverlay, ConfigColumns, ObjectColumnRender, OrderIdx } from "./DataTable";
import { JSONValue } from "@/lib/internaltypes";
import { sortData, toSortColumns } from "./sort";

export function createTableInfo(
    newData: WebTable,
    sort: OrderIdx | OrderIdx[] | undefined,
    columns: Map<string, string | null>,
    clientColumns: ClientColumnOverlay[] = [],
    columnRenderers?: Record<string, string | ObjectColumnRender>,
): TableInfo {
    const errors: WebTableError[] = newData.errors ?? [];
    const sortColumns = toSortColumns(sort);

    const header: string[] = columns.size > 0 ? Array.from(columns).map(([key, value]) => value ?? key) : newData.cells[0] as string[];
    let data = newData.cells.slice(1);
    const renderFuncNames = newData.renderers;
    const columnKeys = Array.from(columns.keys());
    let columnsInfo: ConfigColumns[] = header.map((col: string, index: number) => {
        const backendRenderer = renderFuncNames ? getRenderer(renderFuncNames[index]) : undefined;
        const overrideRenderer = backendRenderer
            ? undefined
            : resolveColumnRendererOverride(columnRenderers, columnKeys[index]);

        return {
            title: formatColName(col),
            index: index,
            render: backendRenderer ?? overrideRenderer,
        };
    });

    const sorted = (!sort || (Array.isArray(sort) && sort.length === 0) || data.length <= 1) ? undefined : sortData(data, sortColumns, columnsInfo);
    if (sorted) {
        data = sorted.data;
        columnsInfo = sorted.columns;
    }

    const withClientColumns = applyClientColumns(data, columnsInfo, clientColumns);
    data = withClientColumns.data;
    columnsInfo = withClientColumns.columnsInfo;

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

export function getColOptions(type: keyof typeof COMMANDS.placeholders, filter?: (f: BaseCommand) => boolean): [string, string][] {
    const commands: BaseCommand[] = CM.placeholders(type).getCommands();
    const result: [string, string][] = [];
    for (const value of commands) {
        if (filter && !filter(value)) {
            continue;
        }
        if (!value.hasRequiredArgument()) {
            result.push([value.name, value.command.desc]);
        }
    }
    return result;
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

export function getTypeFromUrl(params: URLSearchParams): keyof typeof COMMANDS.placeholders | undefined {
    return params.get('type') as keyof typeof COMMANDS.placeholders ?? undefined;
}

export function getSelectionFromUrl(params: URLSearchParams, current: keyof typeof COMMANDS.placeholders | undefined): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    result[""] = params.get('sel') ?? (current ? DEFAULT_TABS[current]!.selections.All : undefined) ?? "*";
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
    return `${process.env.BASE_PATH}custom_table?${getQueryString({
        type: type,
        sel: selection,
        columns: new Map(columns.map(col => [col, null])),
        sort: sort ? sort : { idx: 0, dir: "asc" }
    })}`;
}

export function toLegacySelection(type: string, selection: { [key: string]: string }): string {
    const baseSelection = selection[""] ?? "";
    const modifiers = Object.entries(selection)
        .filter(([key]) => key !== "")
        .map(([key, value]) => `(${key}: ${value})`)
        .join(" ");

    return modifiers ? `${type}:${baseSelection} [${modifiers}]` : `${type}:${baseSelection}`;
}

export function toSelAndModifierString(selAndModifiers: { [key: string]: string }): string | undefined {
    let sel = undefined;
    if (Object.keys(selAndModifiers).length === 1) {
        sel = selAndModifiers[""];
    } else if (Object.keys(selAndModifiers).length > 1) {
        sel = JSON.stringify(selAndModifiers);
    }
    return sel;
}

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
): ObjectColumnRender | undefined {
    if (!columnRenderers || !columnKey) return undefined;
    const key = normalizeRendererLookupKey(columnKey);
    const entries = Object.entries(columnRenderers);
    const match = entries.find(([rendererKey]) => normalizeRendererLookupKey(rendererKey) === key);
    if (!match) return undefined;

    const override = match[1];
    if (typeof override === "string") {
        return getRenderer(override);
    }
    return override;
}

function normalizeRendererLookupKey(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/^\{/, "")
        .replace(/\}$/, "")
        .replace(/\(.+\)$/, "");
}

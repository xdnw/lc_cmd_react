import { useSession } from "@/components/api/SessionContext";
import { Button } from "@/components/ui/button";
import { VIRTUALCONFLICTS } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import { bulkQueryOptions } from "@/lib/queries";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ConfigColumns, TableRowSelection, TableRowSelectionId } from "@/pages/custom_table/DataTable";
import BulkActionsToolbar from "@/pages/custom_table/actions/BulkActionsToolbar";
import { RENDERERS } from "@/components/ui/renderers";
import { usePermission } from "@/utils/PermUtil";
import { serializeIdSet, useIdSelection } from "@/utils/useIdSelection";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConflictPageNav from "./ConflictPageNav";
import TemporaryConflictActionsDialogButton from "./TemporaryConflictActionsDialogButton";
import {
    CONFLICT_EDIT_PERMISSION_PATH,
    CONFLICT_SYNC_PERMISSION_PATH,
} from "./conflictActions";
import {
    createTemporaryConflictBulkActions,
    createTemporaryConflictRowActions,
    type TemporaryConflictBulkAction,
    type TemporaryConflictRowAction,
} from "./temporaryConflictActions";
import { mapTemporaryConflictRows, type TemporaryConflictRow } from "./temporaryConflictTableSchema";
import { useConflictAutoOpen } from "./useConflictAutoOpen";

const syncPermissionKey = CONFLICT_SYNC_PERMISSION_PATH.join(" ");
const editPermissionKey = CONFLICT_EDIT_PERMISSION_PATH.join(" ");

type Mode = "mine" | "all";

function toQueryArgs(mode: Mode): { readonly [key: string]: string | string[] } {
    if (mode === "all") {
        return { all: "true" };
    }
    return {};
}

function buildColumns(
    selectedIds: Set<string>,
    onToggleRowSelection: (rowKey: string, rowIdx: number, shiftKey: boolean) => void,
    rowActions: readonly TemporaryConflictRowAction[],
    canRunTableAction: (action: TemporaryConflictRowAction | TemporaryConflictBulkAction) => boolean,
    canEditActions: boolean,
    onActionSuccess: (actionId: string) => void,
    rowsByKey: ReadonlyMap<string, TemporaryConflictRow>,
    registerConflictOpener: (keys: readonly string[], open: (() => void) | null) => void,
): ConfigColumns[] {
    return [
        {
            title: "Nation ID",
            index: 1,
            sortable: true,
            editable: false,
            draggable: true,
        },
        {
            title: "Date",
            index: 2,
            sortable: true,
            editable: false,
            draggable: true,
            render: {
                display: (value) => {
                    const renderer = RENDERERS.time_ms?.display;
                    if (!renderer) return String(value ?? "-");
                    return renderer(Number(value ?? 0));
                },
            },
        },
        {
            title: "Conflict",
            index: 3,
            sortable: false,
            editable: false,
            draggable: false,
            render: {
                display: (value) => {
                    const rowKey = String(value ?? "");
                    const row = rowsByKey.get(rowKey);
                    if (!row) return "-";

                    return (
                        <div className="flex items-center gap-1 justify-end sm:justify-start">
                            <TemporaryConflictActionsDialogButton
                                row={row}
                                rowLabel={row.meta.uuid}
                                selectedIds={selectedIds}
                                actions={rowActions}
                                canRunAction={canRunTableAction}
                                canEdit={canEditActions}
                                onActionSuccess={onActionSuccess}
                                onOpenReady={registerConflictOpener}
                            />
                        </div>
                    );
                },
            },
        },
    ];
}

export default function TemporaryConflicts() {
    const queryClient = useQueryClient();
    const {
        selectedIds,
        count,
        has,
        addMany,
        removeMany,
        setOne,
        setSelectedIds,
        clear,
    } = useIdSelection<string>();
    const { session } = useSession();

    const { permission: syncPermission, error: syncPermissionError } = usePermission(CONFLICT_SYNC_PERMISSION_PATH, { showDialogOnError: false });
    const { permission: editPermission, error: editPermissionError } = usePermission(CONFLICT_EDIT_PERMISSION_PATH, { showDialogOnError: false });
    const isLoggedIn = Boolean(session?.user_valid || session?.nation_valid || session?.registered);

    const [mode, setMode] = useState<Mode>("mine");
    const [renderedRowKeys, setRenderedRowKeys] = useState<string[]>([]);
    const temporaryConflictOpenersRef = useRef(new Map<string, () => void>());
    const { targetConflictId, autoOpenIfAvailable } = useConflictAutoOpen();

    const queryArgs = useMemo(() => toQueryArgs(mode), [mode]);
    const { data, isFetching, isError, error } = useQuery(
        bulkQueryOptions(VIRTUALCONFLICTS.endpoint, queryArgs),
    );

    const parsedRows = useMemo(() => {
        return mapTemporaryConflictRows(data?.data);
    }, [data?.data]);

    const rows = parsedRows.rows;

    const rowsByKey = useMemo(() => {
        return new Map(rows.map((row) => [row.key, row]));
    }, [rows]);

    const tableRows = useMemo<JSONValue[][]>(() => {
        return rows.map((row) => [
            row.key,
            row.meta.nationId,
            row.dateModified,
            row.key,
        ]);
    }, [rows]);

    const [dataState, setDataState] = useState<JSONValue[][]>([]);

    useEffect(() => {
        setDataState(tableRows);
    }, [tableRows]);

    const canSync = Boolean(syncPermission?.success);
    const canEdit = Boolean(editPermission?.success);
    const canEditMine = mode === "mine" && isLoggedIn;

    const resolveActionPermission = useCallback((permissionPath?: readonly string[]) => {
        if (!permissionPath) return true;
        const key = permissionPath.join(" ");
        if (key === syncPermissionKey) return canSync;
        if (key === editPermissionKey) return canEdit || canEditMine;
        return false;
    }, [canEdit, canEditMine, canSync]);

    const canRunTableAction = useCallback((action: TemporaryConflictRowAction | TemporaryConflictBulkAction) => {
        return resolveActionPermission(action.permission);
    }, [resolveActionPermission]);

    const bulkActions = useMemo(() => {
        return createTemporaryConflictBulkActions();
    }, []);

    const rowActions = useMemo(() => {
        return createTemporaryConflictRowActions();
    }, []);

    const registerConflictOpener = useCallback((keys: readonly string[], open: (() => void) | null) => {
        const openers = temporaryConflictOpenersRef.current;
        let registeredNewOpener = false;

        for (const key of keys) {
            if (!key) continue;
            if (!open) {
                openers.delete(key);
                continue;
            }

            if (openers.get(key) !== open) {
                openers.set(key, open);
                registeredNewOpener = true;
            }
        }

        if (registeredNewOpener && targetConflictId) {
            autoOpenIfAvailable((targetId) => {
                return temporaryConflictOpenersRef.current.get(targetId);
            });
        }
    }, [autoOpenIfAvailable, targetConflictId]);

    useEffect(() => {
        if (!targetConflictId) return;
        autoOpenIfAvailable((targetId) => {
            return temporaryConflictOpenersRef.current.get(targetId);
        });
    }, [autoOpenIfAvailable, targetConflictId]);

    const onActionSuccess = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: [VIRTUALCONFLICTS.endpoint.name, queryArgs],
            exact: true,
        });
    }, [queryArgs, queryClient]);

    const selectAllVisible = useCallback(() => {
        addMany(renderedRowKeys);
    }, [addMany, renderedRowKeys]);
    const rowSelection = useMemo<TableRowSelection>(() => ({
        getRowId: (row: JSONValue[]) => {
            const rowKey = String(row[0] ?? "");
            return rowKey.length > 0 ? rowKey : null;
        },
        selectedIds,
        onSelectedIdsChange: (nextSelectedIds: Set<TableRowSelectionId>) => {
            setSelectedIds(new Set(Array.from(nextSelectedIds).filter((id): id is string => typeof id === "string")));
        },
        onVisibleIdsChange: (nextVisibleIds: TableRowSelectionId[]) => {
            setRenderedRowKeys(nextVisibleIds.filter((id): id is string => typeof id === "string"));
        },
        getLabel: (id) => typeof id === "string" && selectedIds.has(id) ? `Deselect ${id}` : `Select ${id}`,
        copySelection: {
            label: "Copy selected temporary conflicts",
            serialize: (nextSelectedIds) => serializeIdSet(new Set(Array.from(nextSelectedIds).filter((id): id is string => typeof id === "string"))),
        },
        debugTagPrefix: "temporary-conflict-select",
    }), [selectedIds, setSelectedIds]);

    const [columnsInfo, setColumnsInfo] = useState<ConfigColumns[]>(() => []);
    const setMineMode = useCallback(() => setMode("mine"), []);
    const setAllMode = useCallback(() => setMode("all"), []);

    useEffect(() => {
        setColumnsInfo(buildColumns(selectedIds, () => undefined, rowActions, canRunTableAction, canEdit || canEditMine, onActionSuccess, rowsByKey, registerConflictOpener));
    }, [canEdit, canEditMine, canRunTableAction, onActionSuccess, registerConflictOpener, rowActions, rowsByKey, selectedIds]);

    const permissionErrors = useMemo(() => {
        const errors: string[] = [];
        if (syncPermissionError) errors.push(`Sync permission unavailable: ${syncPermissionError}`);
        if (editPermissionError) errors.push(`Edit permission unavailable: ${editPermissionError}`);
        return errors;
    }, [editPermissionError, syncPermissionError]);

    return (
        <>
            <ConflictPageNav />

            {(permissionErrors.length > 0 || !isLoggedIn) && (
                <div className="mb-2 rounded border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm">
                    {!isLoggedIn && (
                        <div className="mb-1">
                            You are not logged in. Some actions are disabled. <Link to="/login" className="underline">Login</Link>
                        </div>
                    )}
                    {permissionErrors.map((message) => (
                        <div key={message} className="text-amber-900 dark:text-amber-200">{message}</div>
                    ))}
                </div>
            )}

            <BulkActionsToolbar<TemporaryConflictRow, string, TemporaryConflictBulkAction>
                title="Temporary Conflicts"
                selectedIds={selectedIds}
                actions={bulkActions}
                canRunAction={canRunTableAction}
                onActionSuccess={onActionSuccess}
                actionLayout="stacked"
            />

            <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button variant={mode === "mine" ? "default" : "outline"} size="sm" onClick={setMineMode}>Mine</Button>
                <Button variant={mode === "all" ? "default" : "outline"} size="sm" onClick={setAllMode}>All</Button>
                <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={renderedRowKeys.length === 0}>
                    Select visible
                </Button>
                <Button variant="outline" size="sm" onClick={clear} disabled={count === 0}>
                    Clear selected
                </Button>
            </div>

            {isError && (
                <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    Failed to load temporary conflicts for {mode === "all" ? "All" : "Mine"}: {String(error)}
                </div>
            )}

            {parsedRows.droppedRows > 0 && (
                <div className="mb-2 rounded border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                    {parsedRows.droppedRows} row(s) were skipped because required temporary conflict metadata was missing.
                </div>
            )}

            {isFetching && (
                <div className="mb-2 text-xs text-muted-foreground">Loading temporary conflicts...</div>
            )}

            <PreparedDataTable
                columnsInfo={columnsInfo}
                data={dataState}
                sort={{ idx: 1, dir: "asc" }}
                indexColumnWidth={64}
                rowSelection={rowSelection}
            />
        </>
    );
}

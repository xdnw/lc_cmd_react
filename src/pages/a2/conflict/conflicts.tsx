import { useSession } from "@/components/api/SessionContext";
import { Button } from "@/components/ui/button";
import { TABLE } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import type { ClientColumnOverlay, ConfigColumns } from "@/pages/custom_table/DataTable";
import BulkActionsToolbar from "@/pages/custom_table/actions/BulkActionsToolbar";
import SelectionCellButton from "@/pages/custom_table/actions/SelectionCellButton";
import { StaticTable } from "@/pages/custom_table/StaticTable";
import { usePermission } from "@/utils/PermUtil";
import { useIdSelection } from "@/utils/useIdSelection";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import ConflictActionsDialogButton from "./ConflictActionsDialogButton";
import {
    CONFLICT_EDIT_PERMISSION_PATH,
    CONFLICT_SYNC_PERMISSION_PATH,
    createConflictBulkActions,
    createConflictRowActions,
    type ConflictTableAction,
} from "./conflictActions";
import {
    conflictColumnRenderers,
    conflictPlaceholderColumns,
    createConflictRow,
    getConflictRawValue,
    isConflictRow,
    toConflictId,
    type ConflictRow,
} from "./conflictTableSchema";

const syncPermissionKey = CONFLICT_SYNC_PERMISSION_PATH.join(" ");
const editPermissionKey = CONFLICT_EDIT_PERMISSION_PATH.join(" ");

function ConflictSelectButton({
    id,
    rowIdx,
    rowNumber,
    selected,
    onToggle,
}: {
    id: number;
    rowIdx: number;
    rowNumber?: number;
    selected: boolean;
    onToggle: (id: number, rowIdx: number, shiftKey: boolean) => void;
}) {
    const onCheckboxToggle = useCallback((_id: number, shiftKey: boolean) => {
        onToggle(id, rowIdx, shiftKey);
    }, [id, onToggle, rowIdx]);

    return (
        <SelectionCellButton
            id={id}
            isSelected={selected}
            onToggle={onCheckboxToggle}
            label={selected ? `Deselect conflict ${id}` : `Select conflict ${id}`}
            debugTag={`conflict-select-${id}`}
            rowNumber={rowNumber}
        />
    );
}

export default function Conflicts() {
    const queryClient = useQueryClient();
    const { session } = useSession();

    const { permission: syncPermission, error: syncPermissionError } = usePermission(CONFLICT_SYNC_PERMISSION_PATH, { showDialogOnError: false });
    const { permission: editPermission, error: editPermissionError } = usePermission(CONFLICT_EDIT_PERMISSION_PATH, { showDialogOnError: false });

    const selected = useIdSelection<number>();

    const [reloadToken, setReloadToken] = useState(0);
    const [columnsInfo, setColumnsInfo] = useState<ConfigColumns[]>([]);
    const [renderedRowIds, setRenderedRowIds] = useState<number[]>([]);
    const [lastSelectedRowIdx, setLastSelectedRowIdx] = useState<number | null>(null);

    const canSync = Boolean(syncPermission?.success);
    const canEdit = Boolean(editPermission?.success);

    const refreshTable = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: [TABLE.endpoint.name] });
        setReloadToken((value) => value + 1);
    }, [queryClient]);

    const onActionSuccess = useCallback(async () => {
        await refreshTable();
    }, [refreshTable]);

    const onColumnsLoaded = useCallback((columns: ConfigColumns[]) => {
        setColumnsInfo(columns);
    }, []);

    const onRowsRendered = useCallback((rows: JSONValue[][]) => {
        const ids = rows
            .map((row) => toConflictId(getConflictRawValue(row, "id")))
            .filter((id): id is number => id !== null);
        setRenderedRowIds(ids);
    }, []);

    const onToggleRowSelection = useCallback((id: number, rowIdx: number, shiftKey: boolean) => {
        const shouldSelect = !selected.has(id);

        if (shiftKey && lastSelectedRowIdx !== null && renderedRowIds.length > 0) {
            const start = Math.max(0, Math.min(lastSelectedRowIdx, rowIdx));
            const end = Math.min(renderedRowIds.length - 1, Math.max(lastSelectedRowIdx, rowIdx));
            const rangeIds = renderedRowIds.slice(start, end + 1);
            if (shouldSelect) {
                selected.addMany(rangeIds);
            } else {
                selected.removeMany(rangeIds);
            }
            setLastSelectedRowIdx(rowIdx);
            return;
        }

        selected.setOne(id, shouldSelect);
        setLastSelectedRowIdx(rowIdx);
    }, [lastSelectedRowIdx, renderedRowIds, selected]);

    const selectAllVisible = useCallback(() => {
        selected.addMany(renderedRowIds);
    }, [renderedRowIds, selected]);

    const resolveActionPermission = useCallback((permissionPath?: readonly string[]) => {
        if (!permissionPath) return true;
        const key = permissionPath.join(" ");
        if (key === syncPermissionKey) return canSync;
        if (key === editPermissionKey) return canEdit;
        return false;
    }, [canEdit, canSync]);

    const canRunTableAction = useCallback((action: ConflictTableAction) => {
        return resolveActionPermission(action.permission);
    }, [resolveActionPermission]);

    const bulkActions = useMemo<ConflictTableAction[]>(() => {
        return createConflictBulkActions();
    }, []);

    const rowActions = useMemo<ConflictTableAction[]>(() => {
        return createConflictRowActions();
    }, []);

    const clientColumns = useMemo<ClientColumnOverlay[]>(() => {
        const actionsColumn: ClientColumnOverlay = {
            id: "actions",
            title: "Conflict",
            position: "start",
            width: 240,
            hideOnMobile: false,
            sortable: false,
            exportable: false,
            editable: false,
            draggable: false,
            value: (row) => createConflictRow(row),
            render: {
                display: (value) => {
                    if (!isConflictRow(value) || value.id < 0) return "-";

                    return (
                        <div className="flex items-center gap-1 justify-end sm:justify-start">
                            <ConflictActionsDialogButton
                                row={value}
                                rowLabel={value.name}
                                selectedIds={selected.selectedIds}
                                actions={rowActions}
                                canRunAction={canRunTableAction}
                                canEdit={canEdit}
                                onActionSuccess={onActionSuccess}
                                columnsInfo={columnsInfo}
                            />
                        </div>
                    );
                },
            },
        };

        return [actionsColumn];
    }, [canEdit, canRunTableAction, columnsInfo, onActionSuccess, rowActions, selected.selectedIds]);

    const indexCellRenderer = useCallback(({ row, rowIdx, rowNumber }: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => {
        const id = toConflictId(getConflictRawValue(row, "id"));
        if (id === null) return String(rowNumber);
        return (
            <ConflictSelectButton
                id={id}
                rowIdx={rowIdx}
                rowNumber={rowNumber}
                selected={selected.has(id)}
                onToggle={onToggleRowSelection}
            />
        );
    }, [onToggleRowSelection, selected]);

    const rowClassName = useCallback((row: JSONValue[]) => {
        const id = toConflictId(getConflictRawValue(row, "id"));
        if (!id) return undefined;
        return selected.has(id) ? "bg-blue-100/80 dark:bg-blue-900/30" : undefined;
    }, [selected]);

    const permissionErrors = useMemo(() => {
        const errors: string[] = [];
        if (syncPermissionError) errors.push(`Sync permission unavailable: ${syncPermissionError}`);
        if (editPermissionError) errors.push(`Edit permission unavailable: ${editPermissionError}`);
        return errors;
    }, [editPermissionError, syncPermissionError]);

    const isLoggedIn = Boolean(session?.user_valid || session?.nation_valid || session?.registered);

    return (
        <>
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

            <BulkActionsToolbar
                title="Conflicts"
                selectedIds={selected.selectedIds}
                actions={bulkActions}
                canRunAction={canRunTableAction}
                onClearSelected={selected.clear}
                onActionSuccess={onActionSuccess}
                actionLayout="stacked"
            />

            <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={renderedRowIds.length === 0}>
                    Select visible
                </Button>
                <Button variant="outline" size="sm" onClick={selected.clear} disabled={selected.count === 0}>
                    Clear selected
                </Button>
            </div>

            <StaticTable
                key={`conflicts-${reloadToken}`}
                type="Conflict"
                selection={{ "": "*" }}
                columns={conflictPlaceholderColumns.aliasedArray()}
                columnRenderers={conflictColumnRenderers}
                clientColumns={clientColumns}
                rowClassName={rowClassName}
                indexCellRenderer={indexCellRenderer}
                indexColumnWidth={64}
                onColumnsLoaded={onColumnsLoaded}
                onRowsRendered={onRowsRendered}
            />
        </>
    );
}

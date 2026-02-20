import CommandActionButton from "@/components/cmd/CommandActionButton";
import { useDialog } from "@/components/layout/DialogContext";
import { Button } from "@/components/ui/button";
import LazyExpander from "@/components/ui/LazyExpander";
import type { ConflictAlliances } from "@/lib/apitypes.d.ts";
import { CONFLICTALLIANCES } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";
import CommandActionDialogContent from "@/pages/custom_table/actions/CommandActionDialogContent";
import { isActionVisible } from "@/pages/custom_table/actions/models";
import {
    type ConflictRow,
    renderConflictCell,
    toPlainString,
} from "@/pages/a2/conflict/conflictTableSchema";
import {
    buildConflictAllianceRemoveArgs,
    buildConflictDialogPrefilledAction,
    CONFLICT_ACTION_IDS,
    CONFLICT_DETAIL_FIELD_SPECS,
    isConflictAllianceAction,
    isConflictFieldEditAction,
    resolveConflictDetailFieldValue,
    type ConflictTableAction,
} from "./conflictActions";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type ReactNode } from "react";

type ConflictDetailField = {
    key: string;
    label: string;
    value: ReactNode;
    actionId?: string;
    expandable?: boolean;
};

type ParsedAllianceEntry = {
    allianceId: number;
    coalition: 0 | 1;
};

function coalitionLabel(side: 0 | 1 | null, coalitionOneName: string, coalitionTwoName: string): string {
    if (side === 0) return coalitionOneName || "Coalition 1";
    if (side === 1) return coalitionTwoName || "Coalition 2";
    return "Unassigned";
}

function parseConflictAllianceEntries(conflictAllianceLists: number[][] | undefined): ParsedAllianceEntry[] {
    if (!conflictAllianceLists) return [];

    const coalitionOne = conflictAllianceLists[0] ?? [];
    const coalitionTwo = conflictAllianceLists[1] ?? [];

    const normalizeIds = (ids: number[]): number[] => {
        return ids.filter((id) => Number.isFinite(id) && id > 0);
    };

    const entries: ParsedAllianceEntry[] = [];
    normalizeIds(coalitionOne).forEach((allianceId) => {
        entries.push({ allianceId, coalition: 0 });
    });
    normalizeIds(coalitionTwo).forEach((allianceId) => {
        entries.push({ allianceId, coalition: 1 });
    });

    const deduped = new Map<string, ParsedAllianceEntry>();
    entries.forEach((entry) => {
        deduped.set(`${entry.coalition}-${entry.allianceId}`, entry);
    });

    return Array.from(deduped.values());
}

function ConflictDetailFieldRow({
    field,
    openAction,
    canRun,
}: {
    field: ConflictDetailField;
    openAction?: () => void;
    canRun: boolean;
}) {
    return (
        <div className="rounded border border-border px-2 py-1">
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground min-w-20">{field.label}</span>
                <div className="text-sm min-w-0 flex-1 overflow-hidden">
                    {field.expandable && typeof field.value === "string" ? (
                        <LazyExpander
                            className="!h-7 !py-0"
                            hideTriggerChildrenWhenExpanded
                            content={<div className="whitespace-pre-wrap break-words">{field.value || "-"}</div>}
                        >
                            <span className="block truncate w-full text-left">{field.value || "-"}</span>
                        </LazyExpander>
                    ) : (
                        <div className="whitespace-pre-wrap break-words">{field.value || "-"}</div>
                    )}
                </div>
                {field.actionId && openAction && (
                    <Button variant="outline" size="sm" onClick={openAction} disabled={!canRun}>
                        Edit
                    </Button>
                )}
            </div>
        </div>
    );
}

function AllianceSubMenu({
    conflict,
    canEdit,
    onActionSuccess,
    coalitionOneName,
    coalitionTwoName,
    openAddAllianceDialog,
    openAddAllForNationDialog,
}: {
    conflict: ConflictRow;
    canEdit: boolean;
    onActionSuccess: () => void;
    coalitionOneName: string;
    coalitionTwoName: string;
    openAddAllianceDialog?: () => void;
    openAddAllForNationDialog?: () => void;
}) {
    const { data, isFetching, isError, error } = useQuery(bulkQueryOptions(CONFLICTALLIANCES.endpoint, { conflicts: String(conflict.id) }));
    const [pendingRemovalKey, setPendingRemovalKey] = useState<string | null>(null);

    const conflictAlliancesData: ConflictAlliances | undefined = data?.data;

    const alliancesMap = useMemo<{ [key: number]: string }>(() => {
        return conflictAlliancesData?.alliance_names ?? {};
    }, [conflictAlliancesData?.alliance_names]);

    const conflictAllianceLists = useMemo(() => {
        return conflictAlliancesData?.conflict_alliances?.[String(conflict.id)];
    }, [conflict.id, conflictAlliancesData?.conflict_alliances]);

    const entries = useMemo(() => parseConflictAllianceEntries(conflictAllianceLists), [conflictAllianceLists]);
    const entriesByCoalition = useMemo(() => {
        const grouped = new Map<0 | 1, ParsedAllianceEntry[]>();
        for (const entry of entries) {
            const bucket = grouped.get(entry.coalition) ?? [];
            bucket.push(entry);
            grouped.set(entry.coalition, bucket);
        }
        return grouped;
    }, [entries]);

    const coalitionSections = useMemo(() => {
        return ([0, 1] as const).map((coalition) => ({
            coalition,
            entries: entriesByCoalition.get(coalition) ?? [],
        }));
    }, [entriesByCoalition]);

    const onConfirmRemoveSuccess = useCallback(() => {
        setPendingRemovalKey(null);
        onActionSuccess();
    }, [onActionSuccess]);

    const setPendingRemovalByKey = useMemo(() => {
        const handlers = new Map<string, () => void>();
        for (const entry of entries) {
            const key = `${entry.coalition}-${entry.allianceId}`;
            handlers.set(key, () => setPendingRemovalKey(key));
        }
        return handlers;
    }, [entries]);

    const clearPendingRemoval = useCallback(() => {
        setPendingRemovalKey(null);
    }, []);

    return (
        <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-2">Alliances</h3>
            {isError && (
                <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    Failed to load alliances: {String(error)}
                </div>
            )}
            {isFetching && <div className="mb-2 text-xs text-muted-foreground">Loading alliances...</div>}
            <div className="flex flex-wrap gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={openAddAllianceDialog} disabled={!canEdit || !openAddAllianceDialog}>Add Alliance</Button>
                <Button variant="outline" size="sm" onClick={openAddAllForNationDialog} disabled={!canEdit || !openAddAllForNationDialog}>Add All for Nation</Button>
            </div>

            <div className="mb-2">
                {entries.length === 0 && !isFetching && <div className="text-xs text-muted-foreground py-1">No alliances added.</div>}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {coalitionSections.map(({ coalition, entries: coalitionEntries }) => (
                        <div key={`coalition-${coalition}`} className="rounded border border-border px-2 py-1">
                            <div className="text-[11px] font-medium text-muted-foreground mb-1">
                                {coalitionLabel(coalition, coalitionOneName, coalitionTwoName)} ({coalitionEntries.length})
                            </div>
                            <div className="space-y-1">
                                {coalitionEntries
                                    .slice()
                                    .sort((left, right) => {
                                        const leftName = alliancesMap[left.allianceId] || `Alliance ${left.allianceId}`;
                                        const rightName = alliancesMap[right.allianceId] || `Alliance ${right.allianceId}`;
                                        return leftName.localeCompare(rightName);
                                    })
                                    .map((entry) => {
                                        const name = alliancesMap[entry.allianceId] || `Alliance ${entry.allianceId}`;
                                        const key = `${entry.coalition}-${entry.allianceId}`;
                                        const isConfirming = pendingRemovalKey === key;
                                        const removeArgs = buildConflictAllianceRemoveArgs(conflict.id, entry.allianceId);
                                        return (
                                            <div key={key} className="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted">
                                                <div className="min-w-0 flex-1 text-xs truncate">{name}</div>
                                                {!isConfirming && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="h-6 px-2 text-[11px]"
                                                        onClick={setPendingRemovalByKey.get(key)}
                                                        disabled={!canEdit}
                                                    >
                                                        Remove
                                                    </Button>
                                                )}
                                                {isConfirming && (
                                                    <div className="flex items-start gap-1">
                                                        <CommandActionButton
                                                            command={["conflict", "alliance", "remove"]}
                                                            args={removeArgs}
                                                            label="Confirm?"
                                                            classes="!m-0 !h-6 !px-2 !w-auto"
                                                            disabled={!canEdit}
                                                            onSuccess={onConfirmRemoveSuccess}
                                                            showResultDialog
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 px-2 text-[11px]"
                                                            onClick={clearPendingRemoval}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ConflictActionsDialogButton({
    row,
    rowLabel,
    selectedIds,
    actions,
    canRunAction,
    canEdit,
    onActionSuccess,
    columnsInfo,
}: {
    row: ConflictRow;
    rowLabel: string;
    selectedIds: Set<number>;
    actions: ConflictTableAction[];
    canRunAction: (action: ConflictTableAction) => boolean;
    canEdit: boolean;
    onActionSuccess?: (actionId: string) => void;
    columnsInfo?: ConfigColumns[];
}) {
    const { showDialog } = useDialog();

    const visibleActions = useMemo(() => {
        return actions.filter((action) => isActionVisible(action, { row, selectedIds }));
    }, [actions, row, selectedIds]);

    const onSuccessByActionId = useMemo(() => {
        const handlers = new Map<string, (() => void) | undefined>();
        for (const action of visibleActions) {
            handlers.set(action.id, onActionSuccess ? () => onActionSuccess(action.id) : undefined);
        }
        return handlers;
    }, [onActionSuccess, visibleActions]);

    const onAllianceActionSuccess = useCallback(() => {
        onActionSuccess?.("");
    }, [onActionSuccess]);

    const formattedCategory = useMemo(() => renderConflictCell(row, "category", columnsInfo), [columnsInfo, row]);
    const startFormatted = useMemo(() => renderConflictCell(row, "start", columnsInfo), [columnsInfo, row]);
    const endFormatted = useMemo(() => renderConflictCell(row, "end", columnsInfo), [columnsInfo, row]);
    const c1Formatted = useMemo(() => renderConflictCell(row, "c1Name", columnsInfo), [columnsInfo, row]);
    const c2Formatted = useMemo(() => renderConflictCell(row, "c2Name", columnsInfo), [columnsInfo, row]);

    const onOpenDialogByActionId = useMemo(() => {
        const handlers = new Map<string, (() => void) | undefined>();
        for (const action of visibleActions) {
            if (!action.requiresDialog) continue;
            handlers.set(action.id, () => {
                const actionWithPrefill = buildConflictDialogPrefilledAction(action, row, {
                    category: formattedCategory,
                    start: startFormatted,
                    end: endFormatted,
                    c1Name: c1Formatted,
                    c2Name: c2Formatted,
                }, selectedIds, columnsInfo);

                showDialog(action.label, (
                    <CommandActionDialogContent
                        action={actionWithPrefill}
                        context={{ row, selectedIds }}
                        onSuccess={onActionSuccess}
                    />
                ), { openInNewTab: true, focusNewTab: true, replaceActive: false });
            });
        }
        return handlers;
    }, [onActionSuccess, row, selectedIds, showDialog, visibleActions, formattedCategory, c1Formatted, c2Formatted, startFormatted, endFormatted, columnsInfo]);

    const actionById = useMemo(() => {
        const map = new Map<string, ConflictTableAction>();
        for (const action of visibleActions) {
            map.set(action.id, action);
        }
        return map;
    }, [visibleActions]);

    const editableFields = useMemo<ConflictDetailField[]>(() => {
        const formatted = {
            category: formattedCategory,
            c1Name: c1Formatted,
            c2Name: c2Formatted,
            start: startFormatted,
            end: endFormatted,
        };

        return CONFLICT_DETAIL_FIELD_SPECS.map((spec) => ({
            key: spec.key,
            label: spec.label,
            value: resolveConflictDetailFieldValue(spec, row, formatted),
            actionId: spec.actionId,
            expandable: spec.expandable,
        }));
    }, [row, formattedCategory, c1Formatted, c2Formatted, startFormatted, endFormatted]);

    const syncAction = useMemo(
        () => visibleActions.find((action) => action.id === CONFLICT_ACTION_IDS.syncSingle),
        [visibleActions],
    );

    const openDetailsContent = useMemo(() => {
        return (
            <div className="space-y-3 pr-1">
                <div className="flex items-start justify-end gap-2">
                    {syncAction && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenDialogByActionId.get(syncAction.id)}
                            disabled={!canRunAction(syncAction)}
                            className="shrink-0"
                        >
                            Sync
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-1">
                    {editableFields.map((field) => {
                        const action = field.actionId ? actionById.get(field.actionId) : undefined;
                        const openAction = field.actionId ? onOpenDialogByActionId.get(field.actionId) : undefined;
                        return (
                            <ConflictDetailFieldRow
                                key={field.key}
                                field={field}
                                openAction={openAction}
                                canRun={action ? canRunAction(action) : true}
                            />
                        );
                    })}
                </div>
                <div className="flex flex-wrap gap-1">
                    {visibleActions.map((action) => {
                        const disabled = !canRunAction(action);
                        const isFieldEdit = isConflictFieldEditAction(action.id);
                        if (isFieldEdit) return null;

                        if (action.id === CONFLICT_ACTION_IDS.deleteConflict) {
                            return (
                                <Button
                                    key={action.id}
                                    variant="destructive"
                                    size="sm"
                                    onClick={onOpenDialogByActionId.get(action.id)}
                                    disabled={disabled}
                                    className="mr-1 mb-1"
                                >
                                    {action.label}
                                </Button>
                            );
                        }

                        if (action.id === CONFLICT_ACTION_IDS.syncSingle) return null;
                        if (isConflictAllianceAction(action.id)) return null;

                        if (action.requiresDialog) {
                            return (
                                <Button
                                    key={action.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={onOpenDialogByActionId.get(action.id)}
                                    disabled={disabled}
                                    className="mr-1 mb-1"
                                >
                                    {action.label}
                                </Button>
                            );
                        }

                        return (
                            <div key={action.id} className="mb-1">
                                <CommandActionButton
                                    command={action.command}
                                    args={action.buildArgs({ row, selectedIds })}
                                    label={action.label}
                                    classes="!ms-0"
                                    disabled={disabled}
                                    showResultDialog={true}
                                    onSuccess={onSuccessByActionId.get(action.id)}
                                />
                            </div>
                        );
                    })}
                </div>
                <AllianceSubMenu
                    conflict={row}
                    canEdit={canEdit}
                    onActionSuccess={onAllianceActionSuccess}
                    coalitionOneName={toPlainString(c1Formatted) ?? row.c1Name}
                    coalitionTwoName={toPlainString(c2Formatted) ?? row.c2Name}
                    openAddAllianceDialog={onOpenDialogByActionId.get(CONFLICT_ACTION_IDS.allianceAdd)}
                    openAddAllForNationDialog={onOpenDialogByActionId.get(CONFLICT_ACTION_IDS.allianceAddForNation)}
                />
            </div>
        );
    }, [
        actionById,
        canEdit,
        canRunAction,
        c1Formatted,
        c2Formatted,
        editableFields,
        onAllianceActionSuccess,
        onOpenDialogByActionId,
        onSuccessByActionId,
        row,
        selectedIds,
        syncAction,
        visibleActions,
    ]);

    const openDetailsClick = useCallback(() => {
        showDialog(`Conflict: ${row.name}`, openDetailsContent, { openInNewTab: true, focusNewTab: true, replaceActive: false });
    }, [openDetailsContent, showDialog, row.name]);

    return (
        <Button variant="outline" size="sm" className="max-w-[220px] truncate justify-start" onClick={openDetailsClick}>
            {rowLabel}
        </Button>
    );
}

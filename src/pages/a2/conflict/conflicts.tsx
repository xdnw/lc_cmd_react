import { Button } from "@/components/ui/button";
import CommandActionButton from "@/components/cmd/CommandActionButton";
import LazyExpander from "@/components/ui/LazyExpander";
import { CONFLICTALLIANCES, TABLE } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import type { ClientColumnOverlay, ConfigColumns } from "@/pages/custom_table/DataTable";
import { StaticTable } from "@/pages/custom_table/StaticTable";
import SelectionCellButton from "@/pages/custom_table/actions/SelectionCellButton";
import BulkActionsToolbar from "@/pages/custom_table/actions/BulkActionsToolbar";
import CommandActionDialogContent from "@/pages/custom_table/actions/CommandActionDialogContent";
import type { TableCommandAction } from "@/pages/custom_table/actions/models";
import { isActionVisible } from "@/pages/custom_table/actions/models";
import { CM } from "@/utils/Command";
import { usePermission } from "@/utils/PermUtil";
import { serializeIdSet, useIdSelection } from "@/utils/useIdSelection";
import { bulkQueryOptions } from "@/lib/queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/api/SessionContext";
import { Link } from "react-router-dom";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useDialog } from "@/components/layout/DialogContext";

function renderConflictCell(row: ConflictRow, idx: number, columnsInfo?: ConfigColumns[]): ReactNode {
    const rawValue = row.raw[idx];
    const column = columnsInfo?.find((value) => value.index === idx);
    const renderer = column?.render?.display;

    if (renderer && column) {
        return renderer(rawValue, {
            row: row.raw,
            rowIdx: 0,
            column,
        }) ?? "-";
    }

    return rawValue == null || rawValue === "" ? "-" : String(rawValue);
}

type ParsedAllianceEntry = {
    allianceId: number;
    coalition: 0 | 1 | null;
};

function toPlainString(value: ReactNode): string | null {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return null;
}

function turnToTimestampPrefill(turn: number): string {
    const turnsPerDay = process.env.TEST ? 24 : 12;
    const timeMillis = (turn / turnsPerDay) * 24 * 60 * 60 * 1000;
    return `timestamp:${Math.floor(timeMillis)}`;
}

function asNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry));
}

function parseConflictAllianceEntries(raw: unknown): ParsedAllianceEntry[] {
    const flattened: Array<{ allianceId: number; coalitionRaw: number | null }> = [];

    const push = (allianceId: number, coalitionRaw: unknown) => {
        if (!Number.isFinite(allianceId) || allianceId <= 0) return;
        const coalitionNumber = Number(coalitionRaw);
        flattened.push({ allianceId, coalitionRaw: Number.isFinite(coalitionNumber) ? coalitionNumber : null });
    };

    if (Array.isArray(raw)) {
        for (const entry of raw) {
            const values = asNumberArray(entry);
            if (values.length === 0) continue;

            // Format A: [allianceId, coalition]
            if (values.length === 2 && (values[1] === 0 || values[1] === 1 || values[1] === 2) && values[0] > 2) {
                push(values[0], values[1]);
                continue;
            }

            // Format B: [coalition, allianceId]
            if (values.length === 2 && (values[0] === 0 || values[0] === 1 || values[0] === 2) && values[1] > 2) {
                push(values[1], values[0]);
                continue;
            }

            // Format C: [coalition, allianceId, allianceId, ...]
            if (values.length > 2 && (values[0] === 0 || values[0] === 1 || values[0] === 2)) {
                const coalition = values[0];
                values.slice(1).forEach((allianceId) => push(allianceId, coalition));
                continue;
            }

            values.forEach((allianceId) => push(allianceId, null));
        }
    }

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const [coalitionKey, alliancesRaw] of Object.entries(raw as Record<string, unknown>)) {
            const alliances = asNumberArray(alliancesRaw);
            alliances.forEach((allianceId) => push(allianceId, coalitionKey));
        }
    }

    const hasZeroBased = flattened.some((entry) => entry.coalitionRaw === 0);
    const normalizeCoalition = (coalitionRaw: number | null): 0 | 1 | null => {
        if (coalitionRaw === null) return null;
        if (hasZeroBased) {
            if (coalitionRaw === 0 || coalitionRaw === 1) return coalitionRaw;
            return null;
        }
        if (coalitionRaw === 1) return 0;
        if (coalitionRaw === 2) return 1;
        return null;
    };

    const normalized = flattened.map((entry) => ({
        allianceId: entry.allianceId,
        coalition: normalizeCoalition(entry.coalitionRaw),
    }));

    const deduped = new Map<string, ParsedAllianceEntry>();
    normalized.forEach((entry) => {
        const key = `${entry.coalition ?? "u"}-${entry.allianceId}`;
        deduped.set(key, entry);
    });
    return Array.from(deduped.values());
}

function coalitionLabel(side: 0 | 1 | null, coalitionOneName: string, coalitionTwoName: string): string {
    if (side === 0) return coalitionOneName || "Coalition 1";
    if (side === 1) return coalitionTwoName || "Coalition 2";
    return "Unassigned";
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

    const alliancesMap = useMemo<{ [key: number]: string }>(() => {
        return data?.data?.alliance_names ?? {};
    }, [data?.data?.alliance_names]);
    const conflictAlliancesRaw = data?.data?.conflict_alliances?.[conflict.id];
    const entries = useMemo(() => parseConflictAllianceEntries(conflictAlliancesRaw), [conflictAlliancesRaw]);
    const entriesByCoalition = useMemo(() => {
        const grouped = new Map<number | null, ParsedAllianceEntry[]>();
        for (const entry of entries) {
            const bucket = grouped.get(entry.coalition) ?? [];
            bucket.push(entry);
            grouped.set(entry.coalition, bucket);
        }
        return grouped;
    }, [entries]);

    const onConfirmRemoveSuccess = useCallback(() => {
        setPendingRemovalKey(null);
        onActionSuccess();
    }, [onActionSuccess]);

    const setPendingRemovalByKey = useMemo(() => {
        const handlers = new Map<string, () => void>();
        for (const entry of entries) {
            const key = `${entry.coalition ?? "u"}-${entry.allianceId}`;
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
            <div className="mb-2 rounded border border-border px-2 py-1">
                {entries.length === 0 && !isFetching && <div className="text-xs text-muted-foreground py-1">No alliances added.</div>}
                {[...entriesByCoalition.entries()]
                    .sort(([left], [right]) => {
                        const leftOrder = left === null ? 2 : left;
                        const rightOrder = right === null ? 2 : right;
                        return leftOrder - rightOrder;
                    })
                    .map(([coalition, coalitionEntries]) => (
                        <div key={`coalition-${coalition ?? "unknown"}`} className="mb-2 last:mb-0">
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
                                        const key = `${entry.coalition ?? "u"}-${entry.allianceId}`;
                                        const isConfirming = pendingRemovalKey === key;
                                        const removeArgs = withKnownCommandArgs(["conflict", "alliance", "remove"], { conflict: String(conflict.id) }, {
                                            alliances: String(entry.allianceId),
                                        });
                                        return (
                                            <div key={key} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted">
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
                                                    <div className="flex items-center gap-1">
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
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={openAddAllianceDialog} disabled={!canEdit || !openAddAllianceDialog}>Add Alliance</Button>
                <Button variant="outline" size="sm" onClick={openAddAllForNationDialog} disabled={!canEdit || !openAddAllForNationDialog}>Add All for Nation</Button>
            </div>
        </div>
    );
}

type ConflictRow = {
    id: number;
    name: string;
    category: string;
    c1Name: string;
    c2Name: string;
    status: string;
    wiki: string;
    start: number;
    end: number;
    activeWars: number;
    c1Damage: string;
    c2Damage: string;
    casusBelli: string;
    raw: JSONValue[];
};

type ConflictDetailField = {
    key: string;
    label: string;
    value: ReactNode;
    actionId?: string;
    expandable?: boolean;
};

function ConflictSelectButton({
    id,
    rowIdx,
    rowNumber,
    selected,
    onToggle,
}: {
    id: number;
    rowIdx: number;
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
        />
    );
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

function ConflictActionsDialogButton({
    row,
    rowLabel,
    selectedIds,
    actions,
    canRunAction,
    onActionSuccess,
    columnsInfo,
}: {
    row: ConflictRow;
    rowLabel: string;
    selectedIds: Set<number>;
    actions: TableCommandAction<ConflictRow, number>[];
    canRunAction: (action: TableCommandAction<ConflictRow, number>) => boolean;
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

    const formattedCategory = useMemo(() => renderConflictCell(row, IDX.category, columnsInfo), [columnsInfo, row]);
    const startFormatted = useMemo(() => renderConflictCell(row, IDX.start, columnsInfo), [columnsInfo, row]);
    const endFormatted = useMemo(() => renderConflictCell(row, IDX.end, columnsInfo), [columnsInfo, row]);
    const c1Formatted = useMemo(() => renderConflictCell(row, IDX.c1Name, columnsInfo), [columnsInfo, row]);
    const c2Formatted = useMemo(() => renderConflictCell(row, IDX.c2Name, columnsInfo), [columnsInfo, row]);

    const onOpenDialogByActionId = useMemo(() => {
        const handlers = new Map<string, (() => void) | undefined>();
        for (const action of visibleActions) {
            if (!action.requiresDialog) continue;
            handlers.set(action.id, () => {
                const categoryPrefill = toPlainString(formattedCategory) ?? row.category;
                const c1Prefill = toPlainString(c1Formatted) ?? row.c1Name;
                const c2Prefill = toPlainString(c2Formatted) ?? row.c2Name;
                const actionWithPrefill: TableCommandAction<ConflictRow, number> = {
                    ...action,
                    buildArgs: (context) => {
                        if (action.id === "edit-category") {
                            return withKnownCommandArgs(["conflict", "edit", "category"], { conflict: String(row.id) }, { category: categoryPrefill });
                        }
                        if (action.id === "edit-start") {
                            return withKnownCommandArgs(["conflict", "edit", "start"], { conflict: String(row.id) }, { time: turnToTimestampPrefill(row.start) });
                        }
                        if (action.id === "edit-end") {
                            return withKnownCommandArgs(["conflict", "edit", "end"], { conflict: String(row.id) }, { time: turnToTimestampPrefill(row.end) });
                        }
                        if (action.id === "edit-c1-name") {
                            return withKnownCommandArgs(["conflict", "edit", "rename"], { conflict: String(row.id) }, {
                                name: c1Prefill,
                                isCoalition1: "true",
                            });
                        }
                        if (action.id === "edit-c2-name") {
                            return withKnownCommandArgs(["conflict", "edit", "rename"], { conflict: String(row.id) }, {
                                name: c2Prefill,
                                isCoalition2: "true",
                            });
                        }
                        return action.buildArgs(context);
                    },
                };

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
    }, [onActionSuccess, row, selectedIds, showDialog, visibleActions, formattedCategory, c1Formatted, c2Formatted]);

    const actionById = useMemo(() => {
        const map = new Map<string, TableCommandAction<ConflictRow, number>>();
        for (const action of visibleActions) {
            map.set(action.id, action);
        }
        return map;
    }, [visibleActions]);

    const editableFields = useMemo<ConflictDetailField[]>(() => {
        return [
            { key: "id", label: "ID", value: String(row.id) },
            { key: "name", label: "Name", value: row.name, actionId: "edit-rename" },
            { key: "category", label: "Category", value: formattedCategory, actionId: "edit-category" },
            { key: "c1Name", label: "C1", value: c1Formatted, actionId: "edit-c1-name" },
            { key: "c2Name", label: "C2", value: c2Formatted, actionId: "edit-c2-name" },
            { key: "status", label: "Status", value: row.status, actionId: "edit-status", expandable: true },
            { key: "casusBelli", label: "CB", value: row.casusBelli, actionId: "edit-casus-belli", expandable: true },
            { key: "wiki", label: "Wiki", value: row.wiki, actionId: "edit-wiki" },
            { key: "start", label: "Start", value: startFormatted, actionId: "edit-start" },
            { key: "end", label: "End", value: endFormatted, actionId: "edit-end" },
        ];
    }, [row, formattedCategory, c1Formatted, c2Formatted, startFormatted, endFormatted]);

    const syncAction = useMemo(() => visibleActions.find((action) => action.id === "sync-single"), [visibleActions]);

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
                        const isFieldEdit = editableFields.some(f => f.actionId === action.id);
                        if (isFieldEdit) return null;

                        if (action.id === "delete-conflict") {
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

                        // Extract sync to top right
                        if (action.id === "sync-single") return null;

                        // Alliance actions have their own sub-menu
                        if (action.id.startsWith("alliance-")) return null;

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
                    canEdit={canRunAction({ permission: editPermissionPath } as TableCommandAction<ConflictRow, number>)}
                    onActionSuccess={onAllianceActionSuccess}
                    coalitionOneName={toPlainString(c1Formatted) ?? row.c1Name}
                    coalitionTwoName={toPlainString(c2Formatted) ?? row.c2Name}
                    openAddAllianceDialog={onOpenDialogByActionId.get("alliance-add")}
                    openAddAllForNationDialog={onOpenDialogByActionId.get("alliance-add-for-nation")}
                />
            </div >
        );
    }, [actionById, canRunAction, editableFields, onOpenDialogByActionId, onSuccessByActionId, row, selectedIds, visibleActions, onAllianceActionSuccess, syncAction, c1Formatted, c2Formatted]);

    const openDetailsClick = useCallback(() => {
        showDialog(`Conflict: ${row.name}`, openDetailsContent, { openInNewTab: true, focusNewTab: true, replaceActive: false });
    }, [openDetailsContent, showDialog, row.name]);

    return (
        <Button variant="outline" size="sm" className="max-w-[220px] truncate justify-start" onClick={openDetailsClick}>
            {rowLabel}
        </Button>
    );
}

const syncPermissionPath: ["conflict", "sync", "website"] = ["conflict", "sync", "website"];
const editPermissionPath: ["conflict", "edit", "rename"] = ["conflict", "edit", "rename"];
const syncPermissionKey = syncPermissionPath.join(" ");
const editPermissionKey = editPermissionPath.join(" ");

const IDX = {
    id: 0,
    name: 1,
    category: 2,
    start: 3,
    end: 4,
    activeWars: 5,
    c1Damage: 6,
    c2Damage: 7,
    wiki: 8,
    status: 9,
    casusBelli: 10,
    c1Name: 11,
    c2Name: 12,
} as const;

const builder = CM.placeholders("Conflict")
    .aliased()
    .add({ cmd: "getid", alias: "ID" })
    .add({ cmd: "getname", alias: "Name" })
    .add({ cmd: "getcategory", alias: "Category" })
    .add({ cmd: "getstartturn", alias: "Start" })
    .add({ cmd: "getendturn", alias: "End" })
    .add({ cmd: "getactivewars", alias: "Active Wars" })
    .add({ cmd: "getdamageconverted", args: { isPrimary: "true" }, alias: "c1_damage" })
    .add({ cmd: "getdamageconverted", args: { isPrimary: "false" }, alias: "c2_damage" })
    .add({ cmd: "getwiki", alias: "Wiki" })
    .add({ cmd: "getstatusdesc", alias: "Status" })
    .add({ cmd: "getcoalitionname", args: { side: "false" }, alias: "C1" })
    .add({ cmd: "getcoalitionname", args: { side: "true" }, alias: "C2" });

function toConflictId(value: unknown): number | null {
    const id = Number(value);
    return Number.isFinite(id) ? id : null;
}

function toConflictRow(value: unknown): ConflictRow | null {
    if (!value || typeof value !== "object") return null;
    const source = value as Partial<ConflictRow>;
    if (typeof source.id !== "number" || !Number.isFinite(source.id)) return null;
    return {
        id: source.id,
        name: source.name ? String(source.name) : String(source.id),
        category: source.category ? String(source.category) : "",
        c1Name: source.c1Name ? String(source.c1Name) : "",
        c2Name: source.c2Name ? String(source.c2Name) : "",
        status: source.status ? String(source.status) : "",
        wiki: source.wiki ? String(source.wiki) : "",
        start: Number(source.start ?? 0),
        end: Number(source.end ?? 0),
        activeWars: Number(source.activeWars ?? 0),
        c1Damage: source.c1Damage ? String(source.c1Damage) : "",
        c2Damage: source.c2Damage ? String(source.c2Damage) : "",
        casusBelli: source.casusBelli ? String(source.casusBelli) : "",
        raw: Array.isArray(source.raw) ? source.raw : [],
    };
}

function withKnownCommandArgs(
    commandPath: TableCommandAction<ConflictRow, number>["command"],
    base: Record<string, string>,
    prefillCandidates: Record<string, string>,
): Record<string, string> {
    const command = CM.get(commandPath);
    const knownArgs = new Set(command.getArguments().map((arg) => arg.name));
    const args: Record<string, string> = { ...base };
    Object.entries(prefillCandidates).forEach(([key, value]) => {
        if (!value) return;
        if (knownArgs.has(key)) {
            args[key] = value;
        }
    });
    return args;
}

export default function Conflicts() {
    const queryClient = useQueryClient();
    const { session } = useSession();

    const { permission: syncPermission, error: syncPermissionError } = usePermission(syncPermissionPath, { showDialogOnError: false });
    const { permission: editPermission, error: editPermissionError } = usePermission(editPermissionPath, { showDialogOnError: false });

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
            .map((row) => toConflictId(row[IDX.id]))
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

    const canRunTableAction = useCallback((action: TableCommandAction<ConflictRow, number>) => {
        return resolveActionPermission(action.permission);
    }, [resolveActionPermission]);

    const bulkActions = useMemo<TableCommandAction<ConflictRow, number>[]>(() => {
        return [
            {
                id: "sync-selected",
                label: "Bulk sync",
                command: ["conflict", "sync", "website"],
                scope: "bulk",
                permission: syncPermissionPath,
                requiresSelection: true,
                buildArgs: ({ selectedIds }) => ({
                    conflicts: serializeIdSet(selectedIds),
                }),
            },
            {
                id: "create-conflict",
                label: "Create conflict",
                command: ["conflict", "create"],
                scope: "bulk",
                permission: editPermissionPath,
                requiresSelection: false,
                requiresDialog: true,
                description: "Create a new conflict with full command arguments.",
                buildArgs: () => ({}),
            },
            {
                id: "create-temp-conflict",
                label: "Create temp",
                command: ["conflict", "create_temp"],
                scope: "bulk",
                permission: editPermissionPath,
                requiresSelection: false,
                requiresDialog: true,
                description: "Create a temporary conflict.",
                buildArgs: () => ({}),
            },
        ];
    }, []);

    const rowActions = useMemo<TableCommandAction<ConflictRow, number>[]>(() => {
        const withConflict = (row?: ConflictRow) => ({ conflict: String(row?.id ?? "") });
        return [
            {
                id: "sync-single",
                label: "Sync website",
                description: "Run conflict sync for this conflict.",
                command: ["conflict", "sync", "website"],
                scope: "row",
                permission: syncPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => ({
                    conflicts: String(row?.id ?? ""),
                }),
            },
            {
                id: "edit-wiki",
                label: "Edit wiki",
                command: ["conflict", "edit", "wiki"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "wiki"], withConflict(row), {
                    wiki: row?.wiki ?? "",
                    url: row?.wiki ?? "",
                }),
            },
            {
                id: "edit-status",
                label: "Edit status",
                command: ["conflict", "edit", "status"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "status"], withConflict(row), {
                    status: row?.status ?? "",
                }),
            },
            {
                id: "edit-casus-belli",
                label: "Edit casus belli",
                command: ["conflict", "edit", "casus_belli"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "casus_belli"], withConflict(row), {
                    casus_belli: row?.casusBelli ?? "",
                    cb: row?.casusBelli ?? "",
                    reason: row?.casusBelli ?? "",
                }),
            },
            {
                id: "edit-category",
                label: "Edit category",
                command: ["conflict", "edit", "category"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "category"], withConflict(row), {
                    category: row?.category ?? "",
                }),
            },
            {
                id: "edit-c1-name",
                label: "Edit C1",
                command: ["conflict", "edit", "rename"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "rename"], withConflict(row), {
                    name: row?.c1Name ?? "",
                    isCoalition1: "true",
                }),
            },
            {
                id: "edit-c2-name",
                label: "Edit C2",
                command: ["conflict", "edit", "rename"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "rename"], withConflict(row), {
                    name: row?.c2Name ?? "",
                    isCoalition2: "true",
                }),
            },
            {
                id: "edit-start",
                label: "Edit start",
                command: ["conflict", "edit", "start"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "start"], withConflict(row), {
                    time: turnToTimestampPrefill(row?.start ?? 0),
                }),
            },
            {
                id: "edit-end",
                label: "Edit end",
                command: ["conflict", "edit", "end"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "end"], withConflict(row), {
                    time: turnToTimestampPrefill(row?.end ?? 0),
                }),
            },
            {
                id: "edit-rename",
                label: "Edit rename",
                command: ["conflict", "edit", "rename"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withKnownCommandArgs(["conflict", "edit", "rename"], withConflict(row), {
                    name: row?.name ?? "",
                    new_name: row?.name ?? "",
                    conflict_name: row?.name ?? "",
                }),
            },
            {
                id: "delete-conflict",
                label: "Delete",
                command: ["conflict", "delete"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withConflict(row),
            },
            {
                id: "alliance-add",
                label: "Alliance add",
                command: ["conflict", "alliance", "add"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withConflict(row),
            },
            {
                id: "alliance-remove",
                label: "Alliance remove",
                command: ["conflict", "alliance", "remove"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withConflict(row),
            },
            {
                id: "alliance-add-for-nation",
                label: "Add all for nation",
                command: ["conflict", "alliance", "add_all_for_nation"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withConflict(row),
            },
            {
                id: "edit-add-forum-post",
                label: "Add forum post",
                command: ["conflict", "edit", "add_forum_post"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withConflict(row),
            },
            {
                id: "edit-add-none-war",
                label: "Add none war",
                command: ["conflict", "edit", "add_none_war"],
                scope: "row",
                permission: editPermissionPath,
                requiresDialog: true,
                buildArgs: ({ row }) => withConflict(row),
            },
        ];
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
            value: (row) => ({
                id: toConflictId(row[IDX.id]) ?? -1,
                name: String(row[IDX.name] ?? row[IDX.id] ?? "Conflict"),
                category: String(row[IDX.category] ?? ""),
                c1Name: String(row[IDX.c1Name] ?? ""),
                c2Name: String(row[IDX.c2Name] ?? ""),
                start: Number(row[IDX.start] ?? 0),
                end: Number(row[IDX.end] ?? 0),
                activeWars: Number(row[IDX.activeWars] ?? 0),
                c1Damage: String(row[IDX.c1Damage] ?? ""),
                c2Damage: String(row[IDX.c2Damage] ?? ""),
                wiki: String(row[IDX.wiki] ?? ""),
                status: String(row[IDX.status] ?? ""),
                casusBelli: String(row[IDX.casusBelli] ?? ""),
                raw: row,
            }),
            render: {
                display: (value) => {
                    const row = toConflictRow(value);
                    if (!row || row.id < 0) return "-";

                    return (
                        <div className="flex items-center gap-1 justify-end sm:justify-start">
                            <ConflictActionsDialogButton
                                row={row}
                                rowLabel={row.name}
                                selectedIds={selected.selectedIds}
                                actions={rowActions}
                                canRunAction={canRunTableAction}
                                onActionSuccess={onActionSuccess}
                                columnsInfo={columnsInfo}
                            />
                        </div>
                    );
                },
            },
        };

        return [actionsColumn];
    }, [canRunTableAction, onActionSuccess, rowActions, selected, columnsInfo]);

    const indexCellRenderer = useCallback(({ row, rowIdx, rowNumber }: { row: JSONValue[]; rowIdx: number; rowNumber: number }) => {
        const id = toConflictId(row[IDX.id]);
        if (id === null) return String(rowNumber);
        return (
            <ConflictSelectButton
                id={id}
                rowIdx={rowIdx}
                selected={selected.has(id)}
                onToggle={onToggleRowSelection}
            />
        );
    }, [onToggleRowSelection, selected]);

    const rowClassName = useCallback((row: unknown[]) => {
        const id = toConflictId(row[0]);
        if (!id) return undefined;
        return selected.has(id) ? "bg-blue-100/80 dark:bg-blue-900/30" : undefined;
    }, [selected]);

    const columnRenderers = useMemo(() => {
        return {
            getstartturn: "turn_to_date",
            getendturn: "turn_to_date",
        };
    }, []);

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
            />

            <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={renderedRowIds.length === 0}>
                    Select visible
                </Button>
                <Button variant="outline" size="sm" onClick={selected.clear} disabled={selected.count === 0}>
                    Clear selected
                </Button>
            </div>

            <div className="">
                <StaticTable
                    key={`conflicts-${reloadToken}`}
                    type="Conflict"
                    selection={{ "": "*" }}
                    columns={builder.aliasedArray()}
                    columnRenderers={columnRenderers}
                    clientColumns={clientColumns}
                    rowClassName={rowClassName}
                    indexCellRenderer={indexCellRenderer}
                    indexColumnWidth={64}
                    onColumnsLoaded={onColumnsLoaded}
                    onRowsRendered={onRowsRendered}
                />
            </div>
        </>
    );
}

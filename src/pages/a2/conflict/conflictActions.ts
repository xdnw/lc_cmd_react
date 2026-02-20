import type { ReactNode } from "react";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";
import type { TableCommandAction } from "@/pages/custom_table/actions/models";
import { withKnownCommandArgs } from "@/pages/custom_table/actions/commandArgs";
import { serializeIdSet } from "@/utils/useIdSelection";
import type { AnyCommandPath } from "@/utils/Command";
import {
    resolveConflictEnumLabel,
    toPlainString,
    turnToTimestampPrefill,
    type ConflictRow,
} from "./conflictTableSchema";

export const CONFLICT_SYNC_PERMISSION_PATH: ["conflict", "sync", "website"] = ["conflict", "sync", "website"];
export const CONFLICT_EDIT_PERMISSION_PATH: ["conflict", "edit", "rename"] = ["conflict", "edit", "rename"];

export const CONFLICT_ACTION_IDS = {
    syncSingle: "sync-single",
    editWiki: "edit-wiki",
    editStatus: "edit-status",
    editCasusBelli: "edit-casus-belli",
    editCategory: "edit-category",
    editC1Name: "edit-c1-name",
    editC2Name: "edit-c2-name",
    editStart: "edit-start",
    editEnd: "edit-end",
    editRename: "edit-rename",
    deleteConflict: "delete-conflict",
    allianceAdd: "alliance-add",
    allianceRemove: "alliance-remove",
    allianceAddForNation: "alliance-add-for-nation",
    editAddForumPost: "edit-add-forum-post",
    editAddNoneWar: "edit-add-none-war",
} as const;

export type ConflictActionId = (typeof CONFLICT_ACTION_IDS)[keyof typeof CONFLICT_ACTION_IDS];

export const CONFLICT_COMMANDS = {
    syncWebsite: ["conflict", "sync", "website"],
    createConflict: ["conflict", "create"],
    createTempConflict: ["conflict", "create_temp"],
    editWiki: ["conflict", "edit", "wiki"],
    editStatus: ["conflict", "edit", "status"],
    editCasusBelli: ["conflict", "edit", "casus_belli"],
    editCategory: ["conflict", "edit", "category"],
    editRename: ["conflict", "edit", "rename"],
    editStart: ["conflict", "edit", "start"],
    editEnd: ["conflict", "edit", "end"],
    deleteConflict: ["conflict", "delete"],
    allianceAdd: ["conflict", "alliance", "add"],
    allianceRemove: ["conflict", "alliance", "remove"],
    allianceAddForNation: ["conflict", "alliance", "add_all_for_nation"],
    editAddForumPost: ["conflict", "edit", "add_forum_post"],
    editAddNoneWar: ["conflict", "edit", "add_none_war"],
} as const satisfies Record<string, AnyCommandPath>;

export type ConflictTableAction = TableCommandAction<ConflictRow, number> & {
    buildDialogArgs?: (context: {
        row: ConflictRow;
        selectedIds: Set<number>;
        formatted: ConflictFormattedValues;
        columnsInfo?: ConfigColumns;
    }) => ReturnType<ConflictTableAction["buildArgs"]>;
};

const ALLIANCE_ACTION_IDS = new Set<ConflictActionId>([
    CONFLICT_ACTION_IDS.allianceAdd,
    CONFLICT_ACTION_IDS.allianceRemove,
    CONFLICT_ACTION_IDS.allianceAddForNation,
]);

const FIELD_EDIT_ACTION_IDS = new Set<ConflictActionId>([
    CONFLICT_ACTION_IDS.editRename,
    CONFLICT_ACTION_IDS.editCategory,
    CONFLICT_ACTION_IDS.editC1Name,
    CONFLICT_ACTION_IDS.editC2Name,
    CONFLICT_ACTION_IDS.editStatus,
    CONFLICT_ACTION_IDS.editCasusBelli,
    CONFLICT_ACTION_IDS.editWiki,
    CONFLICT_ACTION_IDS.editStart,
    CONFLICT_ACTION_IDS.editEnd,
]);

export type ConflictFormattedValues = {
    category: ReactNode;
    start: ReactNode;
    end: ReactNode;
    c1Name: ReactNode;
    c2Name: ReactNode;
};

type DetailValueSource =
    | { source: "row"; key: keyof ConflictRow }
    | { source: "formatted"; key: keyof ConflictFormattedValues }
    | { source: "derived"; value: (row: ConflictRow) => ReactNode };

export type ConflictDetailFieldSpec = {
    key: string;
    label: string;
    value: DetailValueSource;
    actionId?: ConflictActionId;
    expandable?: boolean;
};

export const CONFLICT_DETAIL_FIELD_SPECS: readonly ConflictDetailFieldSpec[] = [
    { key: "id", label: "ID", value: { source: "derived", value: (row) => String(row.id) } },
    { key: "name", label: "Name", value: { source: "row", key: "name" }, actionId: CONFLICT_ACTION_IDS.editRename },
    { key: "category", label: "Category", value: { source: "formatted", key: "category" }, actionId: CONFLICT_ACTION_IDS.editCategory },
    { key: "c1Name", label: "C1", value: { source: "formatted", key: "c1Name" }, actionId: CONFLICT_ACTION_IDS.editC1Name },
    { key: "c2Name", label: "C2", value: { source: "formatted", key: "c2Name" }, actionId: CONFLICT_ACTION_IDS.editC2Name },
    { key: "status", label: "Status", value: { source: "row", key: "status" }, actionId: CONFLICT_ACTION_IDS.editStatus, expandable: true },
    { key: "casusBelli", label: "CB", value: { source: "row", key: "casusBelli" }, actionId: CONFLICT_ACTION_IDS.editCasusBelli, expandable: true },
    { key: "wiki", label: "Wiki", value: { source: "row", key: "wiki" }, actionId: CONFLICT_ACTION_IDS.editWiki },
    { key: "start", label: "Start", value: { source: "formatted", key: "start" }, actionId: CONFLICT_ACTION_IDS.editStart },
    { key: "end", label: "End", value: { source: "formatted", key: "end" }, actionId: CONFLICT_ACTION_IDS.editEnd },
];

export function resolveConflictDetailFieldValue(
    spec: ConflictDetailFieldSpec,
    row: ConflictRow,
    formatted: ConflictFormattedValues,
): ReactNode {
    if (spec.value.source === "row") {
        return row[spec.value.key] as ReactNode;
    }
    if (spec.value.source === "formatted") {
        return formatted[spec.value.key];
    }
    return spec.value.value(row);
}

export function isConflictFieldEditAction(actionId: string): boolean {
    return FIELD_EDIT_ACTION_IDS.has(actionId as ConflictActionId);
}

export function isConflictAllianceAction(actionId: string): boolean {
    return ALLIANCE_ACTION_IDS.has(actionId as ConflictActionId);
}

export function createConflictBulkActions(): ConflictTableAction[] {
    return [
        {
            id: "sync-selected",
            label: "Bulk sync",
            command: CONFLICT_COMMANDS.syncWebsite,
            scope: "bulk",
            permission: CONFLICT_SYNC_PERMISSION_PATH,
            requiresSelection: true,
            buildArgs: ({ selectedIds }) => ({
                conflicts: serializeIdSet(selectedIds),
            }),
        },
        {
            id: "create-conflict",
            label: "Create conflict",
            command: CONFLICT_COMMANDS.createConflict,
            scope: "bulk",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresSelection: false,
            requiresDialog: true,
            description: "Create a new conflict with full command arguments.",
            buildArgs: () => ({}),
        },
        {
            id: "create-temp-conflict",
            label: "Create temp",
            command: CONFLICT_COMMANDS.createTempConflict,
            scope: "bulk",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresSelection: false,
            requiresDialog: true,
            description: "Create a temporary conflict.",
            buildArgs: () => ({}),
        },
    ];
}

export function createConflictRowActions(): ConflictTableAction[] {
    const withConflict = (row?: ConflictRow) => ({ conflict: String(row?.id ?? "") });

    return [
        {
            id: CONFLICT_ACTION_IDS.syncSingle,
            label: "Sync website",
            description: "Run conflict sync for this conflict.",
            command: CONFLICT_COMMANDS.syncWebsite,
            scope: "row",
            permission: CONFLICT_SYNC_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => ({ conflicts: String(row?.id ?? "") }),
        },
        {
            id: CONFLICT_ACTION_IDS.editWiki,
            label: "Edit wiki",
            command: CONFLICT_COMMANDS.editWiki,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editWiki, withConflict(row), {
                wiki: row?.wiki ?? "",
                url: row?.wiki ?? "",
            }),
        },
        {
            id: CONFLICT_ACTION_IDS.editStatus,
            label: "Edit status",
            command: CONFLICT_COMMANDS.editStatus,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editStatus, withConflict(row), {
                status: row?.status ?? "",
            }),
        },
        {
            id: CONFLICT_ACTION_IDS.editCasusBelli,
            label: "Edit casus belli",
            command: CONFLICT_COMMANDS.editCasusBelli,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editCasusBelli, withConflict(row), {
                casus_belli: row?.casusBelli ?? "",
                cb: row?.casusBelli ?? "",
                reason: row?.casusBelli ?? "",
            }),
        },
        {
            id: CONFLICT_ACTION_IDS.editCategory,
            label: "Edit category",
            command: CONFLICT_COMMANDS.editCategory,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editCategory, withConflict(row), {
                category: row?.category ?? "",
            }),
            buildDialogArgs: ({ row, formatted, columnsInfo }) => {
                const primitive = toPlainString(formatted.category);
                const categoryPrefill = primitive
                    ?? resolveConflictEnumLabel(row, "category", columnsInfo)
                    ?? row.category
                    ?? "";
                return withKnownCommandArgs(CONFLICT_COMMANDS.editCategory, { conflict: String(row.id) }, { category: categoryPrefill });
            },
        },
        {
            id: CONFLICT_ACTION_IDS.editC1Name,
            label: "Edit C1",
            command: CONFLICT_COMMANDS.editRename,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(row), {
                name: row?.c1Name ?? "",
                isCoalition1: "true",
            }),
            buildDialogArgs: ({ row, formatted }) => {
                const name = toPlainString(formatted.c1Name) ?? row.c1Name;
                return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, { conflict: String(row.id) }, { name, isCoalition1: "true" });
            },
        },
        {
            id: CONFLICT_ACTION_IDS.editC2Name,
            label: "Edit C2",
            command: CONFLICT_COMMANDS.editRename,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(row), {
                name: row?.c2Name ?? "",
                isCoalition2: "true",
            }),
            buildDialogArgs: ({ row, formatted }) => {
                const name = toPlainString(formatted.c2Name) ?? row.c2Name;
                return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, { conflict: String(row.id) }, { name, isCoalition2: "true" });
            },
        },
        {
            id: CONFLICT_ACTION_IDS.editStart,
            label: "Edit start",
            command: CONFLICT_COMMANDS.editStart,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editStart, withConflict(row), {
                time: turnToTimestampPrefill(row?.start ?? 0),
            }),
            buildDialogArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editStart, { conflict: String(row.id) }, {
                time: turnToTimestampPrefill(row.start),
            }),
        },
        {
            id: CONFLICT_ACTION_IDS.editEnd,
            label: "Edit end",
            command: CONFLICT_COMMANDS.editEnd,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editEnd, withConflict(row), {
                time: turnToTimestampPrefill(row?.end ?? 0),
            }),
            buildDialogArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editEnd, { conflict: String(row.id) }, {
                time: turnToTimestampPrefill(row.end),
            }),
        },
        {
            id: CONFLICT_ACTION_IDS.editRename,
            label: "Edit rename",
            command: CONFLICT_COMMANDS.editRename,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(row), {
                name: row?.name ?? "",
                new_name: row?.name ?? "",
                conflict_name: row?.name ?? "",
            }),
        },
        {
            id: CONFLICT_ACTION_IDS.deleteConflict,
            label: "Delete",
            command: CONFLICT_COMMANDS.deleteConflict,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withConflict(row),
        },
        {
            id: CONFLICT_ACTION_IDS.allianceAdd,
            label: "Alliance add",
            command: CONFLICT_COMMANDS.allianceAdd,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withConflict(row),
        },
        {
            id: CONFLICT_ACTION_IDS.allianceRemove,
            label: "Alliance remove",
            command: CONFLICT_COMMANDS.allianceRemove,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withConflict(row),
        },
        {
            id: CONFLICT_ACTION_IDS.allianceAddForNation,
            label: "Add all for nation",
            command: CONFLICT_COMMANDS.allianceAddForNation,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withConflict(row),
        },
        {
            id: CONFLICT_ACTION_IDS.editAddForumPost,
            label: "Add forum post",
            command: CONFLICT_COMMANDS.editAddForumPost,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withConflict(row),
        },
        {
            id: CONFLICT_ACTION_IDS.editAddNoneWar,
            label: "Add none war",
            command: CONFLICT_COMMANDS.editAddNoneWar,
            scope: "row",
            permission: CONFLICT_EDIT_PERMISSION_PATH,
            requiresDialog: true,
            buildArgs: ({ row }) => withConflict(row),
        },
    ];
}

export function buildConflictDialogPrefilledAction(
    action: ConflictTableAction,
    row: ConflictRow,
    formatted: ConflictFormattedValues,
    selectedIds: Set<number>,
    columnsInfo?: ConfigColumns[],
): ConflictTableAction {
    if (!action.buildDialogArgs) return action;

    return {
        ...action,
        buildArgs: () => action.buildDialogArgs!({ row, selectedIds, formatted, columnsInfo }),
    };
}

export function buildConflictAllianceRemoveArgs(conflictId: number, allianceId: number) {
    return withKnownCommandArgs(CONFLICT_COMMANDS.allianceRemove, { conflict: String(conflictId) }, {
        alliances: String(allianceId),
    });
}

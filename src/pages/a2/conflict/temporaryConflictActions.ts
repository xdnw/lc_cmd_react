import type { ReactNode } from "react";
import type { WebVirtualConflict } from "@/lib/apitypes.d.ts";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";
import type { TableActionArgs, TableActionScope, TableCommandAction } from "@/pages/custom_table/actions/models";
import { withKnownCommandArgs } from "@/pages/custom_table/actions/commandArgs";
import { serializeIdSet } from "@/utils/useIdSelection";
import {
    getActionByDetailRole,
    getActionsByDetailRoles,
    getDetailSpecActions,
    withActionPrefillArgs,
} from "./conflictActionShared";
import {
    buildAllianceRemoveArgsForConflictRef,
    buildForumPostRemoveArgsForConflictRef,
    CONFLICT_COMMANDS,
    CONFLICT_EDIT_PERMISSION_PATH,
    CONFLICT_SYNC_PERMISSION_PATH,
    type ConflictCommandPath,
    withConflictRef,
} from "./conflictActions";
import { toTemporaryConflictRef, type TemporaryConflictRow } from "./temporaryConflictTableSchema";

type TemporaryConflictDetailRole =
    | "sync"
    | "field"
    | "default"
    | "danger"
    | "alliance-add"
    | "alliance-add-for-nation"
    | "alliance-remove-hidden"
    | "forum-post-add"
    | "forum-post-remove-hidden";

type TemporaryConflictDialogContext = {
    row: TemporaryConflictRow;
    selectedIds: Set<string>;
    info?: WebVirtualConflict;
    columnsInfo?: ConfigColumns[];
};

type TemporaryConflictDetailValueContext = {
    row: TemporaryConflictRow;
    info?: WebVirtualConflict;
    columnsInfo?: ConfigColumns[];
};

export type TemporaryConflictDetailField = {
    key: string;
    label: string;
    value: ReactNode;
    expandable?: boolean;
    action?: TemporaryConflictRowAction;
};

type TemporaryConflictActionDetailSpec = {
    key: string;
    label: string;
    order: number;
    expandable?: boolean;
    value: (context: TemporaryConflictDetailValueContext) => ReactNode;
};

type TemporaryConflictActionBase<P extends ConflictCommandPath, S extends TableActionScope> = TableCommandAction<TemporaryConflictRow, string, P> & {
    id: string;
    scope: S;
    detailRole?: TemporaryConflictDetailRole;
    detailSpec?: TemporaryConflictActionDetailSpec;
    prefillArgs?: (context: TemporaryConflictDialogContext) => TableActionArgs<P>;
};

export type TemporaryConflictTableAction = TemporaryConflictActionBase<ConflictCommandPath, TableActionScope>;
export type TemporaryConflictRowAction = TemporaryConflictActionBase<ConflictCommandPath, "row">;
export type TemporaryConflictBulkAction = TemporaryConflictActionBase<ConflictCommandPath, "bulk">;

function defineTemporaryConflictActions<const Actions extends readonly TemporaryConflictTableAction[]>(actions: Actions): Actions {
    return actions;
}

function requireTemporaryConflictRow(row: TemporaryConflictRow | undefined): TemporaryConflictRow {
    if (!row) {
        throw new Error("Temporary conflict action requires a row context.");
    }
    return row;
}

function withTemporaryConflict(row: TemporaryConflictRow): { conflict: string } {
    return withConflictRef(row.commandConflictRef);
}

function getInfoValue(value: string | null | undefined, fallback: string): string {
    return value ?? fallback;
}

const TEMPORARY_CONFLICT_ACTIONS = defineTemporaryConflictActions([
    {
        id: "sync-selected",
        label: "Bulk sync",
        command: CONFLICT_COMMANDS.syncWebsite,
        scope: "bulk",
        permission: CONFLICT_SYNC_PERMISSION_PATH,
        requiresSelection: true,
        buildArgs: ({ selectedIds }) => ({ conflicts: serializeIdSet(selectedIds) }),
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
    {
        id: "sync-single",
        label: "Sync website",
        command: CONFLICT_COMMANDS.syncWebsite,
        scope: "row",
        permission: CONFLICT_SYNC_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "sync",
        buildArgs: ({ row }) => {
            const conflict = requireTemporaryConflictRow(row);
            return { conflicts: conflict.commandConflictRef };
        },
    },
    {
        id: "edit-rename",
        label: "Edit rename",
        command: CONFLICT_COMMANDS.editRename,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "name",
            label: "Name",
            order: 10,
            value: ({ row, info }) => getInfoValue(info?.name, row.name),
        },
        buildArgs: ({ row }) => {
            const conflict = requireTemporaryConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withTemporaryConflict(conflict), {
                name: conflict.name,
            });
        },
        prefillArgs: ({ row, info }) => withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withTemporaryConflict(row), {
            name: getInfoValue(info?.name, row.name),
        }),
    },
    {
        id: "edit-category",
        label: "Edit category",
        command: CONFLICT_COMMANDS.editCategory,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "category",
            label: "Category",
            order: 20,
            value: ({ row, info }) => getInfoValue(info?.category, row.category),
        },
        buildArgs: ({ row }) => {
            const conflict = requireTemporaryConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editCategory, withTemporaryConflict(conflict), {
                category: conflict.category,
            });
        },
        prefillArgs: ({ row, info }) => withKnownCommandArgs(CONFLICT_COMMANDS.editCategory, withTemporaryConflict(row), {
            category: getInfoValue(info?.category, row.category),
        }),
    },
    {
        id: "edit-status",
        label: "Edit status",
        command: CONFLICT_COMMANDS.editStatus,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "status",
            label: "Status",
            order: 30,
            expandable: true,
            value: ({ row, info }) => getInfoValue(info?.status, row.status),
        },
        buildArgs: ({ row }) => {
            const conflict = requireTemporaryConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editStatus, withTemporaryConflict(conflict), {
                status: conflict.status,
            });
        },
        prefillArgs: ({ row, info }) => withKnownCommandArgs(CONFLICT_COMMANDS.editStatus, withTemporaryConflict(row), {
            status: getInfoValue(info?.status, row.status),
        }),
    },
    {
        id: "edit-casus-belli",
        label: "Edit casus belli",
        command: CONFLICT_COMMANDS.editCasusBelli,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "casusBelli",
            label: "CB",
            order: 40,
            expandable: true,
            value: ({ row, info }) => getInfoValue(info?.cb, row.casusBelli),
        },
        buildArgs: ({ row }) => {
            const conflict = requireTemporaryConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editCasusBelli, withTemporaryConflict(conflict), {
                casus_belli: conflict.casusBelli,
            });
        },
        prefillArgs: ({ row, info }) => withKnownCommandArgs(CONFLICT_COMMANDS.editCasusBelli, withTemporaryConflict(row), {
            casus_belli: getInfoValue(info?.cb, row.casusBelli),
        }),
    },
    {
        id: "edit-wiki",
        label: "Edit wiki",
        command: CONFLICT_COMMANDS.editWiki,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "wiki",
            label: "Wiki",
            order: 50,
            value: ({ row, info }) => getInfoValue(info?.wiki, row.wiki),
        },
        buildArgs: ({ row }) => {
            const conflict = requireTemporaryConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editWiki, withTemporaryConflict(conflict), {
                url: conflict.wiki,
            });
        },
        prefillArgs: ({ row, info }) => withKnownCommandArgs(CONFLICT_COMMANDS.editWiki, withTemporaryConflict(row), {
            url: getInfoValue(info?.wiki, row.wiki),
        }),
    },
    {
        id: "alliance-add",
        label: "Alliance add",
        command: CONFLICT_COMMANDS.allianceAdd,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "alliance-add",
        buildArgs: ({ row }) => withTemporaryConflict(requireTemporaryConflictRow(row)),
    },
    {
        id: "alliance-remove",
        label: "Alliance remove",
        command: CONFLICT_COMMANDS.allianceRemove,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "alliance-remove-hidden",
        buildArgs: ({ row }) => withTemporaryConflict(requireTemporaryConflictRow(row)),
    },
    {
        id: "alliance-add-for-nation",
        label: "Add all for nation",
        command: CONFLICT_COMMANDS.allianceAddForNation,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "alliance-add-for-nation",
        buildArgs: ({ row }) => withTemporaryConflict(requireTemporaryConflictRow(row)),
    },
    {
        id: "edit-add-forum-post",
        label: "Add forum post",
        command: CONFLICT_COMMANDS.editAddForumPost,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "forum-post-add",
        buildArgs: ({ row }) => withTemporaryConflict(requireTemporaryConflictRow(row)),
    },
    {
        id: "edit-remove-forum-post",
        label: "Remove forum post",
        command: CONFLICT_COMMANDS.editRemoveForumPost,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "forum-post-remove-hidden",
        buildArgs: ({ row }) => withTemporaryConflict(requireTemporaryConflictRow(row)),
    },
    {
        id: "delete-conflict",
        label: "Delete",
        command: CONFLICT_COMMANDS.deleteConflict,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "danger",
        buildArgs: ({ row }) => withTemporaryConflict(requireTemporaryConflictRow(row)),
    },
] as const);

export function createTemporaryConflictBulkActions(): readonly TemporaryConflictBulkAction[] {
    return TEMPORARY_CONFLICT_ACTIONS.filter((action) => action.scope === "bulk") as readonly TemporaryConflictBulkAction[];
}

export function createTemporaryConflictRowActions(): readonly TemporaryConflictRowAction[] {
    return TEMPORARY_CONFLICT_ACTIONS.filter((action) => action.scope === "row") as readonly TemporaryConflictRowAction[];
}

export function withTemporaryConflictDialogArgs(
    action: TemporaryConflictRowAction,
    context: TemporaryConflictDialogContext,
): TemporaryConflictRowAction {
    return withActionPrefillArgs(action, context);
}

export function buildTemporaryConflictDetailFields(
    actions: readonly TemporaryConflictRowAction[],
    context: TemporaryConflictDetailValueContext,
): TemporaryConflictDetailField[] {
    const fields: TemporaryConflictDetailField[] = [
        { key: "nationId", label: "Nation", value: String(context.row.meta.nationId) },
        { key: "uuid", label: "UUID", value: context.row.meta.uuid, expandable: true },
    ];

    const editableFields = getDetailSpecActions(actions);

    for (const action of editableFields) {
        const detail = action.detailSpec;
        if (!detail) continue;
        fields.push({
            key: detail.key,
            label: detail.label,
            value: detail.value(context),
            expandable: detail.expandable,
            action,
        });
    }

    fields.push({ key: "ref", label: "Conflict Ref", value: toTemporaryConflictRef(context.row.meta), expandable: true });

    return fields;
}

export function getTemporaryConflictHeaderSyncAction(actions: readonly TemporaryConflictRowAction[]): TemporaryConflictRowAction | undefined {
    return getActionByDetailRole(actions, "sync");
}

export function getTemporaryConflictFooterActions(actions: readonly TemporaryConflictRowAction[]): readonly TemporaryConflictRowAction[] {
    return getActionsByDetailRoles(actions, ["default", "danger"]);
}

export function getTemporaryConflictAllianceAddAction(actions: readonly TemporaryConflictRowAction[]): TemporaryConflictRowAction | undefined {
    return getActionByDetailRole(actions, "alliance-add");
}

export function getTemporaryConflictAllianceAddForNationAction(actions: readonly TemporaryConflictRowAction[]): TemporaryConflictRowAction | undefined {
    return getActionByDetailRole(actions, "alliance-add-for-nation");
}

export function getTemporaryConflictAllianceRemoveAction(actions: readonly TemporaryConflictRowAction[]): TemporaryConflictRowAction | undefined {
    return getActionByDetailRole(actions, "alliance-remove-hidden");
}

export function getTemporaryConflictForumPostAddAction(actions: readonly TemporaryConflictRowAction[]): TemporaryConflictRowAction | undefined {
    return getActionByDetailRole(actions, "forum-post-add");
}

export function getTemporaryConflictForumPostRemoveAction(actions: readonly TemporaryConflictRowAction[]): TemporaryConflictRowAction | undefined {
    return getActionByDetailRole(actions, "forum-post-remove-hidden");
}

export function buildTemporaryConflictAllianceRemoveArgs(conflictRef: string, allianceId: number) {
    return buildAllianceRemoveArgsForConflictRef(conflictRef, allianceId);
}

export function buildTemporaryConflictForumPostRemoveArgs(conflictRef: string, url: string) {
    return buildForumPostRemoveArgsForConflictRef(conflictRef, url);
}

import type { ReactNode } from "react";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";
import type { TableActionArgs, TableActionScope, TableCommandAction } from "@/pages/custom_table/actions/models";
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

type ConflictCommandPath = (typeof CONFLICT_COMMANDS)[keyof typeof CONFLICT_COMMANDS];

type ConflictDetailRole =
    | "sync"
    | "field"
    | "default"
    | "danger"
    | "alliance-add"
    | "alliance-add-for-nation"
    | "alliance-remove-hidden";

export type ConflictFormattedValues = {
    category: ReactNode;
    start: ReactNode;
    end: ReactNode;
    c1Name: ReactNode;
    c2Name: ReactNode;
};

type ConflictDialogContext = {
    row: ConflictRow;
    selectedIds: Set<number>;
    formatted: ConflictFormattedValues;
    columnsInfo?: ConfigColumns[];
};

type ConflictDetailValueContext = {
    row: ConflictRow;
    formatted: ConflictFormattedValues;
    columnsInfo?: ConfigColumns[];
};

export type ConflictDetailField = {
    key: string;
    label: string;
    value: ReactNode;
    expandable?: boolean;
    action?: ConflictRowAction;
};

type ConflictActionDetailSpec = {
    key: string;
    label: string;
    order: number;
    expandable?: boolean;
    value: (context: ConflictDetailValueContext) => ReactNode;
};

type ConflictActionBase<P extends ConflictCommandPath, S extends TableActionScope> = TableCommandAction<ConflictRow, number, P> & {
    id: string;
    scope: S;
    detailRole?: ConflictDetailRole;
    detailSpec?: ConflictActionDetailSpec;
    prefillArgs?: (context: ConflictDialogContext) => TableActionArgs<P>;
};

export type ConflictTableAction = ConflictActionBase<ConflictCommandPath, TableActionScope>;
export type ConflictRowAction = ConflictActionBase<ConflictCommandPath, "row">;
export type ConflictBulkAction = ConflictActionBase<ConflictCommandPath, "bulk">;

function defineConflictActions<const Actions extends readonly ConflictTableAction[]>(actions: Actions): Actions {
    return actions;
}

function requireConflictRow(row: ConflictRow | undefined): ConflictRow {
    if (!row) {
        throw new Error("Conflict action requires a row context.");
    }
    return row;
}

function withConflict(row: ConflictRow): { conflict: string } {
    return { conflict: String(row.id) };
}

const CONFLICT_ACTIONS = defineConflictActions([
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
    {
        id: "sync-single",
        label: "Sync website",
        description: "Run conflict sync for this conflict.",
        command: CONFLICT_COMMANDS.syncWebsite,
        scope: "row",
        permission: CONFLICT_SYNC_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "sync",
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return { conflicts: String(conflict.id) };
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
            value: ({ row }) => row.name,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(conflict), {
                name: conflict.name,
            });
        },
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
            value: ({ formatted }) => formatted.category,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editCategory, withConflict(conflict), {
                category: conflict.category,
            });
        },
        prefillArgs: ({ row, formatted, columnsInfo }) => {
            const categoryPrefill = toPlainString(formatted.category)
                ?? resolveConflictEnumLabel(row, "category", columnsInfo)
                ?? row.category
                ?? "";

            return withKnownCommandArgs(CONFLICT_COMMANDS.editCategory, withConflict(row), {
                category: categoryPrefill,
            });
        },
    },
    {
        id: "edit-c1-name",
        label: "Edit C1",
        command: CONFLICT_COMMANDS.editRename,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "c1Name",
            label: "C1",
            order: 30,
            value: ({ formatted }) => formatted.c1Name,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(conflict), {
                name: conflict.c1Name,
                isCoalition1: "true",
            });
        },
        prefillArgs: ({ row, formatted }) => {
            const name = toPlainString(formatted.c1Name) ?? row.c1Name;
            return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(row), {
                name,
                isCoalition1: "true",
            });
        },
    },
    {
        id: "edit-c2-name",
        label: "Edit C2",
        command: CONFLICT_COMMANDS.editRename,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "c2Name",
            label: "C2",
            order: 40,
            value: ({ formatted }) => formatted.c2Name,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(conflict), {
                name: conflict.c2Name,
                isCoalition2: "true",
            });
        },
        prefillArgs: ({ row, formatted }) => {
            const name = toPlainString(formatted.c2Name) ?? row.c2Name;
            return withKnownCommandArgs(CONFLICT_COMMANDS.editRename, withConflict(row), {
                name,
                isCoalition2: "true",
            });
        },
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
            order: 50,
            expandable: true,
            value: ({ row }) => row.status,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editStatus, withConflict(conflict), {
                status: conflict.status,
            });
        },
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
            order: 60,
            expandable: true,
            value: ({ row }) => row.casusBelli,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editCasusBelli, withConflict(conflict), {
                casus_belli: conflict.casusBelli,
            });
        },
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
            order: 70,
            value: ({ row }) => row.wiki,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editWiki, withConflict(conflict), {
                url: conflict.wiki,
            });
        },
    },
    {
        id: "edit-start",
        label: "Edit start",
        command: CONFLICT_COMMANDS.editStart,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "start",
            label: "Start",
            order: 80,
            value: ({ formatted }) => formatted.start,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editStart, withConflict(conflict), {
                time: turnToTimestampPrefill(conflict.start),
            });
        },
        prefillArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editStart, withConflict(row), {
            time: turnToTimestampPrefill(row.start),
        }),
    },
    {
        id: "edit-end",
        label: "Edit end",
        command: CONFLICT_COMMANDS.editEnd,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "field",
        detailSpec: {
            key: "end",
            label: "End",
            order: 90,
            value: ({ formatted }) => formatted.end,
        },
        buildArgs: ({ row }) => {
            const conflict = requireConflictRow(row);
            return withKnownCommandArgs(CONFLICT_COMMANDS.editEnd, withConflict(conflict), {
                time: turnToTimestampPrefill(conflict.end),
            });
        },
        prefillArgs: ({ row }) => withKnownCommandArgs(CONFLICT_COMMANDS.editEnd, withConflict(row), {
            time: turnToTimestampPrefill(row.end),
        }),
    },
    {
        id: "delete-conflict",
        label: "Delete",
        command: CONFLICT_COMMANDS.deleteConflict,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "danger",
        buildArgs: ({ row }) => withConflict(requireConflictRow(row)),
    },
    {
        id: "alliance-add",
        label: "Alliance add",
        command: CONFLICT_COMMANDS.allianceAdd,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "alliance-add",
        buildArgs: ({ row }) => withConflict(requireConflictRow(row)),
    },
    {
        id: "alliance-remove",
        label: "Alliance remove",
        command: CONFLICT_COMMANDS.allianceRemove,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "alliance-remove-hidden",
        buildArgs: ({ row }) => withConflict(requireConflictRow(row)),
    },
    {
        id: "alliance-add-for-nation",
        label: "Add all for nation",
        command: CONFLICT_COMMANDS.allianceAddForNation,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "alliance-add-for-nation",
        buildArgs: ({ row }) => withConflict(requireConflictRow(row)),
    },
    {
        id: "edit-add-forum-post",
        label: "Add forum post",
        command: CONFLICT_COMMANDS.editAddForumPost,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "default",
        buildArgs: ({ row }) => withConflict(requireConflictRow(row)),
    },
    {
        id: "edit-add-none-war",
        label: "Add none war",
        command: CONFLICT_COMMANDS.editAddNoneWar,
        scope: "row",
        permission: CONFLICT_EDIT_PERMISSION_PATH,
        requiresDialog: true,
        detailRole: "default",
        buildArgs: ({ row }) => withConflict(requireConflictRow(row)),
    },
] as const);

type ConflictActionById = {
    [Action in (typeof CONFLICT_ACTIONS)[number] as Action["id"]]: Action;
};

const CONFLICT_ACTIONS_BY_ID = Object.fromEntries(
    CONFLICT_ACTIONS.map((action) => [action.id, action]),
) as ConflictActionById;

export function createConflictBulkActions(): readonly ConflictBulkAction[] {
    return CONFLICT_ACTIONS.filter((action) => action.scope === "bulk") as readonly ConflictBulkAction[];
}

export function createConflictRowActions(): readonly ConflictRowAction[] {
    return CONFLICT_ACTIONS.filter((action) => action.scope === "row") as readonly ConflictRowAction[];
}

export function withConflictDialogArgs(action: ConflictRowAction, context: ConflictDialogContext): ConflictRowAction {
    if (!action.prefillArgs) return action;

    return {
        ...action,
        buildArgs: () => action.prefillArgs!(context),
    };
}

export function buildConflictDetailFields(
    actions: readonly ConflictRowAction[],
    context: ConflictDetailValueContext,
): ConflictDetailField[] {
    const fields: ConflictDetailField[] = [
        {
            key: "id",
            label: "ID",
            value: String(context.row.id),
        },
    ];

    const editableFields = actions
        .filter((action) => action.detailRole === "field" && action.detailSpec)
        .sort((left, right) => (left.detailSpec?.order ?? 0) - (right.detailSpec?.order ?? 0));

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

    return fields;
}

export function getConflictHeaderSyncAction(actions: readonly ConflictRowAction[]): ConflictRowAction | undefined {
    return actions.find((action) => action.detailRole === "sync");
}

export function getConflictAllianceAddAction(actions: readonly ConflictRowAction[]): ConflictRowAction | undefined {
    return actions.find((action) => action.detailRole === "alliance-add");
}

export function getConflictAllianceAddForNationAction(actions: readonly ConflictRowAction[]): ConflictRowAction | undefined {
    return actions.find((action) => action.detailRole === "alliance-add-for-nation");
}

export function getConflictAllianceRemoveAction(actions: readonly ConflictRowAction[]): ConflictRowAction | undefined {
    return actions.find((action) => action.detailRole === "alliance-remove-hidden");
}

export function getConflictFooterActions(actions: readonly ConflictRowAction[]): readonly ConflictRowAction[] {
    return actions.filter((action) => action.detailRole === "default" || action.detailRole === "danger");
}

export function getConflictActionById<ActionId extends keyof ConflictActionById>(id: ActionId): ConflictActionById[ActionId] {
    return CONFLICT_ACTIONS_BY_ID[id];
}

export function buildConflictAllianceRemoveArgs(conflictId: number, allianceId: number) {
    return withKnownCommandArgs(CONFLICT_COMMANDS.allianceRemove, { conflict: String(conflictId) }, {
        alliances: String(allianceId),
    });
}

// Compile-time guard: every declared command tuple must remain an AnyCommandPath and valid for command args.
const _commandTupleValidityCheck: Record<string, AnyCommandPath> = CONFLICT_COMMANDS;
void _commandTupleValidityCheck;

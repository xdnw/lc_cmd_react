import type { RowActionsDetailField } from "@/pages/custom_table/actions/RowActionsDetailDialog";
import type { ReactNode } from "react";

export function buildActionDialogMaps<Action extends { id: string }>(
    actions: readonly Action[],
    openActionDialog: (action: Action) => void,
    onActionSuccess?: (actionId: string) => void,
) {
    const openDialogByActionId = new Map<string, () => void>();
    const onSuccessByActionId = new Map<string, (() => void) | undefined>();

    for (const action of actions) {
        openDialogByActionId.set(action.id, () => openActionDialog(action));
        onSuccessByActionId.set(action.id, onActionSuccess ? () => onActionSuccess(action.id) : undefined);
    }

    return { openDialogByActionId, onSuccessByActionId };
}

export function toRowActionsDetailFields<Action extends { id: string }>(
    fields: ReadonlyArray<{
        key: string;
        label: string;
        value: ReactNode;
        expandable?: boolean;
        action?: Action;
    }>,
    canRunAction: (action: Action) => boolean,
    openDialogByActionId: ReadonlyMap<string, () => void>,
): RowActionsDetailField[] {
    return fields.map((field) => ({
        key: field.key,
        label: field.label,
        value: field.value,
        expandable: field.expandable,
        onEdit: field.action ? openDialogByActionId.get(field.action.id) : undefined,
        canEdit: field.action ? canRunAction(field.action) : true,
    }));
}

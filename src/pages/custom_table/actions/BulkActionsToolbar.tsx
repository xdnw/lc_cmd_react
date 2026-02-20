import CommandActionButton from "@/components/cmd/CommandActionButton";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TableCommandAction } from "./models";
import { useMemo } from "react";
import { useDialog } from "@/components/layout/DialogContext";
import CommandActionDialogContent from "./CommandActionDialogContent";

export default function BulkActionsToolbar<RowT, IdT extends number | string>({
    title,
    selectedIds,
    dirtyCount,
    actions,
    canRunAction,
    onClearSelected,
    onClearDirty,
    onActionSuccess,
    actionLayout = "inline",
    className,
}: {
    title: string;
    selectedIds: Set<IdT>;
    dirtyCount?: number;
    actions: TableCommandAction<RowT, IdT>[];
    canRunAction: (action: TableCommandAction<RowT, IdT>) => boolean;
    onClearSelected?: () => void;
    onClearDirty?: () => void;
    onActionSuccess?: (actionId: string) => void;
    actionLayout?: "inline" | "stacked";
    className?: string;
}) {
    const { showDialog } = useDialog();
    const hasSelection = selectedIds.size > 0;

    const onSuccessByActionId = useMemo(() => {
        const handlers = new Map<string, (() => void) | undefined>();
        for (const action of actions) {
            handlers.set(action.id, onActionSuccess ? () => onActionSuccess(action.id) : undefined);
        }
        return handlers;
    }, [actions, onActionSuccess]);

    const onOpenDialogByActionId = useMemo(() => {
        const handlers = new Map<string, (() => void) | undefined>();
        for (const action of actions) {
            if (!action.requiresDialog) continue;
            handlers.set(action.id, () => {
                showDialog(action.label, (
                    <CommandActionDialogContent
                        action={action}
                        context={{ selectedIds }}
                        onSuccess={onActionSuccess}
                    />
                ));
            });
        }
        return handlers;
    }, [actions, onActionSuccess, selectedIds, showDialog]);

    const actionsRowClassName = actionLayout === "stacked"
        ? "flex flex-wrap items-center gap-2 w-full"
        : "flex flex-wrap items-center gap-2 ms-auto w-full sm:w-auto";

    return (
        <div className={cn("mb-2", className)}>
            <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{title}</h1>
                <Badge variant="outline">Selected: {selectedIds.size}</Badge>
                {typeof dirtyCount === "number" && <Badge variant="outline">Queued: {dirtyCount}</Badge>}
            </div>
            <div className={cn(actionsRowClassName, actionLayout === "stacked" ? "mt-2" : undefined)}>
                {actions.map((action) => {
                    const requiresSelection = action.requiresSelection ?? true;
                    const disabled = (requiresSelection && !hasSelection) || !canRunAction(action);
                    const args = action.buildArgs({ selectedIds });

                    if (action.requiresDialog) {
                        return (
                            <Button
                                key={action.id}
                                variant="outline"
                                size="sm"
                                onClick={onOpenDialogByActionId.get(action.id)}
                                disabled={disabled}
                            >
                                {action.label}
                            </Button>
                        );
                    }

                    return (
                        <CommandActionButton
                            key={action.id}
                            command={action.command}
                            args={args}
                            label={action.label}
                            classes="!ms-0"
                            disabled={disabled}
                            showResultDialog={true}
                            onSuccess={onSuccessByActionId.get(action.id)}
                        />
                    );
                })}
                {onClearSelected && (
                    <Button variant="outline" size="sm" onClick={onClearSelected} disabled={!hasSelection}>
                        Clear selected
                    </Button>
                )}
                {onClearDirty && typeof dirtyCount === "number" && (
                    <Button variant="outline" size="sm" onClick={onClearDirty} disabled={dirtyCount === 0}>
                        Clear queued
                    </Button>
                )}
            </div>
        </div>
    );
}

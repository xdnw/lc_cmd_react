import CommandActionButton from "@/components/cmd/CommandActionButton";
import { useDialog } from "@/components/layout/DialogContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AnyTableCommandAction } from "./models";
import { isActionVisible } from "./models";
import { useMemo } from "react";
import CommandActionDialogContent from "./CommandActionDialogContent";

export default function RowActionsMenu<
    RowT,
    IdT extends number | string,
    A extends AnyTableCommandAction<RowT, IdT>,
>({
    row,
    rowLabel,
    selectedIds,
    actions,
    canRunAction,
    onActionSuccess,
}: {
    row: RowT;
    rowLabel: string;
    selectedIds: Set<IdT>;
    actions: readonly A[];
    canRunAction: (action: A) => boolean;
    onActionSuccess?: (actionId: string) => void;
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

    const onOpenDialogByActionId = useMemo(() => {
        const handlers = new Map<string, (() => void) | undefined>();
        for (const action of visibleActions) {
            if (!action.requiresDialog) continue;
            handlers.set(action.id, () => {
                const context = { row, selectedIds };
                showDialog(action.label, (
                    action.renderDialog ? (
                        action.renderDialog(context)
                    ) : (
                        <CommandActionDialogContent
                            action={action}
                            context={context}
                            onSuccess={onActionSuccess}
                        />
                    )
                ));
            });
        }
        return handlers;
    }, [onActionSuccess, row, selectedIds, showDialog, visibleActions]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-[180px] truncate justify-start">
                    {rowLabel}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[220px]">
                {visibleActions.map((action) => {
                    if (action.requiresDialog) {
                        return (
                            <DropdownMenuItem
                                key={action.id}
                                className="cursor-pointer"
                                onClick={onOpenDialogByActionId.get(action.id)}
                            >
                                {action.label}
                            </DropdownMenuItem>
                        );
                    }

                    return (
                        <DropdownMenuItem key={action.id} className="cursor-default">
                            <CommandActionButton
                                command={action.command}
                                args={action.buildArgs({ row, selectedIds })}
                                label={action.label}
                                classes="!ms-0 w-full"
                                disabled={!canRunAction(action)}
                                showResultDialog={true}
                                onSuccess={onSuccessByActionId.get(action.id)}
                            />
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

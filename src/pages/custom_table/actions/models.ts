import type { COMMANDS } from "@/lib/commands";
import type { AnyCommandPath, CommandArguments } from "@/utils/Command";
import type { ReactNode } from "react";

export type TableActionScope = "row" | "bulk";

export type TableActionArgs<P extends AnyCommandPath> = Partial<CommandArguments<typeof COMMANDS.commands, P>>;

export type TableCommandAction<
    RowT,
    IdT extends number | string = number,
    P extends AnyCommandPath = AnyCommandPath,
> = {
    id: string;
    label: string;
    command: P;
    scope: TableActionScope;
    requiresSelection?: boolean;
    permission?: AnyCommandPath;
    description?: string;
    requiresDialog?: boolean;
    renderDialog?: (context: { row?: RowT; selectedIds: Set<IdT> }) => ReactNode;
    isVisible?: (context: { row?: RowT; selectedIds: Set<IdT> }) => boolean;
    buildArgs: (context: { row?: RowT; selectedIds: Set<IdT> }) => TableActionArgs<P>;
};

export type AnyTableCommandAction<RowT, IdT extends number | string = number> = TableCommandAction<RowT, IdT, AnyCommandPath>;

export function isActionVisible<RowT, IdT extends number | string, A extends AnyTableCommandAction<RowT, IdT>>(
    action: A,
    context: { row?: RowT; selectedIds: Set<IdT> },
): boolean {
    if (!action.isVisible) return true;
    return action.isVisible(context);
}

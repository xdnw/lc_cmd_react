import type { AnyCommandPath } from "@/utils/Command";
import type { ReactNode } from "react";

export type TableActionScope = "row" | "bulk";

export type TableCommandAction<RowT, IdT extends number | string = number> = {
    id: string;
    label: string;
    command: AnyCommandPath;
    scope: TableActionScope;
    requiresSelection?: boolean;
    permission?: AnyCommandPath;
    description?: string;
    requiresDialog?: boolean;
    renderDialog?: (context: { row?: RowT; selectedIds: Set<IdT> }) => ReactNode;
    isVisible?: (context: { row?: RowT; selectedIds: Set<IdT> }) => boolean;
    buildArgs: (context: { row?: RowT; selectedIds: Set<IdT> }) => Record<string, string | string[]>;
};

export function isActionVisible<RowT, IdT extends number | string>(
    action: TableCommandAction<RowT, IdT>,
    context: { row?: RowT; selectedIds: Set<IdT> },
): boolean {
    if (!action.isVisible) return true;
    return action.isVisible(context);
}

export type ActionWithDetailRole = {
    detailRole?: string;
};

export type ActionWithDetailSpec = ActionWithDetailRole & {
    detailSpec?: {
        order: number;
    };
};

export function withActionPrefillArgs<Context, BuildArgs, Action extends {
    prefillArgs?: (context: Context) => BuildArgs;
    buildArgs: (...args: unknown[]) => BuildArgs;
}>(
    action: Action,
    context: Context,
): Action {
    if (!action.prefillArgs) return action;

    return {
        ...action,
        buildArgs: (() => action.prefillArgs!(context)) as Action["buildArgs"],
    };
}

export function getActionsByDetailRoles<Action extends ActionWithDetailRole>(
    actions: readonly Action[],
    detailRoles: readonly string[],
): readonly Action[] {
    return actions.filter((action) => action.detailRole && detailRoles.includes(action.detailRole));
}

export function getActionByDetailRole<Action extends ActionWithDetailRole>(
    actions: readonly Action[],
    detailRole: string,
): Action | undefined {
    return actions.find((action) => action.detailRole === detailRole);
}

export function getDetailSpecActions<Action extends ActionWithDetailSpec>(
    actions: readonly Action[],
): readonly Action[] {
    return actions
        .filter((action) => action.detailRole === "field" && action.detailSpec)
        .sort((left, right) => (left.detailSpec?.order ?? 0) - (right.detailSpec?.order ?? 0));
}

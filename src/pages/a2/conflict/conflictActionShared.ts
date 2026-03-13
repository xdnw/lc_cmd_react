export type ActionWithDetailRole = {
    detailRole?: string;
};

export type ActionWithDetailSpec = ActionWithDetailRole & {
    detailSpec?: {
        order: number;
    };
};

type PrefillableAction<PrefillContext, BuildContext, BuildArgs> = {
    prefillArgs?: (context: PrefillContext) => BuildArgs;
    buildArgs: (context: BuildContext) => BuildArgs;
};

export function withActionPrefillArgs<PrefillContext, BuildContext, BuildArgs, Extra extends object>(
    action: Extra & PrefillableAction<PrefillContext, BuildContext, BuildArgs>,
    context: PrefillContext,
): Extra & PrefillableAction<PrefillContext, BuildContext, BuildArgs> {
    const { prefillArgs } = action;

    if (!prefillArgs) return action;

    return {
        ...action,
        buildArgs: (_buildContext: BuildContext) => prefillArgs(context),
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

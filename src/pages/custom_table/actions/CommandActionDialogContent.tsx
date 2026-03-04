import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import type { CommandInputDisplayMode } from "@/components/cmd/field/fieldTypes";
import type { TableCommandAction } from "@/pages/custom_table/actions/models";
import type { AnyCommandPath } from "@/utils/Command";
import { useMemo } from "react";

function toInitialCommandValues(data: Record<string, string | string[] | undefined>): Record<string, string> {
    const normalized: Array<[string, string]> = [];
    for (const [key, value] of Object.entries(data)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
            normalized.push([key, value.join(",")]);
            continue;
        }
        normalized.push([key, value]);
    }
    return Object.fromEntries(normalized);
}

export default function CommandActionDialogContent<
    RowT,
    IdT extends number | string,
    P extends AnyCommandPath,
>({ 
    action,
    context,
    onSuccess,
    displayMode,
}: {
    action: TableCommandAction<RowT, IdT, P>;
    context: { row?: RowT; selectedIds: Set<IdT> };
    onSuccess?: (actionId: string) => void;
    displayMode?: CommandInputDisplayMode;
}) {
    const initialValues = useMemo(
        () => toInitialCommandValues(action.buildArgs(context) as Record<string, string | string[] | undefined>),
        [action, context],
    );

    const onCompleteSuccess = useMemo(() => {
        if (!onSuccess) return undefined;
        return () => {
            onSuccess(action.id);
        };
    }, [onSuccess, action.id]);

    return (
        <CommandDialogForm
            commandPath={action.command}
            initialValues={initialValues}
            description={action.description ?? "Configure command arguments and submit."}
            runLabel={`Run ${action.label}`}
            displayMode={displayMode}
            showResultDialog={true}
            onCompleteSuccess={onCompleteSuccess}
        />
    );
}

import CommandActionButton from "@/components/cmd/CommandActionButton";
import CommandComponent from "@/components/cmd/CommandComponent";
import type { TableActionArgs, TableCommandAction } from "@/pages/custom_table/actions/models";
import { CM } from "@/utils/Command";
import { createCommandStoreWithDef } from "@/utils/StateUtil";
import { deepEqual } from "@/lib/utils";
import type { AnyCommandPath } from "@/utils/Command";
import { useCallback, useMemo, useState } from "react";
import { useStoreWithEqualityFn } from "zustand/traditional";

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
}: {
    action: TableCommandAction<RowT, IdT, P>;
    context: { row?: RowT; selectedIds: Set<IdT> };
    onSuccess?: (actionId: string) => void;
}) {
    const command = useMemo(() => CM.get(action.command), [action.command]);
    const initialValues = useMemo(
        () => toInitialCommandValues(action.buildArgs(context) as Record<string, string | string[] | undefined>),
        [action, context],
    );

    const [commandStore] = useState(() => createCommandStoreWithDef(initialValues));

    const selectOutput = useCallback((state: { output: Record<string, string | string[]> }) => state.output, []);
    const selectSetOutput = useCallback((state: { setOutput: (key: string, value: string) => void }) => state.setOutput, []);

    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);
    const setOutput = commandStore(selectSetOutput);

    const alwaysShowArgument = useCallback(() => true, []);
    const onSuccessHandler = useMemo(() => onSuccess ? () => onSuccess(action.id) : undefined, [onSuccess, action.id]);

    return (
        <div className="space-y-2 max-h-[70vh] overflow-auto">
            <p className="text-sm text-muted-foreground">{action.description ?? "Configure command arguments and submit."}</p>
            <div className="rounded border border-border p-2">
                <CommandComponent
                    command={command}
                    filterArguments={alwaysShowArgument}
                    initialValues={initialValues}
                    setOutput={setOutput}
                />
            </div>
            <div>
                <CommandActionButton
                    command={action.command}
                    args={output as TableActionArgs<P>}
                    label={`Run ${action.label}`}
                    classes="!ms-0"
                    showResultDialog={true}
                    onSuccess={onSuccessHandler}
                />
            </div>
        </div>
    );
}

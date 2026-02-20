import CommandActionButton from "@/components/cmd/CommandActionButton";
import CommandComponent from "@/components/cmd/CommandComponent";
import type { TableCommandAction } from "@/pages/custom_table/actions/models";
import { CM } from "@/utils/Command";
import { createCommandStoreWithDef } from "@/utils/StateUtil";
import { deepEqual } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { useStoreWithEqualityFn } from "zustand/traditional";

function toInitialCommandValues(data: Record<string, string | string[]>): Record<string, string> {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => {
        if (Array.isArray(value)) {
            return [key, value.join(",")];
        }
        return [key, value];
    }));
}

export default function CommandActionDialogContent<RowT, IdT extends number | string>({
    action,
    context,
    onSuccess,
}: {
    action: TableCommandAction<RowT, IdT>;
    context: { row?: RowT; selectedIds: Set<IdT> };
    onSuccess?: (actionId: string) => void;
}) {
    const command = useMemo(() => CM.get(action.command), [action.command]);
    const initialValues = useMemo(() => toInitialCommandValues(action.buildArgs(context)), [action, context]);

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
                    args={output}
                    label={`Run ${action.label}`}
                    classes="!ms-0"
                    showResultDialog={true}
                    onSuccess={onSuccessHandler}
                />
            </div>
        </div>
    );
}

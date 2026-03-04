import CommandActionButton from "@/components/cmd/CommandActionButton";
import CommandComponent from "@/components/cmd/CommandComponent";
import type { CommandInputDisplayMode } from "@/components/cmd/field/fieldTypes";
import { deepEqual } from "@/lib/utils";
import { COMMANDS } from "@/lib/commands";
import { CM } from "@/utils/Command";
import type { AnyCommandPath, CommandArguments } from "@/utils/Command";
import { createCommandStoreWithDef } from "@/utils/StateUtil";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useStoreWithEqualityFn } from "zustand/traditional";

type CommandDialogArgs<P extends AnyCommandPath> = Partial<CommandArguments<typeof COMMANDS.commands, P>>;

export type CommandDialogFormProps<P extends AnyCommandPath> = {
    commandPath: P;
    initialValues: Record<string, string>;
    description?: string;
    runLabel?: string;
    displayMode?: CommandInputDisplayMode;
    showResultDialog?: boolean;
    onCompleteSuccess?: () => void;
    runDisabled?: boolean;
    children?: (ctx: {
        output: Record<string, string | string[]>;
        setOutput: (key: string, value: string) => void;
    }) => ReactNode;
    extraActions?: ReactNode;
};

export default function CommandDialogForm<P extends AnyCommandPath>({
    commandPath,
    initialValues,
    description,
    runLabel,
    displayMode,
    showResultDialog = true,
    onCompleteSuccess,
    runDisabled = false,
    children,
    extraActions,
}: CommandDialogFormProps<P>) {
    const command = useMemo(() => CM.get(commandPath), [commandPath]);
    const [commandStore] = useState(() => createCommandStoreWithDef(initialValues));

    const selectOutput = useCallback((state: { output: Record<string, string | string[]> }) => state.output, []);
    const selectSetOutput = useCallback((state: { setOutput: (key: string, value: string) => void }) => state.setOutput, []);
    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);
    const setOutput = commandStore(selectSetOutput);

    const alwaysShowArgument = useCallback(() => true, []);
    const onCompleteHandler = useMemo(() => {
        if (!onCompleteSuccess) return undefined;
        return (result?: { status?: "success" | "error" | "action" }) => {
            if (result?.status === "error") return;
            onCompleteSuccess();
        };
    }, [onCompleteSuccess]);

    return (
        <div className="space-y-2 max-h-[70vh] overflow-auto">
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            <div className="rounded border border-border p-2">
                {children ? (
                    children({ output, setOutput })
                ) : (
                    <CommandComponent
                        command={command}
                        filterArguments={alwaysShowArgument}
                        initialValues={initialValues}
                        setOutput={setOutput}
                        displayMode={displayMode}
                    />
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <CommandActionButton
                    command={commandPath}
                    args={output as CommandDialogArgs<P>}
                    label={runLabel ?? `Run ${command.name}`}
                    classes="!ms-0"
                    disabled={runDisabled}
                    showResultDialog={showResultDialog}
                    onComplete={onCompleteHandler}
                />
                {extraActions}
            </div>
        </div>
    );
}

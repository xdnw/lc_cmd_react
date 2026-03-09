import CommandActionButton from "@/components/cmd/CommandActionButton";
import CommandComponent from "@/components/cmd/CommandComponent";
import type { CommandInputDisplayMode } from "@/components/cmd/field/fieldTypes";
import { deepEqual } from "@/lib/utils";
import { COMMANDS } from "@/lib/commands";
import { CM } from "@/utils/Command";
import type { AnyCommandPath, CommandArguments } from "@/utils/Command";
import { createCommandStoreWithDef } from "@/utils/StateUtil";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
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

type CommandStoreShape = {
    output: Record<string, string | string[]>;
    setOutput: (key: string, value: string) => void;
};

const selectOutput = (state: CommandStoreShape) => state.output;
const selectSetOutput = (state: CommandStoreShape) => state.setOutput;

const CommandDialogFields = memo(function CommandDialogFields<P extends AnyCommandPath>({
    commandPath,
    initialValues,
    description,
    displayMode,
    children,
    setOutput,
}: {
    commandPath: P;
    initialValues: Record<string, string>;
    description?: string;
    displayMode?: CommandInputDisplayMode;
    children?: CommandDialogFormProps<P>["children"];
    setOutput: (key: string, value: string) => void;
}) {
    const command = useMemo(() => CM.get(commandPath), [commandPath]);
    const alwaysShowArgument = useCallback(() => true, []);

    return (
        <>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            <div className="rounded border border-border p-2">
                {children ? (
                    children({ output: initialValues, setOutput })
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
        </>
    );
});

function CommandDialogChildrenOutput<P extends AnyCommandPath>({
    commandStore,
    children,
    setOutput,
}: {
    commandStore: ReturnType<typeof createCommandStoreWithDef>;
    children: NonNullable<CommandDialogFormProps<P>["children"]>;
    setOutput: (key: string, value: string) => void;
}) {
    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);
    return <>{children({ output, setOutput })}</>;
}

function CommandDialogActions<P extends AnyCommandPath>({
    commandStore,
    commandPath,
    commandName,
    runLabel,
    runDisabled,
    showResultDialog,
    onComplete,
    extraActions,
}: {
    commandStore: ReturnType<typeof createCommandStoreWithDef>;
    commandPath: P;
    commandName: string;
    runLabel?: string;
    runDisabled?: boolean;
    showResultDialog: boolean;
    onComplete?: (result?: { status?: "success" | "error" | "action" }) => void;
    extraActions?: ReactNode;
}) {
    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <CommandActionButton
                command={commandPath}
                args={output as CommandDialogArgs<P>}
                label={runLabel ?? `Run ${commandName}`}
                classes="!ms-0"
                disabled={runDisabled}
                showResultDialog={showResultDialog}
                onComplete={onComplete}
            />
            {extraActions}
        </div>
    );
}

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
    const [commandStore] = useState(() => createCommandStoreWithDef(initialValues));
    const setOutput = commandStore(selectSetOutput);
    const commandName = useMemo(() => CM.get(commandPath).name, [commandPath]);

    const onCompleteHandler = useMemo(() => {
        if (!onCompleteSuccess) return undefined;
        return (result?: { status?: "success" | "error" | "action" }) => {
            if (result?.status === "error") return;
            onCompleteSuccess();
        };
    }, [onCompleteSuccess]);

    return (
        <div className="space-y-2 max-h-[70vh] overflow-auto">
            {children ? (
                <>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    <div className="rounded border border-border p-2">
                        <CommandDialogChildrenOutput
                            commandStore={commandStore}
                            children={children}
                            setOutput={setOutput}
                        />
                    </div>
                </>
            ) : (
                <CommandDialogFields
                    commandPath={commandPath}
                    initialValues={initialValues}
                    description={description}
                    displayMode={displayMode}
                    setOutput={setOutput}
                />
            )}
            <CommandDialogActions
                commandStore={commandStore}
                commandPath={commandPath}
                commandName={commandName}
                runLabel={runLabel}
                runDisabled={runDisabled}
                showResultDialog={showResultDialog}
                onComplete={onCompleteHandler}
                extraActions={extraActions}
            />
        </div>
    );
}

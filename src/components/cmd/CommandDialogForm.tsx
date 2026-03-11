import CommandActionButton from "@/components/cmd/CommandActionButton";
import CommandComponent from "@/components/cmd/CommandComponent";
import CommandStringPreview from "@/components/cmd/CommandStringPreview";
import type { CommandInputDisplayMode } from "@/components/cmd/field/fieldTypes";
import { cn, deepEqual } from "@/lib/utils";
import { COMMANDS } from "@/lib/commands";
import { CM } from "@/utils/Command";
import type { AnyCommandPath, CommandArguments } from "@/utils/Command";
import { createCommandStoreWithDef } from "@/utils/StateUtil";
import { formatCommandString } from "@/utils/CommandParser";
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
    onOutputChange?: (output: Record<string, string | string[]>) => void;
    showCommandTitle?: boolean;
    autoFocusFirstField?: boolean;
    actionsLayout?: "flow" | "sticky";
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
    showCommandTitle,
    autoFocusFirstField,
    children,
    setOutput,
}: {
    commandPath: P;
    initialValues: Record<string, string>;
    description?: string;
    displayMode?: CommandInputDisplayMode;
    showCommandTitle?: boolean;
    autoFocusFirstField?: boolean;
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
                        showTitle={showCommandTitle}
                        autoFocusFirstField={autoFocusFirstField}
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
    commandPathString,
    commandName,
    runLabel,
    runDisabled,
    showResultDialog,
    onComplete,
    actionsLayout,
    extraActions,
}: {
    commandStore: ReturnType<typeof createCommandStoreWithDef>;
    commandPath: P;
    commandPathString: string;
    commandName: string;
    runLabel?: string;
    runDisabled?: boolean;
    showResultDialog: boolean;
    onComplete?: (result?: { status?: "success" | "error" | "action" }) => void;
    actionsLayout: "flow" | "sticky";
    extraActions?: ReactNode;
}) {
    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);
    const commandString = useMemo(() => formatCommandString(commandPathString, output), [commandPathString, output]);
    const getCommandText = useCallback(() => formatCommandString(commandPathString, commandStore.getState().output), [commandPathString, commandStore]);

    return (
        <div className={cn(
            "flex gap-2",
            actionsLayout === "sticky"
                ? "sticky bottom-0 z-20 -mx-2 border-t border-border/70 bg-background/96 px-2 pb-2 pt-2 backdrop-blur"
                : "flex-wrap items-center",
        )}>
            <div className="min-w-0 flex-1">
                <CommandStringPreview text={commandString} getText={getCommandText} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
    onOutputChange,
    showCommandTitle = true,
    autoFocusFirstField = false,
    actionsLayout = "flow",
    children,
    extraActions,
}: CommandDialogFormProps<P>) {
    const [commandStore] = useState(() => createCommandStoreWithDef(initialValues));
    const setOutput = commandStore(selectSetOutput);
    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);
    const commandName = useMemo(() => CM.get(commandPath).name, [commandPath]);
    const commandPathString = useMemo(() => commandPath.join(" "), [commandPath]);

    useEffect(() => {
        onOutputChange?.(output);
    }, [onOutputChange, output]);

    const onCompleteHandler = useMemo(() => {
        if (!onCompleteSuccess) return undefined;
        return (result?: { status?: "success" | "error" | "action" }) => {
            if (result?.status === "error") return;
            onCompleteSuccess();
        };
    }, [onCompleteSuccess]);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="min-h-0 flex-1 overflow-auto pr-0.5">
                <div className="space-y-2">
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
                            showCommandTitle={showCommandTitle}
                            autoFocusFirstField={autoFocusFirstField}
                            setOutput={setOutput}
                        />
                    )}
                </div>
            </div>
            <CommandDialogActions
                commandStore={commandStore}
                commandPath={commandPath}
                commandPathString={commandPathString}
                commandName={commandName}
                runLabel={runLabel}
                runDisabled={runDisabled}
                showResultDialog={showResultDialog}
                onComplete={onCompleteHandler}
                actionsLayout={actionsLayout}
                extraActions={extraActions}
            />
        </div>
    );
}

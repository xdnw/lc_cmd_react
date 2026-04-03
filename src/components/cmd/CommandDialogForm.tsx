import CommandActionButton from "@/components/cmd/CommandActionButton";
import CommandComponent, { type CommandComponentHandle } from "@/components/cmd/CommandComponent";
import CommandStringPreview from "@/components/cmd/CommandStringPreview";
import { normalizeArgInitialValue } from "@/components/cmd/argInitialValueNormalization";
import { getCommandSubmitShortcutLabel } from "@/components/cmd/commandKeyboard";
import { useCommandArgumentJump } from "@/components/cmd/useCommandArgumentJump";
import { useCommandShellKeyboard } from "@/components/cmd/useCommandShellKeyboard";
import type { CommandInputDisplayMode } from "@/components/cmd/field/fieldTypes";
import { DIALOG_LOCAL_ESCAPE_ATTR } from "@/components/ui/dialog";
import { cn, deepEqual } from "@/lib/utils";
import { COMMANDS } from "@/lib/commands";
import { CM } from "@/utils/Command";
import type { AnyCommandPath, CommandArguments } from "@/utils/Command";
import { createCommandStoreWithDef } from "@/utils/StateUtil";
import { formatCommandString } from "@/utils/CommandParser";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
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
    onRequestBack?: () => void;
    backHint?: string;
    shellHint?: string | null;
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

function buildCommandFooterHint(submitShortcutLabel: string, escapeHint?: string | null) {
    return escapeHint ?? `${submitShortcutLabel} runs | typing jump args | Esc goes back | Arrows and tab navigate`;
}

const selectOutput = (state: CommandStoreShape) => state.output;

const CommandDialogFields = memo(function CommandDialogFields<P extends AnyCommandPath>({
    commandPath,
    initialValues,
    description,
    displayMode,
    showCommandTitle,
    autoFocusFirstField,
    children,
    setOutput,
    commandRef,
    jumpSearchMatches,
    jumpSearchActiveArg,
}: {
    commandPath: P;
    initialValues: Record<string, string>;
    description?: string;
    displayMode?: CommandInputDisplayMode;
    showCommandTitle?: boolean;
    autoFocusFirstField?: boolean;
    children?: CommandDialogFormProps<P>["children"];
    setOutput: (key: string, value: string) => void;
    commandRef?: RefObject<CommandComponentHandle | null>;
    jumpSearchMatches?: readonly string[];
    jumpSearchActiveArg?: string | null;
}) {
    const command = useMemo(() => CM.get(commandPath), [commandPath]);
    const alwaysShowArgument = useCallback(() => true, []);

    return (
        <>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {children ? (
                <div className="min-w-0 rounded-md border border-border/40 p-2">
                    {children({ output: initialValues, setOutput })}
                </div>
            ) : (
                <CommandComponent
                    ref={commandRef}
                    command={command}
                    filterArguments={alwaysShowArgument}
                    initialValues={initialValues}
                    setOutput={setOutput}
                    displayMode={displayMode}
                    showTitle={showCommandTitle}
                    autoFocusFirstField={autoFocusFirstField}
                    jumpSearchMatches={jumpSearchMatches}
                    jumpSearchActiveArg={jumpSearchActiveArg}
                />
            )}
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
    submitButtonRef,
    submitShortcutLabel,
    escapeHint,
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
    submitButtonRef?: RefObject<HTMLButtonElement | null>;
    submitShortcutLabel: string;
    escapeHint?: string | null;
}) {
    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);
    const commandString = useMemo(() => formatCommandString(commandPathString, output), [commandPathString, output]);
    const getCommandText = useCallback(() => formatCommandString(commandPathString, commandStore.getState().output), [commandPathString, commandStore]);
    const resolvedRunLabel = useMemo(() => {
        const baseLabel = runLabel ?? `Run ${commandName}`;
        return baseLabel.includes(submitShortcutLabel) ? baseLabel : `${baseLabel} (${submitShortcutLabel})`;
    }, [commandName, runLabel, submitShortcutLabel]);

    return (
        <div className={cn(
            "grid min-w-0 w-full gap-2",
            actionsLayout === "sticky"
                ? "z-20 border-t border-border/70 bg-background/96 px-2 pb-2 pt-2 backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                : "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        )}>
            <div className="min-w-0">
                <CommandStringPreview text={commandString} getText={getCommandText} />
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{buildCommandFooterHint(submitShortcutLabel, escapeHint)}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
                <CommandActionButton
                    buttonRef={submitButtonRef}
                    command={commandPath}
                    args={output as CommandDialogArgs<P>}
                    label={resolvedRunLabel}
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
    onRequestBack,
    backHint,
    shellHint,
    children,
    extraActions,
}: CommandDialogFormProps<P>) {
    const submitButtonRef = useRef<HTMLButtonElement | null>(null);
    const neutralCommitRef = useRef<((query: string) => void) | null>(null);
    const command = useMemo(() => CM.get(commandPath), [commandPath]);
    const normalizedInitialValues = useMemo(() => {
        const argsByName = new Map(command.getArguments().map((arg) => [arg.name, arg]));

        return Object.entries(initialValues).reduce<Record<string, string>>((accumulator, [key, value]) => {
            const arg = argsByName.get(key);
            const normalizedValue = arg
                ? normalizeArgInitialValue(arg.getTypeBreakdown(), value, { isOptional: arg.arg.optional })
                : value;

            if (normalizedValue) {
                accumulator[key] = normalizedValue;
            }

            return accumulator;
        }, {});
    }, [command, initialValues]);
    const [commandStore] = useState(() => createCommandStoreWithDef(normalizedInitialValues));
    const setOutput = commandStore.getState().setOutput;
    const output = useStoreWithEqualityFn(commandStore, selectOutput, deepEqual);
    const commandName = useMemo(() => command.name, [command]);
    const commandPathString = useMemo(() => commandPath.join(" "), [commandPath]);
    const submitShortcutLabel = useMemo(() => getCommandSubmitShortcutLabel(), []);
    const jumpEnabled = !children;
    const { rootRef, escapeHint, neutralQuery, clearEscapeState, handleBlurCapture, handleMouseDownCapture, handleKeyDownCapture } = useCommandShellKeyboard({
        onSubmit: () => submitButtonRef.current?.click(),
        onRequestBack,
        backHint,
        onNeutralCommit: (query) => {
            neutralCommitRef.current?.(query);
        },
    });

    const jumpState = useCommandArgumentJump({
        neutralQuery,
        clearShellState: clearEscapeState,
        enabled: jumpEnabled,
    });

    useEffect(() => {
        neutralCommitRef.current = jumpState.commitJump;
    }, [jumpState.commitJump]);

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

    const shellEscapeProps = onRequestBack
        ? { [DIALOG_LOCAL_ESCAPE_ATTR]: "true" as const }
        : {};

    return (
        <div
            ref={rootRef}
            {...shellEscapeProps}
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col gap-2 text-foreground"
            onMouseDownCapture={handleMouseDownCapture}
            onBlurCapture={handleBlurCapture}
            onKeyDownCapture={handleKeyDownCapture}
        >
            <div className="min-h-0 flex-1 overflow-auto pr-0.5">
                <div className="space-y-2">
                    {children ? (
                        <>
                            {description && <p className="text-sm text-muted-foreground">{description}</p>}
                            <div className="rounded-md border border-border/40 p-2">
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
                            initialValues={normalizedInitialValues}
                            description={description}
                            displayMode={displayMode}
                            showCommandTitle={showCommandTitle}
                            autoFocusFirstField={autoFocusFirstField}
                            setOutput={setOutput}
                            commandRef={jumpState.commandRef}
                            jumpSearchMatches={jumpState.jumpMatches}
                            jumpSearchActiveArg={jumpState.jumpActiveArgName}
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
                submitButtonRef={submitButtonRef}
                submitShortcutLabel={submitShortcutLabel}
                escapeHint={jumpState.jumpHint ?? escapeHint ?? shellHint}
            />
        </div>
    );
}

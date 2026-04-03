import React, { useCallback, useEffect, useMemo, type Ref } from "react";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { COMMANDS } from "@/lib/commands";
import { useDialog } from "@/components/layout/DialogContext";
import {
    RenderResponse,
    useCommandExecution,
    type CommandActionResult,
} from "@/components/cmd/useCommandExecution";
import type { AnyCommandPath, CommandArguments } from "@/utils/Command";

export type { CommandActionResult } from "@/components/cmd/useCommandExecution";

type CommandActionArgs<P extends AnyCommandPath> = Partial<CommandArguments<typeof COMMANDS.commands, P>>;

export type CommandActionButtonProps<P extends AnyCommandPath> = {
    command: P;
    args: CommandActionArgs<P>;
    label?: string;
    classes?: string;
    disabled?: boolean;
    showResultDialog?: boolean;
    presentResult?: (result: CommandActionResult) => void;
    onStart?: () => void;
    onSuccess?: (result: CommandActionResult) => void;
    onError?: (result: CommandActionResult) => void;
    onComplete?: (result?: CommandActionResult) => void;
    buttonRef?: Ref<HTMLButtonElement>;
}

function toRunCommandValues<P extends AnyCommandPath>(
    args: CommandActionArgs<P>,
): Record<string, string | string[]> {
    const values: Record<string, string | string[]> = {};
    const entries = Object.entries(args) as Array<[string, string | undefined]>;

    for (const [key, value] of entries) {
        if (value != null) {
            values[key] = value;
        }
    }

    return values;
}

export default function CommandActionButton<P extends AnyCommandPath>({
    command,
    args,
    label = "Run",
    classes,
    disabled,
    showResultDialog,
    presentResult,
    onStart,
    onSuccess,
    onError,
    onComplete,
    buttonRef,
}: CommandActionButtonProps<P>) {
    const { showDialog } = useDialog();

    const commandName = useMemo(() => command.join(" "), [command]);
    const values = useMemo(() => toRunCommandValues(args), [args]);

    const presentDefaultDialog = useCallback(
        (messages: React.ComponentProps<typeof RenderResponse>["jsonArr"], result?: CommandActionResult) => {
            const title = result?.status === "error" ? "Command error" : "Command result";
            showDialog(
                title,
                <div className="max-h-[70vh] overflow-auto">
                    <RenderResponse jsonArr={messages} showDialog={showDialog} />
                </div>,
            );
        },
        [showDialog],
    );

    const { run, isPending, messages, latestResult } = useCommandExecution({
        command: commandName,
        values,
        onStart,
        onResult: (result) => {
            presentResult?.(result);
        },
        onSuccess,
        onError,
        onComplete,
    });

    useEffect(() => {
        if (presentResult || !showResultDialog || messages.length === 0 || isPending) {
            return;
        }

        presentDefaultDialog(messages, latestResult);
    }, [isPending, latestResult, messages, presentDefaultDialog, presentResult, showResultDialog]);

    const onClick = useCallback(() => {
        if (disabled) {
            return;
        }

        run();
    }, [disabled, run]);

    return (
        <>
            <Button
                ref={buttonRef}
                variant="default"
                size="sm"
                className={cn("relative", classes)}
                disabled={disabled || isPending}
                onClick={onClick}
            >
                <span className="flex items-center justify-center w-full">
                    <span className={isPending ? "invisible" : "visible"}>{label}</span>
                    {isPending && (
                        <span className="absolute inset-0 flex items-center justify-center">
                            <Loading size={3} variant="ripple" />
                        </span>
                    )}
                </span>
            </Button>
        </>
    );
}

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { COMMANDS } from "@/lib/commands";
import { useDialog } from "@/components/layout/DialogContext";
import {
    getCommandResponseStatus,
    getCommandResponseSummary,
    handleResponse,
    RenderResponse,
    runCommand,
    type CommandMessage,
} from "@/pages/command";
import type { AnyCommandPath, CommandArguments } from "@/utils/Command";

type CommandActionArgs<P extends AnyCommandPath> = Partial<CommandArguments<typeof COMMANDS.commands, P>>;

export type CommandActionResult = {
    status: "success" | "error" | "action";
    message?: string;
    raw: CommandMessage;
};

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
};

function normalizeResult(raw: CommandMessage): CommandActionResult {
    return {
        status: getCommandResponseStatus(raw),
        message: getCommandResponseSummary(raw),
        raw,
    };
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
}: CommandActionButtonProps<P>) {
    const [isPending, setIsPending] = useState(false);
    const responseRef = useRef<HTMLDivElement>(null);
    const latestResultRef = useRef<CommandActionResult | undefined>(undefined);
    const messagesRef = useRef<CommandMessage[]>([]);
    const { showDialog } = useDialog();

    const commandName = useMemo(() => command.join(" "), [command]);
    const values = useMemo(() => toRunCommandValues(args), [args]);

    const presentDefaultDialog = useCallback(
        (messages: CommandMessage[], result?: CommandActionResult) => {
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

    const onClick = useCallback(() => {
        if (isPending || disabled) return;

        latestResultRef.current = undefined;
        messagesRef.current = [];
        setIsPending(true);
        onStart?.();

        runCommand({
            command: commandName,
            values,
            onResponse: (raw) => {
                messagesRef.current.push(raw);
                const result = normalizeResult(raw);
                latestResultRef.current = result;

                handleResponse({
                    json: raw,
                    responseRef,
                    showDialog: () => undefined,
                });

                if (result.status === "success") {
                    onSuccess?.(result);
                } else {
                    onError?.(result);
                }

                if (presentResult) {
                    presentResult(result);
                }
            },
            onDone: () => {
                setIsPending(false);
                if (!presentResult && showResultDialog && messagesRef.current.length > 0) {
                    presentDefaultDialog(messagesRef.current, latestResultRef.current);
                }
                onComplete?.(latestResultRef.current);
            },
        });
    }, [
        isPending,
        disabled,
        onStart,
        commandName,
        values,
        onSuccess,
        onError,
        presentResult,
        showResultDialog,
        presentDefaultDialog,
        onComplete,
    ]);

    return (
        <>
            <Button
                variant="outline"
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
            <div ref={responseRef} className="hidden" />
        </>
    );
}

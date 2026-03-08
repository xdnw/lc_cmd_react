import { useCallback, useEffect, useState } from "react";
import CommandActionButton, { type CommandActionButtonProps, type CommandActionResult } from "@/components/cmd/CommandActionButton";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { AnyCommandPath } from "@/utils/Command";

type ResetOnCompleteMode = "always" | "non-error" | "never";

type ConfirmCommandActionButtonProps<P extends AnyCommandPath> = Pick<
    CommandActionButtonProps<P>,
    "command" | "args" | "showResultDialog" | "presentResult" | "onStart" | "onSuccess" | "onError" | "onComplete"
> & {
    label?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    disabled?: boolean;
    classes?: string;
    buttonVariant?: ButtonProps["variant"];
    buttonSize?: ButtonProps["size"];
    buttonClassName?: string;
    cancelVariant?: ButtonProps["variant"];
    cancelSize?: ButtonProps["size"];
    cancelClassName?: string;
    isConfirming?: boolean;
    onConfirmingChange?: (isConfirming: boolean) => void;
    resetOnComplete?: ResetOnCompleteMode;
};

function shouldResetConfirmation(result: CommandActionResult | undefined, resetOnComplete: ResetOnCompleteMode): boolean {
    if (resetOnComplete === "always") return true;
    if (resetOnComplete === "never") return false;
    return result?.status !== "error";
}

export default function ConfirmCommandActionButton<P extends AnyCommandPath>({
    command,
    args,
    label = "Run",
    confirmLabel = "Confirm?",
    cancelLabel = "Cancel",
    disabled,
    classes,
    buttonVariant = "outline",
    buttonSize = "sm",
    buttonClassName,
    cancelVariant = "outline",
    cancelSize = "sm",
    cancelClassName,
    isConfirming,
    onConfirmingChange,
    resetOnComplete = "always",
    showResultDialog,
    presentResult,
    onStart,
    onSuccess,
    onError,
    onComplete,
}: ConfirmCommandActionButtonProps<P>) {
    const [internalConfirming, setInternalConfirming] = useState(false);

    const isControlled = typeof isConfirming === "boolean";
    const confirming = isControlled ? isConfirming : internalConfirming;

    const setConfirming = useCallback((next: boolean) => {
        if (!isControlled) {
            setInternalConfirming(next);
        }
        onConfirmingChange?.(next);
    }, [isControlled, onConfirmingChange]);

    useEffect(() => {
        if (disabled && confirming) {
            setConfirming(false);
        }
    }, [confirming, disabled, setConfirming]);

    const startConfirm = useCallback(() => {
        if (disabled) return;
        setConfirming(true);
    }, [disabled, setConfirming]);

    const cancelConfirm = useCallback(() => {
        setConfirming(false);
    }, [setConfirming]);

    const handleComplete = useCallback((result?: CommandActionResult) => {
        if (shouldResetConfirmation(result, resetOnComplete)) {
            setConfirming(false);
        }
        onComplete?.(result);
    }, [onComplete, resetOnComplete, setConfirming]);

    if (!confirming) {
        return (
            <Button
                variant={buttonVariant}
                size={buttonSize}
                className={buttonClassName}
                onClick={startConfirm}
                disabled={disabled}
            >
                {label}
            </Button>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-1">
            <CommandActionButton
                command={command}
                args={args}
                label={confirmLabel}
                classes={classes}
                disabled={disabled}
                showResultDialog={showResultDialog}
                presentResult={presentResult}
                onStart={onStart}
                onSuccess={onSuccess}
                onError={onError}
                onComplete={handleComplete}
            />
            <Button
                variant={cancelVariant}
                size={cancelSize}
                className={cancelClassName}
                onClick={cancelConfirm}
            >
                {cancelLabel}
            </Button>
        </div>
    );
}
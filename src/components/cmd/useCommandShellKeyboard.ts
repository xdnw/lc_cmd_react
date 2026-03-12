import { useCallback, useEffect, useRef, useState } from "react";

import {
    COMMAND_ESCAPE_TIMEOUT_MS,
    COMMAND_PREFIX_BUFFER_TIMEOUT_MS,
    doesCommandTargetOwnPrintableKey,
    isCommandJumpConfirmKey,
    isCommandPopupOpenTarget,
    observeCommandPopupOwnership,
    shouldFocusCommandShellFromPointerTarget,
    shouldSubmitCommandForm,
} from "@/components/cmd/commandKeyboard";

export function useCommandEscapeArming({
    onRequestBack,
    backHint,
    getReturnFocusTarget,
    onPopupOwnershipChange,
}: {
    onRequestBack?: () => void;
    backHint?: string;
    getReturnFocusTarget?: () => HTMLElement | null;
    onPopupOwnershipChange?: () => void;
}) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const setRootRef = useCallback((node: HTMLDivElement | null) => {
        rootRef.current = node;
    }, []);
    const [escapeArmedUntil, setEscapeArmedUntil] = useState<number | null>(null);
    const [escapeHint, setEscapeHint] = useState<string | null>(null);

    const clearEscapeArming = useCallback(() => {
        setEscapeArmedUntil(null);
        setEscapeHint(null);
    }, []);

    const refreshEscapeArming = useCallback(() => {
        setEscapeArmedUntil(Date.now() + COMMAND_ESCAPE_TIMEOUT_MS);
    }, []);

    useEffect(() => {
        if (escapeArmedUntil == null) {
            return;
        }

        const timeout = window.setTimeout(() => {
            clearEscapeArming();
        }, Math.max(0, escapeArmedUntil - Date.now()));

        return () => window.clearTimeout(timeout);
    }, [clearEscapeArming, escapeArmedUntil]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }

        return observeCommandPopupOwnership(root, () => {
            clearEscapeArming();
            onPopupOwnershipChange?.();
        });
    }, [clearEscapeArming, onPopupOwnershipChange]);

    const handleBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            clearEscapeArming();
        }
    }, [clearEscapeArming]);

    const triggerEscapeArmOrBack = useCallback(() => {
        if (!onRequestBack) {
            return false;
        }

        const now = Date.now();
        if (escapeArmedUntil != null && escapeArmedUntil > now) {
            clearEscapeArming();
            onRequestBack();
            return true;
        }

        setEscapeArmedUntil(now + COMMAND_ESCAPE_TIMEOUT_MS);
        setEscapeHint(backHint ?? "Press Esc again to go back");
        const activeElement = document.activeElement;
        const returnFocusTarget = getReturnFocusTarget?.() ?? rootRef.current;
        if (returnFocusTarget && returnFocusTarget !== activeElement) {
            returnFocusTarget.focus();
            return true;
        }

        if (activeElement instanceof HTMLElement && rootRef.current?.contains(activeElement)) {
            activeElement.blur();
            return true;
        }

        return true;
    }, [backHint, clearEscapeArming, escapeArmedUntil, getReturnFocusTarget, onRequestBack]);

    return {
        rootRef,
        setRootRef,
        escapeHint,
        escapeArmedUntil,
        clearEscapeArming,
        refreshEscapeArming,
        handleBlurCapture,
        triggerEscapeArmOrBack,
    };
}

export function useCommandShellKeyboard({
    onSubmit,
    onRequestBack,
    backHint,
    onNeutralCommit,
    getReturnFocusTarget,
}: {
    onSubmit: () => void;
    onRequestBack?: () => void;
    backHint?: string;
    onNeutralCommit?: (query: string) => void;
    getReturnFocusTarget?: () => HTMLElement | null;
}) {
    const [neutralQuery, setNeutralQuery] = useState("");

    useEffect(() => {
        if (!neutralQuery) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setNeutralQuery("");
        }, COMMAND_PREFIX_BUFFER_TIMEOUT_MS);

        return () => window.clearTimeout(timeout);
    }, [neutralQuery]);

    const {
        rootRef,
        escapeHint,
        escapeArmedUntil,
        clearEscapeArming,
        refreshEscapeArming,
        handleBlurCapture,
        triggerEscapeArmOrBack,
    } = useCommandEscapeArming({
        onRequestBack,
        backHint,
        getReturnFocusTarget,
        onPopupOwnershipChange: () => {
            setNeutralQuery("");
        },
    });

    const clearEscapeState = useCallback(() => {
        clearEscapeArming();
        setNeutralQuery("");
    }, [clearEscapeArming]);

    const handleShellBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
        handleBlurCapture(event);

        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            setNeutralQuery("");
        }
    }, [handleBlurCapture]);

    const handleMouseDownCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.defaultPrevented) {
            return;
        }

        if (!shouldFocusCommandShellFromPointerTarget(event.target)) {
            return;
        }

        rootRef.current?.focus();
    }, [rootRef]);

    const isNeutralTypingKey = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        return !event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && !/\s/.test(event.key);
    }, []);

    const canStartShellJumpFromKey = useCallback((target: EventTarget | null, key: string) => {
        return !isCommandPopupOpenTarget(target) && !doesCommandTargetOwnPrintableKey(target, key);
    }, []);

    const handleKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (shouldSubmitCommandForm(event.nativeEvent)) {
            event.preventDefault();
            clearEscapeState();
            onSubmit();
            return;
        }

        const allowShellTyping = !event.defaultPrevented && isNeutralTypingKey(event) && (escapeArmedUntil != null || canStartShellJumpFromKey(event.target, event.key));

        if (allowShellTyping && isNeutralTypingKey(event)) {
            event.preventDefault();
            if (escapeArmedUntil != null) {
                refreshEscapeArming();
            }
            setNeutralQuery((currentQuery) => currentQuery + event.key.toLowerCase());
            return;
        }

        if (neutralQuery && !event.defaultPrevented && !isCommandPopupOpenTarget(event.target)) {
            if (event.key === "Backspace") {
                event.preventDefault();
                if (escapeArmedUntil != null) {
                    refreshEscapeArming();
                }
                setNeutralQuery((currentQuery) => currentQuery.slice(0, -1));
                return;
            }

            if (isCommandJumpConfirmKey(event.key)) {
                event.preventDefault();
                onNeutralCommit?.(neutralQuery);
                return;
            }
        }

        if (
            escapeArmedUntil != null
            && !event.defaultPrevented
            && !isCommandPopupOpenTarget(event.target)
        ) {
            if (isNeutralTypingKey(event)) {
                event.preventDefault();
                refreshEscapeArming();
                setNeutralQuery((currentQuery) => currentQuery + event.key.toLowerCase());
                return;
            }

            if (event.key === "Backspace") {
                event.preventDefault();
                refreshEscapeArming();
                setNeutralQuery((currentQuery) => currentQuery.slice(0, -1));
                return;
            }

            if (neutralQuery && isCommandJumpConfirmKey(event.key)) {
                event.preventDefault();
                onNeutralCommit?.(neutralQuery);
                return;
            }
        }

        if (event.key === "Escape" && neutralQuery) {
            event.preventDefault();
            clearEscapeState();
            return;
        }

        if (event.key !== "Escape" && escapeArmedUntil != null) {
            clearEscapeState();
        }

        if (event.key !== "Escape" || !onRequestBack) {
            return;
        }

        if (isCommandPopupOpenTarget(event.target)) {
            return;
        }

        event.preventDefault();
        triggerEscapeArmOrBack();
    }, [canStartShellJumpFromKey, clearEscapeState, escapeArmedUntil, isNeutralTypingKey, neutralQuery, onNeutralCommit, onRequestBack, onSubmit, refreshEscapeArming, triggerEscapeArmOrBack]);

    return {
        rootRef,
        escapeHint,
        neutralQuery,
        clearEscapeState,
        handleBlurCapture: handleShellBlurCapture,
        handleMouseDownCapture,
        handleKeyDownCapture,
    };
}

import React, { startTransition, useCallback, useMemo, useRef, useState } from 'react';
import CommandComponent from '../../components/cmd/CommandComponent'; // Import CommandComponent
import CommandStringPreview from '@/components/cmd/CommandStringPreview';
import { CommandQueryRegistryProvider } from '@/components/cmd/CommandQueryRegistry';
import { getCommandSubmitShortcutLabel } from '@/components/cmd/commandKeyboard';
import {
    handleResponse,
    useCommandExecution,
} from '@/components/cmd/useCommandExecution';
import { useCommandArgumentJump } from '@/components/cmd/useCommandArgumentJump';
import { useCommandShellKeyboard } from '@/components/cmd/useCommandShellKeyboard';
import { CommandStoreType } from '@/utils/StateUtil.ts';
import { CM, AnyCommandPath, getTypeBreakdown } from '@/utils/Command.ts';
import { useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { getQueryParams } from "@/lib/utils.ts";
import { useDialog } from "../../components/layout/DialogContext";
import { queryParamsToObject } from "../../lib/utils";
import { createCommandStoreWithDef } from "../../utils/StateUtil";
import { COMMANDS } from '@/lib/commands';
import type { CommandInputDisplayMode } from '@/components/cmd/field/fieldTypes';
import { formatCommandString } from '@/utils/CommandParser';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { deepEqual } from '@/lib/utils';

export default function CommandPage() {
    const { command } = useParams();
    useLocation();
    const queryParams = getQueryParams();
    const forceMountAll = queryParams.get("mount") === "all" || queryParams.get("forceMount") === "all" || queryParams.get("forceMountAll") === "1";
    const benchMode = queryParams.get("bench") === "1";
    const cmdObj = useMemo(() => {
        if (command === "test") {
            return CM.buildTest();
        }

        return CM.get(command?.split(" ") as AnyCommandPath);
    }, [command]);
    const pathJoined = useMemo(() => cmdObj?.path.join(" ") ?? "", [cmdObj]);
    const [displayMode, setDisplayMode] = useState<CommandInputDisplayMode>("card");
    const shellActionsRef = useRef<HTMLDivElement | null>(null);
    const submitButtonRef = useRef<HTMLButtonElement | null>(null);
    const neutralCommitRef = useRef<((query: string) => void) | null>(null);
    const setCardDisplayMode = useCallback(() => {
        startTransition(() => setDisplayMode("card"));
    }, []);
    const setFocusPaneDisplayMode = useCallback(() => {
        startTransition(() => setDisplayMode("focus-pane"));
    }, []);

    const initialValues = useMemo<{ [key: string]: string }>(() => {
        const nextValues = queryParamsToObject(queryParams) as { [key: string]: string };
        delete nextValues.bench;
        delete nextValues.mount;
        delete nextValues.forceMount;
        delete nextValues.forceMountAll;
        return nextValues;
    }, [queryParams]);
    const commandStore = useMemo(() => createCommandStoreWithDef(initialValues), [initialValues]);
    const setOutput = commandStore.getState().setOutput;
    const commandArgs = useMemo(() => cmdObj?.getArguments() ?? [], [cmdObj]);
    const queryBreakdowns = useMemo(() => {
        const uniqueTypes = new Set(commandArgs.map((arg) => arg.arg.type));
        return Array.from(uniqueTypes, (type) => getTypeBreakdown(CM, type));
    }, [commandArgs]);

    React.useEffect(() => {
        if (!benchMode) {
            return;
        }

        const benchStart = performance.now();
        const longTasks: Array<{ name: string; duration: number; startTime: number }> = [];
        const publishBench = () => {
            (window as Window & { __lcCommandBench?: unknown }).__lcCommandBench = {
                command: pathJoined,
                forceMountAll,
                displayMode,
                elapsedMs: performance.now() - benchStart,
                inputCount: document.querySelectorAll("input, textarea, [role='textbox']").length,
                buttonCount: document.querySelectorAll("button").length,
                scrollHeight: document.documentElement.scrollHeight,
                longTasks: [...longTasks],
                refresh: publishBench,
            };
        };
        const perfObserver = typeof PerformanceObserver !== "undefined"
            ? new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    longTasks.push({
                        name: entry.name,
                        duration: entry.duration,
                        startTime: entry.startTime,
                    });
                });
                publishBench();
            })
            : null;

        try {
            perfObserver?.observe({ entryTypes: ["longtask"] });
        } catch {
            // Long task observers are not always available in every environment.
        }

        const rafOne = window.requestAnimationFrame(() => {
            const rafTwo = window.requestAnimationFrame(() => {
                publishBench();
            });
            (window as Window & { __lcCommandBenchRafTwo?: number }).__lcCommandBenchRafTwo = rafTwo;
        });

        return () => {
            perfObserver?.disconnect();
            window.cancelAnimationFrame(rafOne);
            const rafTwo = (window as Window & { __lcCommandBenchRafTwo?: number }).__lcCommandBenchRafTwo;
            if (rafTwo != null) {
                window.cancelAnimationFrame(rafTwo);
            }
            publishBench();
        };
    }, [benchMode, displayMode, forceMountAll, pathJoined]);

    const alwaysTrue = useCallback(() => true, []);
    const submitShortcutLabel = useMemo(() => getCommandSubmitShortcutLabel(), []);

    const focusShellChrome = useCallback(() => {
        const target = shellActionsRef.current?.querySelector<HTMLElement>("button:not([disabled]), a[href]");
        target?.focus();
    }, []);

    const {
        rootRef: shellRef,
        escapeHint: shellEscapeHint,
        neutralQuery,
        clearEscapeState,
        handleBlurCapture,
        handleMouseDownCapture,
        handleKeyDownCapture,
    } = useCommandShellKeyboard({
        onSubmit: () => submitButtonRef.current?.click(),
        onRequestBack: focusShellChrome,
        backHint: 'Press Esc again to move to page controls',
        onNeutralCommit: (query) => {
            neutralCommitRef.current?.(query);
        },
    });

    const jumpState = useCommandArgumentJump({
        neutralQuery,
        clearShellState: clearEscapeState,
    });

    React.useEffect(() => {
        neutralCommitRef.current = jumpState.commitJump;
    }, [jumpState.commitJump]);

    if (!cmdObj) {
        return <div>No command found</div>;
    }

    return (
        <div
            ref={shellRef}
            tabIndex={-1}
            onMouseDownCapture={handleMouseDownCapture}
            onBlurCapture={handleBlurCapture}
            onKeyDownCapture={handleKeyDownCapture}
        >
            <div ref={shellActionsRef} className="mb-2 flex items-center gap-1">
                <Button size="sm" variant={displayMode === "card" ? "default" : "outline"} onClick={setCardDisplayMode} tabIndex={-1}>Card</Button>
                <Button size="sm" variant={displayMode === "focus-pane" ? "default" : "outline"} onClick={setFocusPaneDisplayMode} tabIndex={-1}>Focus Pane</Button>
            </div>
            <CommandQueryRegistryProvider breakdowns={queryBreakdowns}>
                <CommandComponent key={cmdObj.name} command={cmdObj} filterArguments={alwaysTrue} initialValues={initialValues}
                    displayMode={displayMode}
                    forceMountAll={forceMountAll}
                    setOutput={setOutput}
                    ref={jumpState.commandRef}
                    jumpSearchMatches={jumpState.jumpMatches}
                    jumpSearchActiveArg={jumpState.jumpActiveArgName}
                />
            </CommandQueryRegistryProvider>
            <OutputValuesDisplay name={pathJoined} store={commandStore} submitShortcutLabel={submitShortcutLabel} escapeHint={jumpState.jumpHint ?? shellEscapeHint} buttonRef={submitButtonRef} />
        </div>
    );
}

export function OutputValuesDisplay({
    name,
    store,
    submitShortcutLabel,
    escapeHint,
    buttonRef,
}: {
    name: string,
    store: CommandStoreType,
    submitShortcutLabel: string,
    escapeHint?: string | null,
    buttonRef?: React.RefObject<HTMLButtonElement | null>,
}) {
    const output = useStoreWithEqualityFn(store, (state) => state.output, deepEqual);
    const deferredOutput = React.useDeferredValue(output);
    const responseRef = useRef<HTMLDivElement>(null);
    const { showDialog } = useDialog();

    const { run, clear, isPending } = useCommandExecution({
        command: name,
        values: output,
        onResult: (result) => {
            handleResponse({ json: result.raw, responseRef, showDialog });
        },
    });

    const runCommandCallback = useCallback(() => {
        run();
    }, [run]);

    const clearOutput = useCallback(() => {
        clear();
        if (responseRef.current) {
            responseRef.current.innerHTML = "";
        }
    }, [clear]);

    const commandString = useMemo(() => formatCommandString(name, deferredOutput), [name, deferredOutput]);

    const getText = useCallback(() => {
        return formatCommandString(name, store.getState().output);
    }, [name, store]);
    const footerHint = escapeHint ?? `${submitShortcutLabel} runs, letters jump args, Esc moves to page controls`;

    return (
        <div className="relative">
            <CommandStringPreview text={commandString} getText={getText} className="mb-1" />
            <p className="mb-1 h-4 overflow-hidden text-[11px] text-muted-foreground">{footerHint}</p>
            <Button ref={buttonRef} variant="default" size="sm" onClick={runCommandCallback} tabIndex={-1} disabled={isPending}>{`Run (${submitShortcutLabel})`}</Button>
            <Button variant="outline" size="sm" className="ms-1" onClick={clearOutput} tabIndex={-1}>Clear</Button>
            <div ref={responseRef}></div>
        </div>
    );
}
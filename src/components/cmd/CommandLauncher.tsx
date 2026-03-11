import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import CmdList from "@/components/cmd/CmdList";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import type { CommandInputDisplayMode } from "@/components/cmd/field/fieldTypes";
import {
    createCmdBrowserSearchParams,
    createDefaultCmdBrowserState,
    type CmdBrowserState,
} from "@/components/cmd/cmdBrowserState";
import {
    buildCommandRouteSearchParams,
    isEditableTarget,
    resolveLaunchableCommand,
} from "@/components/cmd/commandLaunchUtils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DIALOG_EXPAND_BUTTON_CLASS_NAME,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CM, type AnyCommandPath, type BaseCommand } from "@/utils/Command";

type CommandModalState = {
    path: string;
    initialValues: Record<string, string>;
    browserStateSnapshot: CmdBrowserState | null;
};

function buildExpandButton(onClick: () => void, title: string) {
    return (
        <button
            type="button"
            className={DIALOG_EXPAND_BUTTON_CLASS_NAME}
            onClick={onClick}
            title={title}
            aria-label={title}
        >
            <span aria-hidden="true">⛶</span>
        </button>
    );
}

export default function CommandLauncher() {
    const navigate = useNavigate();
    const allCommands = useMemo(() => CM.getCommands(), []);
    const browserDialogRef = useRef<HTMLDivElement | null>(null);
    const commandDialogRef = useRef<HTMLDivElement | null>(null);
    const commandsByPath = useMemo(() => {
        const map = new Map<string, BaseCommand>();
        allCommands.forEach((command) => {
            map.set(command.getPathString(), command);
        });
        return map;
    }, [allCommands]);
    const [browserState, setBrowserState] = useState<CmdBrowserState>(() => createDefaultCmdBrowserState());
    const [browserOpen, setBrowserOpen] = useState(false);
    const [commandModalState, setCommandModalState] = useState<CommandModalState | null>(null);
    const [commandOutput, setCommandOutput] = useState<Record<string, string | string[]>>({});
    const [commandDisplayMode, setCommandDisplayMode] = useState<CommandInputDisplayMode>("focus-pane");

    const openBrowser = useCallback((nextState?: Partial<CmdBrowserState>) => {
        setCommandModalState(null);
        setBrowserState(createDefaultCmdBrowserState(nextState));
        setBrowserOpen(true);
    }, []);

    const openCommand = useCallback((commandPath: string, initialValues: Record<string, string>, browserStateSnapshot: CmdBrowserState | null) => {
        setBrowserOpen(false);
        setCommandOutput(initialValues);
        setCommandModalState({
            path: commandPath,
            initialValues,
            browserStateSnapshot,
        });
    }, []);

    const closeModal = useCallback(() => {
        setBrowserOpen(false);
        setCommandModalState(null);
    }, []);

    const focusFirstFieldInDialog = useCallback((container: HTMLElement | null) => {
        if (!container) {
            return;
        }

        const selectors = [
            'textarea:not([disabled])',
            'input:not([disabled]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
            '[contenteditable="true"]',
            '[role="textbox"]:not([aria-disabled="true"])',
            'select:not([disabled])',
        ];

        for (const selector of selectors) {
            const target = container.querySelector<HTMLElement>(selector);
            if (!target) {
                continue;
            }

            target.focus();
            return;
        }
    }, []);

    const handleDialogOpenChange = useCallback((open: boolean) => {
        if (!open) {
            closeModal();
        }
    }, [closeModal]);

    const resolveCommandForLaunch = useCallback((input: string) => resolveLaunchableCommand(input, commandsByPath), [commandsByPath]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if (event.defaultPrevented || event.repeat || event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }

            if (isEditableTarget(event.target)) {
                return;
            }

            event.preventDefault();
            openBrowser({ query: "" });
        }

        function handlePaste(event: ClipboardEvent): void {
            if (event.defaultPrevented || isEditableTarget(event.target)) {
                return;
            }

            const pastedText = event.clipboardData?.getData("text") ?? "";
            if (!pastedText.trim()) {
                return;
            }

            const resolved = resolveCommandForLaunch(pastedText);
            if (!resolved) {
                return;
            }

            event.preventDefault();
            openCommand(resolved.command.getPathString(), resolved.initialValues, null);
        }

        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("paste", handlePaste, true);

        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("paste", handlePaste, true);
        };
    }, [openBrowser, openCommand, resolveCommandForLaunch]);

    const activeCommand = useMemo(() => {
        if (!commandModalState) {
            return null;
        }
        return commandsByPath.get(commandModalState.path) ?? null;
    }, [commandModalState, commandsByPath]);

    const handleSelectCommand = useCallback((command: BaseCommand) => {
        openCommand(command.getPathString(), {}, browserState);
    }, [browserState, openCommand]);

    const handleReturnToBrowser = useCallback(() => {
        if (!commandModalState?.browserStateSnapshot) {
            return;
        }

        setCommandModalState(null);
        setBrowserState(commandModalState.browserStateSnapshot);
        setBrowserOpen(true);
    }, [commandModalState]);

    const setCardDisplayMode = useCallback(() => {
        startTransition(() => setCommandDisplayMode("card"));
    }, []);

    const setFocusPaneDisplayMode = useCallback(() => {
        startTransition(() => setCommandDisplayMode("focus-pane"));
    }, []);

    const handleBrowserOpenAutoFocus = useCallback((event: Event) => {
        event.preventDefault();
        const searchInput = browserDialogRef.current?.querySelector<HTMLInputElement>('input');
        searchInput?.focus();
        searchInput?.select();
    }, []);

    const handleCommandOpenAutoFocus = useCallback((event: Event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
            focusFirstFieldInDialog(commandDialogRef.current);
        });
    }, [focusFirstFieldInDialog]);

    const browserExpand = useMemo(() => buildExpandButton(() => {
        const searchParams = createCmdBrowserSearchParams(browserState);
        closeModal();
        navigate({
            pathname: "/commands",
            search: searchParams.size > 0 ? `?${searchParams.toString()}` : "",
        });
    }, "Open commands page"), [browserState, closeModal, navigate]);

    const commandExpand = useMemo(() => {
        if (!commandModalState) {
            return null;
        }

        return buildExpandButton(() => {
            const searchParams = buildCommandRouteSearchParams(commandOutput);
            closeModal();
            navigate({
                pathname: `/command/${commandModalState.path}`,
                search: searchParams.size > 0 ? `?${searchParams.toString()}` : "",
            });
        }, `Open /${commandModalState.path} page`);
    }, [closeModal, commandModalState, commandOutput, navigate]);

    const modalOpen = browserOpen || commandModalState !== null;

    return (
        <Dialog open={modalOpen} onOpenChange={handleDialogOpenChange}>
            {browserOpen && (
                <DialogContent
                    headerActions={browserExpand}
                    onOpenAutoFocus={handleBrowserOpenAutoFocus}
                    className="max-w-[min(96vw,980px)] gap-0 overflow-hidden border-border/80 p-0"
                >
                    <div ref={browserDialogRef} className="flex max-h-[88vh] min-h-112 flex-col bg-background">
                        <DialogHeader className="border-b border-border/70 px-3 pb-2.5 pt-3 pr-24 text-left">
                            <DialogTitle className="text-base">Commands</DialogTitle>
                            <DialogDescription className="text-xs">
                                Press <kbd className="rounded border border-border/70 bg-muted px-1 py-0.5 text-[10px]">/</kbd> when typing is not active.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="min-h-0 px-3 py-3">
                            <CmdList
                                commands={allCommands}
                                prefix="/"
                                state={browserState}
                                onStateChange={setBrowserState}
                                onSelectCommand={handleSelectCommand}
                                autoFocusSearch={true}
                                modalMode={true}
                                viewportHeight="min(66vh, calc(100vh - 13rem))"
                            />
                        </div>
                    </div>
                </DialogContent>
            )}

            {commandModalState && activeCommand && (
                <DialogContent
                    headerActions={commandExpand}
                    onOpenAutoFocus={handleCommandOpenAutoFocus}
                    className="max-w-[min(96vw,1100px)] gap-0 overflow-hidden border-border/80 p-0"
                >
                    <div ref={commandDialogRef} className="flex max-h-[88vh] min-h-104 flex-col bg-background">
                        <DialogHeader className="border-b border-border/70 px-3 pb-2.5 pt-3 pr-24 text-left">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <DialogTitle className="truncate font-mono text-base">/{commandModalState.path}</DialogTitle>
                                    <DialogDescription className="mt-0.5 line-clamp-2 text-xs">
                                        {activeCommand.getDescShort()}
                                    </DialogDescription>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={commandDisplayMode === "focus-pane" ? "secondary" : "outline"}
                                        onClick={setFocusPaneDisplayMode}
                                    >
                                        Focus
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={commandDisplayMode === "card" ? "secondary" : "outline"}
                                        onClick={setCardDisplayMode}
                                    >
                                        Cards
                                    </Button>
                                    {commandModalState.browserStateSnapshot && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0"
                                            onClick={handleReturnToBrowser}
                                        >
                                            <ArrowLeft className="mr-1 h-4 w-4" />
                                            Back
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>
                        <div className={cn("flex min-h-0 flex-1 overflow-hidden px-3 py-3") }>
                            <CommandDialogForm
                                commandPath={commandModalState.path.split(" ") as AnyCommandPath}
                                initialValues={commandModalState.initialValues}
                                runLabel={`Run /${activeCommand.getPathString()}`}
                                displayMode={commandDisplayMode}
                                onOutputChange={setCommandOutput}
                                showCommandTitle={false}
                                autoFocusFirstField={true}
                                actionsLayout="sticky"
                            />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

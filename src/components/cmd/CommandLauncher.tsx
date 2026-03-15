import { startTransition, useCallback, useEffect, useMemo, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import CmdList from "@/components/cmd/CmdList";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import {
    COMMAND_BROWSER_DISPLAY_PREFIX,
    COMMAND_BROWSER_PAGE_PATH,
    createCmdBrowserPageLocation,
} from "@/components/cmd/commandBrowserNavigation";
import { useCommandLauncher } from "@/components/cmd/CommandLauncherContext";
import {
    buildCommandRouteSearchParams,
    isEditableTarget,
    resolveLaunchableCommand,
} from "@/components/cmd/commandLaunchUtils";
import { focusPrimaryCommandTarget, isCommandPopupOpenTarget } from "@/components/cmd/commandKeyboard";
import { useCommandEscapeArming } from "@/components/cmd/useCommandShellKeyboard";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DIALOG_CHROME_BUTTON_CLASS_NAME,
    DIALOG_EXPAND_BUTTON_CLASS_NAME,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CM, type AnyCommandPath, type BaseCommand } from "@/utils/Command";

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

const COMMAND_BROWSER_PAGE_SEARCH_SELECTOR = '[data-command-browser-search="page"]';

function focusSearchInput(input: HTMLInputElement | null | undefined): boolean {
    if (!input || input.disabled) {
        return false;
    }

    input.focus();
    input.select();
    return document.activeElement === input;
}

function isCommandBrowserPagePath(pathname: string): boolean {
    return pathname === COMMAND_BROWSER_PAGE_PATH || pathname === "/command";
}

function getActiveCommandBrowserPageSearchInput(): HTMLInputElement | null {
    const pageSearchInputs = Array.from(document.querySelectorAll<HTMLInputElement>(COMMAND_BROWSER_PAGE_SEARCH_SELECTOR));

    for (const input of pageSearchInputs) {
        if (input.disabled) {
            continue;
        }

        if (input.matches("[hidden], [aria-hidden='true']") || input.closest("[hidden], [aria-hidden='true'], [inert]")) {
            continue;
        }

        return input;
    }

    return null;
}

export default function CommandLauncher() {
    const location = useLocation();
    const navigate = useNavigate();
    const allCommands = useMemo(() => CM.getCommands(), []);
    const browserDialogRef = useRef<HTMLDivElement | null>(null);
    const commandDialogRef = useRef<HTMLDivElement | null>(null);
    const commandBackButtonRef = useRef<HTMLButtonElement | null>(null);
    const {
        browserOpen,
        browserState,
        commandModalState,
        commandOutput,
        commandDisplayMode,
        openBrowser,
        openCommand,
        returnToBrowser,
        dismissModal,
        closeModal,
        setBrowserState,
        setCommandOutput,
        setCommandDisplayMode,
    } = useCommandLauncher();
    const commandsByPath = useMemo(() => {
        const map = new Map<string, BaseCommand>();
        allCommands.forEach((command) => {
            map.set(command.getPathString(), command);
        });
        return map;
    }, [allCommands]);

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

            if (browserOpen) {
                focusSearchInput(browserDialogRef.current?.querySelector<HTMLInputElement>("input"));
                return;
            }

            if (commandModalState !== null) {
                return;
            }

            if (isCommandBrowserPagePath(location.pathname)) {
                focusSearchInput(getActiveCommandBrowserPageSearchInput());
                return;
            }

            openBrowser({ query: "" });
        }

        function handlePaste(event: ClipboardEvent): void {
            if (browserOpen || commandModalState !== null) {
                return;
            }

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
    }, [browserOpen, commandModalState, location.pathname, openBrowser, openCommand, resolveCommandForLaunch]);

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
        returnToBrowser();
    }, [returnToBrowser]);

    const {
        setRootRef: setCommandChromeEscapeRef,
        escapeHint: commandChromeEscapeHint,
        escapeArmedUntil: commandChromeEscapeArmedUntil,
        clearEscapeArming: clearCommandChromeEscape,
        handleBlurCapture: handleCommandChromeBlurCapture,
        triggerEscapeArmOrBack: triggerCommandChromeEscape,
    } = useCommandEscapeArming({
        onRequestBack: commandModalState?.browserStateSnapshot ? handleReturnToBrowser : closeModal,
        backHint: commandModalState?.browserStateSnapshot ? "Press Esc again to return to the command list" : "Press Esc again to close this command",
        getReturnFocusTarget: () => commandBackButtonRef.current ?? commandDialogRef.current,
    });

    const setCommandDialogRef = useCallback((node: HTMLDivElement | null) => {
        commandDialogRef.current = node;
        setCommandChromeEscapeRef(node);
    }, [setCommandChromeEscapeRef]);

    const setCardDisplayMode = useCallback(() => {
        startTransition(() => setCommandDisplayMode("card"));
    }, [setCommandDisplayMode]);

    const setFocusPaneDisplayMode = useCallback(() => {
        startTransition(() => setCommandDisplayMode("focus-pane"));
    }, [setCommandDisplayMode]);

    const handleBrowserOpenAutoFocus = useCallback((event: Event) => {
        event.preventDefault();
        focusSearchInput(browserDialogRef.current?.querySelector<HTMLInputElement>("input"));
    }, []);

    const handleCommandOpenAutoFocus = useCallback((event: Event) => {
        event.preventDefault();
        window.requestAnimationFrame(() => {
            focusPrimaryCommandTarget(commandDialogRef.current);
        });
    }, []);

    const handleCommandDialogEscapeKeyDown = useCallback((event: Event) => {
        const target = event.target;
        if (!(target instanceof Node)) {
            return;
        }

        const formEscapeOwner = commandDialogRef.current?.querySelector<HTMLElement>("[data-dialog-local-escape='true']");
        if (formEscapeOwner?.contains(target)) {
            return;
        }

        if (isCommandPopupOpenTarget(target)) {
            return;
        }

        event.preventDefault();
        triggerCommandChromeEscape();
    }, [triggerCommandChromeEscape]);

    const handleReturnToBrowserClick = useCallback(() => {
        clearCommandChromeEscape();
        handleReturnToBrowser();
    }, [clearCommandChromeEscape, handleReturnToBrowser]);

    const browserExpand = useMemo(() => buildExpandButton(() => {
        dismissModal();
        navigate(createCmdBrowserPageLocation(browserState));
    }, "Open commands page"), [browserState, dismissModal, navigate]);

    const commandExpand = useMemo(() => {
        if (!commandModalState) {
            return null;
        }

        return buildExpandButton(() => {
            const searchParams = buildCommandRouteSearchParams(commandOutput);
            dismissModal();
            navigate({
                pathname: `/command/${commandModalState.path}`,
                search: searchParams.size > 0 ? `?${searchParams.toString()}` : "",
            });
        }, `Open /${commandModalState.path} page`);
    }, [commandModalState, commandOutput, dismissModal, navigate]);

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
                        <DialogHeader className="border-b border-border/70 px-2 pb-1 pt-1.5 pr-16 text-left">
                            <DialogTitle className="text-sm font-semibold">Commands</DialogTitle>
                            <DialogDescription className="mt-0.5 line-clamp-2 text-[11px]">
                                Search commands or pages.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="min-h-0 px-2 py-1.5">
                            <CmdList
                                commands={allCommands}
                                prefix={COMMAND_BROWSER_DISPLAY_PREFIX}
                                state={browserState}
                                onStateChange={setBrowserState}
                                onSelectCommand={handleSelectCommand}
                                onRequestClose={closeModal}
                                autoFocusSearch={true}
                                modalMode={true}
                                viewportHeight="min(72vh, calc(100vh - 10.5rem))"
                            />
                        </div>
                    </div>
                </DialogContent>
            )}

            {commandModalState && activeCommand && (
                <DialogContent
                    headerActions={commandExpand}
                    onOpenAutoFocus={handleCommandOpenAutoFocus}
                    onEscapeKeyDown={handleCommandDialogEscapeKeyDown}
                    className="max-w-[min(96vw,1100px)] gap-0 overflow-hidden border-border/80 p-0"
                >
                    <div ref={setCommandDialogRef} className="flex max-h-[88vh] min-h-104 flex-col bg-background" onBlurCapture={handleCommandChromeBlurCapture}>
                        <DialogHeader className="border-b border-border/70 px-2 pb-1 pt-1.5 pr-16 text-left">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-start gap-2">
                                    {commandModalState.browserStateSnapshot && (
                                        <button
                                            ref={commandBackButtonRef}
                                            type="button"
                                            className={cn(DIALOG_CHROME_BUTTON_CLASS_NAME, "shrink-0 border-border/70 bg-background text-foreground hover:bg-accent hover:text-accent-foreground")}
                                            onClick={handleReturnToBrowserClick}
                                            title="Return to command list"
                                            aria-label="Return to command list"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>
                                    )}
                                    <div className="min-w-0">
                                        <DialogTitle className="truncate font-mono text-[15px]">/{commandModalState.path}</DialogTitle>
                                        <DialogDescription className="mt-0.5 line-clamp-2 text-[11px]">
                                            {activeCommand.getDescShort()}
                                        </DialogDescription>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
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
                                </div>
                            </div>
                        </DialogHeader>
                        <div className={cn("flex min-h-0 flex-1 overflow-hidden px-2 py-1.5") }>
                            <CommandDialogForm
                                commandPath={commandModalState.path.split(" ") as AnyCommandPath}
                                initialValues={commandModalState.initialValues}
                                runLabel={`Run /${activeCommand.getPathString()}`}
                                displayMode={commandDisplayMode}
                                onOutputChange={setCommandOutput}
                                showCommandTitle={false}
                                autoFocusFirstField={true}
                                actionsLayout="sticky"
                                onRequestBack={commandModalState.browserStateSnapshot ? handleReturnToBrowser : closeModal}
                                backHint={commandModalState.browserStateSnapshot ? "Press Esc again to return to the command list" : "Press Esc again to close this command"}
                                shellHint={commandChromeEscapeArmedUntil != null ? commandChromeEscapeHint : null}
                            />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

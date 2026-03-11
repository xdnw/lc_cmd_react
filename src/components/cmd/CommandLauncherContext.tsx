import {
    createContext,
    useEffect,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";

import {
    createDefaultCmdBrowserState,
    type CmdBrowserState,
} from "@/components/cmd/cmdBrowserState";
import type { CommandInputDisplayMode } from "@/components/cmd/field/fieldTypes";

type CommandModalState = {
    path: string;
    initialValues: Record<string, string>;
    browserStateSnapshot: CmdBrowserState | null;
};

type LauncherHistoryEntry = {
    sessionId: number;
    depth: number;
} & (
    | {
        kind: "browser";
        browserState: CmdBrowserState;
    }
    | {
        kind: "command";
        commandState: CommandModalState;
    }
);

type LauncherHistoryState = History["state"] & {
    __lcCommandLauncher?: LauncherHistoryEntry;
};

type LauncherHistoryWriteEntry =
    | {
        kind: "browser";
        depth: number;
        browserState: CmdBrowserState;
    }
    | {
        kind: "command";
        depth: number;
        commandState: CommandModalState;
    };

const LAUNCHER_HISTORY_KEY = "__lcCommandLauncher";

function getLauncherHistoryEntry(state: unknown): LauncherHistoryEntry | null {
    if (!state || typeof state !== "object") {
        return null;
    }

    const entry = (state as LauncherHistoryState)[LAUNCHER_HISTORY_KEY];
    if (!entry || typeof entry !== "object") {
        return null;
    }

    if ((entry.kind !== "browser" && entry.kind !== "command") || typeof entry.sessionId !== "number" || typeof entry.depth !== "number") {
        return null;
    }

    return entry;
}

type CommandLauncherContextValue = {
    browserOpen: boolean;
    browserState: CmdBrowserState;
    commandModalState: CommandModalState | null;
    commandOutput: Record<string, string | string[]>;
    commandDisplayMode: CommandInputDisplayMode;
    openBrowser: (nextState?: Partial<CmdBrowserState>) => void;
    openCommand: (
        commandPath: string,
        initialValues: Record<string, string>,
        browserStateSnapshot: CmdBrowserState | null,
    ) => void;
    returnToBrowser: () => void;
    dismissModal: () => void;
    closeModal: () => void;
    setBrowserState: Dispatch<SetStateAction<CmdBrowserState>>;
    setCommandOutput: Dispatch<SetStateAction<Record<string, string | string[]>>>;
    setCommandDisplayMode: Dispatch<SetStateAction<CommandInputDisplayMode>>;
};

const CommandLauncherContext = createContext<CommandLauncherContextValue | null>(null);

export function CommandLauncherProvider({ children }: { children: ReactNode }) {
    const [browserState, setBrowserState] = useState<CmdBrowserState>(() => createDefaultCmdBrowserState());
    const [browserOpen, setBrowserOpen] = useState(false);
    const [commandModalState, setCommandModalState] = useState<CommandModalState | null>(null);
    const [commandOutput, setCommandOutput] = useState<Record<string, string | string[]>>({});
    const [commandDisplayMode, setCommandDisplayMode] = useState<CommandInputDisplayMode>("focus-pane");
    const nextSessionIdRef = useRef(0);
    const sessionIdRef = useRef<number | null>(null);
    const historyDepthRef = useRef(0);

    const clearLauncherSession = useCallback(() => {
        sessionIdRef.current = null;
        historyDepthRef.current = 0;
    }, []);

    const syncClosedState = useCallback(() => {
        setBrowserOpen(false);
        setCommandModalState(null);
    }, []);

    const writeLauncherHistory = useCallback((entry: LauncherHistoryWriteEntry, mode: "push" | "replace") => {
        if (typeof window === "undefined") {
            return;
        }

        const sessionId = sessionIdRef.current ?? (nextSessionIdRef.current += 1);
        sessionIdRef.current = sessionId;
        historyDepthRef.current = entry.depth;

        const nextState: LauncherHistoryState = {
            ...(window.history.state as LauncherHistoryState | null ?? {}),
            [LAUNCHER_HISTORY_KEY]: {
                ...entry,
                sessionId,
            },
        };

        if (mode === "push") {
            window.history.pushState(nextState, "", window.location.href);
            return;
        }

        window.history.replaceState(nextState, "", window.location.href);
    }, []);

    const openBrowser = useCallback((nextState?: Partial<CmdBrowserState>) => {
        const resolvedState = createDefaultCmdBrowserState(nextState);
        setCommandModalState(null);
        setBrowserState(resolvedState);
        setBrowserOpen(true);
        if (!browserOpen && commandModalState == null) {
            writeLauncherHistory({
                kind: "browser",
                depth: 1,
                browserState: resolvedState,
            }, "push");
        }
    }, [browserOpen, commandModalState, writeLauncherHistory]);

    const openCommand = useCallback((commandPath: string, initialValues: Record<string, string>, browserStateSnapshot: CmdBrowserState | null) => {
        const nextCommandState = {
            path: commandPath,
            initialValues,
            browserStateSnapshot,
        };
        setBrowserOpen(false);
        setCommandOutput(initialValues);
        setCommandModalState(nextCommandState);

        if (browserOpen) {
            writeLauncherHistory({
                kind: "command",
                depth: 2,
                commandState: nextCommandState,
            }, "push");
            return;
        }

        if (commandModalState == null) {
            writeLauncherHistory({
                kind: "command",
                depth: 1,
                commandState: nextCommandState,
            }, "push");
        }
    }, [browserOpen, commandModalState, writeLauncherHistory]);

    const returnToBrowser = useCallback(() => {
        if (!commandModalState?.browserStateSnapshot) {
            return;
        }

        setCommandModalState(null);
        setBrowserState(createDefaultCmdBrowserState(commandModalState.browserStateSnapshot));
        setBrowserOpen(true);

        if (typeof window !== "undefined" && historyDepthRef.current > 1) {
            window.history.back();
            return;
        }
    }, [commandModalState]);

    const dismissModal = useCallback(() => {
        clearLauncherSession();
        syncClosedState();
    }, [clearLauncherSession, syncClosedState]);

    const closeModal = useCallback(() => {
        if (typeof window !== "undefined" && historyDepthRef.current > 0) {
            window.history.go(-historyDepthRef.current);
            return;
        }

        dismissModal();
    }, [dismissModal]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handlePopState = (event: PopStateEvent) => {
            const entry = getLauncherHistoryEntry(event.state);
            if (!entry) {
                clearLauncherSession();
                syncClosedState();
                return;
            }

            sessionIdRef.current = entry.sessionId;
            historyDepthRef.current = entry.depth;

            if (entry.kind === "browser") {
                setCommandModalState(null);
                setBrowserState(createDefaultCmdBrowserState(entry.browserState));
                setBrowserOpen(true);
                return;
            }

            setBrowserOpen(false);
            setCommandOutput(entry.commandState.initialValues);
            setCommandModalState(entry.commandState);
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [clearLauncherSession, syncClosedState]);

    useEffect(() => {
        if (!browserOpen || sessionIdRef.current == null || historyDepthRef.current !== 1) {
            return;
        }

        writeLauncherHistory({
            kind: "browser",
            depth: 1,
            browserState,
        }, "replace");
    }, [browserOpen, browserState, writeLauncherHistory]);

    const value = useMemo<CommandLauncherContextValue>(() => ({
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
    }), [
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
    ]);

    return (
        <CommandLauncherContext.Provider value={value}>
            {children}
        </CommandLauncherContext.Provider>
    );
}

export function useCommandLauncher() {
    const context = useContext(CommandLauncherContext);
    if (!context) {
        throw new Error("useCommandLauncher must be used within a CommandLauncherProvider");
    }
    return context;
}

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
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

    const value = useMemo<CommandLauncherContextValue>(() => ({
        browserOpen,
        browserState,
        commandModalState,
        commandOutput,
        commandDisplayMode,
        openBrowser,
        openCommand,
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

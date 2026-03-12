import React, { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import SimpleDialog from "../ui/simple-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { normalizeShowDialogOptions, type ShowDialogArg, type ShowDialogFn, type ShowDialogOptions } from "@/lib/dialog";

export type { ShowDialogArg, ShowDialogFn, ShowDialogOptions } from "@/lib/dialog";

type DialogContextType = {
    /**
     * Show a dialog entry.
     * - `showDialog(title, message)` uses defaults.
     * - `showDialog(title, message, true)` preserves boolean quote compatibility.
     * - `showDialog(title, message, { openInNewTab, focusNewTab, replaceActive, quote })`
     *   provides explicit tab/session behavior.
     */
    showDialog: ShowDialogFn;
    hideDialog: () => void;
};

type DialogProps = {
    id: string;
    title: string;
    header?: ReactNode;
    message: ReactNode;
    quote?: boolean;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

type DialogState = {
    dialogs: DialogProps[];
    isDialogVisible: boolean;
    activeDialogId: string | null;
    tabHistory: string[];
};

type DialogAction =
    | { type: "SHOW"; title: string; message: ReactNode; options: ShowDialogOptions }
    | { type: "HIDE" }
    | { type: "SET_VISIBLE"; visible: boolean }
    | { type: "CLOSE_TAB"; dialogId: string }
    | { type: "GO_BACK" }
    | { type: "SET_ACTIVE_TAB"; dialogId: string };

const INITIAL_DIALOG_STATE: DialogState = {
    dialogs: [],
    isDialogVisible: false,
    activeDialogId: null,
    tabHistory: [],
};

const createDialogId = (): string => `dialog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const appendHistory = (history: string[], dialogId: string): string[] => {
    if (history[history.length - 1] === dialogId) {
        return history;
    }
    return [...history, dialogId];
};

const pruneHistory = (history: string[], validIds: Set<string>): string[] => {
    return history.filter((id) => validIds.has(id));
};

const getLastDialogId = (dialogs: DialogProps[]): string | null => {
    return dialogs[dialogs.length - 1]?.id ?? null;
};

const removeDialogById = (state: DialogState, dialogId: string): DialogState => {
    const nextDialogs = state.dialogs.filter((dialog) => dialog.id !== dialogId);
    if (nextDialogs.length === 0) {
        return INITIAL_DIALOG_STATE;
    }

    const nextDialogIdSet = new Set(nextDialogs.map((dialog) => dialog.id));
    let nextHistory = pruneHistory(state.tabHistory.filter((id) => id !== dialogId), nextDialogIdSet);

    let nextActiveDialogId = state.activeDialogId;
    const activeWasRemoved = !nextActiveDialogId || !nextDialogIdSet.has(nextActiveDialogId);
    if (activeWasRemoved) {
        nextActiveDialogId = nextHistory[nextHistory.length - 1] ?? getLastDialogId(nextDialogs);
    }

    if (!nextActiveDialogId) {
        return INITIAL_DIALOG_STATE;
    }

    nextHistory = appendHistory(nextHistory, nextActiveDialogId);

    return {
        dialogs: nextDialogs,
        isDialogVisible: true,
        activeDialogId: nextActiveDialogId,
        tabHistory: nextHistory,
    };
};

const dialogReducer = (state: DialogState, action: DialogAction): DialogState => {
    switch (action.type) {
        case "SHOW": {
            const { title, message, options } = action;
            const quote = options.quote ?? false;
            const header = options.header;

            const hasActive = state.activeDialogId !== null && state.dialogs.some((dialog) => dialog.id === state.activeDialogId);
            const openInNewTab = options.openInNewTab ?? false;
            const replaceActive = options.replaceActive ?? (!openInNewTab);

            if (replaceActive && hasActive && state.activeDialogId) {
                const nextDialogs = state.dialogs.map((dialog) => {
                    if (dialog.id !== state.activeDialogId) return dialog;
                    return { ...dialog, title, header, message, quote };
                });
                const nextDialogIdSet = new Set(nextDialogs.map((dialog) => dialog.id));
                const nextHistory = appendHistory(pruneHistory(state.tabHistory, nextDialogIdSet), state.activeDialogId);
                return {
                    dialogs: nextDialogs,
                    isDialogVisible: true,
                    activeDialogId: state.activeDialogId,
                    tabHistory: nextHistory,
                };
            }

            const id = createDialogId();
            const nextDialogs = [...state.dialogs, { id, title, header, message, quote }];
            const shouldFocusNewTab = options.focusNewTab ?? true;
            const nextActiveDialogId = shouldFocusNewTab || !hasActive
                ? id
                : (state.activeDialogId ?? id);
            const nextDialogIdSet = new Set(nextDialogs.map((dialog) => dialog.id));
            const nextHistory = appendHistory(pruneHistory(state.tabHistory, nextDialogIdSet), nextActiveDialogId);

            return {
                dialogs: nextDialogs,
                isDialogVisible: true,
                activeDialogId: nextActiveDialogId,
                tabHistory: nextHistory,
            };
        }
        case "HIDE":
            return INITIAL_DIALOG_STATE;
        case "SET_VISIBLE":
            if (!action.visible) {
                return INITIAL_DIALOG_STATE;
            }
            return {
                ...state,
                isDialogVisible: true,
            };
        case "CLOSE_TAB":
            return removeDialogById(state, action.dialogId);
        case "GO_BACK": {
            if (state.dialogs.length === 0) {
                return INITIAL_DIALOG_STATE;
            }

            const currentDialogId = state.activeDialogId ?? getLastDialogId(state.dialogs);
            if (!currentDialogId) {
                return INITIAL_DIALOG_STATE;
            }

            return removeDialogById(state, currentDialogId);
        }
        case "SET_ACTIVE_TAB": {
            const exists = state.dialogs.some((dialog) => dialog.id === action.dialogId);
            if (!exists) {
                const validIds = new Set(state.dialogs.map((dialog) => dialog.id));
                return {
                    ...state,
                    tabHistory: pruneHistory(state.tabHistory, validIds),
                };
            }
            return {
                ...state,
                activeDialogId: action.dialogId,
                tabHistory: appendHistory(state.tabHistory, action.dialogId),
            };
        }
        default:
            return state;
    }
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(dialogReducer, INITIAL_DIALOG_STATE);
    const { dialogs, isDialogVisible, activeDialogId, tabHistory } = state;

    const showDialog = useCallback<ShowDialogFn>((title, message, optionsArg = false) => {
        dispatch({
            type: "SHOW",
            title,
            message,
            options: normalizeShowDialogOptions(optionsArg),
        });
    }, []);

    const hideDialog = useCallback(() => {
        dispatch({ type: "HIDE" });
    }, []);

    const setDialogVisibleAndClear = useCallback((visible: boolean) => {
        dispatch({ type: "SET_VISIBLE", visible });
    }, []);

    const closeDialogTab = useCallback((dialogId: string) => {
        dispatch({ type: "CLOSE_TAB", dialogId });
    }, []);

    const onTabChange = useCallback((nextDialogId: string) => {
        dispatch({ type: "SET_ACTIVE_TAB", dialogId: nextDialogId });
    }, []);

    const goBack = useCallback(() => {
        dispatch({ type: "GO_BACK" });
    }, []);

    const selectedDialogId = useMemo(() => {
        if (activeDialogId && dialogs.some((dialog) => dialog.id === activeDialogId)) {
            return activeDialogId;
        }
        return dialogs[dialogs.length - 1]?.id ?? null;
    }, [activeDialogId, dialogs]);

    const selectedDialog = useMemo(() => {
        return dialogs.find((dialog) => dialog.id === selectedDialogId) ?? dialogs[0];
    }, [dialogs, selectedDialogId]);

    const canGoBack = dialogs.length > 0;

    const closeHandlerByDialogId = useMemo(() => {
        const handlers = new Map<string, () => void>();
        for (const dialog of dialogs) {
            handlers.set(dialog.id, () => {
                closeDialogTab(dialog.id);
            });
        }
        return handlers;
    }, [closeDialogTab, dialogs]);

    const middleClickCloseHandlerByDialogId = useMemo(() => {
        const handlers = new Map<string, (event: React.MouseEvent<HTMLButtonElement>) => void>();
        for (const dialog of dialogs) {
            handlers.set(dialog.id, (event: React.MouseEvent<HTMLButtonElement>) => {
                if (event.button !== 1) return;
                event.preventDefault();
                closeDialogTab(dialog.id);
            });
        }
        return handlers;
    }, [closeDialogTab, dialogs]);

    return (
        <DialogContext.Provider value={{ showDialog, hideDialog }}>
            {children}
            {isDialogVisible && selectedDialog && (
                <SimpleDialog
                    title={selectedDialog.title}
                    header={selectedDialog.header}
                    message={
                        dialogs.length < 2 ? (
                            selectedDialog.message
                        ) : (
                            <Tabs value={selectedDialog.id} onValueChange={onTabChange} className="w-full">
                                <div className="mb-2 flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={goBack} disabled={!canGoBack}>
                                        Back
                                    </Button>
                                    <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1 p-1">
                                        {dialogs.map((dialog) => (
                                            <div key={dialog.id} className="inline-flex items-center gap-1 rounded border border-border px-1">
                                                <TabsTrigger
                                                    value={dialog.id}
                                                    className="h-7 max-w-55 truncate px-2"
                                                    title={dialog.title}
                                                    onMouseDown={middleClickCloseHandlerByDialogId.get(dialog.id)}
                                                >
                                                    <span className="truncate">{dialog.title}</span>
                                                </TabsTrigger>
                                                <button
                                                    type="button"
                                                    className="h-5 w-5 rounded text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    aria-label={`Close ${dialog.title}`}
                                                    title={`Close ${dialog.title}`}
                                                    onClick={closeHandlerByDialogId.get(dialog.id)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </TabsList>
                                </div>
                                {dialogs.map((dialog) => (
                                    <TabsContent key={dialog.id} value={dialog.id} className="mt-0">
                                        {dialog.message}
                                    </TabsContent>
                                ))}
                            </Tabs>
                        )
                    }
                    quote={selectedDialog.quote}
                    showDialog={isDialogVisible}
                    setShowDialog={setDialogVisibleAndClear}
                />
            )}
        </DialogContext.Provider>
    );
};

export const useDialog = (): DialogContextType => {
    const context = useContext(DialogContext);
    if (context === undefined) {
        throw new Error("useDialog must be used within a DialogProvider");
    }
    return context;
};

export const useShowDialog = (): ShowDialogFn => {
    return useDialog().showDialog;
};

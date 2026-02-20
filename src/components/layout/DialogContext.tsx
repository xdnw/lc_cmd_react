import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import SimpleDialog from "../ui/simple-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";

export type ShowDialogOptions = {
    quote?: boolean;
    openInNewTab?: boolean;
    focusNewTab?: boolean;
    replaceActive?: boolean;
};

type DialogContextType = {
    showDialog: (title: string, message: ReactNode, quoteOrOptions?: boolean | ShowDialogOptions) => void;
    hideDialog: () => void;
};

type DialogProps = {
    id: string;
    title: string;
    message: ReactNode;
    quote?: boolean;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialogs, setDialogs] = useState<DialogProps[]>([]);
    const [isDialogVisible, setDialogVisible] = useState(false);
    const [activeDialogId, setActiveDialogId] = useState<string | null>(null);
    const [tabHistory, setTabHistory] = useState<string[]>([]);

    const logDialogDebug = useCallback((event: string, payload: Record<string, unknown>) => {
        if (process.env.NODE_ENV === "production") return;
        try {
            console.debug(`[DialogContext] ${event}`, payload);
        } catch {
            // no-op
        }
    }, []);

    const showDialog = useCallback((title: string, message: ReactNode, quoteOrOptions: boolean | ShowDialogOptions = false) => {
        const options: ShowDialogOptions = typeof quoteOrOptions === "boolean"
            ? { quote: quoteOrOptions }
            : quoteOrOptions;

        const quote = options.quote ?? false;

        setDialogs((prevDialogs) => {
            const hasActive = activeDialogId !== null && prevDialogs.some((dialog) => dialog.id === activeDialogId);
            const openInNewTab = options.openInNewTab ?? false;
            const replaceActive = options.replaceActive ?? (!openInNewTab);

            if (replaceActive && hasActive && activeDialogId) {
                return prevDialogs.map((dialog) => {
                    if (dialog.id !== activeDialogId) return dialog;
                    return {
                        ...dialog,
                        title,
                        message,
                        quote,
                    };
                });
            }

            const id = `dialog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const nextDialogs = [...prevDialogs, { id, title, message, quote }];

            const shouldFocusNewTab = options.focusNewTab ?? true;
            if (shouldFocusNewTab || !hasActive) {
                setActiveDialogId(id);
                setTabHistory((prev) => {
                    const next = prev[prev.length - 1] === id ? prev : [...prev, id];
                    logDialogDebug("open-tab", { id, nextHistory: next });
                    return next;
                });
            }

            return nextDialogs;
        });

        setDialogVisible(true);
    }, [activeDialogId, logDialogDebug]);

    const hideDialog = useCallback(() => {
        setDialogs([]);
        setActiveDialogId(null);
        setTabHistory([]);
        setDialogVisible(false);
    }, []);

    const setDialogVisibleAndClear = useCallback((visible: boolean) => {
        setDialogVisible(visible);
        if (!visible) {
            setDialogs([]);
            setActiveDialogId(null);
            setTabHistory([]);
        }
    }, []);

    const closeDialogTab = useCallback((dialogId: string) => {
        setDialogs((prevDialogs) => {
            const nextDialogs = prevDialogs.filter((dialog) => dialog.id !== dialogId);
            const nextDialogIdSet = new Set(nextDialogs.map((dialog) => dialog.id));
            if (nextDialogs.length === 0) {
                setDialogVisible(false);
                setActiveDialogId(null);
                setTabHistory([]);
                logDialogDebug("close-last-tab", { closed: dialogId });
                return nextDialogs;
            }

            if (activeDialogId === dialogId) {
                const previousId = [...tabHistory]
                    .reverse()
                    .find((id) => id !== dialogId && nextDialogIdSet.has(id));
                const fallbackId = previousId ?? nextDialogs[nextDialogs.length - 1].id;
                setActiveDialogId(fallbackId);
                setTabHistory((prev) => {
                    const filtered = prev.filter((id) => id !== dialogId && nextDialogIdSet.has(id));
                    const next = filtered[filtered.length - 1] === fallbackId ? filtered : [...filtered, fallbackId];
                    logDialogDebug("close-active-tab", { closed: dialogId, fallbackId, nextHistory: next });
                    return next;
                });
            } else {
                setTabHistory((prev) => {
                    const next = prev.filter((id) => id !== dialogId && nextDialogIdSet.has(id));
                    logDialogDebug("close-inactive-tab", { closed: dialogId, nextHistory: next });
                    return next;
                });
            }

            return nextDialogs;
        });
    }, [activeDialogId, tabHistory, logDialogDebug]);

    const onTabChange = useCallback((nextDialogId: string) => {
        setActiveDialogId(nextDialogId);
        setTabHistory((prev) => {
            const next = prev[prev.length - 1] === nextDialogId ? prev : [...prev, nextDialogId];
            logDialogDebug("tab-change", { nextDialogId, nextHistory: next });
            return next;
        });
    }, [logDialogDebug]);

    const goBack = useCallback(() => {
        setTabHistory((prev) => {
            if (prev.length <= 1) return prev;
            const validIds = new Set(dialogs.map((dialog) => dialog.id));
            const pruned = prev.filter((id) => validIds.has(id));
            if (pruned.length <= 1) {
                const only = pruned[0] ?? dialogs[dialogs.length - 1]?.id ?? null;
                setActiveDialogId(only);
                logDialogDebug("back-pruned-noop", { history: prev, pruned, active: only });
                return pruned;
            }
            const next = pruned.slice(0, -1);
            const previousId = next[next.length - 1] ?? null;
            setActiveDialogId(previousId);
            logDialogDebug("back", { history: prev, pruned, nextHistory: next, previousId });
            return next;
        });
    }, [dialogs, logDialogDebug]);

    const selectedDialogId = useMemo(() => {
        if (activeDialogId && dialogs.some((dialog) => dialog.id === activeDialogId)) {
            return activeDialogId;
        }
        return dialogs[dialogs.length - 1]?.id ?? null;
    }, [activeDialogId, dialogs]);

    const selectedDialog = useMemo(() => {
        return dialogs.find((dialog) => dialog.id === selectedDialogId) ?? dialogs[0];
    }, [dialogs, selectedDialogId]);

    const canGoBack = tabHistory.length > 1;

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
                                                    className="h-7 max-w-[220px] truncate px-2"
                                                    title={dialog.title}
                                                    onMouseDown={middleClickCloseHandlerByDialogId.get(dialog.id)}
                                                >
                                                    <span className="truncate">{dialog.title}</span>
                                                </TabsTrigger>
                                                <button
                                                    type="button"
                                                    className="h-5 w-5 rounded text-xs hover:bg-muted"
                                                    aria-label={`Close ${dialog.title}`}
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

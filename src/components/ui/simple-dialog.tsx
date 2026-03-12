import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CopyToClipboardTextArea } from "./copytoclipboard";
import { cn } from "@/lib/utils";
import {
    getHtmlEditorFullscreenEventName,
    isHtmlEditorFullscreenActive as getIsHtmlEditorFullscreenActive,
} from "@/components/cmd/htmlEditorFullscreen";

type SimpleDialogProps = {
    title: string;
    header?: React.ReactNode;
    message: React.ReactNode;
    quote?: boolean;
    showDialog: boolean;
    setShowDialog: (show: boolean) => void;
};

/**
 * Internal wrapper around shared dialog primitives.
 * Ownership: `DialogContext` controls all dialog state and calls this component.
 */
export default function SimpleDialog({ title, header, message, quote, showDialog, setShowDialog }: SimpleDialogProps) {
    const [isHtmlEditorFullscreenActive, setIsHtmlEditorFullscreenActive] = useState<boolean>(getIsHtmlEditorFullscreenActive);

    useEffect(() => {
        function handleHtmlEditorFullscreenChange(event: Event): void {
            const nextActive = event instanceof CustomEvent && typeof event.detail?.active === "boolean"
                ? event.detail.active
                : getIsHtmlEditorFullscreenActive();

            setIsHtmlEditorFullscreenActive(nextActive);
        }

        const eventName = getHtmlEditorFullscreenEventName();
        window.addEventListener(eventName, handleHtmlEditorFullscreenChange);
        return () => {
            window.removeEventListener(eventName, handleHtmlEditorFullscreenChange);
        };
    }, []);

    return (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className={cn(
                isHtmlEditorFullscreenActive && "left-0 top-0 flex h-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 p-0 sm:rounded-none",
            )}>
                <DialogHeader className={cn(
                    "overflow-x-auto overflow-y-auto",
                    isHtmlEditorFullscreenActive
                        ? "min-h-0 flex-1 space-y-0 overflow-hidden p-0"
                        : "max-h-[75vh] pr-8",
                )}>
                    {header ? (
                        <>
                            <DialogTitle className="sr-only">{title}</DialogTitle>
                            <div className={cn(isHtmlEditorFullscreenActive && "sr-only")}>{header}</div>
                        </>
                    ) : (
                        <DialogTitle className={cn(isHtmlEditorFullscreenActive && "sr-only")}>{title}</DialogTitle>
                    )}
                    <div className={cn(
                        "relative overflow-x-auto",
                        isHtmlEditorFullscreenActive && "min-h-0 flex-1 overflow-hidden",
                    )}>
                        {quote ? (
                            <>
                                <CopyToClipboardTextArea text={message} />
                            </>
                        ) : (
                            message
                        )}
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}
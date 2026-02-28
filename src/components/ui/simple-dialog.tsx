import React, { useCallback } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CopyToClipboardTextArea } from "./copytoclipboard";
import { Button } from "./button";

type SimpleDialogProps = {
    title: string;
    message: React.ReactNode;
    quote?: boolean;
    showDialog: boolean;
    setShowDialog: (show: boolean) => void;
};

/**
 * Internal wrapper around shared dialog primitives.
 * Ownership: `DialogContext` controls all dialog state and calls this component.
 */
export default function SimpleDialog({ title, message, quote, showDialog, setShowDialog }: SimpleDialogProps) {
    const hideDialog = useCallback(() => {
        setShowDialog(false);
    }, [setShowDialog]);

    const dismissFromOutside = useCallback(() => {
        hideDialog();
    }, [hideDialog]);

    return (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent onInteractOutside={dismissFromOutside} onEscapeKeyDown={dismissFromOutside}>
                <DialogHeader className='overflow-x-auto overflow-y-auto' style={{ maxHeight: "75vh" }}>
                    <DialogTitle>{title}</DialogTitle>
                    <div className="relative overflow-x-auto">
                        {quote ? (
                            <>
                                <CopyToClipboardTextArea text={message} />
                            </>
                        ) : (
                            message
                        )}
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" size="sm" onClick={hideDialog}>Dismiss</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
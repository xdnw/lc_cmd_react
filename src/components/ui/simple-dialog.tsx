import React, { useCallback } from "react";
import {
    AlertDialog, AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog.tsx";
import { CopyToClipboardTextArea } from "./copytoclipboard";

export default function SimpleDialog({ title, message, quote, showDialog, setShowDialog }: { title: string, message: React.ReactNode, quote?: boolean, showDialog: boolean, setShowDialog: (show: boolean) => void }) {
    const hideDialog = useCallback(() => {
        setShowDialog(false);
    }, [setShowDialog]);
    return (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent>
                <AlertDialogHeader className='overflow-x-auto overflow-y-auto' style={{ maxHeight: "75vh" }}>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription></AlertDialogDescription>
                    <div className="relative overflow-x-auto">
                        {quote ? (
                            <>
                                <CopyToClipboardTextArea text={message} />
                            </>
                        ) : (
                            message
                        )}
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={hideDialog}>Dismiss</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
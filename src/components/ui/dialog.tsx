import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const DIALOG_CHROME_BUTTON_CLASS_NAME = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-md border shadow-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
);

export const DIALOG_EXPAND_BUTTON_CLASS_NAME = cn(
    DIALOG_CHROME_BUTTON_CLASS_NAME,
    "border-primary/35 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
);

export const DIALOG_CLOSE_BUTTON_CLASS_NAME = cn(
    DIALOG_CHROME_BUTTON_CLASS_NAME,
    "border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground",
);

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

function isHtmlEditorFullscreenTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement
        && target.closest('[data-html-editor-fullscreen="true"]') !== null;
}

type DialogInteractOutsideEvent = Parameters<
    NonNullable<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>["onInteractOutside"]>
>[0];

type DialogPointerDownOutsideEvent = Parameters<
    NonNullable<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>["onPointerDownOutside"]>
>[0];

type DialogFocusOutsideEvent = Parameters<
    NonNullable<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>["onFocusOutside"]>
>[0];

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className,
        )}
        {...props}
    />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
        headerActions?: React.ReactNode;
        showCloseButton?: boolean;
    }
>(({ className, children, headerActions, showCloseButton = true, onInteractOutside, onPointerDownOutside, onFocusOutside, ...props }, ref) => {
    const handleInteractOutside = React.useCallback((event: DialogInteractOutsideEvent) => {
        if (isHtmlEditorFullscreenTarget(event.target)) {
            event.preventDefault();
            return;
        }

        onInteractOutside?.(event);
    }, [onInteractOutside]);

    const handlePointerDownOutside = React.useCallback((event: DialogPointerDownOutsideEvent) => {
        if (isHtmlEditorFullscreenTarget(event.target)) {
            event.preventDefault();
            return;
        }

        onPointerDownOutside?.(event);
    }, [onPointerDownOutside]);

    const handleFocusOutside = React.useCallback((event: DialogFocusOutsideEvent) => {
        if (isHtmlEditorFullscreenTarget(event.target)) {
            event.preventDefault();
            return;
        }

        onFocusOutside?.(event);
    }, [onFocusOutside]);

    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                ref={ref}
                className={cn(
                    "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-2 border bg-background p-3 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
                    className,
                )}
                onPointerDownOutside={handlePointerDownOutside}
                onFocusOutside={handleFocusOutside}
                onInteractOutside={handleInteractOutside}
                {...props}
            >
                {children}
                {(headerActions || showCloseButton) && (
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                        {headerActions}
                        {showCloseButton && (
                            <DialogPrimitive.Close className={DIALOG_CLOSE_BUTTON_CLASS_NAME}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </DialogPrimitive.Close>
                        )}
                    </div>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-2 text-center sm:text-left",
            className,
        )}
        {...props}
    />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className,
        )}
        {...props}
    />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn("text-lg font-semibold", className)}
        {...props}
    />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogTrigger,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
};

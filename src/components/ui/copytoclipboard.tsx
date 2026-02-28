import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { TooltipProvider } from "./tooltip";
import { BlockCopyButton } from "./block-copy-button";
import { useDialog } from "../layout/DialogContext";
import { Button } from "./button";

export default function CopyToClipboard({ text, copy, className }: { text: string, copy?: string, className?: string }) {
    const { showDialog } = useDialog();
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(copy ? copy : text).then(() => {
            showDialog("Copied to Clipboard", <>The text <kbd className='bg-secondary rounded px-0.5'>{copy ? copy : text}</kbd> has been copied to your clipboard.</>);
        }).catch(err => {
            showDialog("Copy Failed", <>Failed to copy <kbd className='bg-secondary rounded px-0.5'>{copy ? copy : text}</kbd> to clipboard:<br />{err}</>);
        });
    }, [copy, text, showDialog]);

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        const el = buttonRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width >= window.innerWidth * 0.9 || rect.height >= window.innerHeight * 0.9) {
            console.warn('[CopyToClipboard] Unexpected button size', {
                text,
                className,
                width: rect.width,
                height: rect.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                computedDisplay: getComputedStyle(el).display,
            });
        }
    }, [className, text]);

    return (
        <>
            <Button
                size="sm"
                variant="ghost"
                className={`font-mono bg-background rounded px-1.5 ${className} underline text-primary`}
                ref={buttonRef}
                style={{ cursor: 'pointer' }}
                aria-label={`Copy ${text} to clipboard`}
                onClick={handleCopy}>
                {text}
            </Button>
        </>
    );
}

export function CopyToClipboardTextArea({ text, className }: { text: ReactNode, className?: string }) {
    const textareaRef = useRef<HTMLDivElement>(null);
    const getText = useCallback(() => {
        return textareaRef.current ? textareaRef.current.textContent ?? "" : '';
    }, [textareaRef]);
    return (
        <>
            <div className="relative font-mono">
                <code ref={textareaRef} className={`text-sm bg-background p-1 ${className} rounded text-primary wrap-break-word max-w-full`}>
                    {text}
                </code>
                <TooltipProvider>
                    <BlockCopyButton
                        getText={getText} />
                </TooltipProvider>
            </div>
        </>
    );
}
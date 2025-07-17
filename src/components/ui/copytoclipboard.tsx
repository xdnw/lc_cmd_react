import { ReactNode, useCallback, useRef } from 'react';
import { TooltipProvider } from "./tooltip";
import { BlockCopyButton } from "./block-copy-button";
import { useDialog } from "../layout/DialogContext";
import { Button } from "./button";

export default function CopyToClipboard({ text, copy, className }: { text: string, copy?: string, className?: string }) {
    const { showDialog } = useDialog();

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(copy ? copy : text).then(() => {
            showDialog("Copied to Clipboard", <>The text <kbd className='bg-secondary rounded px-0.5'>{copy ? copy : text}</kbd> has been copied to your clipboard.</>);
        }).catch(err => {
            showDialog("Copy Failed", <>Failed to copy <kbd className='bg-secondary rounded px-0.5'>{copy ? copy : text}</kbd> to clipboard:<br />{err}</>);
        });
    }, [copy, text, showDialog]);

    return (
        <>
            <Button
                size="sm"
                className={`font-mono bg-background rounded px-0.5 ${className} underline text-primary`}
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
                <code ref={textareaRef} className={`text-sm bg-background p-1 ${className} rounded text-primary break-words max-w-full`}>
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
import ArgInput from "./ArgInput";
import { Argument, BaseCommand } from "../../utils/Command";
import { useCallback, useMemo, useState, useEffect, type FocusEvent } from "react";
import MarkupRenderer from "../ui/MarkupRenderer";
import LazyIcon from "../ui/LazyIcon";
import { cn } from "@/lib/utils";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import ArgFieldShell from "./field/ArgFieldShell";
import { parseCommandString } from "../../utils/CommandParser";

interface CommandProps {
    command: BaseCommand,
    overrideName?: string,
    filterArguments: (arg: Argument) => boolean,
    initialValues: { [key: string]: string },
    displayMode?: CommandInputDisplayMode,
    setOutput: (key: string, value: string) => void
}

function buildGroupedArgs(argsArr: Argument[]): Argument[][] {
    const groupedArgs: Argument[][] = [];
    let lastGroupId = -1;
    let lastGroup: Argument[] = [];

    for (let i = 0; i < argsArr.length; i++) {
        const arg = argsArr[i];
        const group = arg.arg.group;
        if (group == null) {
            groupedArgs.push([arg]);
        } else if (group !== lastGroupId) {
            lastGroup = [arg];
            lastGroupId = group;
            groupedArgs.push(lastGroup);
        } else {
            lastGroup.push(arg);
        }
    }

    return groupedArgs;
}

function FocusInfoBar({ arg }: { arg: Argument | null }) {
    if (!arg) return null;

    return (
        <div className="sticky top-0 z-20 mb-2 rounded border border-border bg-background/95 p-2 text-xs backdrop-blur">
            <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">
                    {arg.name} <span className="text-muted-foreground font-normal">{arg.arg.type}</span>
                </p>
                {arg.arg.optional ? (
                    <span className="rounded bg-blue-400/20 text-blue-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Optional</span>
                ) : (
                    <span className="rounded bg-red-400/20 text-red-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Required</span>
                )}
            </div>
            {arg.arg.desc && <p className="mt-1"><MarkupRenderer content={arg.arg.desc} /></p>}
            {arg.getTypeDesc() && <p className="mt-1 text-muted-foreground"><MarkupRenderer content={arg.getTypeDesc() || ""} /></p>}
        </div>
    );
}

export default function CommandComponent({ command, overrideName, filterArguments, initialValues, setOutput, displayMode = "card" }: CommandProps) {
    const groupedArgs = useMemo(() => buildGroupedArgs(command.getArguments()), [command]);
    const compact = isCompactMode(displayMode);
    const [focusedArgName, setFocusedArgName] = useState<string | null>(null);
    const [localValues, setLocalValues] = useState<{ [key: string]: string }>(initialValues);

    useEffect(() => {
        setLocalValues(initialValues);
    }, [initialValues]);

    const focusedArg = useMemo(() => {
        if (!focusedArgName) return null;
        return command.getArguments().find((arg) => arg.name === focusedArgName) ?? null;
    }, [command, focusedArgName]);

    const handleFocusCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
        const argName = event.currentTarget.dataset.argName;
        if (argName) {
            setFocusedArgName(argName);
        }
    }, []);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = event.clipboardData.getData('text');
        if (!pastedText) return;

        const parsed = parseCommandString(command, pastedText);
        if (parsed) {
            event.preventDefault();
            event.stopPropagation();
            setLocalValues(prev => ({ ...prev, ...parsed }));
            for (const [key, value] of Object.entries(parsed)) {
                setOutput(key, value);
            }
        }
    }, [command, setOutput]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' && !event.ctrlKey && !event.shiftKey && !event.isDefaultPrevented()) {
            const target = event.target as HTMLElement;
            if (target.tagName === 'TEXTAREA') return;
            if (target.tagName === 'BUTTON') return;

            // Find all focusable inputs within this CommandComponent
            const container = event.currentTarget;
            const focusableElements = Array.from(
                container.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
            ) as HTMLElement[];

            const currentIndex = focusableElements.indexOf(target);
            if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
                event.preventDefault();
                focusableElements[currentIndex + 1].focus();
            }
        }
    }, []);

    return (
        <div onPasteCapture={handlePasteCapture} onKeyDown={handleKeyDown}>
            <h2 className="text-sm font-semibold">{overrideName ?? command.name}</h2>
            {displayMode === "focus-pane" && <FocusInfoBar arg={focusedArg} />}
            {
                groupedArgs.map((group, index) => {
                    const groupExists = group[0].arg.group != null;
                    const groupDescExists = command.command.group_descs && command.command.group_descs[group[0].arg.group || 0];
                    return (
                        <div className="mb-0.5 px-0.5 pb-0.5" key={index + "g"}>
                            {groupExists &&
                                <>
                                    <p className="font-bold">
                                        {command.command.groups?.[group[0].arg.group || 0] ?? ''}
                                    </p>
                                    {groupDescExists &&
                                        <p>
                                            {command.command.group_descs?.[group[0].arg.group || 0] ?? ''}
                                        </p>
                                    }
                                </>
                            }
                            <div>
                                {group.map((arg, argIndex) => (
                                    filterArguments(arg) &&
                                    <div
                                        className={cn("w-full", compact ? "mb-1" : "mb-2")}
                                        key={index + "-" + argIndex + "m"}
                                        data-arg-name={arg.name}
                                        onFocusCapture={handleFocusCapture}
                                    >
                                        {displayMode !== "focus-pane" && (
                                            <ArgDescComponent
                                                arg={arg}
                                                includeType={!compact}
                                                includeDesc={!compact}
                                                includeExamples={false}
                                                compact={compact}
                                            />
                                        )}
                                        <ArgFieldShell displayMode={displayMode} className={displayMode !== "focus-pane" ? "rounded-t-none" : ""} isOptional={arg.arg.optional}>
                                            {displayMode === "focus-pane" && (
                                                <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">{arg.name}:</span>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <ArgInput argName={arg.name} breakdown={arg.getTypeBreakdown()} min={arg.arg.min}
                                                    max={arg.arg.max} initialValue={localValues[arg.name]}
                                                    displayMode={displayMode}
                                                    setOutputValue={setOutput} />
                                            </div>
                                        </ArgFieldShell>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            }
        </div>
    );
}

export function ArgDescComponent(
    { arg, includeType = false, includeDesc = false, includeExamples = false, compact = false }:
        {
            arg: Argument,
            includeType?: boolean,
            includeDesc?: boolean,
            includeExamples?: boolean,
            compact?: boolean,
        }) {
    const [hide, setHide] = useState<boolean>(!includeType && !includeDesc && !includeExamples);
    const desc = arg.getTypeDesc();
    const examples = useMemo(() => {
        const ex = arg.getExamples();
        if (ex) {
            return Array.isArray(ex) ? ex : [ex];
        }
        return [];
    }, [arg]);

    const isExpanded = !hide;


    const optionalBadge = useMemo(() => {
        return arg.arg.optional
            ? <div className="inline-block bg-blue-500/20 text-blue-600 dark:text-blue-400 me-1 px-1 rounded-sm font-medium">Optional</div>
            : <div className="inline-block bg-red-500/20 text-red-600 dark:text-red-400 me-1 px-1 rounded-sm font-medium">Required</div>;
    }, [arg.arg.optional]);

    const toggleIcon = useMemo(() => {
        return hide ?
            <LazyIcon name="ChevronRight" className="rounded-sm ms-1 inline-block h-4 w-6 active:bg-background" /> :
            <LazyIcon name="ChevronLeft" className="rounded-sm ms-1 inline-block h-4 w-6 active:bg-background" />;
    }, [hide]);

    const descriptionContent = useMemo(() => {
        if (!isExpanded) return null;
        return (
            <>
                <br />
                <p className="font-thin text-xs mb-1"><MarkupRenderer content={arg.arg.desc ?? ""} /></p>
                {desc && <p className="font-thin text-xs"><MarkupRenderer content={desc} /></p>}
            </>
        );
    }, [isExpanded, arg.arg.desc, desc]);

    const examplesContent = useMemo(() => {
        if (!isExpanded || examples.length === 0) return null;
        return (
            <p className="font-thin mt-1">
                Examples:
                {examples
                    .map(example => <kbd key={example} className="mx-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-mono">{example}</kbd>)
                    .reduce((prev, curr) => <> {prev} {curr} </>)}
            </p>
        );
    }, [isExpanded, examples]);

    const toggleHidden = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setHide(f => !f);
    }, [setHide]);


    return (
        <div className={cn("inline-block rounded-t-sm border border-border border-b-0 bg-accent m-0 p-1 align-top top-0 left-0 me-1 text-xs", compact ? "w-full me-0" : "")} style={{ marginBottom: "-1px" }}>
            {optionalBadge}
            <button type="button" tabIndex={-1} className="inline-flex items-center cursor-pointer rounded border border-transparent hover:bg-background/50 hover:border hover:border-primary/20" onClick={toggleHidden}>
                <span className="bg-white/20 px-0.5">
                    {arg.name}{isExpanded ? ": " + arg.arg.type : ""}
                </span>
                {toggleIcon}
            </button>
            {descriptionContent}
            {examplesContent}
        </div>
    );
}
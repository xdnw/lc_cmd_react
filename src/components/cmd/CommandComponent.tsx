import ArgInput from "./ArgInput";
import { Argument, BaseCommand } from "../../utils/Command";
import { memo, useCallback, useMemo, useState, useEffect, type FocusEvent } from "react";
import MarkupRenderer from "../ui/MarkupRenderer";
import LazyIcon from "../ui/LazyIcon";
import { cn } from "@/lib/utils";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import ArgFieldShell from "./field/ArgFieldShell";
import { parseCommandStringDetailed } from "../../utils/CommandParser";
import { useDialog } from "../layout/DialogContext";

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
        <div className="sticky top-0 z-20 mb-2 rounded-md border border-border/60 bg-background/95 px-2 py-1.5 text-[11px] shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 leading-none">
                <p className="min-w-0 truncate font-medium text-foreground">{arg.name}</p>
                <span className="truncate text-muted-foreground">{arg.arg.type}</span>
                <span className="text-muted-foreground">•</span>
                {arg.arg.optional ? (
                    <span className="font-medium text-sky-700 dark:text-sky-300">optional</span>
                ) : (
                    <span className="font-medium text-rose-700 dark:text-rose-300">required</span>
                )}
            </div>
            {arg.arg.desc && <div className="mt-1 text-muted-foreground"><MarkupRenderer content={arg.arg.desc} /></div>}
        </div>
    );
}

const CommandComponent = memo(function CommandComponent({ command, overrideName, filterArguments, initialValues, setOutput, displayMode = "card" }: CommandProps) {
    const { showDialog } = useDialog();
    const groupedArgs = useMemo(() => buildGroupedArgs(command.getArguments()), [command]);
    const compact = isCompactMode(displayMode);
    const trackFocusedArg = displayMode === "focus-pane";
    const [focusedArgName, setFocusedArgName] = useState<string | null>(null);
    const [localValues, setLocalValues] = useState<{ [key: string]: string }>(initialValues);

    useEffect(() => {
        setLocalValues(initialValues);
    }, [initialValues]);

    useEffect(() => {
        if (!trackFocusedArg && focusedArgName != null) {
            setFocusedArgName(null);
        }
    }, [focusedArgName, trackFocusedArg]);

    const focusedArg = useMemo(() => {
        if (!trackFocusedArg || !focusedArgName) return null;
        return command.getArguments().find((arg) => arg.name === focusedArgName) ?? null;
    }, [command, focusedArgName, trackFocusedArg]);

    const handleFocusCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
        if (!trackFocusedArg) {
            return;
        }
        const argName = event.currentTarget.dataset.argName;
        if (argName) {
            setFocusedArgName(argName);
        }
    }, [trackFocusedArg]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const pastedText = event.clipboardData.getData('text');
        if (!pastedText) return;

        const parsed = parseCommandStringDetailed(command, pastedText);
        if (parsed.values) {
            event.preventDefault();
            event.stopPropagation();
            setLocalValues(prev => ({ ...prev, ...parsed.values }));
            for (const [key, value] of Object.entries(parsed.values)) {
                setOutput(key, value);
            }
            return;
        }

        if (parsed.error) {
            event.preventDefault();
            event.stopPropagation();
            showDialog("Unable to parse pasted command", <>{parsed.error}</>);
        }
    }, [command, setOutput, showDialog]);

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
        <div className={cn("space-y-2.5", compact && "space-y-1.5")} onPasteCapture={handlePasteCapture} onKeyDown={handleKeyDown}>
            <h2 className={cn("text-sm font-semibold tracking-tight", compact && "text-xs")}>{overrideName ?? command.name}</h2>
            {displayMode === "focus-pane" && <FocusInfoBar arg={focusedArg} />}
            {
                groupedArgs.map((group, index) => {
                    const groupExists = group[0].arg.group != null;
                    const groupDescExists = command.command.group_descs && command.command.group_descs[group[0].arg.group || 0];
                    return (
                        <section className={cn("space-y-2 px-0.5", compact && "space-y-1.5")} key={index + "g"}>
                            {groupExists &&
                                <div className="border-b border-border/50 pb-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        {command.command.groups?.[group[0].arg.group || 0] ?? ''}
                                    </p>
                                    {groupDescExists &&
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {command.command.group_descs?.[group[0].arg.group || 0] ?? ''}
                                        </p>
                                    }
                                </div>
                            }
                            <div className={cn("space-y-2", compact && "space-y-1.5")}>
                                {group.map((arg, argIndex) => (
                                    filterArguments(arg) &&
                                    <div
                                        className={cn("w-full rounded-md border border-border/60 bg-background/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", compact ? "p-px" : "p-0.5")}
                                        key={index + "-" + argIndex + "m"}
                                        data-arg-name={arg.name}
                                        onFocusCapture={trackFocusedArg ? handleFocusCapture : undefined}
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
                                                <span className="w-24 shrink-0 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{arg.name}</span>
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
                        </section>
                    );
                })
            }
        </div>
    );
});

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
            ? <span className="inline-flex font-medium text-sky-700 dark:text-sky-300">optional</span>
            : <span className="inline-flex font-medium text-rose-700 dark:text-rose-300">required</span>;
    }, [arg.arg.optional]);

    const toggleIcon = useMemo(() => {
        return hide ?
            <LazyIcon name="ChevronDown" className="inline-block h-3.5 w-3.5" /> :
            <LazyIcon name="ChevronUp" className="inline-block h-3.5 w-3.5" />;
    }, [hide]);

    const descriptionContent = useMemo(() => {
        if (!isExpanded || !includeDesc) return null;
        return (
            <div className="grid gap-x-3 gap-y-1 border-t border-border/50 pt-1.5 text-[11px] sm:grid-cols-[auto_1fr]">
                {arg.arg.desc && <span className="font-medium text-muted-foreground">Info</span>}
                {arg.arg.desc && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={arg.arg.desc ?? ""} /></div>}
                {desc && <span className="font-medium text-muted-foreground">Type</span>}
                {desc && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={desc} /></div>}
            </div>
        );
    }, [isExpanded, includeDesc, arg.arg.desc, desc]);

    const examplesContent = useMemo(() => {
        if (!isExpanded || !includeExamples || examples.length === 0) return null;
        return (
            <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px]">
                <span className="font-medium text-muted-foreground">Examples</span>
                {examples.map((example) => (
                    <kbd key={example} className="rounded-sm border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground">{example}</kbd>
                ))}
            </div>
        );
    }, [isExpanded, includeExamples, examples]);

    const toggleHidden = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setHide(f => !f);
    }, [setHide]);


    const hasExtraContent = Boolean((includeDesc && (arg.arg.desc || desc)) || (includeExamples && examples.length > 0));

    return (
        <div className={cn("rounded-t-md border border-border/80 border-b-0 bg-muted/55 px-2 py-1 text-xs", compact ? "w-full" : "inline-block max-w-full me-1")} style={{ marginBottom: "-1px" }}>
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate font-medium text-foreground">{arg.name}</div>
                {includeType && <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{arg.arg.type}</div>}
                {optionalBadge}
                {hasExtraContent && <button type="button" tabIndex={-1} className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground" onClick={toggleHidden}>
                    {isExpanded ? "Hide details" : "Show details"}
                    {toggleIcon}
                </button>}
            </div>
            {(descriptionContent || examplesContent) && (
                <div className="mt-1.5 space-y-1.5">
                    {descriptionContent}
                    {examplesContent}
                </div>
            )}
        </div>
    );
}

export default CommandComponent;
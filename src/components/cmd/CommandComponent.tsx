import ArgInput from "./ArgInput";
import { Argument, BaseCommand } from "../../utils/Command";
import { memo, useCallback, useMemo, useState, useEffect, useRef, type FocusEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import MarkupRenderer from "../ui/MarkupRenderer";
import { cn } from "@/lib/utils";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import ArgFieldShell from "./field/ArgFieldShell";
import { parseCommandStringDetailed } from "../../utils/CommandParser";
import { useDialog } from "../layout/DialogContext";
import type { TypeBreakdown } from "@/utils/Command";
import { prefetchArgInputData } from "./argInputWarmup";
import { scheduleInteractionTransition } from "./interactionScheduling";

interface CommandProps {
    command: BaseCommand,
    overrideName?: string,
    filterArguments: (arg: Argument) => boolean,
    initialValues: { [key: string]: string },
    displayMode?: CommandInputDisplayMode,
    forceMountAll?: boolean,
    setOutput: (key: string, value: string) => void
}

type CommandArgEntry = {
    arg: Argument;
};

const EAGER_ARG_INPUT_COUNT = 12;
const ARG_PREFETCH_ROOT_MARGIN = "2200px 0px";
const ARG_INPUT_ROOT_MARGIN = "700px 0px";
const FOCUSABLE_INPUT_SELECTOR = [
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "[contenteditable='true']",
    "[contenteditable='plaintext-only']",
    "[role='textbox']",
].join(", ");

const argBreakdownCache = new WeakMap<Argument, TypeBreakdown>();

function getCachedArgBreakdown(arg: Argument): TypeBreakdown {
    const cached = argBreakdownCache.get(arg);
    if (cached) {
        return cached;
    }

    const breakdown = arg.getTypeBreakdown();
    argBreakdownCache.set(arg, breakdown);
    return breakdown;
}

function buildGroupedArgs(argsArr: CommandArgEntry[]): CommandArgEntry[][] {
    const groupedArgs: CommandArgEntry[][] = [];
    let lastGroupId = -1;
    let lastGroup: CommandArgEntry[] = [];

    for (let i = 0; i < argsArr.length; i++) {
        const entry = argsArr[i];
        const group = entry.arg.arg.group;
        if (group == null) {
            groupedArgs.push([entry]);
        } else if (group !== lastGroupId) {
            lastGroup = [entry];
            lastGroupId = group;
            groupedArgs.push(lastGroup);
        } else {
            lastGroup.push(entry);
        }
    }

    return groupedArgs;
}

const DeferredArgInput = memo(function DeferredArgInput({
    arg,
    argName,
    min,
    max,
    initialValue,
    displayMode,
    setOutputValue,
    eager,
    forceMountAll,
}: {
    arg: Argument;
    argName: string;
    min?: number;
    max?: number;
    initialValue: string;
    displayMode?: CommandInputDisplayMode;
    setOutputValue: (key: string, value: string) => void;
    eager: boolean;
    forceMountAll?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const queryClient = useQueryClient();
    const focusAfterMountRef = useRef(false);
    const scheduledMountRef = useRef<(() => void) | null>(null);
    const [shouldPrefetch, setShouldPrefetch] = useState<boolean>(() => eager || Boolean(initialValue));
    const [isMounted, setIsMounted] = useState<boolean>(() => eager || Boolean(initialValue));
    const shouldResolveBreakdown = shouldPrefetch || isMounted;
    const breakdown = useMemo(
        () => (shouldResolveBreakdown ? getCachedArgBreakdown(arg) : null),
        [arg, shouldResolveBreakdown],
    );

    useEffect(() => {
        return () => {
            scheduledMountRef.current?.();
            scheduledMountRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (isMounted && !shouldPrefetch) {
            setShouldPrefetch(true);
        }
    }, [isMounted, shouldPrefetch]);

    useEffect(() => {
        if (shouldPrefetch || typeof IntersectionObserver === "undefined") {
            return;
        }

        const node = containerRef.current;
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) {
                return;
            }
            setShouldPrefetch(true);
            observer.disconnect();
        }, { rootMargin: ARG_PREFETCH_ROOT_MARGIN });

        observer.observe(node);
        return () => observer.disconnect();
    }, [shouldPrefetch]);

    useEffect(() => {
        if (!shouldPrefetch || !breakdown) {
            return;
        }

        void prefetchArgInputData(queryClient, breakdown);
    }, [breakdown, queryClient, shouldPrefetch]);

    useEffect(() => {
        if (isMounted || typeof IntersectionObserver === "undefined") {
            return;
        }

        const node = containerRef.current;
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) {
                return;
            }
            setIsMounted(true);
            observer.disconnect();
        }, { rootMargin: ARG_INPUT_ROOT_MARGIN });

        observer.observe(node);
        return () => observer.disconnect();
    }, [isMounted]);

    useEffect(() => {
        if (!isMounted || !focusAfterMountRef.current) {
            return;
        }

        focusAfterMountRef.current = false;
        const handle = window.requestAnimationFrame(() => {
            const target = containerRef.current?.querySelector(FOCUSABLE_INPUT_SELECTOR) as HTMLElement | null;
            target?.focus();
        });

        return () => window.cancelAnimationFrame(handle);
    }, [isMounted]);

    const mountInput = useCallback((focusAfterMount: boolean) => {
        if (focusAfterMount) {
            focusAfterMountRef.current = true;
        }
        if (isMounted || scheduledMountRef.current) {
            return;
        }

        scheduledMountRef.current = scheduleInteractionTransition(() => {
            scheduledMountRef.current = null;
            setIsMounted(true);
        });
    }, [isMounted]);

    const handlePointerDownCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (isMounted) {
            return;
        }
        event.preventDefault();
        mountInput(true);
    }, [isMounted, mountInput]);

    const handleFocusCapture = useCallback(() => {
        if (!isMounted) {
            mountInput(true);
        }
    }, [isMounted, mountInput]);

    return (
        <div
            ref={containerRef}
            onPointerDownCapture={handlePointerDownCapture}
            onFocusCapture={handleFocusCapture}
        >
            {isMounted ? (
                <ArgInput
                    argName={argName}
                    breakdown={breakdown ?? getCachedArgBreakdown(arg)}
                    min={min}
                    max={max}
                    initialValue={initialValue}
                    displayMode={displayMode}
                    forceMountAll={forceMountAll}
                    setOutputValue={setOutputValue}
                />
            ) : (
                <div
                    className="flex min-h-8 items-center rounded-md border border-dashed border-border/60 bg-muted/20 px-2 py-1 text-xs text-muted-foreground"
                    aria-hidden="true"
                >
                    Loading input...
                </div>
            )}
        </div>
    );
});

const CommandArgCard = memo(function CommandArgCard({
    entry,
    displayMode,
    compact,
    trackFocusedArg,
    handleFocusCapture,
    initialValue,
    setOutput,
    eager,
    forceMountAll,
}: {
    entry: CommandArgEntry;
    displayMode: CommandInputDisplayMode;
    compact: boolean;
    trackFocusedArg: boolean;
    handleFocusCapture: (event: FocusEvent<HTMLDivElement>) => void;
    initialValue: string;
    setOutput: (key: string, value: string) => void;
    eager: boolean;
    forceMountAll?: boolean;
}) {
    const { arg } = entry;

    return (
        <div
            className={cn("w-full rounded-md border border-border/60 bg-background/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", compact ? "p-px" : "p-0.5")}
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
                <div className="min-w-0 flex-1">
                    <DeferredArgInput
                        arg={arg}
                        argName={arg.name}
                        min={arg.arg.min}
                        max={arg.arg.max}
                        initialValue={initialValue}
                        displayMode={displayMode}
                        setOutputValue={setOutput}
                        eager={forceMountAll || eager}
                        forceMountAll={forceMountAll}
                    />
                </div>
            </ArgFieldShell>
        </div>
    );
});

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

const CommandComponent = memo(function CommandComponent({ command, overrideName, filterArguments, initialValues, setOutput, displayMode = "card", forceMountAll = false }: CommandProps) {
    const { showDialog } = useDialog();
    const argEntries = useMemo(() => command.getArguments().filter(filterArguments).map((arg) => ({ arg })), [command, filterArguments]);
    const groupedArgs = useMemo(() => buildGroupedArgs(argEntries), [argEntries]);
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
        return argEntries.find((entry) => entry.arg.name === focusedArgName)?.arg ?? null;
    }, [argEntries, focusedArgName, trackFocusedArg]);

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
                    const groupExists = group[0].arg.arg.group != null;
                    const groupDescExists = command.command.group_descs && command.command.group_descs[group[0].arg.arg.group || 0];
                    return (
                        <section className={cn("space-y-2 px-0.5", compact && "space-y-1.5")} key={index + "g"}>
                            {groupExists &&
                                <div className="border-b border-border/50 pb-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        {command.command.groups?.[group[0].arg.arg.group || 0] ?? ''}
                                    </p>
                                    {groupDescExists &&
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {command.command.group_descs?.[group[0].arg.arg.group || 0] ?? ''}
                                        </p>
                                    }
                                </div>
                            }
                            <div className={cn("space-y-2", compact && "space-y-1.5")}>
                                {group.map((entry, argIndex) => (
                                    <CommandArgCard
                                        key={index + "-" + argIndex + "m"}
                                        entry={entry}
                                        displayMode={displayMode}
                                        compact={compact}
                                        trackFocusedArg={trackFocusedArg}
                                        handleFocusCapture={handleFocusCapture}
                                        initialValue={localValues[entry.arg.name] ?? ""}
                                        setOutput={setOutput}
                                        eager={index === 0 && argIndex < EAGER_ARG_INPUT_COUNT}
                                        forceMountAll={forceMountAll}
                                    />
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
    const desc = arg.getTypeDesc();
    const examples = useMemo(() => {
        const ex = arg.getExamples();
        if (ex) {
            return Array.isArray(ex) ? ex : [ex];
        }
        return [];
    }, [arg]);

    const optionalBadge = useMemo(() => {
        return arg.arg.optional
            ? <span className="inline-flex font-medium text-sky-700 dark:text-sky-300">optional</span>
            : <span className="inline-flex font-medium text-rose-700 dark:text-rose-300">required</span>;
    }, [arg.arg.optional]);

    const descriptionContent = useMemo(() => {
        if (!includeDesc) return null;
        return (
            <div className="grid gap-x-3 gap-y-1 border-t border-border/50 pt-1.5 text-[11px] sm:grid-cols-[auto_1fr]">
                {arg.arg.desc && <span className="font-medium text-muted-foreground">Info</span>}
                {arg.arg.desc && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={arg.arg.desc ?? ""} /></div>}
                {desc && <span className="font-medium text-muted-foreground">Type</span>}
                {desc && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={desc} /></div>}
            </div>
        );
    }, [includeDesc, arg.arg.desc, desc]);

    const examplesContent = useMemo(() => {
        if (!includeExamples || examples.length === 0) return null;
        return (
            <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px]">
                <span className="font-medium text-muted-foreground">Examples</span>
                {examples.map((example) => (
                    <kbd key={example} className="rounded-sm border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground">{example}</kbd>
                ))}
            </div>
        );
    }, [includeExamples, examples]);

    return (
        <div className={cn("rounded-t-md border border-border/80 border-b-0 bg-muted/55 px-2 py-1 text-xs", compact ? "w-full" : "inline-block max-w-full me-1")} style={{ marginBottom: "-1px" }}>
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate font-medium text-foreground">{arg.name}</div>
                {includeType && <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{arg.arg.type}</div>}
                {optionalBadge}
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
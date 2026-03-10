import ArgInput from "./ArgInput";
import { Argument, BaseCommand } from "../../utils/Command";
import { memo, useCallback, useMemo, useState, useEffect, type CSSProperties, type FocusEvent } from "react";
import MarkupRenderer from "../ui/MarkupRenderer";
import { cn } from "@/lib/utils";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import ArgFieldShell from "./field/ArgFieldShell";
import { parseCommandStringDetailed } from "../../utils/CommandParser";
import { useDialog } from "../layout/DialogContext";
import type { TypeBreakdown } from "@/utils/Command";

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
    breakdown: TypeBreakdown;
    typeDesc: string;
    examples: readonly string[];
    description: string;
    groupId: number | null;
    groupTitle: string;
    groupDescription: string;
};

const argBreakdownCache = new WeakMap<Argument, TypeBreakdown>();
const ARG_CARD_VISIBILITY_STYLE: CSSProperties = {
    contain: "layout style paint",
    contentVisibility: "auto",
    containIntrinsicSize: "168px",
};

function getCachedArgBreakdown(arg: Argument): TypeBreakdown {
    const cached = argBreakdownCache.get(arg);
    if (cached) {
        return cached;
    }

    const breakdown = arg.getTypeBreakdown();
    argBreakdownCache.set(arg, breakdown);
    return breakdown;
}

type CommandArgGroup = {
    key: string;
    groupId: number | null;
    groupTitle: string;
    groupDescription: string;
    entries: CommandArgEntry[];
};

function buildCommandArgEntry(command: BaseCommand, arg: Argument): CommandArgEntry {
    const groupId = arg.arg.group ?? null;

    return {
        arg,
        breakdown: getCachedArgBreakdown(arg),
        typeDesc: arg.getTypeDesc(),
        examples: arg.getExamples(),
        description: arg.arg.desc ?? "",
        groupId,
        groupTitle: groupId == null ? "" : command.command.groups?.[groupId] ?? "",
        groupDescription: groupId == null ? "" : command.command.group_descs?.[groupId] ?? "",
    };
}

function buildGroupedArgs(argsArr: CommandArgEntry[]): CommandArgGroup[] {
    const groupedArgs: CommandArgGroup[] = [];
    let lastGroupId = -1;
    let lastGroup: CommandArgGroup | null = null;

    for (let i = 0; i < argsArr.length; i++) {
        const entry = argsArr[i];
        if (entry.groupId == null) {
            groupedArgs.push({
                key: `${entry.arg.name}-${i}`,
                groupId: null,
                groupTitle: "",
                groupDescription: "",
                entries: [entry],
            });
        } else if (entry.groupId !== lastGroupId || !lastGroup) {
            lastGroup = {
                key: `group-${entry.groupId}-${i}`,
                groupId: entry.groupId,
                groupTitle: entry.groupTitle,
                groupDescription: entry.groupDescription,
                entries: [entry],
            };
            lastGroupId = entry.groupId;
            groupedArgs.push(lastGroup);
        } else {
            lastGroup.entries.push(entry);
        }
    }

    return groupedArgs;
}

const CommandArgCard = memo(function CommandArgCard({
    entry,
    displayMode,
    compact,
    trackFocusedArg,
    handleFocusCapture,
    initialValue,
    setOutput,
    forceMountAll,
}: {
    entry: CommandArgEntry;
    displayMode: CommandInputDisplayMode;
    compact: boolean;
    trackFocusedArg: boolean;
    handleFocusCapture: (event: FocusEvent<HTMLDivElement>) => void;
    initialValue: string;
    setOutput: (key: string, value: string) => void;
    forceMountAll?: boolean;
}) {
    const { arg } = entry;

    return (
        <div
            className={cn("w-full rounded-md border border-border/60 bg-background/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", compact ? "p-px" : "p-0.5")}
            data-arg-name={arg.name}
            onFocusCapture={trackFocusedArg ? handleFocusCapture : undefined}
            style={ARG_CARD_VISIBILITY_STYLE}
        >
            {displayMode !== "focus-pane" && (
                <ArgDescComponent
                    entry={entry}
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
                    <ArgInput
                        key={`${arg.name}:${initialValue}`}
                        argName={arg.name}
                        breakdown={entry.breakdown}
                        min={arg.arg.min}
                        max={arg.arg.max}
                        initialValue={initialValue}
                        displayMode={displayMode}
                        forceMountAll={forceMountAll}
                        setOutputValue={setOutput}
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
    const argEntries = useMemo(() => command.getArguments().filter(filterArguments).map((arg) => buildCommandArgEntry(command, arg)), [command, filterArguments]);
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
        <div className={cn("space-y-2.5", compact && "space-y-1.5")} data-command-root="true" onPasteCapture={handlePasteCapture} onKeyDown={handleKeyDown}>
            <h2 className={cn("text-sm font-semibold tracking-tight", compact && "text-xs")}>{overrideName ?? command.name}</h2>
            {displayMode === "focus-pane" && <FocusInfoBar arg={focusedArg} />}
            {
                groupedArgs.map((group, index) => {
                    const groupExists = group.groupId != null;
                    const groupDescExists = Boolean(group.groupDescription);
                    return (
                        <section className={cn("space-y-2 px-0.5", compact && "space-y-1.5")} key={group.key}>
                            {groupExists &&
                                <div className="border-b border-border/50 pb-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                        {group.groupTitle}
                                    </p>
                                    {groupDescExists &&
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {group.groupDescription}
                                        </p>
                                    }
                                </div>
                            }
                            <div className={cn("space-y-2", compact && "space-y-1.5")}>
                                {group.entries.map((entry, argIndex) => (
                                    <CommandArgCard
                                        key={index + "-" + argIndex + "m"}
                                        entry={entry}
                                        displayMode={displayMode}
                                        compact={compact}
                                        trackFocusedArg={trackFocusedArg}
                                        handleFocusCapture={handleFocusCapture}
                                        initialValue={localValues[entry.arg.name] ?? ""}
                                        setOutput={setOutput}
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
    { entry, arg: legacyArg, includeType = false, includeDesc = false, includeExamples = false, compact = false }:
        {
            entry?: CommandArgEntry,
            arg?: Argument,
            includeType?: boolean,
            includeDesc?: boolean,
            includeExamples?: boolean,
            compact?: boolean,
        }) {
    const resolvedEntry = entry ?? (legacyArg ? {
        arg: legacyArg,
        breakdown: getCachedArgBreakdown(legacyArg),
        typeDesc: legacyArg.getTypeDesc(),
        examples: legacyArg.getExamples(),
        description: legacyArg.arg.desc ?? "",
        groupId: legacyArg.arg.group ?? null,
        groupTitle: "",
        groupDescription: "",
    } satisfies CommandArgEntry : null);

    if (!resolvedEntry) {
        return null;
    }

    const { arg, description, typeDesc, examples } = resolvedEntry;
    const optionalBadge = arg.arg.optional
        ? <span className="inline-flex font-medium text-sky-700 dark:text-sky-300">optional</span>
        : <span className="inline-flex font-medium text-rose-700 dark:text-rose-300">required</span>;

    const hasDescriptionContent = includeDesc && (Boolean(description) || Boolean(typeDesc));
    const hasExamplesContent = includeExamples && examples.length > 0;

    return (
        <div className={cn("rounded-t-md border border-border/80 border-b-0 bg-muted/55 px-2 py-1 text-xs", compact ? "w-full" : "inline-block max-w-full me-1")} style={{ marginBottom: "-1px" }}>
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate font-medium text-foreground">{arg.name}</div>
                {includeType && <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{arg.arg.type}</div>}
                {optionalBadge}
            </div>
            {(hasDescriptionContent || hasExamplesContent) && (
                <div className="mt-1.5 space-y-1.5">
                    {hasDescriptionContent && (
                        <div className="grid gap-x-3 gap-y-1 border-t border-border/50 pt-1.5 text-[11px] sm:grid-cols-[auto_1fr]">
                            {description && <span className="font-medium text-muted-foreground">Info</span>}
                            {description && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={description} /></div>}
                            {typeDesc && <span className="font-medium text-muted-foreground">Type</span>}
                            {typeDesc && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={typeDesc} /></div>}
                        </div>
                    )}
                    {hasExamplesContent && (
                        <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px]">
                            <span className="font-medium text-muted-foreground">Examples</span>
                            {examples.map((example) => (
                                <kbd key={example} className="rounded-sm border border-border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground">{example}</kbd>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CommandComponent;
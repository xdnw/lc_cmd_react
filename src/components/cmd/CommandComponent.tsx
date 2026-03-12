import ArgInput from "./ArgInput";
import { Argument, BaseCommand } from "../../utils/Command";
import {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type FocusEvent,
} from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

import MarkupRenderer from "../ui/MarkupRenderer";
import { cn } from "@/lib/utils";
import type { CommandInputDisplayMode } from "./field/fieldTypes";
import { isCompactMode } from "./field/fieldTypes";
import ArgFieldShell from "./field/ArgFieldShell";
import { focusPrimaryCommandTarget, getCommandEdgeArrowDirection, shouldAdvanceCommandField } from "./commandKeyboard";
import { parseCommandStringDetailed } from "../../utils/CommandParser";
import type { TypeBreakdown } from "@/utils/Command";
import {
    applyCommandFieldStateUpdater,
    commandFieldStatesEqual,
    createCommandFieldState,
    type CommandFieldState,
    type CommandFieldStateUpdater,
} from "./field/commandFieldState";
import { serializeBooleanValue } from "./booleanValueUtils";
import { isEditableTarget } from "./commandLaunchUtils";
import { getPastedText } from "./pasteUtils";

interface CommandProps {
    command: BaseCommand;
    overrideName?: string;
    showTitle?: boolean;
    autoFocusFirstField?: boolean;
    filterArguments: (arg: Argument) => boolean;
    initialValues: { [key: string]: string };
    displayMode?: CommandInputDisplayMode;
    forceMountAll?: boolean;
    virtualizationMode?: "auto" | "off";
    setOutput: (key: string, value: string) => void;
    jumpSearchMatches?: readonly string[];
    jumpSearchActiveArg?: string | null;
}

export type CommandArgSearchMatch = {
    matches: string[];
    bestMatch: string | null;
    exactMatch: string | null;
};

export type CommandComponentHandle = {
    focusArg: (argName: string) => boolean;
    searchArgs: (query: string) => CommandArgSearchMatch;
};

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

type CommandArgGroup = {
    key: string;
    groupId: number | null;
    groupTitle: string;
    groupDescription: string;
    entries: CommandArgEntry[];
};

type CommandRowItem =
    | {
        key: string;
        kind: "group-header";
        groupId: number;
        groupTitle: string;
        groupDescription: string;
    }
    | {
        key: string;
        kind: "arg";
        entry: CommandArgEntry;
    };

type CommandFieldStateMap = Record<string, CommandFieldState>;

const COMMAND_VIRTUALIZE_THRESHOLD = 28;
const COMMAND_INITIAL_PREWARM_ROWS = 10;
const COMMAND_PREWARM_AHEAD_ROWS = 8;
const COMMAND_PREWARM_BEHIND_ROWS = 2;
const COMMAND_VIRTUAL_VIEWPORT = { top: 900, bottom: 1800 };
const COMMAND_VIRTUAL_OVERSCAN = 420;
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

function normalizeParsedCommandArgOutput(entry: CommandArgEntry | undefined, value: string): string {
    if (!entry || !value) {
        return value;
    }

    const element = entry.breakdown.element;
    if (element === "Boolean") {
        return serializeBooleanValue(value, { mode: "tri-state" });
    }
    if (element === "boolean") {
        return serializeBooleanValue(value, { mode: "boolean", optional: entry.arg.arg.optional });
    }
    return value;
}

function normalizeArgSearchText(text: string): string {
    return text.toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

function formatCommandPasteError(command: BaseCommand, parsed: ReturnType<typeof parseCommandStringDetailed>): string {
    const commandPath = `/${command.getPathString()}`;
    if (parsed.errorCode === "unknown-args" && parsed.unknownArgs && parsed.unknownArgs.length > 0) {
        return parsed.unknownArgs.length === 1
            ? `Paste not applied. ${commandPath} does not have an argument named "${parsed.unknownArgs[0]}".`
            : `Paste not applied. ${commandPath} does not have arguments named ${parsed.unknownArgs.map((arg) => `"${arg}"`).join(", ")}.`;
    }

    if (parsed.errorCode === "no-arguments") {
        return `Paste not applied. ${commandPath} was recognized, but no argument values could be read. Use ${commandPath} name:value or paste directly into a field.`;
    }

    return `Paste not applied. ${parsed.error ?? "The pasted command could not be read."}`;
}

function getArgJumpTerms(entry: CommandArgEntry): string[] {
    return [
        entry.arg.name,
        entry.arg.arg.flag ?? "",
    ].map(normalizeArgSearchText).filter(Boolean);
}

function scoreArgSearchEntry(entry: CommandArgEntry, query: string): { score: number; exact: boolean } {
    const terms = getArgJumpTerms(entry);
    let score = -1;
    let exact = false;

    terms.forEach((term) => {
        if (!term) {
            return;
        }

        const words = term.split(/\s+/).filter(Boolean);
        if (term === query) {
            exact = true;
            score = Math.max(score, 1000);
            return;
        }
        if (words.includes(query)) {
            score = Math.max(score, 900);
            return;
        }
        if (term.startsWith(query)) {
            score = Math.max(score, 800);
            return;
        }
        if (words.some((word) => word.startsWith(query))) {
            score = Math.max(score, 700);
            return;
        }
        if (term.includes(query)) {
            score = Math.max(score, 600);
        }
    });

    return { score, exact };
}

function searchCommandArgs(entries: readonly CommandArgEntry[], rawQuery: string): CommandArgSearchMatch {
    const query = normalizeArgSearchText(rawQuery);
    if (!query) {
        return { matches: [], bestMatch: null, exactMatch: null };
    }

    const ranked = entries
        .map((entry) => ({
            argName: entry.arg.name,
            ...scoreArgSearchEntry(entry, query),
        }))
        .filter((entry) => entry.score >= 0)
        .sort((left, right) => right.score - left.score || left.argName.localeCompare(right.argName));

    return {
        matches: ranked.map((entry) => entry.argName),
        bestMatch: ranked[0]?.argName ?? null,
        exactMatch: ranked.find((entry) => entry.exact)?.argName ?? null,
    };
}

function buildGroupedArgs(argsArr: CommandArgEntry[]): CommandArgGroup[] {
    const groupedArgs: CommandArgGroup[] = [];
    let lastGroupId = -1;
    let lastGroup: CommandArgGroup | null = null;

    for (let i = 0; i < argsArr.length; i += 1) {
        const entry = argsArr[i];
        if (entry.groupId == null) {
            groupedArgs.push({
                key: `${entry.arg.name}-${i}`,
                groupId: null,
                groupTitle: "",
                groupDescription: "",
                entries: [entry],
            });
            continue;
        }

        if (entry.groupId !== lastGroupId || !lastGroup) {
            lastGroup = {
                key: `group-${entry.groupId}-${i}`,
                groupId: entry.groupId,
                groupTitle: entry.groupTitle,
                groupDescription: entry.groupDescription,
                entries: [entry],
            };
            lastGroupId = entry.groupId;
            groupedArgs.push(lastGroup);
            continue;
        }

        lastGroup.entries.push(entry);
    }

    return groupedArgs;
}

function buildVirtualRows(groups: readonly CommandArgGroup[]): CommandRowItem[] {
    const items: CommandRowItem[] = [];

    groups.forEach((group) => {
        if (group.groupId != null) {
            items.push({
                key: `${group.key}-header`,
                kind: "group-header",
                groupId: group.groupId,
                groupTitle: group.groupTitle,
                groupDescription: group.groupDescription,
            });
        }

        group.entries.forEach((entry) => {
            items.push({
                key: `arg-${entry.arg.name}`,
                kind: "arg",
                entry,
            });
        });
    });

    return items;
}

function synchronizeFieldStates(
    currentStates: CommandFieldStateMap,
    entries: readonly CommandArgEntry[],
    initialValues: Record<string, string>,
    reseedFromInitialValues: boolean,
): CommandFieldStateMap {
    return entries.reduce<CommandFieldStateMap>((accumulator, entry) => {
        accumulator[entry.arg.name] = reseedFromInitialValues
            ? createCommandFieldState(initialValues[entry.arg.name] ?? "")
            : currentStates[entry.arg.name] ?? createCommandFieldState(initialValues[entry.arg.name] ?? "");
        return accumulator;
    }, {});
}

function serializeInitialValues(initialValues: Record<string, string>): string {
    return Object.entries(initialValues)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}:${value}`)
        .join("|");
}

function findArgContainer(root: ParentNode | null, argName: string): HTMLElement | null {
    if (!root) {
        return null;
    }

    const matches = Array.from(root.querySelectorAll<HTMLElement>("[data-arg-name]"));
    return matches.find((element) => element.dataset.argName === argName) ?? null;
}

function collectPrewarmNames(items: readonly CommandRowItem[], startIndex: number, endIndex: number): Set<string> {
    const nextNames = new Set<string>();
    const safeStart = Math.max(0, startIndex - COMMAND_PREWARM_BEHIND_ROWS);
    const safeEnd = Math.min(items.length - 1, endIndex + COMMAND_PREWARM_AHEAD_ROWS);

    for (let index = safeStart; index <= safeEnd; index += 1) {
        const item = items[index];
        if (item?.kind === "arg") {
            nextNames.add(item.entry.arg.name);
        }
    }

    return nextNames;
}

const CommandGroupHeader = memo(function CommandGroupHeader({
    groupTitle,
    groupDescription,
    compact,
}: {
    groupTitle: string;
    groupDescription: string;
    compact: boolean;
}) {
    return (
        <div className={cn("px-0.5 pt-2", compact && "pt-1.5")}>
            <div className="border-b border-border/50 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {groupTitle}
                </p>
                {groupDescription && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {groupDescription}
                    </p>
                )}
            </div>
        </div>
    );
});

const CommandArgCard = memo(function CommandArgCard({
    entry,
    displayMode,
    compact,
    trackFocusedArg,
    handleFocusCapture,
    fieldState,
    setFieldState,
    setOutput,
    commitOutput,
    forceMountAll,
    prewarm,
    autoFocusOnMount,
    onAutoFocusComplete,
    jumpMatched,
    jumpActive,
}: {
    entry: CommandArgEntry;
    displayMode: CommandInputDisplayMode;
    compact: boolean;
    trackFocusedArg: boolean;
    handleFocusCapture: (event: FocusEvent<HTMLDivElement>) => void;
    fieldState: CommandFieldState;
    setFieldState: (updater: CommandFieldStateUpdater) => void;
    setOutput: (key: string, value: string) => void;
    commitOutput: (key: string, value: string) => void;
    forceMountAll?: boolean;
    prewarm?: boolean;
    autoFocusOnMount?: boolean;
    onAutoFocusComplete?: () => void;
    jumpMatched?: boolean;
    jumpActive?: boolean;
}) {
    const { arg } = entry;
    const containerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        if (!autoFocusOnMount) {
            return;
        }

        if (!focusPrimaryCommandTarget(containerRef.current)) {
            return;
        }

        onAutoFocusComplete?.();
    }, [autoFocusOnMount, onAutoFocusComplete]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "w-full rounded-md border border-border/60 bg-background/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors",
                compact ? "p-px" : "p-0.5",
                jumpMatched && "border-primary/40 bg-primary/5",
                jumpActive && "ring-2 ring-primary/60 ring-offset-1 ring-offset-background",
            )}
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
                        argName={arg.name}
                        breakdown={entry.breakdown}
                        min={arg.arg.min}
                        max={arg.arg.max}
                        initialValue={fieldState.displayValue}
                        fieldState={fieldState}
                        setFieldState={setFieldState}
                        displayMode={displayMode}
                        forceMountAll={forceMountAll}
                        prewarm={prewarm}
                        isOptional={arg.arg.optional}
                        setOutputValue={setOutput}
                        setCommittedValue={commitOutput}
                    />
                </div>
            </ArgFieldShell>
        </div>
    );
});

function FocusInfoBar({ arg }: { arg: Argument | null }) {
    if (!arg) return null;

    return (
        <div className="sticky top-0 z-20 mb-2 rounded-md border border-border/60 bg-background/95 px-2 py-1.5 text-[11px] shadow-sm backdrop-blur" data-testid="focus-info-bar">
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
            {arg.arg.desc && <div className="mt-1 text-muted-foreground"><MarkupRenderer content={arg.arg.desc} disableLinkTabStops /></div>}
        </div>
    );
}

const CommandComponent = memo(forwardRef<CommandComponentHandle, CommandProps>(function CommandComponent({
    command,
    overrideName,
    showTitle = true,
    autoFocusFirstField = false,
    filterArguments,
    initialValues,
    setOutput,
    displayMode = "card",
    forceMountAll = false,
    virtualizationMode = "auto",
    jumpSearchMatches = [],
    jumpSearchActiveArg = null,
}: CommandProps, ref) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const virtuosoRef = useRef<VirtuosoHandle | null>(null);
    const [commandPasteError, setCommandPasteError] = useState<string>("");
    const [focusedArgName, setFocusedArgName] = useState<string | null>(null);
    const [fieldStates, setFieldStates] = useState<CommandFieldStateMap>({});
    const [prewarmedArgNames, setPrewarmedArgNames] = useState<Set<string>>(() => new Set());
    const [pendingFocusArgName, setPendingFocusArgName] = useState<string | null>(null);
    const previousInitialValuesSignatureRef = useRef<string | null>(null);
    const pointerFocusActiveRef = useRef(false);
    const pendingFocusedArgNameRef = useRef<string | null>(null);
    const pendingFocusedArgTimeoutRef = useRef<number | null>(null);

    const argEntries = useMemo(() => command.getArguments().filter(filterArguments).map((arg) => buildCommandArgEntry(command, arg)), [command, filterArguments]);
    const groupedArgs = useMemo(() => buildGroupedArgs(argEntries), [argEntries]);
    const virtualRows = useMemo(() => buildVirtualRows(groupedArgs), [groupedArgs]);
    const initialValuesSignature = useMemo(() => serializeInitialValues(initialValues), [initialValues]);
    const compact = isCompactMode(displayMode);
    const trackFocusedArg = displayMode === "focus-pane";
    const shouldVirtualize = virtualizationMode !== "off" && !forceMountAll && argEntries.length >= COMMAND_VIRTUALIZE_THRESHOLD;

    const argOrder = useMemo(() => argEntries.map((entry) => entry.arg.name), [argEntries]);
    const argEntryByName = useMemo(() => new Map(argEntries.map((entry) => [entry.arg.name, entry])), [argEntries]);
    const argRowIndexByName = useMemo(() => {
        const nextMap = new Map<string, number>();
        virtualRows.forEach((item, index) => {
            if (item.kind === "arg") {
                nextMap.set(item.entry.arg.name, index);
            }
        });
        return nextMap;
    }, [virtualRows]);

    useEffect(() => {
        const shouldReseedFromInitialValues = previousInitialValuesSignatureRef.current !== initialValuesSignature;
        previousInitialValuesSignatureRef.current = initialValuesSignature;

        setFieldStates((currentStates) => synchronizeFieldStates(
            currentStates,
            argEntries,
            initialValues,
            shouldReseedFromInitialValues,
        ));
    }, [argEntries, initialValues, initialValuesSignature]);

    useEffect(() => {
        setPrewarmedArgNames(new Set(argOrder.slice(0, COMMAND_INITIAL_PREWARM_ROWS)));
    }, [argOrder]);

    const clearPendingFocusedArgTimeout = useCallback(() => {
        if (pendingFocusedArgTimeoutRef.current == null) {
            return;
        }

        window.clearTimeout(pendingFocusedArgTimeoutRef.current);
        pendingFocusedArgTimeoutRef.current = null;
    }, []);

    const flushPendingFocusedArg = useCallback(() => {
        clearPendingFocusedArgTimeout();
        pointerFocusActiveRef.current = false;

        const pendingArgName = pendingFocusedArgNameRef.current;
        pendingFocusedArgNameRef.current = null;
        if (!pendingArgName) {
            return;
        }

        setFocusedArgName((currentArgName) => currentArgName === pendingArgName ? currentArgName : pendingArgName);
    }, [clearPendingFocusedArgTimeout]);

    const schedulePendingFocusedArgFlush = useCallback(() => {
        pointerFocusActiveRef.current = false;
        clearPendingFocusedArgTimeout();

        if (!pendingFocusedArgNameRef.current) {
            return;
        }

        // Pointerup fires before click. Flush on the next task so layout changes
        // cannot move the target out from under the click that is about to land.
        pendingFocusedArgTimeoutRef.current = window.setTimeout(() => {
            pendingFocusedArgTimeoutRef.current = null;
            flushPendingFocusedArg();
        }, 0);
    }, [clearPendingFocusedArgTimeout, flushPendingFocusedArg]);

    const cancelPendingFocusedArg = useCallback(() => {
        pointerFocusActiveRef.current = false;
        pendingFocusedArgNameRef.current = null;
        clearPendingFocusedArgTimeout();
    }, [clearPendingFocusedArgTimeout]);

    useEffect(() => {
        if (trackFocusedArg) {
            return;
        }

        cancelPendingFocusedArg();
        if (focusedArgName != null) {
            setFocusedArgName(null);
        }
    }, [cancelPendingFocusedArg, focusedArgName, trackFocusedArg]);

    useEffect(() => {
        if (!trackFocusedArg) {
            return;
        }

        const handleWindowPointerUp = () => {
            if (!pointerFocusActiveRef.current) {
                return;
            }

            schedulePendingFocusedArgFlush();
        };
        const handleWindowPointerCancel = () => {
            if (!pointerFocusActiveRef.current) {
                return;
            }

            cancelPendingFocusedArg();
        };

        window.addEventListener("pointerup", handleWindowPointerUp);
        window.addEventListener("pointercancel", handleWindowPointerCancel);

        return () => {
            window.removeEventListener("pointerup", handleWindowPointerUp);
            window.removeEventListener("pointercancel", handleWindowPointerCancel);
        };
    }, [cancelPendingFocusedArg, schedulePendingFocusedArgFlush, trackFocusedArg]);

    useEffect(() => {
        return () => {
            cancelPendingFocusedArg();
        };
    }, [cancelPendingFocusedArg]);

    useLayoutEffect(() => {
        if (!autoFocusFirstField || argOrder.length === 0) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            const firstArgName = argOrder[0];
            const focused = focusPrimaryCommandTarget(findArgContainer(rootRef.current, firstArgName));
            if (focused && trackFocusedArg) {
                setFocusedArgName(firstArgName);
            }
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [argOrder, autoFocusFirstField, trackFocusedArg]);

    const focusedArg = useMemo(() => {
        if (!trackFocusedArg || !focusedArgName) return null;
        return argEntries.find((entry) => entry.arg.name === focusedArgName)?.arg ?? null;
    }, [argEntries, focusedArgName, trackFocusedArg]);

    const updateFieldState = useCallback((argName: string, updater: CommandFieldStateUpdater) => {
        setFieldStates((currentStates) => {
            const previousState = currentStates[argName] ?? createCommandFieldState(initialValues[argName] ?? "");
            const nextState = applyCommandFieldStateUpdater(previousState, updater);
            if (commandFieldStatesEqual(previousState, nextState)) {
                return currentStates;
            }

            return {
                ...currentStates,
                [argName]: nextState,
            };
        });
    }, [initialValues]);

    const fieldStateUpdaters = useMemo<Record<string, (updater: CommandFieldStateUpdater) => void>>(() => {
        return argEntries.reduce<Record<string, (updater: CommandFieldStateUpdater) => void>>((accumulator, entry) => {
            accumulator[entry.arg.name] = (updater) => updateFieldState(entry.arg.name, updater);
            return accumulator;
        }, {});
    }, [argEntries, updateFieldState]);

    const handleFieldOutput = useCallback((argName: string, value: string) => {
        setCommandPasteError("");
        updateFieldState(argName, (previousState) => {
            if (previousState.displayValue === value && previousState.committedValue === value) {
                return previousState;
            }

            return {
                ...previousState,
                displayValue: value,
                committedValue: value,
            };
        });
        setOutput(argName, value);
    }, [setOutput, updateFieldState]);

    const handleFieldCommit = useCallback((argName: string, value: string) => {
        setCommandPasteError("");
        updateFieldState(argName, (previousState) => (
            previousState.committedValue === value
                ? previousState
                : { ...previousState, committedValue: value }
        ));
        setOutput(argName, value);
    }, [setOutput, updateFieldState]);

    const handleFocusCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
        if (!trackFocusedArg) {
            return;
        }
        const argName = event.currentTarget.dataset.argName;
        if (argName) {
            if (pointerFocusActiveRef.current) {
                pendingFocusedArgNameRef.current = argName;
                return;
            }

            setFocusedArgName((currentArgName) => currentArgName === argName ? currentArgName : argName);
        }
    }, [trackFocusedArg]);

    const handlePointerDownCapture = useCallback(() => {
        if (!trackFocusedArg) {
            return;
        }

        clearPendingFocusedArgTimeout();
        pointerFocusActiveRef.current = true;
        pendingFocusedArgNameRef.current = null;
    }, [clearPendingFocusedArgTimeout, trackFocusedArg]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        if (event.defaultPrevented || isEditableTarget(event.target)) {
            return;
        }

        const pastedText = getPastedText(event).trim();
        if (!pastedText) {
            return;
        }

        const parsed = parseCommandStringDetailed(command, pastedText);
        if (!parsed.matchedCommandReference) {
            return;
        }

        const parsedValues = parsed.values;
        if (parsedValues) {
            event.preventDefault();
            event.stopPropagation();
            setCommandPasteError("");
            setFieldStates((currentStates) => {
                const nextStates = { ...currentStates };
                Object.entries(parsedValues).forEach(([key, value]) => {
                    const previousState = nextStates[key] ?? createCommandFieldState(initialValues[key] ?? "");
                    const normalizedValue = normalizeParsedCommandArgOutput(argEntryByName.get(key), value);
                    nextStates[key] = {
                        ...previousState,
                        displayValue: value,
                        committedValue: normalizedValue,
                    };
                });
                return nextStates;
            });
            for (const [key, value] of Object.entries(parsedValues)) {
                setOutput(key, normalizeParsedCommandArgOutput(argEntryByName.get(key), value));
            }
            return;
        }

        if (parsed.error) {
            event.preventDefault();
            event.stopPropagation();
            setCommandPasteError(formatCommandPasteError(command, parsed));
        }
    }, [argEntryByName, command, initialValues, setOutput]);

    const handleDismissCommandPasteError = useCallback(() => {
        setCommandPasteError("");
    }, []);

    const tryFocusArg = useCallback((argName: string) => {
        const root = rootRef.current;
        return focusPrimaryCommandTarget(findArgContainer(root, argName));
    }, []);

    const requestFocusArg = useCallback((argName: string) => {
        if (tryFocusArg(argName)) {
            return true;
        }

        const nextRowIndex = argRowIndexByName.get(argName);
        if (nextRowIndex == null) {
            return false;
        }

        setPendingFocusArgName(argName);
        virtuosoRef.current?.scrollToIndex({ index: nextRowIndex, align: "center", behavior: "auto" });
        return true;
    }, [argRowIndexByName, tryFocusArg]);

    useImperativeHandle(ref, () => ({
        focusArg: (argName: string) => requestFocusArg(argName),
        searchArgs: (query: string) => searchCommandArgs(argEntries, query),
    }), [argEntries, requestFocusArg]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        const currentArgContainer = target.closest<HTMLElement>("[data-arg-name]");
        const currentArgName = currentArgContainer?.dataset.argName;
        if (!currentArgName) {
            return;
        }

        const currentIndex = argOrder.indexOf(currentArgName);
        if (currentIndex === -1) {
            return;
        }

        const edgeArrowDirection = getCommandEdgeArrowDirection(event.nativeEvent);
        if (edgeArrowDirection) {
            const nextIndex = edgeArrowDirection === "previous" ? currentIndex - 1 : currentIndex + 1;
            const nextArgName = argOrder[nextIndex];
            if (!nextArgName) {
                return;
            }

            event.preventDefault();
            requestFocusArg(nextArgName);
            return;
        }

        if (!shouldAdvanceCommandField(event.nativeEvent) || currentIndex >= argOrder.length - 1) {
            return;
        }

        const nextArgName = argOrder[currentIndex + 1];
        event.preventDefault();
        requestFocusArg(nextArgName);
    }, [argOrder, requestFocusArg]);

    const handleRangeChanged = useCallback((range: { startIndex: number; endIndex: number }) => {
        if (!shouldVirtualize) {
            return;
        }

        setPrewarmedArgNames((currentNames) => {
            const nextNames = new Set(currentNames);
            collectPrewarmNames(virtualRows, range.startIndex, range.endIndex).forEach((name) => nextNames.add(name));
            return nextNames.size === currentNames.size ? currentNames : nextNames;
        });
    }, [shouldVirtualize, virtualRows]);

    const handlePendingFocusComplete = useCallback(() => {
        setPendingFocusArgName(null);
    }, []);

    const renderArgRow = useCallback((entry: CommandArgEntry) => {
        const fieldState = fieldStates[entry.arg.name] ?? createCommandFieldState(initialValues[entry.arg.name] ?? "");
        const setFieldState = fieldStateUpdaters[entry.arg.name];
        const prewarm = forceMountAll || prewarmedArgNames.has(entry.arg.name);
        const autoFocusOnMount = pendingFocusArgName === entry.arg.name;

        return (
            <CommandArgCard
                key={entry.arg.name}
                entry={entry}
                displayMode={displayMode}
                compact={compact}
                trackFocusedArg={trackFocusedArg}
                handleFocusCapture={handleFocusCapture}
                fieldState={fieldState}
                setFieldState={setFieldState}
                setOutput={handleFieldOutput}
                commitOutput={handleFieldCommit}
                forceMountAll={forceMountAll}
                prewarm={prewarm}
                autoFocusOnMount={autoFocusOnMount}
                onAutoFocusComplete={autoFocusOnMount ? handlePendingFocusComplete : undefined}
                jumpMatched={jumpSearchMatches.includes(entry.arg.name)}
                jumpActive={jumpSearchActiveArg === entry.arg.name}
            />
        );
    }, [compact, displayMode, fieldStateUpdaters, fieldStates, forceMountAll, handleFieldCommit, handleFieldOutput, handleFocusCapture, handlePendingFocusComplete, initialValues, jumpSearchActiveArg, jumpSearchMatches, pendingFocusArgName, prewarmedArgNames, trackFocusedArg]);

    const computeVirtualItemKey = useCallback((_: number, item: CommandRowItem) => item.key, []);

    const renderVirtualRow = useCallback((index: number, item: CommandRowItem) => {
        if (item.kind === "group-header") {
            return (
                <CommandGroupHeader
                    groupTitle={item.groupTitle}
                    groupDescription={item.groupDescription}
                    compact={compact}
                />
            );
        }

        return (
            <div className={cn("px-0.5 py-1", compact && "py-0.5")}>
                {renderArgRow(item.entry)}
            </div>
        );
    }, [compact, renderArgRow]);

    return (
        <div
            ref={rootRef}
            className={cn("space-y-2.5", compact && "space-y-1.5")}
            data-command-root="true"
            onPasteCapture={handlePasteCapture}
            onKeyDown={handleKeyDown}
            onPointerDownCapture={trackFocusedArg ? handlePointerDownCapture : undefined}
        >
            {showTitle && <h2 className={cn("text-sm font-semibold tracking-tight", compact && "text-xs")}>{overrideName ?? command.name}</h2>}
            {displayMode === "focus-pane" && <FocusInfoBar arg={focusedArg} />}
            {commandPasteError && (
                <div
                    role="alert"
                    data-command-paste-error="true"
                    className="rounded-md border border-destructive/35 bg-destructive/6 px-2 py-1.5 text-[11px] text-destructive"
                >
                    <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1">{commandPasteError}</p>
                        <button
                            type="button"
                            className="shrink-0 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                            onClick={handleDismissCommandPasteError}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
            {shouldVirtualize ? (
                <Virtuoso
                    ref={virtuosoRef}
                    useWindowScroll
                    data={virtualRows}
                    computeItemKey={computeVirtualItemKey}
                    increaseViewportBy={COMMAND_VIRTUAL_VIEWPORT}
                    overscan={COMMAND_VIRTUAL_OVERSCAN}
                    rangeChanged={handleRangeChanged}
                    itemContent={renderVirtualRow}
                />
            ) : (
                groupedArgs.map((group) => {
                    const groupExists = group.groupId != null;
                    return (
                        <section className={cn("space-y-2 px-0.5", compact && "space-y-1.5")} key={group.key}>
                            {groupExists && (
                                <CommandGroupHeader
                                    groupTitle={group.groupTitle}
                                    groupDescription={group.groupDescription}
                                    compact={compact}
                                />
                            )}
                            <div className={cn("space-y-2", compact && "space-y-1.5")}>
                                {group.entries.map((entry) => renderArgRow(entry))}
                            </div>
                        </section>
                    );
                })
            )}
        </div>
    );
}));

export function ArgDescComponent(
    { entry, arg: legacyArg, includeType = false, includeDesc = false, includeExamples = false, compact = false }:
        {
            entry?: CommandArgEntry;
            arg?: Argument;
            includeType?: boolean;
            includeDesc?: boolean;
            includeExamples?: boolean;
            compact?: boolean;
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
                            {description && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={description} disableLinkTabStops /></div>}
                            {typeDesc && <span className="font-medium text-muted-foreground">Type</span>}
                            {typeDesc && <div className="min-w-0 text-muted-foreground"><MarkupRenderer content={typeDesc} disableLinkTabStops /></div>}
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

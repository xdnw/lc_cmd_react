import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useDebounce } from "use-debounce";
import { Filter, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import ListComponent from "@/components/cmd/ListComponent";
import TriStateInput from "@/components/cmd/TriStateInput";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import SearchBar from "@/components/cmd/SearchBar";
import CopyToClipboard from "@/components/ui/copytoclipboard";
import { WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN } from "@/components/ui/virtuosoTuning";
import {
    CMD_TRI_FILTER_DEFS,
    countActiveCmdBrowserFilters,
    createDefaultCmdBrowserState,
    isCmdBrowserStateEqual,
    normalizeTriStateValue,
    type CmdBrowserState,
    type CmdTriFilterKey,
} from "@/components/cmd/cmdBrowserState";
import { cn } from "@/lib/utils";
import { getCharFrequency, simpleSimilarity } from "@/utils/StringUtil";
import type { BaseCommand } from "@/utils/Command";
import { getSearchListKeyboardAction, getSearchListOptionId, useSearchListActiveNavigation } from "./searchListPrimitives";
import { useCommandEscapeArming } from "./useCommandShellKeyboard";
import { DIALOG_LOCAL_ESCAPE_ATTR } from "@/components/ui/dialog";

type CmdListProps = {
    commands: BaseCommand[];
    prefix: string;
    state?: CmdBrowserState;
    initialState?: CmdBrowserState;
    onStateChange?: (state: CmdBrowserState) => void;
    onSelectCommand?: (command: BaseCommand) => void;
    onRequestClose?: () => void;
    autoFocusSearch?: boolean;
    modalMode?: boolean;
    viewportHeight?: string | number;
    className?: string;
};

type SelectOption = { label: string; value: string };

const CMD_LIST_DEFAULT_ROW_HEIGHT = 48;
const CMD_LIST_HINT_SLOT_CLASS = "min-h-[1rem] overflow-hidden whitespace-nowrap text-[11px] text-muted-foreground";

function normalizeSearchQuery(query: string): string {
    return query.trim().replace(/^\/+/, "").toLowerCase();
}

function CompactFilterCard({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-md border border-border/60 bg-background/85 px-2 py-1">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {label}
            </div>
            {children}
        </div>
    );
}

function CommandListRow({
    command,
    prefix,
    onSelectCommand,
    optionId,
    isActive,
    compact,
    rowRef,
    onMouseMove,
}: {
    command: BaseCommand;
    prefix: string;
    onSelectCommand?: (command: BaseCommand) => void;
    optionId: string;
    isActive: boolean;
    compact: boolean;
    rowRef?: (node: HTMLElement | null) => void;
    onMouseMove?: () => void;
}) {
    const path = command.getPathString();
    const description = command.getDescShort();
    const argCount = command.getArguments().length;

    const rowBody = (
        <div className={cn("flex min-w-0 items-start", compact ? "gap-1.5" : "gap-2") }>
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1">
                    <div className={cn("truncate font-mono font-semibold text-foreground", compact ? "text-[12px]" : "text-[13px]")}>
                        <span className="text-muted-foreground">{prefix}</span>
                        {path}
                    </div>
                    {argCount > 0 && (
                        <span className={cn("shrink-0 rounded-md border border-border/70 bg-muted/40 font-medium text-muted-foreground", compact ? "px-1 py-0 text-[9px]" : "px-1 py-0.5 text-[10px]")}>
                            {argCount}
                        </span>
                    )}
                </div>
                <div className={cn("mt-0.5 text-muted-foreground", compact ? "line-clamp-1 text-[10px]" : "line-clamp-2 text-[11px]")}>
                    <MarkupRenderer content={description} />
                </div>
            </div>
        </div>
    );

    const handleSelect = useCallback(() => {
        onSelectCommand?.(command);
    }, [command, onSelectCommand]);

    if (onSelectCommand) {
        return (
            <button
                type="button"
                ref={rowRef as React.Ref<HTMLButtonElement> | undefined}
                onClick={handleSelect}
                id={optionId}
                role="option"
                aria-selected={isActive}
                onMouseMove={onMouseMove}
                className={cn(
                    "w-full rounded-md border border-transparent bg-card/65 text-left transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    compact ? "px-1.5 py-1" : "px-2 py-1.5",
                    isActive && "border-border bg-card ring-1 ring-border/70",
                )}
            >
                {rowBody}
            </button>
        );
    }

    return (
        <a
            ref={rowRef as React.Ref<HTMLAnchorElement> | undefined}
            href={`#command/${path}`}
            id={optionId}
            role="option"
            aria-selected={isActive}
            onMouseMove={onMouseMove}
            className={cn(
                "block rounded-md border border-transparent bg-card/65 no-underline transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                compact ? "px-1.5 py-1" : "px-2 py-1.5",
                isActive && "border-border bg-card ring-1 ring-border/70",
            )}
        >
            {rowBody}
        </a>
    );
}

function serializeTableCopy(commands: BaseCommand[], prefix: string): string {
    const header = "Command\tDescription";
    const rows = commands.map((command) => {
        const path = `${prefix}${command.getPathString()}`;
        const description = command.getDescShort().replace(/\s+/g, " ").trim();
        return `${path}\t${description}`;
    });
    return [header, ...rows].join("\n");
}

function buildLauncherShortcutHints({
    modalMode,
}: {
    modalMode: boolean;
}) {
    if (!modalMode) {
        return ["Type filters", "Arrows browse", "Enter opens", "Esc clears, then leaves"];
    }

    return ["Type filters", "/ refocuses", "Arrows browse", "Enter opens", "Esc clears, then closes"];
}

export default function CmdList({
    commands,
    prefix,
    state: controlledState,
    initialState,
    onStateChange,
    onSelectCommand,
    onRequestClose,
    autoFocusSearch = true,
    modalMode = false,
    viewportHeight = "70vh",
    className,
}: CmdListProps) {
    const [uncontrolledState, setUncontrolledState] = useState<CmdBrowserState>(() => createDefaultCmdBrowserState(initialState));
    const browserState = controlledState ?? uncontrolledState;
    const [filtersInitialized, setFiltersInitialized] = useState<boolean>(() => {
        const startingState = controlledState ?? createDefaultCmdBrowserState(initialState);
        return startingState.showFilters || countActiveCmdBrowserFilters(startingState) > 0;
    });
    const searchRef = useRef<HTMLInputElement>(null);
    const virtuosoRef = useRef<VirtuosoHandle | null>(null);
    const rowRefs = useRef(new Map<string, HTMLElement>());
    const listboxId = useId();
    const {
        rootRef: shellRef,
        escapeHint,
        escapeArmedUntil,
        clearEscapeArming: clearEscapeState,
        triggerEscapeArmOrBack,
    } = useCommandEscapeArming({
        onRequestBack: onRequestClose,
        backHint: modalMode ? "Press Esc again to close the launcher" : "Press Esc again to leave the command browser",
        getReturnFocusTarget: () => searchRef.current,
    });

    useEffect(() => {
        if (browserState.showFilters || countActiveCmdBrowserFilters(browserState) > 0) {
            setFiltersInitialized(true);
        }
    }, [browserState]);

    useEffect(() => {
        if (!autoFocusSearch) {
            return;
        }

        const active = document.activeElement;
        const nothingFocused = !active || active === document.body || active === document.documentElement;
        if (nothingFocused) {
            searchRef.current?.focus();
            searchRef.current?.select();
        }
    }, [autoFocusSearch]);

    const [debouncedQuery] = useDebounce(browserState.query, 100);
    const isDebouncing = browserState.query !== debouncedQuery;
    const activeCustomFilterCount = countActiveCmdBrowserFilters(browserState);
    const hasAnyFiltering = activeCustomFilterCount > 0 || normalizeSearchQuery(debouncedQuery).length > 0;

    const updateBrowserState = useCallback((updater: (currentState: CmdBrowserState) => CmdBrowserState) => {
        const nextState = updater(browserState);
        if (isCmdBrowserStateEqual(nextState, browserState)) {
            return;
        }

        if (controlledState == null) {
            setUncontrolledState(nextState);
        }
        onStateChange?.(nextState);
    }, [browserState, controlledState, onStateChange]);

    const argChildrenByCmd = useMemo(() => {
        if (!filtersInitialized) {
            return null;
        }

        const map = new WeakMap<BaseCommand, Set<string>>();
        commands.forEach((command) => {
            map.set(
                command,
                new Set(command.getArguments().flatMap((arg) => arg.getTypeBreakdown().getAllChildren())),
            );
        });
        return map;
    }, [commands, filtersInitialized]);

    const roles = useMemo<SelectOption[]>(() => {
        if (!filtersInitialized) {
            return [];
        }

        const uniqueRoles = new Map<string, number>();
        commands.forEach((command) => {
            const roleAnnotation = command.command.annotations?.role as
                | { value: string[]; any?: boolean; root?: boolean }
                | undefined;
            if (!roleAnnotation?.value) {
                return;
            }
            roleAnnotation.value.forEach((role) => {
                uniqueRoles.set(role, (uniqueRoles.get(role) ?? 0) + 1);
            });
        });

        return Array.from(uniqueRoles.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([role, count]) => ({ label: `${role} (${count})`, value: role }));
    }, [commands, filtersInitialized]);

    const commandArgs = useMemo<SelectOption[]>(() => {
        if (!filtersInitialized || !argChildrenByCmd) {
            return [];
        }

        const uniqueArgs = new Map<string, number>();
        commands.forEach((command) => {
            argChildrenByCmd.get(command)?.forEach((argName) => {
                uniqueArgs.set(argName, (uniqueArgs.get(argName) ?? 0) + 1);
            });
        });

        return Array.from(uniqueArgs.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([argName, count]) => ({ label: `${argName} (${count})`, value: argName }));
    }, [argChildrenByCmd, commands, filtersInitialized]);

    const filteredCommands = useMemo(() => {
        let currentCommands = commands;

        const triFilters = browserState.filters.triFilters;
        if (Object.keys(triFilters).length > 0) {
            currentCommands = currentCommands.filter((command) => {
                return Object.entries(triFilters).every(([annotation, rawValue]) => {
                    const value = normalizeTriStateValue(rawValue);
                    if (value === "0") {
                        return true;
                    }

                    const expected = value === "1";
                    if (annotation === "viewable") {
                        return (command.command.viewable === true) === expected;
                    }

                    const annotationValue = command.command.annotations?.[annotation];
                    if (typeof annotationValue === "boolean") {
                        return annotationValue === expected;
                    }
                    return Boolean(annotationValue) === expected;
                });
            });
        }

        if (browserState.filters.hasArgs !== "0") {
            const wantsArgs = browserState.filters.hasArgs === "1";
            currentCommands = currentCommands.filter((command) => command.getArguments().length > 0 === wantsArgs);
        }

        if (browserState.filters.rolesAny.trim()) {
            const expectedRoles = new Set(
                browserState.filters.rolesAny.split(",").map((value) => value.trim()).filter(Boolean),
            );
            currentCommands = currentCommands.filter((command) => {
                const roleAnnotation = command.command.annotations?.role as
                    | { value: string[]; any?: boolean; root?: boolean }
                    | undefined;
                if (!roleAnnotation?.value || roleAnnotation.root) {
                    return false;
                }
                return roleAnnotation.value.some((role) => expectedRoles.has(role));
            });
        }

        if (browserState.filters.requiredArgs.trim()) {
            const expectedArgs = new Set(
                browserState.filters.requiredArgs.split(",").map((value) => value.trim()).filter(Boolean),
            );
            currentCommands = currentCommands.filter((command) => {
                const allChildren = argChildrenByCmd?.get(command) ?? new Set<string>();
                for (const argName of expectedArgs) {
                    if (!allChildren.has(argName)) {
                        return false;
                    }
                }
                return true;
            });
        }

        const normalizedQuery = normalizeSearchQuery(debouncedQuery);
        if (!normalizedQuery) {
            return currentCommands;
        }

        const queryFrequency = getCharFrequency(normalizedQuery);
        const queryWordFrequency = new Set(normalizedQuery.split(/\s+/).filter(Boolean));

        return currentCommands
            .map((command) => ({
                command,
                score: simpleSimilarity(normalizedQuery, queryFrequency, queryWordFrequency, command),
            }))
            .filter((entry) => entry.score > 0)
            .sort((left, right) => right.score - left.score)
            .map((entry) => entry.command);
    }, [argChildrenByCmd, browserState.filters, commands, debouncedQuery]);

    const tableCopy = useMemo(() => serializeTableCopy(filteredCommands, prefix), [filteredCommands, prefix]);

    const focusSearchInput = useCallback(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
    }, []);

    const getOptionId = useCallback((command: BaseCommand) => {
        return getSearchListOptionId(listboxId, command.getPathString());
    }, [listboxId]);

    const scrollToCommandIndex = useCallback((index: number, align: "start" | "center" | "end") => {
        virtuosoRef.current?.scrollToIndex({ index, align, behavior: "auto" });
    }, []);

    const {
        activeIndex,
        setActiveIndex,
        moveActiveIndex,
    } = useSearchListActiveNavigation({
        itemCount: filteredCommands.length,
        scrollToIndex: scrollToCommandIndex,
    });

    const activateCommandIndex = useCallback((index: number) => {
        const command = filteredCommands[index];
        if (!command) {
            return;
        }

        clearEscapeState();
        if (onSelectCommand) {
            onSelectCommand(command);
            return;
        }

        rowRefs.current.get(command.getPathString())?.click();
    }, [clearEscapeState, filteredCommands, onSelectCommand]);

    const setQuery = useCallback((query: string) => {
        updateBrowserState((currentState) => ({
            ...currentState,
            query,
        }));
    }, [updateBrowserState]);

    const setTriFilter = useCallback((key: CmdTriFilterKey, nextValue: string) => {
        updateBrowserState((currentState) => {
            const normalizedValue = normalizeTriStateValue(nextValue);
            const nextTriFilters = { ...currentState.filters.triFilters };
            if (normalizedValue === "0") {
                delete nextTriFilters[key];
            } else {
                nextTriFilters[key] = normalizedValue;
            }

            return {
                ...currentState,
                filters: {
                    ...currentState.filters,
                    triFilters: nextTriFilters,
                },
            };
        });
    }, [updateBrowserState]);

    const setHasArgsFilter = useCallback((nextValue: string) => {
        updateBrowserState((currentState) => ({
            ...currentState,
            filters: {
                ...currentState.filters,
                hasArgs: normalizeTriStateValue(nextValue),
            },
        }));
    }, [updateBrowserState]);

    const setRolesFilter = useCallback((_: string, nextValue: string) => {
        updateBrowserState((currentState) => ({
            ...currentState,
            filters: {
                ...currentState.filters,
                rolesAny: nextValue,
            },
        }));
    }, [updateBrowserState]);

    const setRequiredArgsFilter = useCallback((_: string, nextValue: string) => {
        updateBrowserState((currentState) => ({
            ...currentState,
            filters: {
                ...currentState.filters,
                requiredArgs: nextValue,
            },
        }));
    }, [updateBrowserState]);

    const toggleFilters = useCallback(() => {
        setFiltersInitialized(true);
        updateBrowserState((currentState) => ({
            ...currentState,
            showFilters: !currentState.showFilters,
        }));
    }, [updateBrowserState]);

    const clearSearch = useCallback(() => {
        setQuery("");
        requestAnimationFrame(() => {
            focusSearchInput();
        });
    }, [focusSearchInput, setQuery]);

    const clearFilters = useCallback(() => {
        updateBrowserState((currentState) => ({
            ...currentState,
            filters: createDefaultCmdBrowserState().filters,
        }));
    }, [updateBrowserState]);

    const clearAll = useCallback(() => {
        updateBrowserState((currentState) => ({
            ...createDefaultCmdBrowserState(),
            showFilters: currentState.showFilters,
        }));
        requestAnimationFrame(() => {
            focusSearchInput();
        });
    }, [focusSearchInput, updateBrowserState]);

    const onFilterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        clearEscapeState();
        setQuery(event.target.value);
    }, [clearEscapeState, setQuery]);

    const onSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Escape" && escapeArmedUntil != null) {
            clearEscapeState();
        }

        const action = getSearchListKeyboardAction({
            key: event.key,
            itemCount: filteredCommands.length,
            activeIndex,
            hasQuery: browserState.query.trim().length > 0,
            pageSize: 10,
            wrapArrowUp: true,
            wrapArrowDown: true,
        });

        switch (action.type) {
            case "move":
                event.preventDefault();
                clearEscapeState();
                moveActiveIndex(action.nextIndex, action.align);
                return;
            case "activate":
                event.preventDefault();
                activateCommandIndex(activeIndex);
                return;
            case "clear-query":
                event.preventDefault();
                clearSearch();
                clearEscapeState();
                return;
            case "escape":
                event.preventDefault();
                triggerEscapeArmOrBack();
                return;
            default:
                return;
        }
    }, [activeIndex, activateCommandIndex, browserState.query, clearEscapeState, clearSearch, escapeArmedUntil, filteredCommands.length, moveActiveIndex, triggerEscapeArmOrBack]);

    const registerRowRef = useCallback((path: string, node: HTMLElement | null) => {
        if (node) {
            rowRefs.current.set(path, node);
            return;
        }

        rowRefs.current.delete(path);
    }, []);

    const triFilterHandlers = useMemo(
        () => Object.fromEntries(CMD_TRI_FILTER_DEFS.map((filterDef) => [
            filterDef.key,
            (_name: string, value: string) => setTriFilter(filterDef.key, value),
        ])) as Record<CmdTriFilterKey, (name: string, value: string) => void>,
        [setTriFilter],
    );

    const hasArgsFilterHandler = useCallback((_name: string, value: string) => {
        setHasArgsFilter(value);
    }, [setHasArgsFilter]);

    const commandRowRefs = useMemo(
        () => Object.fromEntries(filteredCommands.map((command) => {
            const path = command.getPathString();
            return [path, (node: HTMLElement | null) => registerRowRef(path, node)];
        })) as Record<string, (node: HTMLElement | null) => void>,
        [filteredCommands, registerRowRef],
    );

    const commandMouseMoveHandlers = useMemo(
        () => filteredCommands.map((_, index) => () => {
            setActiveIndex(index);
        }),
        [filteredCommands, setActiveIndex],
    );

    const computeCommandItemKey = useCallback((_index: number, command: BaseCommand) => {
        return command.getPathString();
    }, []);

    const renderCommandRow = useCallback((index: number, command: BaseCommand) => {
        const path = command.getPathString();
        return (
            <div className="px-0.5 py-0.5">
                <CommandListRow
                    command={command}
                    prefix={prefix}
                    onSelectCommand={onSelectCommand}
                    optionId={getOptionId(command)}
                    isActive={index === activeIndex}
                    compact={modalMode}
                    rowRef={commandRowRefs[path]}
                    onMouseMove={commandMouseMoveHandlers[index]}
                />
            </div>
        );
    }, [activeIndex, commandMouseMoveHandlers, commandRowRefs, getOptionId, modalMode, onSelectCommand, prefix]);

    const listHeight = typeof viewportHeight === "number" ? `${viewportHeight}px` : viewportHeight;
    const activeCommand = filteredCommands[activeIndex] ?? null;
    const activeDescendantId = activeCommand ? getOptionId(activeCommand) : undefined;
    const launcherShortcutHints = buildLauncherShortcutHints({ modalMode });

    return (
        <div ref={shellRef} {...{ [DIALOG_LOCAL_ESCAPE_ATTR]: "true" }} className={cn("flex min-h-0 flex-col gap-1.5", className)}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                        <SearchBar
                            ref={searchRef}
                            value={browserState.query}
                            onChange={onFilterChange}
                            onClear={clearSearch}
                            onKeyDown={onSearchKeyDown}
                            placeholder={`Search ${prefix}commands`}
                            inputProps={{
                                role: "combobox",
                                "aria-autocomplete": "list",
                                "aria-expanded": filteredCommands.length > 0,
                                "aria-haspopup": "listbox",
                                "aria-controls": listboxId,
                                "aria-activedescendant": activeDescendantId,
                            }}
                            className={cn(
                                "rounded-md border-input/80 bg-background/90 text-sm shadow-none",
                                modalMode && "h-8",
                            )}
                        />
                    </div>
                    <Button
                        type="button"
                        size="icon"
                        variant={browserState.showFilters || activeCustomFilterCount > 0 ? "secondary" : "outline"}
                        onClick={toggleFilters}
                        aria-expanded={browserState.showFilters}
                        aria-controls="cmd-filter-panel"
                        title="Toggle filters"
                        className="shrink-0"
                    >
                        <ListFilter className="h-4 w-4" />
                        <span className="sr-only">Toggle filters</span>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                    <div className={cn("flex min-w-0 flex-1 items-center gap-2 overflow-hidden", CMD_LIST_HINT_SLOT_CLASS)}>
                        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                            {launcherShortcutHints.map((hint, index) => (
                                <React.Fragment key={hint}>
                                    {index > 0 && <span className="shrink-0 text-muted-foreground/50">|</span>}
                                    <span className="shrink-0 truncate">{hint}</span>
                                </React.Fragment>
                            ))}
                        </div>
                        <span role="status" aria-live="polite" className="truncate text-[11px] text-muted-foreground">{escapeHint ?? ""}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {filteredCommands.length > 0 && (
                            <CopyToClipboard
                                text="Copy"
                                copy={tableCopy}
                                className="h-6 rounded-md px-2 text-[11px]"
                            />
                        )}
                        <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/25 px-1.5 py-0.5">
                            <Filter className="h-3 w-3" />
                            <span>
                                {filteredCommands.length.toLocaleString()} / {commands.length.toLocaleString()}
                                {isDebouncing ? " updating" : " shown"}
                            </span>
                        </span>
                        {activeCustomFilterCount > 0 && (
                            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary">
                                {activeCustomFilterCount} filter{activeCustomFilterCount === 1 ? "" : "s"}
                            </span>
                        )}
                        {activeCustomFilterCount > 0 && (
                            <Button type="button" size="sm" variant="ghost" className="h-6 rounded-md px-2 text-[11px]" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        )}
                        {hasAnyFiltering && (
                            <Button type="button" size="sm" variant="ghost" className="h-6 rounded-md px-2 text-[11px]" onClick={clearAll}>
                                Reset
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {filtersInitialized && browserState.showFilters && (
                <div
                    id="cmd-filter-panel"
                    className="rounded-md border border-border/70 bg-muted/15 p-1.5"
                >
                    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3 xl:grid-cols-5">
                        {CMD_TRI_FILTER_DEFS.map((filterDef) => (
                            <CompactFilterCard key={filterDef.key} label={filterDef.label}>
                                <TriStateInput
                                    argName={filterDef.key}
                                    initialValue={browserState.filters.triFilters[filterDef.key] ?? "0"}
                                    setOutputValue={triFilterHandlers[filterDef.key]}
                                    compact={true}
                                />
                            </CompactFilterCard>
                        ))}
                        <CompactFilterCard label="Has Args">
                            <TriStateInput
                                argName="hasArgs"
                                initialValue={browserState.filters.hasArgs}
                                setOutputValue={hasArgsFilterHandler}
                                compact={true}
                            />
                        </CompactFilterCard>
                    </div>

                    <div className="mt-1 grid gap-1.5 lg:grid-cols-2">
                        {roles.length > 0 && (
                            <CompactFilterCard label="Roles">
                                <ListComponent
                                    argName="rolesAny"
                                    options={roles}
                                    isMulti={true}
                                    initialValue={browserState.filters.rolesAny}
                                    setOutputValue={setRolesFilter}
                                />
                            </CompactFilterCard>
                        )}
                        {commandArgs.length > 0 && (
                            <CompactFilterCard label="Required Args">
                                <ListComponent
                                    argName="requiredArgs"
                                    options={commandArgs}
                                    isMulti={true}
                                    initialValue={browserState.filters.requiredArgs}
                                    setOutputValue={setRequiredArgsFilter}
                                />
                            </CompactFilterCard>
                        )}
                    </div>
                </div>
            )}

            {filteredCommands.length > 0 ? (
                <div id={listboxId} role="listbox" aria-label="Commands" className="min-h-0 rounded-md border border-border/70 bg-card/60 p-px shadow-sm">
                    <Virtuoso
                        ref={virtuosoRef}
                        style={{ height: listHeight }}
                        data={filteredCommands}
                        computeItemKey={computeCommandItemKey}
                        itemContent={renderCommandRow}
                        defaultItemHeight={CMD_LIST_DEFAULT_ROW_HEIGHT}
                        overscan={WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN}
                        increaseViewportBy={600}
                    />
                </div>
            ) : (
                <div className="rounded-md border border-dashed border-border/70 bg-card/40 px-3 py-4 text-sm text-muted-foreground">
                    No commands match the current search.
                </div>
            )}
        </div>
    );
}

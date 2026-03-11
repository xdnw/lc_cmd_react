import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
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

type CmdListProps = {
    commands: BaseCommand[];
    prefix: string;
    state?: CmdBrowserState;
    initialState?: CmdBrowserState;
    onStateChange?: (state: CmdBrowserState) => void;
    onSelectCommand?: (command: BaseCommand) => void;
    autoFocusSearch?: boolean;
    modalMode?: boolean;
    viewportHeight?: string | number;
    className?: string;
};

type SelectOption = { label: string; value: string };

const CMD_LIST_DEFAULT_ROW_HEIGHT = 64;

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
        <div className="rounded-md border border-border/60 bg-background/85 px-2 py-1.5">
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
}: {
    command: BaseCommand;
    prefix: string;
    onSelectCommand?: (command: BaseCommand) => void;
}) {
    const path = command.getPathString();
    const description = command.getDescShort();
    const argCount = command.getArguments().length;

    const rowBody = (
        <div className="flex min-w-0 items-start gap-2.5">
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                    <div className="truncate font-mono text-[13px] font-semibold text-foreground">
                        <span className="text-muted-foreground">{prefix}</span>
                        {path}
                    </div>
                    {argCount > 0 && (
                        <span className="shrink-0 rounded-md border border-border/70 bg-muted/40 px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {argCount}
                        </span>
                    )}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                    <MarkupRenderer content={description} />
                </div>
            </div>
        </div>
    );

    if (onSelectCommand) {
        return (
            <button
                type="button"
                onClick={() => onSelectCommand(command)}
                className="w-full rounded-md border border-transparent bg-card/65 px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {rowBody}
            </button>
        );
    }

    return (
        <a
            href={`#command/${path}`}
            className="block rounded-md border border-transparent bg-card/65 px-2.5 py-2 no-underline transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

export default function CmdList({
    commands,
    prefix,
    state: controlledState,
    initialState,
    onStateChange,
    onSelectCommand,
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
            searchRef.current?.focus();
            searchRef.current?.select();
        });
    }, [setQuery]);

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
            searchRef.current?.focus();
            searchRef.current?.select();
        });
    }, [updateBrowserState]);

    const onFilterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    }, [setQuery]);

    const onSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            clearSearch();
        }
    }, [clearSearch]);

    const listHeight = typeof viewportHeight === "number" ? `${viewportHeight}px` : viewportHeight;

    return (
        <div className={cn("flex min-h-0 flex-col gap-2", className)}>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                        <SearchBar
                            ref={searchRef}
                            value={browserState.query}
                            onChange={onFilterChange}
                            onClear={clearSearch}
                            onKeyDown={onSearchKeyDown}
                            placeholder={`Search ${prefix}commands`}
                            className={cn(
                                "rounded-md border-input/80 bg-background/90 text-sm shadow-none",
                                modalMode && "h-8",
                            )}
                        />
                    </div>
                    <Button
                        type="button"
                        size="iconSm"
                        variant={browserState.showFilters || activeCustomFilterCount > 0 ? "secondary" : "outline"}
                        onClick={toggleFilters}
                        aria-expanded={browserState.showFilters}
                        aria-controls="cmd-filter-panel"
                        title="Toggle filters"
                        className="shrink-0"
                    >
                        <ListFilter className="h-3.5 w-3.5" />
                        <span className="sr-only">Toggle filters</span>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-1.5">
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
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {filteredCommands.length > 0 && (
                            <CopyToClipboard
                                text="Copy"
                                copy={tableCopy}
                                className="h-6 rounded-md px-2 text-[11px]"
                            />
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
                    className="rounded-md border border-border/70 bg-muted/15 p-2"
                >
                    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3 xl:grid-cols-5">
                        {CMD_TRI_FILTER_DEFS.map((filterDef) => (
                            <CompactFilterCard key={filterDef.key} label={filterDef.label}>
                                <TriStateInput
                                    argName={filterDef.key}
                                    initialValue={browserState.filters.triFilters[filterDef.key] ?? "0"}
                                    setOutputValue={(_name, value) => setTriFilter(filterDef.key, value)}
                                    compact={true}
                                />
                            </CompactFilterCard>
                        ))}
                        <CompactFilterCard label="Has Args">
                            <TriStateInput
                                argName="hasArgs"
                                initialValue={browserState.filters.hasArgs}
                                setOutputValue={(_name, value) => setHasArgsFilter(value)}
                                compact={true}
                            />
                        </CompactFilterCard>
                    </div>

                    <div className="mt-1.5 grid gap-1.5 lg:grid-cols-2">
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
                <div className="min-h-0 rounded-md border border-border/70 bg-card/60 p-0.5 shadow-sm">
                    <Virtuoso
                        style={{ height: listHeight }}
                        data={filteredCommands}
                        computeItemKey={(_index, command) => command.getPathString()}
                        itemContent={(_index, command) => (
                            <div className="px-0.5 py-0.5">
                                <CommandListRow command={command} prefix={prefix} onSelectCommand={onSelectCommand} />
                            </div>
                        )}
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

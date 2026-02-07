import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TableVirtuoso, type TableComponents } from "react-virtuoso";
import { useDebounce } from "use-debounce";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ListComponent from "@/components/cmd/ListComponent";
import TriStateInput from "@/components/cmd/TriStateInput";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import { CustomTriInput } from "@/components/cmd/CustomTriInput";
import SearchBar from "@/components/cmd/SearchBar";

import { getCharFrequency, simpleSimilarity } from "@/utils/StringUtil";
import type { BaseCommand } from "@/utils/Command";

type CmdFilterMap = Record<string, (cmd: BaseCommand) => boolean>;

const TRI_FILTER_DEFS: Array<{ label: string; annotation: string }> = [
    { label: "Viewable", annotation: "viewable" },
    { label: "Whitelisted", annotation: "whitelist" },
    { label: "Whitelisted Coalition", annotation: "coalition" },
    { label: "Requires Alliance", annotation: "isalliance" },
    { label: "Requires API", annotation: "hasapi" },
    { label: "Requires Offshore", annotation: "hasoffshore" },
    { label: "Restricted Guild", annotation: "isguild" },
    { label: "Role annotation exists", annotation: "role" },
];

function InlineFilterRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-2 py-1.5">
            <span className="min-w-0 truncate text-sm">{label}</span>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

const VirtuosoTableComponents: TableComponents<BaseCommand> = {
    Scroller: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
        ({ style, className, ...props }, ref) => (
            <div
                ref={ref}
                {...props}
                style={style}
                className={[
                    "overflow-auto rounded-md border bg-card",
                    "[scrollbar-gutter:stable]",
                    "focus:outline-none",
                    className ?? "",
                ].join(" ")}
            />
        )
    ),

    Table: ({ style, className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
        <table
            {...(props as React.TableHTMLAttributes<HTMLTableElement>)}
            style={style}
            className={[
                "w-full table-fixed border-separate border-spacing-0 text-sm",
                className ?? "",
            ].join(" ")}
        >
            {/* Stable column sizing to prevent jitter while virtualized rows mount/unmount */}
            <colgroup>
                <col style={{ width: "clamp(14rem, 32%, 22rem)" }} />
                <col />
            </colgroup>
            {children}
        </table>
    ),

    TableHead: React.forwardRef<
        HTMLTableSectionElement,
        React.HTMLAttributes<HTMLTableSectionElement>
    >(({ className, ...props }, ref) => (
        <thead
            {...props}
            ref={ref}
            className={[
                "sticky top-0 z-10",
                "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                className ?? "",
            ].join(" ")}
        />
    )),

    TableRow: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
        <tr
            {...props}
            className={[
                "align-top border-b border-border/60",
                "hover:bg-muted/40",
                className ?? "",
            ].join(" ")}
        />
    ),

    TableBody: React.forwardRef<
        HTMLTableSectionElement,
        React.HTMLAttributes<HTMLTableSectionElement>
    >(({ className, ...props }, ref) => (
        <tbody
            {...props}
            ref={ref}
            className={["[&_tr:last-child]:border-b-0", className ?? ""].join(" ")}
        />
    )),
};

(VirtuosoTableComponents.Scroller as React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement>>).displayName =
    "VirtuosoScroller";
(VirtuosoTableComponents.TableHead as React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableSectionElement>>).displayName =
    "VirtuosoTableHead";
(VirtuosoTableComponents.TableBody as React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableSectionElement>>).displayName =
    "VirtuosoTableBody";

export default function CmdList({
    commands,
    prefix,
}: {
    commands: BaseCommand[];
    prefix: string;
}) {
    const [filter, setFilter] = useState("");
    const [customFilters, setCustomFilters] = useState<CmdFilterMap>({});
    const [showFilters, setShowFilters] = useState(false);
    const [filtersInitialized, setFiltersInitialized] = useState(false);

    // Used to force-remount uncontrolled filter inputs when "Clear filters" is clicked.
    const [filterControlsKey, setFilterControlsKey] = useState(0);

    const searchRef = useRef<HTMLInputElement>(null);

    // Focus search on load, but don't steal focus if something else already has it.
    useEffect(() => {
        const el = searchRef.current;
        if (!el) return;

        const active = document.activeElement;
        const nothingFocused =
            !active || active === document.body || active === document.documentElement;

        if (nothingFocused) {
            el.focus();
            el.select();
        }
    }, []);

    // Debounce only the text query (custom filters should apply immediately)
    const [debouncedFilter] = useDebounce(filter, 120);
    const isDebouncing = filter !== debouncedFilter;

    const activeCustomFilterCount = Object.keys(customFilters).length;
    const hasAnyFiltering =
        activeCustomFilterCount > 0 || debouncedFilter.trim().length > 0;

    /**
     * React Compiler rule: don't read/mutate ref.current during render.
     * So we build a pure cache via useMemo instead of useRef.
     *
     * This computes once when commands or filtersInitialized changes.
     * (Still lazy because it only builds after opening filters once.)
     */
    const EMPTY_SET = useMemo(() => new Set<string>(), []);
    const argChildrenByCmd = useMemo(() => {
        if (!filtersInitialized) return null;

        const map = new WeakMap<BaseCommand, Set<string>>();
        for (const cmd of commands) {
            const allChildren = new Set(
                cmd
                    .getArguments()
                    .flatMap((arg) => arg.getTypeBreakdown().getAllChildren())
            );
            map.set(cmd, allChildren);
        }
        return map;
    }, [commands, filtersInitialized]);

    const getArgChildren = useCallback(
        (cmd: BaseCommand): Set<string> => {
            return argChildrenByCmd?.get(cmd) ?? EMPTY_SET;
        },
        [argChildrenByCmd, EMPTY_SET]
    );

    // Build filter option lists ONLY after the filter panel is opened once
    const roles = useMemo<{ label: string; value: string }[]>(() => {
        if (!filtersInitialized) return [];
        const rolesUnique = new Map<string, number>();

        for (const cmd of commands) {
            const roleAnn = cmd.command.annotations?.["role"] as
                | { value: string[]; any?: boolean; root?: boolean }
                | undefined;

            if (!roleAnn?.value) continue;

            for (const role of roleAnn.value) {
                rolesUnique.set(role, (rolesUnique.get(role) || 0) + 1);
            }
        }

        return Array.from(rolesUnique.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([role, count]) => ({ label: `${role} (${count})`, value: role }));
    }, [commands, filtersInitialized]);

    const cmdArgs = useMemo<{ label: string; value: string }[]>(() => {
        if (!filtersInitialized) return [];
        const argsUnique = new Map<string, number>();

        for (const cmd of commands) {
            const uniqueChildrenForCmd = getArgChildren(cmd); // cached
            for (const child of uniqueChildrenForCmd) {
                argsUnique.set(child, (argsUnique.get(child) || 0) + 1);
            }
        }

        return Array.from(argsUnique.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([arg, count]) => ({ label: `${arg} (${count})`, value: arg }));
    }, [commands, filtersInitialized, getArgChildren]);

    const customFilterFns = useMemo(
        () => Object.values(customFilters),
        [customFilters]
    );

    // Apply custom filters first (so we score/sort fewer items)
    const customFilteredCommands = useMemo(() => {
        if (customFilterFns.length === 0) return commands;
        return commands.filter((cmd) => customFilterFns.every((fn) => fn(cmd)));
    }, [commands, customFilterFns]);

    // Then apply similarity scoring only when the debounced query changes
    const filteredCommands = useMemo(() => {
        const q = debouncedFilter.trim().toLowerCase();
        if (!q) return customFilteredCommands;

        const inputFreq = getCharFrequency(q);
        const inputWordFreq = new Set(q.split(/\s+/).filter(Boolean));

        return customFilteredCommands
            .map((cmd) => ({
                cmd,
                similarityScore: simpleSimilarity(q, inputFreq, inputWordFreq, cmd),
            }))
            .filter(({ similarityScore }) => similarityScore > 0)
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .map(({ cmd }) => cmd);
    }, [customFilteredCommands, debouncedFilter]);

    const toggleFilters = useCallback(() => {
        setShowFilters((prev) => {
            if (!prev) setFiltersInitialized(true); // lazy-init option lists
            return !prev;
        });
    }, []);

    const clearAll = useCallback(() => {
        setFilter("");
        setCustomFilters({});
        setFilterControlsKey((k) => k + 1);
        // helpful for quick retry
        requestAnimationFrame(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
        });
    }, []);

    const clearCustomOnly = useCallback(() => {
        setCustomFilters({});
        setFilterControlsKey((k) => k + 1);
    }, []);

    const onFilterChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setFilter(e.target.value);
        },
        []
    );

    const onSearchKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") {
                setFilter("");
                requestAnimationFrame(() => {
                    searchRef.current?.focus();
                    searchRef.current?.select();
                });
            }
        },
        []
    );

    const clearSearch = useCallback(() => {
        setFilter("");
        requestAnimationFrame(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
        });
    }, []);

    const hasRoleOutput = useCallback((_: string, value: string) => {
        setCustomFilters((prev) => {
            const next = { ...prev };
            if (value) {
                const options = new Set(
                    value.split(",").map((s) => s.trim()).filter(Boolean)
                );
                next["hasrole"] = (cmd: BaseCommand) => {
                    const roleAnn = cmd.command.annotations?.["role"] as
                        | { value: string[]; any?: boolean; root?: boolean }
                        | undefined;

                    if (!roleAnn?.value) return false;
                    if (roleAnn.root) return false;

                    for (const r of roleAnn.value) {
                        if (options.has(r)) return true;
                    }
                    return false;
                };
            } else {
                delete next["hasrole"];
            }
            return next;
        });
    }, []);

    const hasArgOutput = useCallback((_: string, value: string) => {
        setCustomFilters((prev) => {
            const next = { ...prev };
            if (value === "1" || value === "-1") {
                const wantArgs = value === "1";
                next["hasarg"] = (cmd: BaseCommand) =>
                    (!!(cmd.command.arguments &&
                        Object.values(cmd.command.arguments).length > 0)) === wantArgs;
            } else {
                delete next["hasarg"];
            }
            return next;
        });
    }, []);

    const reqArgOutput = useCallback(
        (_: string, value: string) => {
            setCustomFilters((prev) => {
                const next = { ...prev };
                if (value) {
                    const required = new Set(
                        value.split(",").map((s) => s.trim()).filter(Boolean)
                    );
                    next["hasargs"] = (cmd: BaseCommand) => {
                        if (!cmd.command.arguments) return false;
                        const allChildren = getArgChildren(cmd); // cached
                        for (const r of required) {
                            if (!allChildren.has(r)) return false;
                        }
                        return true;
                    };
                } else {
                    delete next["hasargs"];
                }
                return next;
            });
        },
        [getArgChildren]
    );

    const fixedHeaderContent = useCallback(
        () => (
            <tr className="border-b border-border/60 bg-muted/40">
                <th
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                    Command
                </th>
                <th
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                    Description
                </th>
            </tr>
        ),
        []
    );

    const rowContent = useCallback(
        (_index: number, cmd: BaseCommand) => {
            const path = cmd.getPathString();
            const desc = cmd.getDescShort();

            return (
                <>
                    <td className="px-3 py-2 align-top">
                        <a
                            href={`#command/${path}`}
                            className="block break-words font-mono text-sm font-semibold text-primary no-underline hover:underline"
                        >
                            <span className="text-muted-foreground">{prefix}</span>
                            {path}
                        </a>
                    </td>
                    <td className="px-3 py-2 align-top">
                        <div className="min-w-0 break-words text-sm text-foreground">
                            <MarkupRenderer content={desc} />
                        </div>
                    </td>
                </>
            );
        },
        [prefix]
    );

    const computeItemKey = useCallback(
        (_index: number, cmd: BaseCommand) => cmd.getPathString(),
        []
    );

    return (
        <div className="flex flex-col gap-2">
            {/* Search + Filters */}
            <div className="flex w-full flex-col gap-2">
                <SearchBar
                    ref={searchRef}
                    value={filter}
                    onChange={onFilterChange}
                    onClear={clearSearch}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Search commands (name, description, args)…"
                    className="w-full"
                />

                <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={showFilters || activeCustomFilterCount > 0 ? "secondary" : "outline"}
                            onClick={toggleFilters}
                            aria-expanded={showFilters}
                            aria-controls="cmd-filter-panel"
                            className="shrink-0 gap-2"
                            title="Filters"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden sm:inline">Filters</span>

                            {activeCustomFilterCount > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                                    {activeCustomFilterCount}
                                </span>
                            )}

                            {showFilters ? (
                                <ChevronUp className="h-4 w-4 opacity-80" />
                            ) : (
                                <ChevronDown className="h-4 w-4 opacity-80" />
                            )}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div>
                            Showing <span className="font-medium text-foreground">{filteredCommands.length.toLocaleString()}</span> of <span className="font-medium text-foreground">{commands.length.toLocaleString()}</span> commands{isDebouncing ? " (typing…)" : ""}
                        </div>

                        {hasAnyFiltering && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAll}
                                className="h-6 px-2 text-xs"
                                title="Clear search + filters"
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter panel (lazy init on first open) */}
            {filtersInitialized && (
                <div
                    id="cmd-filter-panel"
                    className={[
                        "rounded-md border bg-muted/20 p-3",
                        showFilters ? "block" : "hidden",
                    ].join(" ")}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="text-sm font-semibold">Filters</div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearCustomOnly}
                            disabled={activeCustomFilterCount === 0}
                            className="h-7 px-2"
                            title="Clear active filters"
                        >
                            Clear filters
                        </Button>
                    </div>

                    <div key={filterControlsKey} className="mt-3 grid gap-4">
                        {/* Flags */}
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {TRI_FILTER_DEFS.map((def) => (
                                <InlineFilterRow key={def.annotation} label={def.label}>
                                    <CustomTriInput annotation={def.annotation} set={setCustomFilters} />
                                </InlineFilterRow>
                            ))}

                            <InlineFilterRow label="Has Arguments">
                                <TriStateInput
                                    argName="hasarg"
                                    initialValue="0"
                                    setOutputValue={hasArgOutput}
                                />
                            </InlineFilterRow>
                        </div>

                        {/* Pick-lists */}
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {roles.length > 0 && (
                                <div className="rounded-md border border-border/60 bg-background p-2">
                                    <div className="mb-2 text-sm font-medium">Require Roles (Any)</div>
                                    <ListComponent
                                        argName="hasrole"
                                        options={roles}
                                        isMulti={true}
                                        initialValue={""}
                                        setOutputValue={hasRoleOutput}
                                    />
                                </div>
                            )}

                            {cmdArgs.length > 0 && (
                                <div className="rounded-md border border-border/60 bg-background p-2">
                                    <div className="mb-2 text-sm font-medium">
                                        Require Arguments (All)
                                    </div>
                                    <ListComponent
                                        argName="reqarg"
                                        options={cmdArgs}
                                        isMulti={true}
                                        initialValue={""}
                                        setOutputValue={reqArgOutput}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Results table */}
            {filteredCommands.length > 0 ? (
                <TableVirtuoso
                    style={{ height: "70vh" }}
                    data={filteredCommands}
                    computeItemKey={computeItemKey}
                    components={VirtuosoTableComponents}
                    fixedHeaderContent={fixedHeaderContent}
                    itemContent={rowContent}
                    increaseViewportBy={800}
                />
            ) : (
                <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                    No commands match.
                </div>
            )}
        </div>
    );
}


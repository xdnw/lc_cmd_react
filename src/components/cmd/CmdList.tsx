import React, { useCallback, useMemo, useRef, useState } from "react";
import { TableVirtuoso, type TableComponents } from "react-virtuoso";
import { useDebounce } from "use-debounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ListComponent from "@/components/cmd/ListComponent";
import TriStateInput from "@/components/cmd/TriStateInput";
import MarkupRenderer from "@/components/ui/MarkupRenderer";

import { getCharFrequency, simpleSimilarity } from "@/utils/StringUtil";
import type { BaseCommand } from "@/utils/Command";

type CmdFilterMap = Record<string, (cmd: BaseCommand) => boolean>;

const VirtuosoTableComponents: TableComponents<BaseCommand> = {
    Scroller: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
        ({ style, className, ...props }, ref) => (
            <div
                ref={ref}
                {...props}
                style={style}
                className={`overflow-auto ${className ?? ""}`}
            />
        )
    ),
    Table: (props) => <table {...props} className="table-auto w-full" />,
    TableHead: React.forwardRef<
        HTMLTableSectionElement,
        React.HTMLAttributes<HTMLTableSectionElement>
    >((props, ref) => <thead {...props} ref={ref} />),
    TableRow: (props) => <tr {...props} className="align-top" />,
    TableBody: React.forwardRef<
        HTMLTableSectionElement,
        React.HTMLAttributes<HTMLTableSectionElement>
    >((props, ref) => <tbody {...props} ref={ref} />),
};

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

    // Debounce only the text query (custom filters should apply immediately)
    const [debouncedFilter] = useDebounce(filter, 120);
    const isDebouncing = filter !== debouncedFilter;

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

    const customFilterFns = useMemo(() => Object.values(customFilters), [customFilters]);

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

    const onFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);
    }, []);

    const hasRoleOutput = useCallback((_: string, value: string) => {
        setCustomFilters((prev) => {
            const next = { ...prev };
            if (value) {
                const options = new Set(value.split(",").map((s) => s.trim()).filter(Boolean));
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
                    (!!(cmd.command.arguments && Object.values(cmd.command.arguments).length > 0)) ===
                    wantArgs;
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
            <tr className="bg-card">
                <th className="px-4 py-2 text-left">Command</th>
                <th className="px-4 py-2 text-left">Description</th>
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
                    <td className="px-1 py-1 border-2 border-blue-500/50 bg-secondary">
                        <a
                            href={`#command/${path}`}
                            className="font-bold no-underline hover:underline text-blue-600 dark:text-blue-500"
                        >
                            {prefix}
                            {path}
                        </a>
                    </td>
                    <td className="px-1 py-1 border-2 border-blue-500/50 bg-secondary">
                        <MarkupRenderer content={desc} />
                    </td>
                </>
            );
        },
        [prefix]
    );
    const computeItemKey = useCallback((_index: number, cmd: BaseCommand) => cmd.getPathString(),
        []
    );
    return (
        <div>
            <div className="flex w-full items-center pb-1 gap-1">
                <Input
                    className="relative grow"
                    type="search"
                    placeholder="Search for a command..."
                    value={filter}
                    onChange={onFilterChange}
                />
                <Button type="button" size="sm" variant="outline" onClick={toggleFilters}>
                    Filter {showFilters ? "▲" : "▼"}
                </Button>
            </div>

            <div className="text-xs text-muted-foreground pb-1">
                {filteredCommands.length.toLocaleString()} commands
                {isDebouncing ? " (typing…)" : ""}
            </div>

            {filtersInitialized && (
                <div className={`bg-secondary ${showFilters ? "mb-1 p-1 pt-0" : "hidden"}`}>
                    Viewable
                    <CustomTriInput annotation="viewable" set={setCustomFilters} />
                    Whitelisted
                    <CustomTriInput annotation="whitelist" set={setCustomFilters} />
                    Whitelisted Coalition
                    <CustomTriInput annotation="coalition" set={setCustomFilters} />
                    Requires Alliance
                    <CustomTriInput annotation="isalliance" set={setCustomFilters} />
                    Requires API
                    <CustomTriInput annotation="hasapi" set={setCustomFilters} />
                    Requires Offshore
                    <CustomTriInput annotation="hasoffshore" set={setCustomFilters} />
                    Restricted Guild
                    <CustomTriInput annotation="isguild" set={setCustomFilters} />
                    Roles (annotation exists)
                    <CustomTriInput annotation="role" set={setCustomFilters} />

                    {roles.length > 0 && (
                        <>
                            Require Roles (Any)
                            <ListComponent
                                argName="hasrole"
                                options={roles}
                                isMulti={true}
                                initialValue={""}
                                setOutputValue={hasRoleOutput}
                            />
                        </>
                    )}

                    Has Arguments:
                    <TriStateInput argName="hasarg" initialValue="0" setOutputValue={hasArgOutput} />

                    {cmdArgs.length > 0 && (
                        <>
                            Require Arguments (All):
                            <ListComponent
                                argName="reqarg"
                                options={cmdArgs}
                                isMulti={true}
                                initialValue={""}
                                setOutputValue={reqArgOutput}
                            />
                        </>
                    )}
                </div>
            )}

            {/* Virtualized table: full data is available; only DOM rows are virtualized */}
            {filteredCommands.length > 0 ? (
                <TableVirtuoso
                    style={{ height: "70vh" }}
                    data={filteredCommands}
                    computeItemKey={computeItemKey}     // ✅ correct prop for TableVirtuoso
                    components={VirtuosoTableComponents}
                    fixedHeaderContent={fixedHeaderContent}
                    itemContent={rowContent}
                    increaseViewportBy={800}
                />
            ) : (
                <div className="text-sm text-muted-foreground">No commands match.</div>
            )}
        </div>
    );
}

export function CustomTriInput({
    annotation,
    set,
}: {
    annotation: string;
    set: React.Dispatch<React.SetStateAction<CmdFilterMap>>;
}) {
    const handleChange = useCallback(
        (_name: string, value: string) => {
            set((prev) => {
                const next = { ...prev };

                if (value === "1" || value === "-1") {
                    const valueBool = value === "1";

                    next[annotation] = (cmd: BaseCommand) => {
                        // typed boolean property first
                        if (annotation === "viewable") {
                            return (cmd.command.viewable === true) === valueBool;
                        }

                        const ann = cmd.command.annotations?.[annotation];
                        if (typeof ann === "boolean") return ann === valueBool;
                        return (!!ann) === valueBool;
                    };
                } else {
                    delete next[annotation];
                }

                return next;
            });
        },
        [annotation, set]
    );

    return (
        <TriStateInput argName={annotation} initialValue="0" setOutputValue={handleChange} />
    );
}
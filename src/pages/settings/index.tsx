import { useMemo, useState, useCallback, useLayoutEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListItem } from "react-virtuoso";
import { GroupedVirtuoso } from "react-virtuoso";
import { useSession } from "@/components/api/SessionContext";
import { useDialog } from "@/components/layout/DialogContext";
import Loading from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import {
    WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN,
    WINDOW_DYNAMIC_VIRTUOSO_VIEWPORT,
} from "@/components/ui/virtuosoTuning";
import { TABLE } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import type { QueryResult } from "@/lib/BulkQuery";
import type { GuildSettingSubgroup, WebTable } from "@/lib/apitypes";
import SettingEditDialog from "./components/SettingEditDialog";
import SettingsCategorySection, { SettingsCategoryHeader, SettingsSubgroupHeader } from "./components/SettingsCategorySection";
import SettingsTopBar from "./components/SettingsTopBar";
import {
    GUILD_SETTING_COLUMNS,
    SETTINGS_ROW_ITEM_HEIGHT,
    createDefaultSettingsBrowserState,
    deriveSettingsBrowserRows,
    groupRowsByCategory,
    normalizeGuildSettingRows,
    mergeRowIntoTableCache,
    removeRowFromTableCache,
    type SettingRow,
} from "./settingsDomain";
import LoginPickerPage from "../login_picker";

const PAGE_STICKY_TOP_PX = 8;

type VirtualizedSettingsItem =
    | {
        key: string;
        kind: "subgroup";
        category: SettingRow["metadata"]["category"];
        subgroup: SettingRow["metadata"]["subgroup"];
        settingCount: number;
    }
    | {
        key: string;
        kind: "setting";
        row: SettingRow;
        subgroupPosition: "first" | "middle" | "last" | "only";
    };

export default function SettingsPage() {
    const { session } = useSession();
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();
    const [browserState, setBrowserState] = useState(() => createDefaultSettingsBrowserState());
    const [perSettingWarning, setPerSettingWarning] = useState<string | null>(null);
    const [topBarHeight, setTopBarHeight] = useState(0);
    const [stickySubgroupByCategory, setStickySubgroupByCategory] = useState<Record<number, GuildSettingSubgroup | null>>({});
    const topBarRef = useRef<HTMLDivElement | null>(null);

    const listQueryArgs = useMemo(() => {
        return {
            type: "GuildSetting",
            selection_str: "*",
            columns: GUILD_SETTING_COLUMNS,
        };
    }, []);

    const listQuery = useQuery({
        ...(listQueryArgs
            ? bulkQueryOptions(TABLE.endpoint, listQueryArgs)
            : {
                queryKey: ["settings", "disabled"] as const,
                queryFn: async () => {
                    throw new Error("settings query disabled");
                },
            }),
        enabled: Boolean(listQueryArgs),
    });

    const listQueryKey = useMemo(() => {
        if (!listQueryArgs) return undefined;
        return [TABLE.endpoint.name, listQueryArgs] as const;
    }, [listQueryArgs]);

    const normalized = useMemo(() => {
        if (!listQuery.data?.data) {
            return {
                rows: [],
                schemaErrors: [],
                rowParseErrors: [],
                unsupportedInputRows: [],
            };
        }

        return normalizeGuildSettingRows(listQuery.data.data);
    }, [listQuery.data]);

    const browserResult = useMemo(
        () => deriveSettingsBrowserRows(normalized.rows, browserState),
        [browserState, normalized.rows],
    );
    const categoryGroups = useMemo(() => {
        return groupRowsByCategory(browserResult.rows);
    }, [browserResult.rows]);
    const groupCounts = useMemo(
        () => categoryGroups.map((category) => category.subgroups.reduce((count, subgroup) => count + subgroup.rows.length + 1, 0)),
        [categoryGroups],
    );
    const groupedSettingsItems = useMemo(() => {
        return categoryGroups.flatMap((category) => {
            return category.subgroups.flatMap((subgroup) => {
                const subgroupHeader: VirtualizedSettingsItem = {
                    key: `${category.category}:${subgroup.subgroup}:header`,
                    kind: "subgroup",
                    category: category.category,
                    subgroup: subgroup.subgroup,
                    settingCount: subgroup.rows.length,
                };

                const settingItems: VirtualizedSettingsItem[] = subgroup.rows.map((row, index) => ({
                    key: `${category.category}:${subgroup.subgroup}:${row.settingKey}`,
                    kind: "setting",
                    row,
                    subgroupPosition: subgroup.rows.length === 1
                        ? "only"
                        : index === 0
                            ? "first"
                            : index === subgroup.rows.length - 1
                                ? "last"
                                : "middle",
                }));

                return [subgroupHeader, ...settingItems];
            });
        });
    }, [categoryGroups]);

    useLayoutEffect(() => {
        const element = topBarRef.current;
        if (!element) return;

        const updateHeight = () => {
            setTopBarHeight(element.getBoundingClientRect().height);
        };

        updateHeight();

        const observer = new ResizeObserver(() => {
            updateHeight();
        });
        observer.observe(element);
        window.addEventListener("resize", updateHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    const refreshSingleSetting = useCallback(async (settingKey: string) => {
        if (!session?.guild || !listQueryArgs || !listQueryKey) return;

        if (!settingKey) return;

        const singleArgs = {
            type: "GuildSetting",
            selection_str: settingKey,
            columns: GUILD_SETTING_COLUMNS,
        };

        const singleResult = await queryClient.fetchQuery(bulkQueryOptions(TABLE.endpoint, singleArgs));
        const normalizedSingle = normalizeGuildSettingRows(singleResult.data!);

        const updatedRow = normalizedSingle.rows.find((row) => row.settingKey === settingKey) ?? normalizedSingle.rows[0];
        if (!updatedRow) {
            setPerSettingWarning(null);
            queryClient.setQueryData(listQueryKey, (old) => {
                return removeRowFromTableCache({
                    oldResult: old as QueryResult<WebTable> | undefined,
                    settingKey,
                });
            });
            return;
        }

        setPerSettingWarning(null);
        queryClient.setQueryData(listQueryKey, (old) => {
            return mergeRowIntoTableCache({ oldResult: old as QueryResult<WebTable> | undefined, updatedRow });
        });
    }, [session?.guild, listQueryArgs, listQueryKey, queryClient]);

    const openEditDialog = useCallback((row: SettingRow) => {
        showDialog(
            `Edit ${row.settingKey}`,
            <SettingEditDialog row={row} onRefreshSetting={refreshSingleSetting} />,
        );
    }, [showDialog, refreshSingleSetting]);

    const openHelpDialog = useCallback((row: SettingRow) => {
        showDialog(
            row.settingKey,
            <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{row.metadata.argType}</span>
                    <span>{row.metadata.category}</span>
                    <span>{row.metadata.subgroup}</span>
                </div>
                <div className="whitespace-pre-wrap wrap-break-word text-foreground">
                    {row.metadata.helpFull || row.metadata.helpShort}
                </div>
            </div>,
        );
    }, [showDialog]);

    const onRefreshAll = useCallback(() => {
        void listQuery.refetch();
    }, [listQuery]);

    const updateStickySubgroup = useCallback((items: ListItem<VirtualizedSettingsItem>[]) => {
        const firstRecord = items.find((item) => item.type !== "group" && item.data);
        if (!firstRecord || firstRecord.groupIndex == null || !firstRecord.data) {
            return;
        }

        const nextSubgroup = firstRecord.data.kind === "subgroup"
            ? firstRecord.data.subgroup
            : firstRecord.data.row.metadata.subgroup;

        setStickySubgroupByCategory((current) => {
            if (current[firstRecord.groupIndex!] === nextSubgroup) {
                return current;
            }

            return {
                ...current,
                [firstRecord.groupIndex!]: nextSubgroup,
            };
        });
    }, []);

    if (!session?.guild) {
        return <LoginPickerPage />;
    }

    if (listQuery.isLoading) {
        return (
            <div className="py-6">
                <Loading variant="ripple" />
            </div>
        );
    }

    if (listQuery.error) {
        return <div className="text-sm text-destructive">Failed to load settings: {listQuery.error.message}</div>;
    }

    return (
        <div className="space-y-2 pb-6">
            <div ref={topBarRef} className="sticky top-2 z-20">
                <SettingsTopBar
                    browserState={browserState}
                    counts={browserResult.counts}
                    rowParseErrorCount={normalized.rowParseErrors.length}
                    schemaErrorCount={normalized.schemaErrors.length}
                    unsupportedIssues={normalized.unsupportedInputRows}
                    onBrowserStateChange={setBrowserState}
                />
            </div>

            {(normalized.schemaErrors.length > 0 || normalized.rowParseErrors.length > 0) && (
                <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                    {normalized.schemaErrors.map((error) => (
                        <div key={`schema-${error}`}>Schema: {error}</div>
                    ))}
                    {normalized.rowParseErrors.slice(0, 12).map((error) => (
                        <div key={`parse-${error}`}>Parse: {error}</div>
                    ))}
                    {normalized.rowParseErrors.length > 12 && <div>…and {normalized.rowParseErrors.length - 12} more parse errors.</div>}
                </div>
            )}

            {perSettingWarning && (
                <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs space-y-2">
                    <div>{perSettingWarning}</div>
                    <Button size="sm" variant="outline" onClick={onRefreshAll}>
                        Refresh all
                    </Button>
                </div>
            )}

            {groupedSettingsItems.length > 0 ? (
                <GroupedVirtuoso
                    useWindowScroll
                    data={groupedSettingsItems}
                    groupCounts={groupCounts}
                    overscan={WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN}
                    increaseViewportBy={WINDOW_DYNAMIC_VIRTUOSO_VIEWPORT}
                    defaultItemHeight={SETTINGS_ROW_ITEM_HEIGHT}
                    components={{
                        Group: ({ children, style, ...props }) => (
                            <div
                                {...props}
                                style={{
                                    ...style,
                                    top: topBarHeight + PAGE_STICKY_TOP_PX,
                                    zIndex: 9,
                                }}
                            >
                                {children}
                            </div>
                        ),
                    }}
                    itemsRendered={updateStickySubgroup}
                    computeItemKey={(_, item) => item.key}
                    groupContent={(groupIndex) => {
                        const group = categoryGroups[groupIndex];
                        return group ? (
                            <SettingsCategoryHeader
                                category={group.category}
                                stickySubgroup={stickySubgroupByCategory[groupIndex] ?? group.subgroups[0]?.subgroup ?? null}
                            />
                        ) : null;
                    }}
                    itemContent={(_, __, item) => (
                        item.kind === "subgroup"
                            ? (
                                <SettingsSubgroupHeader
                                    category={item.category}
                                    subgroup={item.subgroup}
                                    settingCount={item.settingCount}
                                />
                            )
                            : (
                                <SettingsCategorySection
                                    row={item.row}
                                    subgroupPosition={item.subgroupPosition}
                                    onEdit={openEditDialog}
                                    onShowHelp={openHelpDialog}
                                    onRefreshSetting={refreshSingleSetting}
                                />
                            )
                    )}
                />
            ) : (
                <div className="text-sm text-muted-foreground">
                    {browserResult.counts.totalRows === 0
                        ? "No settings available for this guild selection."
                        : "No settings match the current search and filters."}
                </div>
            )}
        </div>
    );
}

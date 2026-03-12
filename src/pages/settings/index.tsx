import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Virtuoso } from "react-virtuoso";
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
import type { WebTable } from "@/lib/apitypes";
import SettingEditDialog from "./components/SettingEditDialog";
import SettingsCategorySection, { SettingsCategoryHeader, SettingsSubgroupHeader } from "./components/SettingsCategorySection";
import SettingsTopBar from "./components/SettingsTopBar";
import {
    GUILD_SETTING_COLUMNS,
    SETTINGS_ROW_ITEM_HEIGHT,
    createDefaultSettingsBrowserState,
    deriveSettingsBrowserRows,
    hasVisibleSettingsSubgroup,
    normalizeGuildSettingRows,
    mergeRowIntoTableCache,
    removeRowFromTableCache,
    type SettingRow,
} from "./settingsDomain";
import LoginPickerPage from "../login_picker";

export default function SettingsPage() {
    const { session } = useSession();
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();
    const [browserState, setBrowserState] = useState(() => createDefaultSettingsBrowserState());
    const [perSettingWarning, setPerSettingWarning] = useState<string | null>(null);

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
            row.settingKey,
            <SettingEditDialog row={row} onRefreshSetting={refreshSingleSetting} />,
            {
                header: (
                    <div className="space-y-1 pr-8">
                        <div className="wrap-break-word text-base font-semibold tracking-tight text-foreground">{row.settingKey}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                            <span>{row.metadata.category}</span>
                            {hasVisibleSettingsSubgroup(row.metadata.subgroup) && (
                                <>
                                    <span aria-hidden="true">/</span>
                                    <span>{row.metadata.subgroup}</span>
                                </>
                            )}
                            <span aria-hidden="true">/</span>
                            <span>{row.metadata.argType}</span>
                        </div>
                    </div>
                ),
            },
        );
    }, [showDialog, refreshSingleSetting]);

    const openHelpDialog = useCallback((row: SettingRow) => {
        showDialog(
            row.settingKey,
            <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{row.metadata.argType}</span>
                    <span>{row.metadata.category}</span>
                    {hasVisibleSettingsSubgroup(row.metadata.subgroup) && <span>{row.metadata.subgroup}</span>}
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
            <div className="sticky top-2 z-20">
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

            {browserResult.flattenedItems.length > 0 ? (
                <Virtuoso
                    useWindowScroll
                    data={browserResult.flattenedItems}
                    overscan={WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN}
                    increaseViewportBy={WINDOW_DYNAMIC_VIRTUOSO_VIEWPORT}
                    defaultItemHeight={SETTINGS_ROW_ITEM_HEIGHT}
                    computeItemKey={(_, item) => item.key}
                    itemContent={(_, item) => (
                        item.kind === "category"
                            ? (
                                <SettingsCategoryHeader
                                    category={item.category}
                                    settingCount={item.settingCount}
                                />
                            )
                            : item.kind === "subgroup"
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

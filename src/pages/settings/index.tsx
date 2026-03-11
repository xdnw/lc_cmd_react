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
import SettingsCategorySection from "./components/SettingsCategorySection";
import SettingsTopBar from "./components/SettingsTopBar";
import {
    GUILD_SETTING_COLUMNS,
    flattenSettingsRows,
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
    const [showUnavailable, setShowUnavailable] = useState(false);
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

    const filteredRows = useMemo(() => {
        return normalized.rows.filter((row) => showUnavailable || row.flags.isAllowed);
    }, [normalized.rows, showUnavailable]);

    const flattenedRows = useMemo(() => flattenSettingsRows(filteredRows), [filteredRows]);

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
        <div className="space-y-3">
            <SettingsTopBar
                invalidCount={normalized.rows.filter((row) => row.flags.invalid).length}
                unsupportedIssues={normalized.unsupportedInputRows}
                showUnavailable={showUnavailable}
                setShowUnavailable={setShowUnavailable}
            />

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

            {flattenedRows.length > 0 ? (
                <Virtuoso
                    useWindowScroll
                    data={flattenedRows}
                    overscan={WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN}
                    increaseViewportBy={WINDOW_DYNAMIC_VIRTUOSO_VIEWPORT}
                    defaultItemHeight={124}
                    computeItemKey={(_, item) => item.key}
                    itemContent={(_, item) => (
                        <div className="pb-3">
                            <SettingsCategorySection
                                item={item}
                                onEdit={openEditDialog}
                                onRefreshSetting={refreshSingleSetting}
                            />
                        </div>
                    )}
                />
            ) : (
                <div className="text-sm text-muted-foreground">No settings available for this guild selection.</div>
            )}
        </div>
    );
}

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/components/api/SessionContext";
import type { QueryResult } from "@/lib/BulkQuery";
import type { WebTable } from "@/lib/apitypes";
import { TABLE } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { getViewTableUrl } from "@/pages/custom_table/table_util";

import {
    GUILD_SETTING_COLUMNS,
    GUILD_SETTING_TABLE_TYPE,
    GUILD_SETTING_VIEW_TABLE_COLUMNS,
    mergeRowIntoTableCache,
    normalizeGuildSettingRows,
    removeRowFromTableCache,
    type NormalizedSettingsRowsResult,
} from "./settingsDomain";

const EMPTY_NORMALIZED_SETTINGS: NormalizedSettingsRowsResult = {
    rows: [],
    schemaErrors: [],
    rowParseErrors: [],
    unsupportedInputRows: [],
};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    return "Unknown error";
}

export function useGuildSettingsData() {
    const { session } = useSession();
    const queryClient = useQueryClient();

    const listQueryArgs = useMemo(() => ({
        type: GUILD_SETTING_TABLE_TYPE,
        selection_str: "*",
        columns: GUILD_SETTING_COLUMNS,
    }), []);

    const listQueryKey = useMemo(() => [TABLE.endpoint.name, listQueryArgs] as const, [listQueryArgs]);

    const viewTableTo = useMemo(() => getViewTableUrl({
        type: listQueryArgs.type,
        sel: listQueryArgs.selection_str,
        columns: GUILD_SETTING_VIEW_TABLE_COLUMNS,
    }), [listQueryArgs.selection_str, listQueryArgs.type]);

    const listQuery = useQuery({
        ...bulkQueryOptions(TABLE.endpoint, listQueryArgs),
        enabled: Boolean(session?.guild),
    });

    const normalized = useMemo(() => {
        if (!listQuery.data?.data) {
            return EMPTY_NORMALIZED_SETTINGS;
        }

        return normalizeGuildSettingRows(listQuery.data.data);
    }, [listQuery.data]);

    const refreshSingleSetting = useCallback(async (settingKey: string) => {
        if (!session?.guild || !settingKey) {
            return null;
        }

        const singleArgs = {
            type: GUILD_SETTING_TABLE_TYPE,
            selection_str: settingKey,
            columns: GUILD_SETTING_COLUMNS,
        };

        try {
            const singleResult = await queryClient.fetchQuery(bulkQueryOptions(TABLE.endpoint, singleArgs));
            const normalizedSingle = normalizeGuildSettingRows(singleResult.data!);
            const updatedRow = normalizedSingle.rows.find((row) => row.settingKey === settingKey) ?? normalizedSingle.rows[0];

            if (!updatedRow) {
                queryClient.setQueryData(listQueryKey, (old) => {
                    return removeRowFromTableCache({
                        oldResult: old as QueryResult<WebTable> | undefined,
                        settingKey,
                    });
                });
                return null;
            }

            queryClient.setQueryData(listQueryKey, (old) => {
                return mergeRowIntoTableCache({
                    oldResult: old as QueryResult<WebTable> | undefined,
                    updatedRow,
                });
            });
        } catch (error) {
            return `Failed to refresh ${settingKey}: ${getErrorMessage(error)}`;
        }

        return null;
    }, [listQueryKey, queryClient, session?.guild]);

    const refetchAll = useCallback(() => {
        void listQuery.refetch();
    }, [listQuery]);

    return {
        hasGuild: Boolean(session?.guild),
        listQuery,
        normalized,
        viewTableTo,
        refreshSingleSetting,
        refetchAll,
    };
}

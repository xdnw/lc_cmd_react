import { useCallback, useMemo, useRef } from "react";
import { OrderIdx } from './DataTable';
import { getQueryParams } from "../../lib/utils";
import { DEFAULT_TABS } from "../../lib/layouts";
import { getSortFromUrl, getColumnsFromUrl, getSelectionFromUrl, getTypeFromUrl, PlaceholderType } from "./table_util";
import { PlaceholderTabs, PlaceholderTabsHandle } from "@/pages/custom_table/PlaceholderTabs";

import { AbstractTableWithButtons, TableProps } from "@/pages/custom_table/AbstractTable";
import { useDeepState } from "@/utils/StateUtil";


export default function CustomTable() {
    const params = useMemo(() => getQueryParams(), []);


    const [type] = useDeepState<PlaceholderType>(
        getTypeFromUrl(params) ?? "DBNation"
    );
    const [selection] = useDeepState<{ [key: string]: string }>(
        getSelectionFromUrl(params, type)
    );
    const [columns] = useDeepState<Map<string, string | null>>(function () {
        const defaultTab = DEFAULT_TABS[type];
        const firstColumnGroup = Object.keys(defaultTab?.columns ?? {})[0];
        const defaultColumns = firstColumnGroup
            ? defaultTab?.columns[firstColumnGroup]?.value
            : undefined;
        return getColumnsFromUrl(params) ?? new Map(
            (defaultColumns ?? ["{id}"]).map(col => {
                if (Array.isArray(col)) {
                    return [col[0], col[1]];
                } else {
                    return [col, null];
                }
            })
        );
    }());
    const defaultTab = DEFAULT_TABS[type];
    const firstColumnGroup = Object.keys(defaultTab?.columns ?? {})[0];
    const [sort] = useDeepState<OrderIdx | OrderIdx[] | undefined>(
        getSortFromUrl(params) ?? (firstColumnGroup ? defaultTab?.columns[firstColumnGroup]?.sort : undefined)
    );

    const tabsRef = useRef<PlaceholderTabsHandle>(null);

    const getTableProps = useCallback(() => {
        const currentTabs = tabsRef.current;
        const data: TableProps = {
            type: currentTabs?.getType() ?? type,
            selection: currentTabs?.getSelection() ?? selection,
            columns: currentTabs?.getColumns() ?? columns,
            sort: currentTabs?.getSort() ?? sort,
        };
        return data;
    }, [tabsRef, type, selection, columns, sort]);

    const table = useMemo(() => {
        return <div className="themeDiv p-2 mt-2">
            <AbstractTableWithButtons
                getTableProps={getTableProps}
                load={false}
            />
        </div>
    }, [getTableProps]);


    return (
        <>
            <PlaceholderTabs
                ref={tabsRef}
                defType={type}
                defSelection={selection}
                defColumns={columns}
                defSort={sort}
            />
            {table}
        </>
    );
}
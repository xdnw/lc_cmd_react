import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { SquarePen } from "lucide-react";
import { useSession } from "@/components/api/SessionContext";
import { useDialog } from "@/components/layout/DialogContext";
import HierarchySidebarNav, { type HierarchySidebarItem, type HierarchySidebarStatus } from "@/components/layout/HierarchySidebarNav";
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
    type FlattenedSettingsItem,
    getSettingsVisibleContext,
    hasVisibleSettingsSubgroup,
    normalizeGuildSettingRows,
    mergeRowIntoTableCache,
    removeRowFromTableCache,
    type SettingRow,
} from "./settingsDomain";
import LoginPickerPage from "../login_picker";

function SettingsTrackedListItem({
    item,
    showCategorySeparator,
    isHighlighted,
    registerElement,
    onEdit,
    onShowHelp,
    onRefreshSetting,
}: {
    item: FlattenedSettingsItem;
    showCategorySeparator: boolean;
    isHighlighted: boolean;
    registerElement: (key: string, element: HTMLDivElement | null) => void;
    onEdit: (row: SettingRow) => void;
    onShowHelp: (row: SettingRow) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const handleRef = useCallback((element: HTMLDivElement | null) => {
        registerElement(item.key, element);
    }, [item.key, registerElement]);

    return (
        <div ref={handleRef} data-settings-item-key={item.key}>
            {item.kind === "category"
                ? (
                    <SettingsCategoryHeader
                        category={item.category}
                        settingCount={item.settingCount}
                        showSeparator={showCategorySeparator}
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
                        isHighlighted={isHighlighted}
                        onEdit={onEdit}
                        onShowHelp={onShowHelp}
                        onRefreshSetting={onRefreshSetting}
                    />
                )}
        </div>
    );
}

function getSettingsSidebarStatus(item: FlattenedSettingsItem): HierarchySidebarStatus {
    if (item.kind !== "setting") {
        return "default";
    }

    if (!item.row.flags.isAllowed) {
        return "disabled";
    }

    if (item.row.flags.invalid) {
        return "error";
    }

    if (!item.row.editor.inputSupport.supported) {
        return "warning";
    }

    return item.row.value.hasValue ? "set" : "unset";
}

function buildSettingsSidebarItems({
    items,
    activeKey,
    activeCategory,
    activeSubgroup,
    activeSettingKey,
    onSelect,
    onEdit,
}: {
    items: FlattenedSettingsItem[];
    activeKey: string | null;
    activeCategory: string | null;
    activeSubgroup: string | null;
    activeSettingKey: string | null;
    onSelect: (index: number) => void;
    onEdit: (row: SettingRow) => void;
}): HierarchySidebarItem[] {
    return items.map((item, index) => {
        if (item.kind === "category") {
            return {
                id: item.key,
                label: item.category,
                level: 0,
                tone: "section",
                status: "default",
                meta: item.settingCount,
                active: activeKey === item.key,
                inActivePath: activeCategory === item.category,
                onSelect: () => onSelect(index),
            } satisfies HierarchySidebarItem;
        }

        if (item.kind === "subgroup") {
            return {
                id: item.key,
                label: item.subgroup,
                level: 1,
                tone: "subsection",
                status: "default",
                meta: item.settingCount,
                active: activeKey === item.key,
                inActivePath: activeCategory === item.category && activeSubgroup === item.subgroup,
                onSelect: () => onSelect(index),
            } satisfies HierarchySidebarItem;
        }

        const canEdit = item.row.flags.isAllowed && item.row.editor.inputSupport.supported;

        return {
            id: item.key,
            label: item.row.settingKey,
            level: hasVisibleSettingsSubgroup(item.row.metadata.subgroup) ? 2 : 1,
            tone: "item",
            title: `${item.row.settingKey} - ${item.row.metadata.helpShort}`,
            status: getSettingsSidebarStatus(item),
            active: activeKey === item.key,
            inActivePath: activeSettingKey === item.row.settingKey,
            onSelect: () => onSelect(index),
            quickAction: canEdit
                ? {
                    label: `${item.row.value.hasValue ? "Edit" : "Set"} ${item.row.settingKey}`,
                    icon: <SquarePen className="h-3.5 w-3.5" />,
                    onClick: () => onEdit(item.row),
                }
                : undefined,
        } satisfies HierarchySidebarItem;
    });
}

export default function SettingsPage() {
    const { session } = useSession();
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();
    const virtuosoRef = useRef<VirtuosoHandle | null>(null);
    const topBarRef = useRef<HTMLDivElement | null>(null);
    const itemElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [browserState, setBrowserState] = useState(() => createDefaultSettingsBrowserState());
    const [perSettingWarning, setPerSettingWarning] = useState<string | null>(null);
    const [visibleItemKey, setVisibleItemKey] = useState<string | null>(null);
    const [highlightedSettingKey, setHighlightedSettingKey] = useState<string | null>(null);

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

    const itemIndexByKey = useMemo(() => Object.fromEntries(
        browserResult.flattenedItems.map((item, index) => [item.key, index]),
    ) as Record<string, number>, [browserResult.flattenedItems]);

    const registerItemElement = useCallback((key: string, element: HTMLDivElement | null) => {
        itemElementRefs.current[key] = element;
    }, []);

    const updateVisibleItemFromDom = useCallback(() => {
        if (browserResult.flattenedItems.length === 0) {
            setVisibleItemKey((current) => (current === null ? current : null));
            return;
        }

        const stickyBottom = (topBarRef.current?.getBoundingClientRect().bottom ?? 0) + 8;
        const focusLine = stickyBottom + ((window.innerHeight - stickyBottom) / 2);
        const renderedItems = browserResult.flattenedItems
            .map((item) => ({ key: item.key, element: itemElementRefs.current[item.key] }))
            .filter((entry): entry is { key: string; element: HTMLDivElement } => Boolean(entry.element))
            .map((entry) => ({
                key: entry.key,
                element: entry.element,
                rect: entry.element.getBoundingClientRect(),
            }))
            .filter((entry) => entry.rect.height > 0)
            .sort((left, right) => left.rect.top - right.rect.top);

        if (renderedItems.length === 0) {
            return;
        }

        const candidate = renderedItems.find((entry) => entry.rect.top <= focusLine && entry.rect.bottom >= focusLine)
            ?? renderedItems.find((entry) => entry.rect.bottom > stickyBottom)
            ?? renderedItems[renderedItems.length - 1];

        if (!candidate) {
            return;
        }

        setVisibleItemKey((current) => (current === candidate.key ? current : candidate.key));
    }, [browserResult.flattenedItems]);

    useEffect(() => {
        updateVisibleItemFromDom();

        let frameId = 0;
        const scheduleUpdate = () => {
            if (frameId !== 0) {
                return;
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = 0;
                updateVisibleItemFromDom();
            });
        };

        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);

        return () => {
            if (frameId !== 0) {
                window.cancelAnimationFrame(frameId);
            }
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
        };
    }, [updateVisibleItemFromDom]);

    useEffect(() => {
        if (!highlightedSettingKey) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setHighlightedSettingKey((current) => (current === highlightedSettingKey ? null : current));
        }, 1800);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [highlightedSettingKey]);

    const visibleIndex = useMemo(() => {
        if (!visibleItemKey) {
            return 0;
        }

        return itemIndexByKey[visibleItemKey] ?? 0;
    }, [itemIndexByKey, visibleItemKey]);

    const activeItem = useMemo(() => {
        if (browserResult.flattenedItems.length === 0 || visibleIndex < 0) {
            return null;
        }

        return browserResult.flattenedItems[Math.min(visibleIndex, browserResult.flattenedItems.length - 1)] ?? null;
    }, [visibleIndex, browserResult.flattenedItems]);

    const visibleContext = useMemo(
        () => getSettingsVisibleContext(browserResult.flattenedItems, visibleIndex),
        [browserResult.flattenedItems, visibleIndex],
    );

    const setVirtuosoInstance = useCallback((instance: VirtuosoHandle | null) => {
        virtuosoRef.current = instance;
    }, []);

    const scrollToSettingsIndex = useCallback((index: number) => {
        const targetItem = browserResult.flattenedItems[index];
        setVisibleItemKey(targetItem?.key ?? null);
        setHighlightedSettingKey(targetItem?.kind === "setting" ? targetItem.row.settingKey : null);

        virtuosoRef.current?.scrollToIndex({
            index,
            align: "center",
            behavior: "auto",
        });

        window.requestAnimationFrame(() => {
            updateVisibleItemFromDom();
        });
    }, [browserResult.flattenedItems]);

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

    const sidebarItems = useMemo(() => buildSettingsSidebarItems({
        items: browserResult.flattenedItems,
        activeKey: activeItem?.kind === "setting" ? activeItem.key : null,
        activeCategory: visibleContext.category,
        activeSubgroup: visibleContext.subgroup,
        activeSettingKey: activeItem?.kind === "setting" ? activeItem.row.settingKey : null,
        onSelect: scrollToSettingsIndex,
        onEdit: openEditDialog,
    }), [activeItem, browserResult.flattenedItems, openEditDialog, scrollToSettingsIndex, visibleContext.category, visibleContext.subgroup]);

    const getFlattenedItemKey = useCallback((_: number, item: FlattenedSettingsItem) => item.key, []);

    const renderFlattenedItem = useCallback((_: number, item: FlattenedSettingsItem) => (
        <SettingsTrackedListItem
            item={item}
            showCategorySeparator={_ > 0}
            isHighlighted={item.kind === "setting" && highlightedSettingKey === item.row.settingKey}
            registerElement={registerItemElement}
            onEdit={openEditDialog}
            onShowHelp={openHelpDialog}
            onRefreshSetting={refreshSingleSetting}
        />
    ), [highlightedSettingKey, openEditDialog, openHelpDialog, refreshSingleSetting, registerItemElement]);

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
        <div className="pb-6">
            <div className="w-full px-3 sm:px-4">
                {sidebarItems.length > 0 && (
                    <aside className="hidden xl:block">
                        <div
                            className="fixed bottom-0 left-0 z-0"
                            style={{
                                top: "calc(2rem + 1px)",
                                width: "18.5rem",
                            }}
                        >
                            <HierarchySidebarNav
                                ariaLabel="Settings navigation"
                                items={sidebarItems}
                                showHeader={false}
                                className="h-full border-l-0"
                                contentClassName="max-h-full"
                            />
                        </div>
                    </aside>
                )}

                <div className="min-w-0 xl:pl-80">
                    <div className="mx-auto max-w-6xl space-y-2">
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

                        {browserResult.flattenedItems.length > 0 ? (
                            <Virtuoso
                                ref={setVirtuosoInstance}
                                useWindowScroll
                                data={browserResult.flattenedItems}
                                overscan={WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN}
                                increaseViewportBy={WINDOW_DYNAMIC_VIRTUOSO_VIEWPORT}
                                defaultItemHeight={SETTINGS_ROW_ITEM_HEIGHT}
                                computeItemKey={getFlattenedItemKey}
                                itemContent={renderFlattenedItem}
                            />
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                {browserResult.counts.totalRows === 0
                                    ? "No settings available for this guild selection."
                                    : "No settings match the current search and filters."}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

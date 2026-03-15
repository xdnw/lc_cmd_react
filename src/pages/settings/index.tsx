import { useMemo, useState, useCallback, useEffect, useRef, type ChangeEvent, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { SquarePen } from "lucide-react";
import { useLocation } from "react-router-dom";
import SearchBar from "@/components/cmd/SearchBar";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import { useDefaultPageSidebar, usePageSidebar } from "@/components/layout/PageSidebarContext";
import {
    type SidebarNavConfig,
    type SidebarNavItem,
    type SidebarNavStatus,
} from "@/components/layout/SidebarNav";
import Loading from "@/components/ui/loading";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    WINDOW_DYNAMIC_VIRTUOSO_OVERSCAN,
    WINDOW_DYNAMIC_VIRTUOSO_VIEWPORT,
} from "@/components/ui/virtuosoTuning";
import SettingsFlattenedItem from "./components/SettingsFlattenedItem";
import {
    SETTINGS_ROW_ITEM_HEIGHT,
    deriveSettingsBrowserRows,
    type FlattenedSettingsItem,
    getSettingsVisibleContext,
    hasVisibleSettingsSubgroup,
    parseSettingsPageSearchParams,
    type SettingsBrowserCounts,
    type SettingsBrowserState,
    type SettingRow,
    type UnsupportedInputIssue,
} from "./settingsDomain";
import { useGuildSettingsData } from "./useGuildSettingsData";
import { useGuildSettingDialogs } from "./useGuildSettingDialogs";
import LoginPickerPage from "../login_picker";

function SettingsHeaderControls({
    browserState,
    counts,
    rowParseErrorCount,
    schemaErrorCount,
    unsupportedIssues,
    viewTableTo,
    onBrowserStateChange,
}: {
    browserState: SettingsBrowserState;
    counts: SettingsBrowserCounts;
    rowParseErrorCount: number;
    schemaErrorCount: number;
    unsupportedIssues: UnsupportedInputIssue[];
    viewTableTo: string;
    onBrowserStateChange: Dispatch<SetStateAction<SettingsBrowserState>>;
}) {
    const updateState = useCallback((updater: (currentState: SettingsBrowserState) => SettingsBrowserState) => {
        onBrowserStateChange((currentState) => updater(currentState));
    }, [onBrowserStateChange]);

    const showAllAvailability = browserState.availability === "all";
    const onlySet = browserState.hasValue === "only";
    const showInvalid = browserState.invalid === "only";
    const showChannels = browserState.channelType === "only";
    const showUnsupported = browserState.unsupported === "only";
    const unsupportedIssueCount = unsupportedIssues.length;
    const hasWarnings = schemaErrorCount > 0 || rowParseErrorCount > 0 || unsupportedIssueCount > 0;

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const nextQuery = event.target.value;
        updateState((currentState) => ({
            ...currentState,
            query: nextQuery,
            sort: nextQuery.trim() ? "relevance" : "category",
        }));
    }, [updateState]);

    const handleSearchClear = useCallback(() => {
        updateState((currentState) => ({
            ...currentState,
            query: "",
            sort: "category",
        }));
    }, [updateState]);

    const toggleAvailability = useCallback(() => {
        updateState((currentState) => ({
            ...currentState,
            availability: currentState.availability === "all" ? "available" : "all",
        }));
    }, [updateState]);

    const toggleHasValue = useCallback(() => {
        updateState((currentState) => ({
            ...currentState,
            hasValue: currentState.hasValue === "only" ? "all" : "only",
        }));
    }, [updateState]);

    const toggleInvalid = useCallback(() => {
        updateState((currentState) => ({
            ...currentState,
            invalid: currentState.invalid === "only" ? "all" : "only",
        }));
    }, [updateState]);

    const toggleUnsupported = useCallback(() => {
        updateState((currentState) => ({
            ...currentState,
            unsupported: currentState.unsupported === "only" ? "all" : "only",
        }));
    }, [updateState]);

    const toggleChannelType = useCallback(() => {
        updateState((currentState) => ({
            ...currentState,
            channelType: currentState.channelType === "only" ? "all" : "only",
        }));
    }, [updateState]);

    return (
        <div className="space-y-3">
            <div className="grid gap-2 lg:grid-cols-[minmax(18rem,32rem)_minmax(0,1fr)] lg:items-center">
                <SearchBar
                    value={browserState.query}
                    onChange={handleSearchChange}
                    onClear={handleSearchClear}
                    placeholder="Search settings"
                    className="h-7 border-border/70 bg-background px-2 pr-8 text-sm"
                />

                <div className="flex flex-wrap items-center gap-2 lg:justify-between">
                    <div className="overflow-x-auto pb-0.5">
                        <div className="flex w-max min-w-full flex-nowrap items-center gap-1 lg:justify-start">
                            <Button
                                type="button"
                                variant={showAllAvailability ? "default" : "outline"}
                                size="sm"
                                onClick={toggleAvailability}
                            >
                                {showAllAvailability
                                    ? "Show available"
                                    : counts.unavailableRows > 0
                                        ? `Show all (${counts.unavailableRows})`
                                        : "Show all"}
                            </Button>
                            <Button
                                type="button"
                                variant={onlySet ? "default" : "outline"}
                                size="sm"
                                onClick={toggleHasValue}
                            >
                                {onlySet ? "Showing set" : `Show set (${counts.hasValueRows})`}
                            </Button>
                            <Button
                                type="button"
                                variant={showInvalid ? "default" : "outline"}
                                size="sm"
                                onClick={toggleInvalid}
                                disabled={counts.invalidRows === 0 && !showInvalid}
                            >
                                {showInvalid ? `Showing invalid (${counts.invalidRows})` : `Invalid (${counts.invalidRows})`}
                            </Button>
                            <Button
                                type="button"
                                variant={showUnsupported ? "default" : "outline"}
                                size="sm"
                                onClick={toggleUnsupported}
                                disabled={counts.unsupportedRows === 0 && !showUnsupported}
                            >
                                {showUnsupported ? `Showing unsupported (${counts.unsupportedRows})` : `Unsupported (${counts.unsupportedRows})`}
                            </Button>
                            <Button
                                type="button"
                                variant={showChannels ? "default" : "outline"}
                                size="sm"
                                onClick={toggleChannelType}
                                disabled={counts.channelTypeRows === 0 && !showChannels}
                            >
                                {showChannels ? `Showing channels (${counts.channelTypeRows})` : `Channels (${counts.channelTypeRows})`}
                            </Button>
                        </div>
                    </div>

                    <Button variant="outline" size="sm" className="shrink-0" asChild>
                        <ContextPreservingLink to={viewTableTo}>View table</ContextPreservingLink>
                    </Button>
                </div>
            </div>

            {hasWarnings ? (
                <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    {unsupportedIssueCount > 0 && <span>{unsupportedIssueCount} unsupported</span>}
                    {(schemaErrorCount > 0 || rowParseErrorCount > 0) && (
                        <span>{unsupportedIssueCount > 0 ? " | " : ""}{schemaErrorCount + rowParseErrorCount} data warnings</span>
                    )}
                    {unsupportedIssues.length > 0 ? (
                        <div className="mt-1 truncate">
                            {unsupportedIssues.slice(0, 4).map((issue) => issue.settingKey).join(", ")}
                            {unsupportedIssues.length > 4 && `, +${unsupportedIssues.length - 4} more`}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function getSettingsSidebarStatus(item: FlattenedSettingsItem): SidebarNavStatus {
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
}): SidebarNavItem[] {
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
            } satisfies SidebarNavItem;
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
            } satisfies SidebarNavItem;
        }

        const canEdit = item.row.flags.isAllowed;

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
        } satisfies SidebarNavItem;
    });
}

function getSettingsSidebarTriggerValue(activeItem: FlattenedSettingsItem | null): string {
    if (!activeItem) {
        return "Browse settings";
    }

    if (activeItem.kind === "setting") {
        return activeItem.row.settingKey;
    }

    if (activeItem.kind === "category") {
        return activeItem.category;
    }

    return activeItem.subgroup;
}

type SettingsSidebarMode = "settings" | "main";

function SettingsSidebarModeTabs({
    mode,
    isRefreshing,
    onModeChange,
}: {
    mode: SettingsSidebarMode;
    isRefreshing: boolean;
    onModeChange: (mode: SettingsSidebarMode) => void;
}) {
    const handleValueChange = useCallback((nextValue: string) => {
        if (nextValue === "settings" || nextValue === "main") {
            onModeChange(nextValue);
        }
    }, [onModeChange]);

    return (
        <div className="space-y-1">
            <Tabs value={mode} onValueChange={handleValueChange}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="main">App nav</TabsTrigger>
                </TabsList>
            </Tabs>
            {isRefreshing ? <div className="text-[10px] text-muted-foreground">Refreshing</div> : null}
        </div>
    );
}

function buildSettingsSidebarConfig({
    activeItem,
    hasGuild,
    isLoading,
    hasError,
    headerContent,
    items,
}: {
    activeItem: FlattenedSettingsItem | null;
    hasGuild: boolean;
    isLoading: boolean;
    hasError: boolean;
    headerContent: ReactNode;
    items: SidebarNavItem[];
}): SidebarNavConfig {
    return {
        ariaLabel: "Settings navigation",
        layout: "tree",
        headerContent,
        items,
        emptyMessage: !hasGuild
            ? "Select a guild to browse settings."
            : isLoading
                ? "Loading settings navigation..."
                : hasError
                    ? "Failed to load settings navigation."
                    : "No settings available.",
        mobileTriggerLabel: "Settings",
        mobileTriggerValue: getSettingsSidebarTriggerValue(activeItem),
        mobileButtonLabel: "Settings",
        mobileSheetTitle: "Settings",
        mobileSheetSubtitle: "Server configuration",
    };
}

export default function SettingsPage() {
    const location = useLocation();
    const defaultSidebar = useDefaultPageSidebar();
    const virtuosoRef = useRef<VirtuosoHandle | null>(null);
    const searchState = useMemo(() => parseSettingsPageSearchParams(new URLSearchParams(location.search)), [location.search]);
    const [browserState, setBrowserState] = useState<SettingsBrowserState>(() => searchState.browserState);
    const [sidebarMode, setSidebarMode] = useState<SettingsSidebarMode>("settings");
    const [perSettingWarning, setPerSettingWarning] = useState<string | null>(null);
    const [visibleIndex, setVisibleIndex] = useState(0);
    const [highlightedSettingKey, setHighlightedSettingKey] = useState<string | null>(null);
    const [pendingScrollIndex, setPendingScrollIndex] = useState<number | null>(null);
    const [pendingFocusSettingKey, setPendingFocusSettingKey] = useState<string | null>(searchState.focusSettingKey);
    const {
        hasGuild,
        listQuery,
        normalized,
        refetchAll,
        refreshSingleSetting,
        viewTableTo,
    } = useGuildSettingsData();
    const { openEditDialog, openHelpDialog } = useGuildSettingDialogs(refreshSingleSetting);

    const browserResult = useMemo(
        () => deriveSettingsBrowserRows(normalized.rows, browserState),
        [browserState, normalized.rows],
    );

    useEffect(() => {
        if (!searchState.focusSettingKey) {
            return;
        }

        setBrowserState(searchState.browserState);
        setPendingFocusSettingKey(searchState.focusSettingKey);
    }, [searchState]);

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

    const activeIndex = useMemo(() => {
        if (browserResult.flattenedItems.length === 0) {
            return 0;
        }

        return Math.min(visibleIndex, browserResult.flattenedItems.length - 1);
    }, [browserResult.flattenedItems.length, visibleIndex]);

    const activeItem = useMemo(() => {
        if (browserResult.flattenedItems.length === 0) {
            return null;
        }

        return browserResult.flattenedItems[activeIndex] ?? null;
    }, [activeIndex, browserResult.flattenedItems]);

    const visibleContext = useMemo(
        () => getSettingsVisibleContext(browserResult.flattenedItems, activeIndex),
        [activeIndex, browserResult.flattenedItems],
    );

    const setVirtuosoInstance = useCallback((instance: VirtuosoHandle | null) => {
        virtuosoRef.current = instance;
    }, []);

    useEffect(() => {
        if (pendingScrollIndex == null) {
            return;
        }

        if (browserResult.flattenedItems.length === 0) {
            setPendingScrollIndex((current) => (current === pendingScrollIndex ? null : current));
            return;
        }

        const targetIndex = Math.min(pendingScrollIndex, browserResult.flattenedItems.length - 1);
        const frameId = window.requestAnimationFrame(() => {
            virtuosoRef.current?.scrollToIndex({
                index: targetIndex,
                align: "center",
                behavior: "auto",
            });
            setPendingScrollIndex((current) => (current === pendingScrollIndex ? null : current));
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [browserResult.flattenedItems.length, pendingScrollIndex]);

    useEffect(() => {
        if (!pendingFocusSettingKey) {
            return;
        }

        if (
            browserState.query.trim() !== pendingFocusSettingKey
            || browserState.availability !== "all"
            || browserState.sort !== "relevance"
        ) {
            return;
        }

        const targetIndex = browserResult.flattenedItems.findIndex((item) => (
            item.kind === "setting" && item.row.settingKey === pendingFocusSettingKey
        ));

        if (targetIndex >= 0) {
            setVisibleIndex(targetIndex);
            setPendingScrollIndex(targetIndex);
            setHighlightedSettingKey(pendingFocusSettingKey);
            setPendingFocusSettingKey(null);
            setPerSettingWarning((current) => (
                current?.startsWith("Could not focus setting ") ? null : current
            ));
            return;
        }

        if (listQuery.isLoading || listQuery.isFetching) {
            return;
        }

        setPendingFocusSettingKey(null);
        setPerSettingWarning(`Could not focus setting "${pendingFocusSettingKey}" because it was not found in this guild.`);
    }, [browserResult.flattenedItems, browserState.availability, browserState.query, browserState.sort, listQuery.isFetching, listQuery.isLoading, pendingFocusSettingKey]);

    const handleVisibleRangeChanged = useCallback(({ startIndex }: { startIndex: number; endIndex: number }) => {
        setVisibleIndex((current) => (current === startIndex ? current : startIndex));
    }, []);

    const handleSelectSidebarItem = useCallback((index: number) => {
        const targetItem = browserResult.flattenedItems[index];
        if (!targetItem) {
            return;
        }

        setVisibleIndex(index);
        setPendingScrollIndex(index);
        setHighlightedSettingKey(targetItem.kind === "setting" ? targetItem.row.settingKey : null);
    }, [browserResult.flattenedItems]);

    const handleSidebarModeChange = useCallback((nextMode: SettingsSidebarMode) => {
        setSidebarMode(nextMode);
    }, []);

    const handleRefreshSetting = useCallback((settingKey: string) => {
        void refreshSingleSetting(settingKey).then((errorMessage) => {
            setPerSettingWarning(errorMessage);
        });
    }, [refreshSingleSetting]);

    const sidebarItems = useMemo(() => buildSettingsSidebarItems({
        items: browserResult.flattenedItems,
        activeKey: activeItem?.key ?? null,
        activeCategory: visibleContext.category,
        activeSubgroup: visibleContext.subgroup,
        activeSettingKey: activeItem?.kind === "setting" ? activeItem.row.settingKey : null,
        onSelect: handleSelectSidebarItem,
        onEdit: openEditDialog,
    }), [activeItem, browserResult.flattenedItems, handleSelectSidebarItem, openEditDialog, visibleContext.category, visibleContext.subgroup]);

    const sidebarHeaderContent = useMemo(() => (
        <SettingsSidebarModeTabs
            mode={sidebarMode}
            isRefreshing={listQuery.isFetching}
            onModeChange={handleSidebarModeChange}
        />
    ), [handleSidebarModeChange, listQuery.isFetching, sidebarMode]);

    const settingsSidebarConfig = useMemo<SidebarNavConfig>(() => buildSettingsSidebarConfig({
        activeItem,
        hasGuild,
        isLoading: listQuery.isLoading,
        hasError: Boolean(listQuery.error),
        headerContent: sidebarHeaderContent,
        items: sidebarItems,
    }), [activeItem, hasGuild, listQuery.error, listQuery.isLoading, sidebarHeaderContent, sidebarItems]);

    const mainSidebarConfig = useMemo<SidebarNavConfig | null>(() => {
        if (!defaultSidebar) {
            return null;
        }

        return {
            ...defaultSidebar,
            headerContent: sidebarHeaderContent,
        };
    }, [defaultSidebar, sidebarHeaderContent]);

    const activeSidebarConfig = sidebarMode === "settings" ? settingsSidebarConfig : mainSidebarConfig;

    const pageHeaderConfig = useMemo<PageHeaderConfig | null>(() => {
        if (!hasGuild || listQuery.isLoading || listQuery.error) {
            return null;
        }

        return {
            sticky: true,
            title: (
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Guild settings</h1>
                    <span className="text-xs text-muted-foreground">
                        {browserResult.counts.visibleRows} shown of {browserResult.counts.totalRows}
                    </span>
                </div>
            ),
            content: (
                <SettingsHeaderControls
                    browserState={browserState}
                    counts={browserResult.counts}
                    rowParseErrorCount={normalized.rowParseErrors.length}
                    schemaErrorCount={normalized.schemaErrors.length}
                    unsupportedIssues={normalized.unsupportedInputRows}
                    viewTableTo={viewTableTo}
                    onBrowserStateChange={setBrowserState}
                />
            ),
        } satisfies PageHeaderConfig;
    }, [
        browserResult.counts,
        browserState,
        listQuery.error,
        listQuery.isLoading,
        normalized.rowParseErrors.length,
        normalized.schemaErrors.length,
        normalized.unsupportedInputRows,
        hasGuild,
        viewTableTo,
    ]);

    usePageSidebar(activeSidebarConfig);
    usePageHeader(pageHeaderConfig);

    const getFlattenedItemKey = useCallback((_: number, item: FlattenedSettingsItem) => item.key, []);

    const renderFlattenedItem = useCallback((index: number, item: FlattenedSettingsItem) => (
        <SettingsFlattenedItem
            item={item}
            showCategorySeparator={index > 0}
            isHighlighted={item.kind === "setting" && highlightedSettingKey === item.row.settingKey}
            onEdit={openEditDialog}
            onShowHelp={openHelpDialog}
            onRefreshSetting={handleRefreshSetting}
        />
    ), [handleRefreshSetting, highlightedSettingKey, openEditDialog, openHelpDialog]);

    const onRefreshAll = useCallback(() => {
        setPerSettingWarning(null);
        refetchAll();
    }, [refetchAll]);

    if (!hasGuild) {
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
        return (
            <div className="text-sm text-destructive wrap-break-word">
                Failed to load settings: <MarkupRenderer content={listQuery.error.message} />
            </div>
        );
    }

    return (
        <div className="pb-6">
            <div className="w-full px-3 sm:px-4">
                <div className="mx-auto max-w-6xl space-y-2">
                    {(normalized.schemaErrors.length > 0 || normalized.rowParseErrors.length > 0) && (
                        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                            {normalized.schemaErrors.map((error) => (
                                <div key={`schema-${error}`} className="wrap-break-word">
                                    <span className="font-medium">Schema:</span>{" "}
                                    <MarkupRenderer content={error} />
                                </div>
                            ))}
                            {normalized.rowParseErrors.slice(0, 12).map((error) => (
                                <div key={`parse-${error}`} className="wrap-break-word">
                                    <span className="font-medium">Parse:</span>{" "}
                                    <MarkupRenderer content={error} />
                                </div>
                            ))}
                            {normalized.rowParseErrors.length > 12 && <div>…and {normalized.rowParseErrors.length - 12} more parse errors.</div>}
                        </div>
                    )}

                    {perSettingWarning && (
                        <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs space-y-2">
                            <div className="wrap-break-word">
                                <MarkupRenderer content={perSettingWarning} />
                            </div>
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
                            rangeChanged={handleVisibleRangeChanged}
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
    );
}

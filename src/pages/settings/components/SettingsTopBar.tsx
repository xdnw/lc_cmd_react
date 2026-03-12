import { useCallback, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import SearchBar from "@/components/cmd/SearchBar";
import { Button } from "@/components/ui/button";
import type {
    SettingsBrowserCounts,
    SettingsBrowserState,
    UnsupportedInputIssue,
} from "../settingsDomain";

export default function SettingsTopBar({
    browserState,
    counts,
    rowParseErrorCount,
    schemaErrorCount,
    unsupportedIssues,
    onBrowserStateChange,
}: {
    browserState: SettingsBrowserState;
    counts: SettingsBrowserCounts;
    rowParseErrorCount: number;
    schemaErrorCount: number;
    unsupportedIssues: UnsupportedInputIssue[];
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
    const hasWarnings = schemaErrorCount > 0 || rowParseErrorCount > 0 || unsupportedIssues.length > 0;
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
        <section className="border border-border/70 bg-background/95">
            <div className="px-2 py-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Guild settings</h1>
                    <span className="text-xs text-muted-foreground">
                        {counts.visibleRows} shown of {counts.totalRows}
                    </span>
                </div>

                <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(18rem,32rem)_minmax(0,1fr)] lg:items-center">
                    <SearchBar
                        value={browserState.query}
                        onChange={handleSearchChange}
                        onClear={handleSearchClear}
                        placeholder="Search settings"
                        className="h-7 border-border/70 bg-background px-2 pr-8 text-sm"
                    />

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
                            {counts.invalidRows > 0 && (
                                <Button
                                    type="button"
                                    variant={showInvalid ? "default" : "outline"}
                                    size="sm"
                                    onClick={toggleInvalid}
                                >
                                    {showInvalid ? `Showing invalid (${counts.invalidRows})` : `Invalid (${counts.invalidRows})`}
                                </Button>
                            )}
                            {counts.unsupportedRows > 0 && (
                                <Button
                                    type="button"
                                    variant={showUnsupported ? "default" : "outline"}
                                    size="sm"
                                    onClick={toggleUnsupported}
                                >
                                    {showUnsupported ? `Showing unsupported (${counts.unsupportedRows})` : `Unsupported (${counts.unsupportedRows})`}
                                </Button>
                            )}
                            {counts.channelTypeRows > 0 && (
                                <Button
                                    type="button"
                                    variant={showChannels ? "default" : "outline"}
                                    size="sm"
                                    onClick={toggleChannelType}
                                >
                                    {showChannels ? `Showing channels (${counts.channelTypeRows})` : `Channels (${counts.channelTypeRows})`}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {hasWarnings && (
                <div className="border-t border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
                    {counts.unsupportedRows > 0 && <span>{counts.unsupportedRows} unsupported</span>}
                    {(schemaErrorCount > 0 || rowParseErrorCount > 0) && (
                        <span>{counts.unsupportedRows > 0 ? " | " : ""}{schemaErrorCount + rowParseErrorCount} data warnings</span>
                    )}
                    {unsupportedIssues.length > 0 && (
                        <div className="mt-1 truncate">
                            {unsupportedIssues.slice(0, 4).map((issue) => issue.settingKey).join(", ")}
                            {unsupportedIssues.length > 4 && `, +${unsupportedIssues.length - 4} more`}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

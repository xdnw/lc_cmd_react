import type { Dispatch, SetStateAction } from "react";
import Badge from "@/components/ui/badge";
import SearchBar from "@/components/cmd/SearchBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    const updateState = (updater: (currentState: SettingsBrowserState) => SettingsBrowserState) => {
        onBrowserStateChange((currentState) => updater(currentState));
    };

    const showUnavailable = browserState.availability === "all";
    const onlySet = browserState.hasValue === "only";
    const showInvalid = browserState.invalid === "only";
    const showChannels = browserState.channelType === "only";

    return (
        <Card className="border-border/70 bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/88">
            <CardHeader className="gap-1 px-1.5 py-1.5">
                <div className="flex flex-wrap items-center gap-1">
                    <CardTitle>Guild settings</CardTitle>
                    <span className="text-xs text-muted-foreground">
                        {counts.visibleRows} shown / {counts.totalRows} total
                    </span>
                </div>
                <div className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <SearchBar
                        value={browserState.query}
                        onChange={(event) => {
                            const nextQuery = event.target.value;
                            updateState((currentState) => ({
                                ...currentState,
                                query: nextQuery,
                                sort: nextQuery.trim() ? "relevance" : "category",
                            }));
                        }}
                        onClear={() => {
                            updateState((currentState) => ({
                                ...currentState,
                                query: "",
                                sort: "category",
                            }));
                        }}
                        placeholder="Search settings"
                        className="h-6 px-1.5 pr-7 text-xs"
                    />
                    <div className="overflow-x-auto pb-0.5">
                        <div className="flex w-max min-w-full flex-nowrap items-center gap-1">
                            <Button
                                type="button"
                                variant={showUnavailable ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateState((currentState) => ({
                                    ...currentState,
                                    availability: currentState.availability === "all" ? "available" : "all",
                                }))}
                            >
                                {showUnavailable
                                    ? "Show available"
                                    : counts.unavailableRows > 0
                                        ? `Show all (${counts.unavailableRows} unavailable)`
                                        : "Show all"}
                            </Button>
                            <Button
                                type="button"
                                variant={onlySet ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateState((currentState) => ({
                                    ...currentState,
                                    hasValue: currentState.hasValue === "only" ? "all" : "only",
                                }))}
                            >
                                {onlySet ? "Showing only set" : `Show only set (${counts.hasValueRows})`}
                            </Button>
                            {counts.invalidRows > 0 && (
                                <Button
                                    type="button"
                                    variant={showInvalid ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => updateState((currentState) => ({
                                        ...currentState,
                                        invalid: currentState.invalid === "only" ? "all" : "only",
                                    }))}
                                >
                                    {showInvalid ? `Showing invalid (${counts.invalidRows})` : `Show invalid (${counts.invalidRows})`}
                                </Button>
                            )}
                            {counts.channelTypeRows > 0 && (
                                <Button
                                    type="button"
                                    variant={showChannels ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => updateState((currentState) => ({
                                        ...currentState,
                                        channelType: currentState.channelType === "only" ? "all" : "only",
                                    }))}
                                >
                                    {showChannels ? `Showing channels (${counts.channelTypeRows})` : `Show channels (${counts.channelTypeRows})`}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-1 px-1.5 pb-1.5 pt-0">
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {counts.unsupportedRows > 0 && <Badge variant="destructive">{counts.unsupportedRows} unsupported</Badge>}
                    {(schemaErrorCount > 0 || rowParseErrorCount > 0) && (
                        <Badge variant="destructive">{schemaErrorCount + rowParseErrorCount} data warnings</Badge>
                    )}
                </div>

                {unsupportedIssues.length > 0 && (
                    <div className="rounded border border-destructive/40 bg-destructive/10 p-1 text-xs">
                        <div className="mb-0.5 font-medium text-destructive">Unsupported web inputs need follow-up fixes</div>
                        <ul className="space-y-0.5 text-muted-foreground">
                            {unsupportedIssues.slice(0, 8).map((issue) => (
                                <li key={issue.settingKey}>
                                    {issue.settingKey}: {issue.reason}
                                </li>
                            ))}
                            {unsupportedIssues.length > 8 && <li>...and {unsupportedIssues.length - 8} more</li>}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

import { useCallback, useMemo, useState, type ReactNode } from "react";

import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Loading from "@/components/ui/loading";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import { cn } from "@/lib/utils";
import LoginPickerPage from "@/pages/login_picker";

import {
    flattenSettingsRows,
    type SettingKey,
} from "../settingsDomain";
import { useGuildSettingsData } from "../useGuildSettingsData";
import { useGuildSettingDialogs } from "../useGuildSettingDialogs";
import SettingsFlattenedItem from "./SettingsFlattenedItem";

function formatPlural(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

export default function GuildSettingsSubset({
    title,
    description,
    settings,
    emptyMessage = "No matching settings are available for this guild.",
    className,
    headerContent,
    renderAs = "card",
    showAvailabilitySummary = true,
}: {
    title: string;
    description?: ReactNode;
    settings: readonly SettingKey[];
    emptyMessage?: string;
    className?: string;
    headerContent?: ReactNode;
    renderAs?: "card" | "section";
    showAvailabilitySummary?: boolean;
}) {
    const [warning, setWarning] = useState<string | null>(null);
    const {
        hasGuild,
        listQuery,
        normalized,
        refetchAll,
        refreshSingleSetting,
        viewTableTo,
    } = useGuildSettingsData();

    const settingsSet = useMemo(() => new Set<string>(settings), [settings]);
    const filteredRows = useMemo(
        () => normalized.rows.filter((row) => settingsSet.has(row.settingKey)),
        [normalized.rows, settingsSet],
    );
    const flattenedItems = useMemo(() => flattenSettingsRows(filteredRows), [filteredRows]);
    const visibleSettingKeys = useMemo(() => new Set(filteredRows.map((row) => row.settingKey)), [filteredRows]);
    const missingSettings = useMemo(
        () => settings.filter((settingKey) => !visibleSettingKeys.has(settingKey)),
        [settings, visibleSettingKeys],
    );

    const handleRefreshSetting = useCallback((settingKey: string) => {
        void refreshSingleSetting(settingKey).then((errorMessage) => {
            setWarning(errorMessage);
        });
    }, [refreshSingleSetting]);

    const { openEditDialog, openHelpDialog } = useGuildSettingDialogs(handleRefreshSetting);
    const renderedDescription = useMemo(() => {
        if (typeof description === "string") {
            return <MarkupRenderer content={description} />;
        }

        return description;
    }, [description]);

    const handleRefreshAll = useCallback(() => {
        setWarning(null);
        refetchAll();
    }, [refetchAll]);

    if (!hasGuild) {
        return <LoginPickerPage />;
    }

    const header = (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                {renderedDescription ? <div className="max-w-3xl text-sm leading-6 text-muted-foreground wrap-break-word">{renderedDescription}</div> : null}
                {showAvailabilitySummary ? (
                    <div className="text-[11px] text-muted-foreground">
                        {formatPlural(filteredRows.length, "setting")}
                        {missingSettings.length > 0 ? ` shown, ${missingSettings.length} unavailable in this guild` : " available in this guild"}
                    </div>
                ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {headerContent}
                <Button type="button" variant="outline" size="sm" onClick={handleRefreshAll}>
                    Refresh
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                    <ContextPreservingLink to="/settings">Open settings</ContextPreservingLink>
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                    <ContextPreservingLink to={viewTableTo}>View table</ContextPreservingLink>
                </Button>
            </div>
        </div>
    );

    const content = (
        <div className="space-y-3">
            {warning ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
                    <div className="wrap-break-word">
                        <MarkupRenderer content={warning} />
                    </div>
                </div>
            ) : null}

            {normalized.schemaErrors.length > 0 || normalized.rowParseErrors.length > 0 ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {normalized.schemaErrors.length > 0 ? `${normalized.schemaErrors.length} schema issue(s)` : null}
                    {normalized.schemaErrors.length > 0 && normalized.rowParseErrors.length > 0 ? " | " : null}
                    {normalized.rowParseErrors.length > 0 ? `${normalized.rowParseErrors.length} row parse issue(s)` : null}
                </div>
            ) : null}

            {missingSettings.length > 0 ? (
                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Missing from this guild: {missingSettings.join(", ")}
                </div>
            ) : null}

            {listQuery.isLoading ? (
                <div className="py-4">
                    <Loading variant="ripple" />
                </div>
            ) : listQuery.error ? (
                <div className="text-sm text-destructive wrap-break-word">
                    Failed to load settings: <MarkupRenderer content={listQuery.error.message} />
                </div>
            ) : flattenedItems.length > 0 ? (
                <div className="space-y-1.5">
                    {flattenedItems.map((item, index) => (
                        <SettingsFlattenedItem
                            key={item.key}
                            item={item}
                            showCategorySeparator={index > 0}
                            isHighlighted={false}
                            onEdit={openEditDialog}
                            onShowHelp={openHelpDialog}
                            onRefreshSetting={handleRefreshSetting}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-sm text-muted-foreground">{emptyMessage}</div>
            )}
        </div>
    );

    if (renderAs === "section") {
        return (
            <section className={cn("space-y-3", className)}>
                {header}
                {content}
            </section>
        );
    }

    return (
        <Card className={className}>
            <div className="space-y-3 p-4">
                {header}
                {content}
            </div>
        </Card>
    );
}

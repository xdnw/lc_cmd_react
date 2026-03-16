import type { ReactNode } from "react";

import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Loading from "@/components/ui/loading";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import { cn } from "@/lib/utils";

import type {
    FlattenedSettingsItem,
    SettingRow,
    SettingsSubsetModel,
} from "../settingsDomain";
import SettingsFlattenedItem from "./SettingsFlattenedItem";

function formatPlural(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

export default function SettingsSubsetSection({
    title,
    description,
    subset,
    emptyMessage = "No matching settings are available for this guild.",
    className,
    headerContent,
    renderAs = "card",
    showAvailabilitySummary = true,
    warning,
    schemaErrorCount,
    rowParseErrorCount,
    isLoading,
    error,
    onRefreshAll,
    onRefreshSetting,
    onEdit,
    onShowHelp,
    viewTableTo,
    renderItem,
}: {
    title: string;
    description?: ReactNode;
    subset: SettingsSubsetModel;
    emptyMessage?: string;
    className?: string;
    headerContent?: ReactNode;
    renderAs?: "card" | "section";
    showAvailabilitySummary?: boolean;
    warning?: string | null;
    schemaErrorCount: number;
    rowParseErrorCount: number;
    isLoading: boolean;
    error?: Error | null;
    onRefreshAll: () => void;
    onRefreshSetting: (settingKey: string) => void;
    onEdit: (row: SettingRow) => void;
    onShowHelp: (row: SettingRow) => void;
    viewTableTo: string;
    renderItem?: (params: { item: FlattenedSettingsItem; index: number; defaultNode: ReactNode }) => ReactNode;
}) {
    const renderedDescription = typeof description === "string"
        ? <MarkupRenderer content={description} />
        : description;

    const header = (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                {renderedDescription ? <div className="max-w-3xl text-sm leading-6 text-muted-foreground wrap-break-word">{renderedDescription}</div> : null}
                {showAvailabilitySummary ? (
                    <div className="text-[11px] text-muted-foreground">
                        {formatPlural(subset.presentRows.length, "setting")}
                        {subset.missingKeys.length > 0 ? ` shown, ${subset.missingKeys.length} unavailable in this guild` : " available in this guild"}
                    </div>
                ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {headerContent}
                <Button type="button" variant="outline" size="sm" onClick={onRefreshAll}>
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

            {schemaErrorCount > 0 || rowParseErrorCount > 0 ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {schemaErrorCount > 0 ? `${schemaErrorCount} schema issue(s)` : null}
                    {schemaErrorCount > 0 && rowParseErrorCount > 0 ? " | " : null}
                    {rowParseErrorCount > 0 ? `${rowParseErrorCount} row parse issue(s)` : null}
                </div>
            ) : null}

            {subset.missingKeys.length > 0 ? (
                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Missing from this guild: {subset.missingKeys.join(", ")}
                </div>
            ) : null}

            {isLoading ? (
                <div className="py-4">
                    <Loading variant="ripple" />
                </div>
            ) : error ? (
                <div className="text-sm text-destructive wrap-break-word">
                    Failed to load settings: <MarkupRenderer content={error.message} />
                </div>
            ) : subset.flattenedItems.length > 0 ? (
                <div className="space-y-1.5">
                    {subset.flattenedItems.map((item, index) => {
                        const defaultNode = (
                            <SettingsFlattenedItem
                                key={item.key}
                                item={item}
                                showCategorySeparator={index > 0}
                                isHighlighted={false}
                                onEdit={onEdit}
                                onShowHelp={onShowHelp}
                                onRefreshSetting={onRefreshSetting}
                            />
                        );

                        return renderItem
                            ? renderItem({ item, index, defaultNode })
                            : defaultNode;
                    })}
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

import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCallback, type ReactNode } from "react";
import { hasVisibleSettingsSubgroup, type SettingRow } from "../settingsDomain";
import SettingClearAction from "./SettingClearAction";
import { getSettingTypeToneStyle } from "./settingsVisuals";

function summarizeValue(valueText: string, hasValue: boolean): string {
    const normalized = valueText.trim();
    if (!hasValue) {
        return "Unset";
    }

    return normalized || "Empty value";
}

function SettingHoverTooltip({
    content,
    disabled = false,
    children,
    className,
}: {
    content: ReactNode;
    disabled?: boolean;
    children: ReactNode;
    className?: string;
}) {
    if (disabled) {
        return <>{children}</>;
    }

    return (
        <Tooltip>
            <TooltipTrigger className={cn("block w-full text-left", className)}>
                {children}
            </TooltipTrigger>
            <TooltipContent className="max-w-[min(42rem,calc(100vw-2rem))] whitespace-pre-wrap wrap-break-word text-xs leading-5">
                {content}
            </TooltipContent>
        </Tooltip>
    );
}

export default function SettingRow({
    row,
    subgroupPosition,
    isHighlighted = false,
    onEdit,
    onShowHelp,
    onRefreshSetting,
}: {
    row: SettingRow;
    subgroupPosition: "first" | "middle" | "last" | "only";
    isHighlighted?: boolean;
    onEdit: (row: SettingRow) => void;
    onShowHelp: (row: SettingRow) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const isUnsupported = !row.editor.inputSupport.supported;
    const unavailableReason = !row.flags.isAllowed ? row.flags.availabilityReason : undefined;
    const valueSummary = summarizeValue(row.value.displayText, row.value.hasValue);
    const hasMoreHelp = row.metadata.helpFull.trim() !== row.metadata.helpShort.trim();
    const subgroupVisible = hasVisibleSettingsSubgroup(row.metadata.subgroup);
    const canEdit = row.flags.isAllowed;
    const helpTooltipText = row.metadata.helpFull || row.metadata.helpShort;
    const showHelpTooltip = helpTooltipText.trim().length > 0;
    const valueTooltipText = row.value.displayText || row.value.rawText || valueSummary;
    const showValueTooltip = row.value.hasValue && (valueTooltipText.includes("\n") || valueTooltipText.length > 120);

    const handleEdit = useCallback(() => onEdit(row), [onEdit, row]);
    const handleRefreshSetting = useCallback(
        () => onRefreshSetting(row.settingKey),
        [onRefreshSetting, row.settingKey],
    );
    const handleShowHelp = useCallback(() => onShowHelp(row), [onShowHelp, row]);

    const typeToneStyle = getSettingTypeToneStyle(row.metadata.argType);
    const rowSpacingClass = subgroupPosition === "last" || subgroupPosition === "only" ? "mb-0" : "mb-1";
    const detailNotes = [
        subgroupVisible
            ? { key: `subgroup-${row.metadata.subgroup}`, content: row.metadata.subgroup, useMarkup: false }
            : null,
        ...row.rowParseErrors.map((error, index) => ({
            key: `parse-${index}`,
            content: error,
            useMarkup: true,
        })),
        isUnsupported
            ? {
                key: "unsupported",
                content: row.editor.inputSupport.reason ?? "Unsupported web input",
                useMarkup: true,
            }
            : null,
        unavailableReason
            ? { key: "unavailable", content: unavailableReason, useMarkup: true }
            : null,
    ].filter((note): note is { key: string; content: string; useMarkup: boolean } => Boolean(note));

    return (
        <div
            className={[
                rowSpacingClass,
                "rounded-sm border bg-background px-2 py-1.5 transition-[border-color,box-shadow,background-color] duration-300",
                isHighlighted
                    ? "border-primary/55 bg-primary/6 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14)]"
                    : "border-border/65",
            ].join(" ")}
        >
            <div className="grid gap-x-3 gap-y-1.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(12rem,0.95fr)_auto] lg:items-start">
                <div className="min-w-0 space-y-0.75">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <div className="min-w-0 text-[13px] font-semibold tracking-tight wrap-break-word text-foreground">{row.settingKey}</div>
                        <span
                            className="rounded-sm border px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground"
                            style={typeToneStyle}
                        >
                            {row.metadata.argType}
                        </span>
                        {row.flags.invalid && <Badge variant="destructive">Invalid</Badge>}
                        {!row.flags.isAllowed && <Badge variant="outline">Unavailable</Badge>}
                        {!row.value.hasValue && <Badge variant="outline">Unset</Badge>}
                        {isUnsupported && <Badge variant="outline">Unsupported</Badge>}
                    </div>

                    <div className="space-y-0.5">
                        <SettingHoverTooltip
                            content={(
                                <div className="text-foreground">
                                    <MarkupRenderer content={helpTooltipText} disableLinkTabStops />
                                </div>
                            )}
                            disabled={!showHelpTooltip}
                        >
                            <div className="line-clamp-2 text-[11px] leading-4.5 text-muted-foreground">
                                <MarkupRenderer content={row.metadata.helpShort} disableLinkTabStops />
                                {hasMoreHelp && (
                                    <>
                                        {" "}
                                        <button
                                            type="button"
                                            className="font-medium text-foreground underline decoration-border underline-offset-2"
                                            onClick={handleShowHelp}
                                        >
                                            Show more
                                        </button>
                                    </>
                                )}
                            </div>
                        </SettingHoverTooltip>
                        {detailNotes.length > 0 && (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] leading-4 text-muted-foreground">
                                {detailNotes.map((note) => (
                                    <span key={note.key} className="wrap-break-word">
                                        {note.useMarkup
                                            ? <MarkupRenderer content={note.content} />
                                            : note.content}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="min-w-0 text-left">
                    {row.value.hasValue ? (
                        <SettingHoverTooltip content={valueTooltipText} disabled={!showValueTooltip}>
                            <div className="w-full rounded-sm border border-border/60 bg-muted/15 px-2 py-1.5 text-left text-[12px] leading-5 text-foreground wrap-break-word line-clamp-3">
                                {valueSummary}
                            </div>
                        </SettingHoverTooltip>
                    ) : (
                        <div className="w-full rounded-sm border border-border/60 bg-muted/10 px-2 py-1.5 text-left text-[12px] leading-5 text-muted-foreground">
                            Unset
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-start justify-start gap-1.5 lg:justify-end">
                    {canEdit && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEdit}
                            >
                                {row.value.hasValue ? "Edit" : "Set"}
                            </Button>
                            <SettingClearAction
                                settingKey={row.settingKey}
                                hasValue={row.value.hasValue}
                                onSuccess={handleRefreshSetting}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { hasVisibleSettingsSubgroup, type SettingRow } from "../settingsDomain";
import SettingClearAction from "./SettingClearAction";
import { getSettingRowStateClasses, getSettingTypeToneStyle, getSubgroupTone } from "./settingsVisuals";

function summarizeValue(valueText: string, hasValue: boolean): string {
    const normalized = valueText.trim();
    if (!hasValue) {
        return "Unset";
    }

    return normalized || "Empty value";
}

export default function SettingRow({
    row,
    subgroupPosition,
    onEdit,
    onShowHelp,
    onRefreshSetting,
}: {
    row: SettingRow;
    subgroupPosition: "first" | "middle" | "last" | "only";
    onEdit: (row: SettingRow) => void;
    onShowHelp: (row: SettingRow) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const isUnsupported = !row.editor.inputSupport.supported;
    const unavailableReason = !row.flags.isAllowed ? "Unavailable in current guild context" : undefined;
    const valueSummary = summarizeValue(row.value.displayText, row.value.hasValue);
    const hasMoreHelp = row.metadata.helpFull.trim() !== row.metadata.helpShort.trim();
    const subgroupVisible = hasVisibleSettingsSubgroup(row.metadata.subgroup);

    const handleEdit = useCallback(() => onEdit(row), [onEdit, row]);
    const handleRefreshSetting = useCallback(
        () => onRefreshSetting(row.settingKey),
        [onRefreshSetting, row.settingKey],
    );
    const handleShowHelp = useCallback(() => onShowHelp(row), [onShowHelp, row]);

    const subgroupTone = getSubgroupTone(row.metadata.subgroup);
    const stateTone = getSettingRowStateClasses({
        invalid: row.flags.invalid,
        unavailable: !row.flags.isAllowed,
        unset: !row.value.hasValue,
        unsupported: isUnsupported,
    });
    const typeToneStyle = getSettingTypeToneStyle(row.metadata.argType);
    const rowSpacingClass = subgroupPosition === "last" || subgroupPosition === "only" ? "mb-0" : "mb-1.5";

    return (
        <div
            className={`${rowSpacingClass} rounded-sm border border-border/70 px-2.5 py-2 ${stateTone.background}`}
        >
            <div className="grid gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(12rem,0.9fr)_auto] lg:items-start">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 text-sm font-semibold tracking-tight wrap-break-word">{row.settingKey}</div>
                        <span
                            className="rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none"
                            style={typeToneStyle}
                        >
                            {row.metadata.argType}
                        </span>
                        {row.flags.invalid && <Badge variant="destructive">Invalid</Badge>}
                        {!row.flags.isAllowed && <Badge variant="secondary">Unavailable</Badge>}
                        {!row.value.hasValue && <Badge variant="secondary">Unset</Badge>}
                        {isUnsupported && <Badge variant="destructive">Unsupported</Badge>}
                    </div>

                    <div className="flex items-start gap-2 text-[11px] leading-4.5 text-muted-foreground">
                        {subgroupVisible && (
                            <div className="mt-0.5 h-4 w-0.5 shrink-0 rounded-full" style={subgroupTone.railStyle} />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="wrap-break-word whitespace-pre-wrap">
                                {row.metadata.helpShort}
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
                            {row.rowParseErrors.length > 0 && (
                                <div className="mt-1 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                                    {row.rowParseErrors.join("; ")}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="min-w-0 text-left">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Current value</div>
                    {row.value.hasValue ? (
                        <div className={`w-full rounded-sm border border-border/60 bg-background px-2 py-1.5 text-left text-[13px] leading-5 wrap-break-word ${stateTone.value}`}>
                            {valueSummary}
                        </div>
                    ) : (
                        <div className="w-full rounded-sm border border-amber-500/30 bg-amber-500/8 px-2 py-1.5 text-left text-[11px] font-medium text-amber-800 dark:text-amber-200">
                            No value set
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-start justify-start gap-1.5 lg:justify-end">
                    {!unavailableReason && !isUnsupported && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEdit}
                            >
                                Edit
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

            {isUnsupported && (
                <div className="mt-1 text-xs text-destructive">{row.editor.inputSupport.reason}</div>
            )}
            {unavailableReason && <div className="mt-1 text-xs text-destructive">{unavailableReason}</div>}
        </div>
    );
}

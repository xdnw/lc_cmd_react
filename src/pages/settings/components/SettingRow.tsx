import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import type { SettingRow } from "../settingsDomain";
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

    const rowShellClassName = subgroupPosition === "last" || subgroupPosition === "only"
        ? `rounded-b-md border-r border-b px-2 py-1 ${stateTone.background}`
        : `border-r border-b px-2 py-1 ${stateTone.background}`;

    return (
        <div
            className={`${rowShellClassName} border-l-2 ${stateTone.leftAccent}`}
            style={{
                borderRightColor: subgroupTone.borderColor,
                borderBottomColor: subgroupTone.borderColor,
            }}
        >
            <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_auto] sm:items-start">
                <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 text-sm font-medium wrap-break-word">{row.settingKey}</div>
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

                    <div className="flex items-start gap-2">
                        <div className="mt-0.5 h-4 w-0.5 shrink-0 rounded-full" style={subgroupTone.railStyle} />
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] leading-4.5 text-muted-foreground wrap-break-word whitespace-pre-wrap">
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
                    {row.value.hasValue ? (
                        <div className={`w-full rounded-sm border border-border/50 bg-background/75 px-2 py-1 text-left text-[13px] wrap-break-word ${stateTone.value}`}>
                            {valueSummary}
                        </div>
                    ) : (
                        <div className="w-full rounded px-1.5 py-0.5 text-left text-[10px] font-medium bg-amber-500/14 text-amber-800 dark:text-amber-200">
                            No value set
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-start justify-start gap-1.5">
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

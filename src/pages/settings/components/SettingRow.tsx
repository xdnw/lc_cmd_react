import LazyExpander from "@/components/ui/LazyExpander";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import type { SettingRow } from "../settingsDomain";
import SettingClearAction from "./SettingClearAction";

export default function SettingRow({
    row,
    onEdit,
    onRefreshSetting,
}: {
    row: SettingRow;
    onEdit: (row: SettingRow) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const isUnsupported = !row.editor.inputSupport.supported;
    const unavailableReason = !row.flags.isAllowed ? "Unavailable in current guild context" : undefined;

    const handleEdit = useCallback(() => onEdit(row), [onEdit, row]);
    const handleRefreshSetting = useCallback(
        () => onRefreshSetting(row.settingKey),
        [onRefreshSetting, row.settingKey],
    );

    return (
        <div className="rounded border border-border p-2 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-sm font-medium wrap-break-word">{row.settingKey}</div>
                    <div className="text-xs text-muted-foreground wrap-break-word">{row.metadata.argType}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1 justify-end">
                    {row.flags.invalid && <Badge variant="destructive">Invalid</Badge>}
                    {row.flags.isChannelType && <Badge variant="outline">Channel</Badge>}
                    {!row.value.hasValue && <Badge variant="secondary">Unset</Badge>}
                    {isUnsupported && <Badge variant="destructive">Unsupported web input</Badge>}
                </div>
            </div>

            <div className="text-xs wrap-break-word">
                <span className="text-muted-foreground">Value:</span> {row.value.displayText || "(empty)"}
            </div>

            <div className="text-xs text-muted-foreground wrap-break-word">{row.metadata.helpShort}</div>

            {row.metadata.helpFull && row.metadata.helpFull !== row.metadata.helpShort && (
                <LazyExpander
                    className="h-7! py-0!"
                    content={<div className="text-xs whitespace-pre-wrap wrap-break-word">{row.metadata.helpFull}</div>}
                    hideTriggerChildrenWhenExpanded
                >
                    <span className="text-xs">Show full help</span>
                </LazyExpander>
            )}

            {row.rowParseErrors.length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {row.rowParseErrors.join("; ")}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {unavailableReason ? (
                    <div className="text-xs text-destructive">{unavailableReason}</div>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEdit}
                            disabled={isUnsupported}
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

            {isUnsupported && (
                <div className="text-xs text-destructive">{row.editor.inputSupport.reason}</div>
            )}
        </div>
    );
}

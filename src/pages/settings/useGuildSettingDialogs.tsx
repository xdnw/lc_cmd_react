import { useCallback } from "react";

import { useDialog } from "@/components/layout/DialogContext";
import MarkupRenderer from "@/components/ui/MarkupRenderer";

import { hasVisibleSettingsSubgroup, type SettingRow } from "./settingsDomain";
import SettingClearAction from "./components/SettingClearAction";
import SettingEditDialog from "./components/SettingEditDialog";

function SettingClearDialogContent({
    row,
    onRefreshSetting,
}: {
    row: SettingRow;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const handleClearSuccess = useCallback(() => {
        onRefreshSetting(row.settingKey);
    }, [onRefreshSetting, row.settingKey]);

    return (
        <div className="space-y-3 text-sm">
            <p className="text-foreground/80">
                Clear the current value for <span className="font-medium text-foreground">{row.settingKey}</span>?
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <SettingClearAction
                    settingKey={row.settingKey}
                    hasValue={row.value.hasValue}
                    onSuccess={handleClearSuccess}
                />
            </div>
        </div>
    );
}

export function useGuildSettingDialogs(onRefreshSetting: (settingKey: string) => void) {
    const { showDialog } = useDialog();

    const openEditDialog = useCallback((row: SettingRow) => {
        showDialog(
            row.settingKey,
            <SettingEditDialog row={row} onRefreshSetting={onRefreshSetting} />,
            {
                header: (
                    <div className="space-y-1 pr-8">
                        <div className="wrap-break-word text-base font-semibold tracking-tight text-foreground">{row.settingKey}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                            <span>{row.metadata.category}</span>
                            {hasVisibleSettingsSubgroup(row.metadata.subgroup) ? (
                                <>
                                    <span aria-hidden="true">/</span>
                                    <span>{row.metadata.subgroup}</span>
                                </>
                            ) : null}
                            <span aria-hidden="true">/</span>
                            <span>{row.metadata.argType}</span>
                        </div>
                    </div>
                ),
            },
        );
    }, [onRefreshSetting, showDialog]);

    const openHelpDialog = useCallback((row: SettingRow) => {
        showDialog(
            row.settingKey,
            <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{row.metadata.argType}</span>
                    <span>{row.metadata.category}</span>
                    {hasVisibleSettingsSubgroup(row.metadata.subgroup) ? <span>{row.metadata.subgroup}</span> : null}
                </div>
                <div className="wrap-break-word text-foreground">
                    <MarkupRenderer content={row.metadata.helpFull || row.metadata.helpShort} />
                </div>
            </div>,
        );
    }, [showDialog]);

    const openClearDialog = useCallback((row: SettingRow) => {
        if (!row.value.hasValue) {
            return;
        }

        showDialog(
            `Clear ${row.settingKey}`,
            <SettingClearDialogContent row={row} onRefreshSetting={onRefreshSetting} />,
        );
    }, [onRefreshSetting, showDialog]);

    return {
        openEditDialog,
        openHelpDialog,
        openClearDialog,
    };
}

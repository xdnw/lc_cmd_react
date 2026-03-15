import { useCallback } from "react";

import { useDialog } from "@/components/layout/DialogContext";

import { hasVisibleSettingsSubgroup, type SettingRow } from "./settingsDomain";
import SettingEditDialog from "./components/SettingEditDialog";

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
                <div className="whitespace-pre-wrap wrap-break-word text-foreground">
                    {row.metadata.helpFull || row.metadata.helpShort}
                </div>
            </div>,
        );
    }, [showDialog]);

    return {
        openEditDialog,
        openHelpDialog,
    };
}

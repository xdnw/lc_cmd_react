import { useCallback, useMemo, useState, type ReactNode } from "react";

import MarkupRenderer from "@/components/ui/MarkupRenderer";
import LoginPickerPage from "@/pages/login_picker";

import {
    deriveSettingsSubsetModel,
    type SettingKey,
} from "../settingsDomain";
import { useGuildSettingsData } from "../useGuildSettingsData";
import { useGuildSettingDialogs } from "../useGuildSettingDialogs";
import SettingsSubsetSection from "./SettingsSubsetSection";

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

    const subset = useMemo(() => deriveSettingsSubsetModel(normalized.rows, settings), [normalized.rows, settings]);

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

    return (
        <SettingsSubsetSection
            title={title}
            description={renderedDescription}
            subset={subset}
            emptyMessage={emptyMessage}
            className={className}
            headerContent={headerContent}
            renderAs={renderAs}
            showAvailabilitySummary={showAvailabilitySummary}
            warning={warning}
            schemaErrorCount={normalized.schemaErrors.length}
            rowParseErrorCount={normalized.rowParseErrors.length}
            isLoading={listQuery.isLoading}
            error={listQuery.error}
            onRefreshAll={handleRefreshAll}
            onRefreshSetting={handleRefreshSetting}
            onEdit={openEditDialog}
            onShowHelp={openHelpDialog}
            viewTableTo={viewTableTo}
        />
    );
}

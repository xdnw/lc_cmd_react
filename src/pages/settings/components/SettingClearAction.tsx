import { useCallback } from "react";
import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import type { CommandActionResult } from "@/components/cmd/CommandActionButton";
import { COMMANDS } from "@/lib/commands";
import type { CommandArguments } from "@/utils/Command";

const SETTINGS_DELETE_COMMAND: ["settings", "delete"] = ["settings", "delete"];
type SettingsDeleteArgs = Partial<CommandArguments<typeof COMMANDS.commands, typeof SETTINGS_DELETE_COMMAND>>;

export default function SettingClearAction({
    settingKey,
    hasValue,
    onSuccess,
    showResultDialog = true,
}: {
    settingKey: string;
    hasValue: boolean;
    onSuccess?: () => void;
    showResultDialog?: boolean;
}) {
    if (!hasValue) {
        return null;
    }

    const deleteArgs: SettingsDeleteArgs = { key: settingKey };

    const handleComplete = useCallback((result?: CommandActionResult) => {
        if (result?.status === "error") return;
        onSuccess?.();
    }, [onSuccess]);

    return (
        <ConfirmCommandActionButton
            command={SETTINGS_DELETE_COMMAND}
            args={deleteArgs}
            label="Clear"
            disabled={!hasValue}
            showResultDialog={showResultDialog}
            onComplete={handleComplete}
            resetOnComplete="always"
        />
    );
}
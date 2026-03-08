import { useCallback } from "react";
import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import type { CommandActionResult } from "@/components/cmd/CommandActionButton";

const SETTINGS_DELETE_COMMAND: ["settings", "delete"] = ["settings", "delete"];

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
    const deleteArgs = { key: settingKey } as never;

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
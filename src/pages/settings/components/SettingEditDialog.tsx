import ArgInput from "@/components/cmd/ArgInput";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import Badge from "@/components/ui/badge";
import { useCallback, useMemo } from "react";
import type { ArgInputSupport } from "@/components/cmd/ArgInput";
import type { TypeBreakdown } from "@/utils/Command";
import type { SettingRow } from "../settingsDomain";
import SettingClearAction from "./SettingClearAction";

const SETTINGS_INFO_COMMAND: ["settings", "info"] = ["settings", "info"];

function SettingArgInputContent({
    breakdown,
    inputSupport,
    argType,
    initialValue,
    setOutput,
}: {
    breakdown: TypeBreakdown | null;
    inputSupport: ArgInputSupport;
    argType: string;
    initialValue: string;
    setOutput: (key: string, value: string) => void;
}) {
    const handleSetOutput = useCallback((_: string, v: string) => setOutput("value", v), [setOutput]);

    if (breakdown && inputSupport.supported) {
        return (
            <ArgInput
                argName="value"
                breakdown={breakdown}
                initialValue={initialValue}
                setOutputValue={handleSetOutput}
            />
        );
    }
    return (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="mb-1 font-medium">Unsupported web input for this setting</div>
            <div className="mb-2">{inputSupport.reason ?? "Unknown type"}</div>
            <Badge variant="outline">Type: {argType || "(missing)"}</Badge>
        </div>
    );
}

export default function SettingEditDialog({
    row,
    onRefreshSetting,
}: {
    row: SettingRow;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const initialValues = useMemo(() => {
        const base: Record<string, string> = { key: row.settingKey };
        base.value = row.editor.initialValue;
        return base;
    }, [row.settingKey, row.editor.initialValue]);

    const handleRefreshSetting = useCallback(
        () => onRefreshSetting(row.settingKey),
        [onRefreshSetting, row.settingKey],
    );

    return (
        <CommandDialogForm
            commandPath={SETTINGS_INFO_COMMAND}
            initialValues={initialValues}
            description={`Edit ${row.settingKey}`}
            runLabel="Save"
            runDisabled={!row.editor.inputSupport.supported}
            showResultDialog={true}
            onCompleteSuccess={handleRefreshSetting}
            extraActions={
                <SettingClearAction
                    settingKey={row.settingKey}
                    hasValue={row.value.hasValue}
                    onSuccess={handleRefreshSetting}
                    showResultDialog={true}
                />
            }
        >
            {({ setOutput }) => (
                <SettingArgInputContent
                    breakdown={row.editor.breakdown}
                    inputSupport={row.editor.inputSupport}
                    argType={row.metadata.argType}
                    initialValue={row.editor.initialValue}
                    setOutput={setOutput}
                />
            )}
        </CommandDialogForm>
    );
}

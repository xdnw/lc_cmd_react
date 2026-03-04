import ArgInput from "@/components/cmd/ArgInput";
import CommandActionButton from "@/components/cmd/CommandActionButton";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import Badge from "@/components/ui/badge";
import { useCallback, useMemo } from "react";
import type { ArgInputSupport } from "@/components/cmd/ArgInput";
import type { TypeBreakdown } from "@/utils/Command";
import type { SettingRow } from "../settingsDomain";

const SETTINGS_INFO_COMMAND: ["settings", "info"] = ["settings", "info"];
const SETTINGS_DELETE_COMMAND: ["settings", "delete"] = ["settings", "delete"];

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
    const deleteArgs = { key: row.settingKey } as never;

    const initialValues = useMemo(() => {
        const base: Record<string, string> = { key: row.settingKey };
        if (row.initialEditValue) {
            base.value = row.initialEditValue;
        }
        return base;
    }, [row.settingKey, row.initialEditValue]);

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
            runDisabled={!row.inputSupport.supported}
            showResultDialog={true}
            onCompleteSuccess={handleRefreshSetting}
            extraActions={
                <CommandActionButton
                    command={SETTINGS_DELETE_COMMAND}
                    args={deleteArgs}
                    label="Clear"
                    showResultDialog={true}
                    onSuccess={handleRefreshSetting}
                />
            }
        >
            {({ setOutput }) => (
                <SettingArgInputContent
                    breakdown={row.breakdown}
                    inputSupport={row.inputSupport}
                    argType={row.argType}
                    initialValue={row.initialEditValue}
                    setOutput={setOutput}
                />
            )}
        </CommandDialogForm>
    );
}

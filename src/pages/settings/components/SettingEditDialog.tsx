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

    const statusBadges = [
        row.flags.invalid ? <Badge key="invalid" variant="destructive">Invalid</Badge> : null,
        !row.flags.isAllowed ? <Badge key="unavailable" variant="secondary">Unavailable</Badge> : null,
        !row.value.hasValue ? <Badge key="unset" variant="secondary">Unset</Badge> : null,
        row.flags.isChannelType ? <Badge key="channel" variant="outline">Channel type</Badge> : null,
        !row.editor.inputSupport.supported ? <Badge key="unsupported" variant="destructive">Unsupported web input</Badge> : null,
    ].filter(Boolean);

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
                <div className="space-y-3">
                    <SettingArgInputContent
                        breakdown={row.editor.breakdown}
                        inputSupport={row.editor.inputSupport}
                        argType={row.metadata.argType}
                        initialValue={row.editor.initialValue}
                        setOutput={setOutput}
                    />

                    <div className="space-y-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{row.metadata.argType}</span>
                            <span>{row.metadata.category}</span>
                            <span>{row.metadata.subgroup}</span>
                            {statusBadges.length > 0 && statusBadges}
                        </div>

                        <div className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word">
                            {row.metadata.helpFull || row.metadata.helpShort}
                        </div>

                        <div className="text-xs text-muted-foreground">
                            Current value
                        </div>
                        <div className="rounded border border-border/60 bg-background px-2.5 py-2 text-sm wrap-break-word whitespace-pre-wrap">
                            {row.value.hasValue ? (row.value.displayText || "Empty value") : "Unset"}
                        </div>

                        {row.rowParseErrors.length > 0 && (
                            <div className="rounded border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                                {row.rowParseErrors.join("; ")}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </CommandDialogForm>
    );
}

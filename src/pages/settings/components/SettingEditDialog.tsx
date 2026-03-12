import ArgInput from "@/components/cmd/ArgInput";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import Badge from "@/components/ui/badge";
import { useCallback, useMemo } from "react";
import type { ArgInputSupport } from "@/components/cmd/ArgInput";
import type { TypeBreakdown } from "@/utils/Command";
import type { SettingRow } from "../settingsDomain";

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
        !row.editor.inputSupport.supported ? <Badge key="unsupported" variant="destructive">Unsupported web input</Badge> : null,
    ].filter(Boolean);

    return (
        <CommandDialogForm
            commandPath={SETTINGS_INFO_COMMAND}
            initialValues={initialValues}
            runLabel="Save"
            runDisabled={!row.editor.inputSupport.supported}
            showResultDialog={true}
            onCompleteSuccess={handleRefreshSetting}
            showCommandTitle={false}
            actionsLayout="sticky"
        >
            {({ setOutput }) => (
                <div className="space-y-3">
                    {statusBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {statusBadges}
                        </div>
                    )}

                    <div className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap wrap-break-word">
                        {row.metadata.helpFull || row.metadata.helpShort}
                    </div>

                    <SettingArgInputContent
                        breakdown={row.editor.breakdown}
                        inputSupport={row.editor.inputSupport}
                        argType={row.metadata.argType}
                        initialValue={row.editor.initialValue}
                        setOutput={setOutput}
                    />

                    <div className="space-y-3 border-t border-border/60 pt-3">
                        <div>
                            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Current value</div>
                            <div className="mt-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap">
                                {row.value.hasValue ? (row.value.displayText || "Empty value") : "Unset"}
                            </div>
                        </div>

                        {row.rowParseErrors.length > 0 && (
                            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                {row.rowParseErrors.join("; ")}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </CommandDialogForm>
    );
}

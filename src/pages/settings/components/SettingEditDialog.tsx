import ArgInput from "@/components/cmd/ArgInput";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import Badge from "@/components/ui/badge";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useMemo, useState, type ChangeEvent } from "react";
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
    value,
    setOutput,
}: {
    breakdown: TypeBreakdown | null;
    inputSupport: ArgInputSupport;
    argType: string;
    initialValue: string;
    value: string;
    setOutput: (key: string, value: string) => void;
}) {
    const handleSetOutput = useCallback((_: string, v: string) => setOutput("value", v), [setOutput]);
    const handleRawInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        setOutput("value", event.target.value);
    }, [setOutput]);

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
            <div className="mb-2 wrap-break-word">
                <MarkupRenderer content={inputSupport.reason ?? "Unknown type"} />
            </div>
            <Badge variant="outline">Type: {argType || "(missing)"}</Badge>
            <div className="mt-3 space-y-2 text-foreground">
                <div className="text-xs leading-5 text-muted-foreground">
                    Advanced fallback: save will send the raw text below without a specialized editor. Double-check formatting before submitting.
                </div>
                <Textarea
                    value={value}
                    onChange={handleRawInputChange}
                    placeholder="Paste or type the raw setting value"
                    className="min-h-28 font-mono text-xs leading-5"
                    aria-label="Raw setting value"
                />
            </div>
        </div>
    );
}

function hasMeaningfulSettingValue(value: string): boolean {
    return value.trim().length > 0;
}

export default function SettingEditDialog({
    row,
    onRefreshSetting,
}: {
    row: SettingRow;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const [draftValue, setDraftValue] = useState(row.editor.initialValue);

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

    const requiresExplicitValue = !row.value.hasValue;
    const saveDisabled = !row.flags.isAllowed || (requiresExplicitValue && !hasMeaningfulSettingValue(draftValue));

    const handleOutputChange = useCallback((output: Record<string, string | string[]>) => {
        const nextValue = output.value;
        if (typeof nextValue === "string") {
            setDraftValue(nextValue);
            return;
        }

        setDraftValue(Array.isArray(nextValue) ? nextValue.join(",") : "");
    }, []);

    return (
        <CommandDialogForm
            commandPath={SETTINGS_INFO_COMMAND}
            initialValues={initialValues}
            runLabel="Save"
            runDisabled={saveDisabled}
            showResultDialog={true}
            onCompleteSuccess={handleRefreshSetting}
            onOutputChange={handleOutputChange}
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

                    <div className="text-sm leading-6 text-muted-foreground wrap-break-word">
                        <MarkupRenderer content={row.metadata.helpFull || row.metadata.helpShort} />
                    </div>

                    <div className="border-t border-border/60 pt-3">
                        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">New value</div>
                        <SettingArgInputContent
                        breakdown={row.editor.breakdown}
                        inputSupport={row.editor.inputSupport}
                        argType={row.metadata.argType}
                        initialValue={row.editor.initialValue}
                        value={draftValue}
                        setOutput={setOutput}
                    />
                    </div>
                    <div className="space-y-3 border-t border-border/60 pt-3">
                        {row.value.hasValue ? (
                            <>
                                <div>
                                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Current value</div>
                                    <div className="mt-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap">
                                        {row.value.displayText || "Empty value"}
                                    </div>
                                </div>

                                <div>
                                    <SettingClearAction
                                        settingKey={row.settingKey}
                                        hasValue={row.value.hasValue}
                                        onSuccess={handleRefreshSetting}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
                                No value set
                            </div>
                        )}

                        {row.rowParseErrors.length > 0 && (
                            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                <div className="space-y-1 wrap-break-word">
                                    {row.rowParseErrors.map((error, index) => (
                                        <div key={`parse-${index}`}>
                                            <MarkupRenderer content={error} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </CommandDialogForm>
    );
}

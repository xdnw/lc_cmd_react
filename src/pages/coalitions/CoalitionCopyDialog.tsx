import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CompactSegmentedControl, type CompactSegmentedOption } from "@/components/ui/compact-segmented-control";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LazyIcon from "@/components/ui/LazyIcon";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
    buildCoalitionCopyOutput,
    type CoalitionCopyMode,
    type CoalitionCopyNameMode,
    type CoalitionViewRecord,
} from "./coalitionsDomain";

type CoalitionMemberVisibilityFilter = "active" | "all" | "deleted";
type CoalitionCopyScope = "all" | "selected";
type CoalitionCopyIssueTone = "warning" | "error";

type CoalitionCopyIssue = {
    tone: CoalitionCopyIssueTone;
    message: string;
};

const COPY_SCOPE_OPTIONS: readonly CompactSegmentedOption<CoalitionCopyScope>[] = [
    {
        value: "selected",
        label: "Selected",
        title: "Copy only selected coalitions",
        activeClassName: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    },
    {
        value: "all",
        label: "All",
        title: "Copy all shown coalitions",
        activeClassName: "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200",
    },
] as const;

const COPY_VALUE_OPTIONS: readonly CompactSegmentedOption<CoalitionCopyMode>[] = [
    { value: "ids", label: "Ids", title: "Copy ids" },
    { value: "names", label: "Names", title: "Copy names" },
] as const;

const COPY_QUALIFIER_OPTIONS: readonly CompactSegmentedOption<"qualified" | "plain">[] = [
    {
        value: "qualified",
        label: "Prefixed",
        title: "Include canonical prefixes",
        activeClassName: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200",
    },
    {
        value: "plain",
        label: "Plain",
        title: "Omit prefixes",
        activeClassName: "border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-200",
    },
] as const;

const COPY_LAYOUT_OPTIONS: readonly CompactSegmentedOption<CoalitionCopyNameMode>[] = [
    {
        value: "flat",
        label: "Flat",
        title: "Merge all values into one list",
        activeClassName: "border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-200",
    },
    {
        value: "named",
        label: "Named",
        title: "Prefix each coalition with its name",
        activeClassName: "border-indigo-500/40 bg-indigo-500/15 text-indigo-800 dark:text-indigo-200",
    },
] as const;

function getMemberVisibilityLabel(visibility: CoalitionMemberVisibilityFilter): string {
    switch (visibility) {
        case "active":
            return "live members";
        case "deleted":
            return "deleted members";
        case "all":
        default:
            return "all members";
    }
}

function getCoalitionCopyEmptyMessage(mode: CoalitionCopyMode, memberVisibility: CoalitionMemberVisibilityFilter): string {
    return mode === "ids"
        ? `No ids for ${getMemberVisibilityLabel(memberVisibility)}`
        : `No names for ${getMemberVisibilityLabel(memberVisibility)}`;
}

function CopyControlRow<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: readonly CompactSegmentedOption<T>[];
    onChange: (value: T) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <div className="min-w-11 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">{label}</div>
            <CompactSegmentedControl
                ariaLabel={label}
                value={value}
                options={options}
                onChange={onChange}
            />
        </div>
    );
}

export default function CoalitionCopyDialog({
    open,
    coalition,
    allCoalitions,
    selectedCoalitions,
    memberVisibility,
    onOpenChange,
}: {
    open: boolean;
    coalition: CoalitionViewRecord | null;
    allCoalitions: CoalitionViewRecord[];
    selectedCoalitions: CoalitionViewRecord[];
    memberVisibility: CoalitionMemberVisibilityFilter;
    onOpenChange: (nextOpen: boolean) => void;
}) {
    const [copyScope, setCopyScope] = useState<CoalitionCopyScope>("selected");
    const [copyValue, setCopyValue] = useState<CoalitionCopyMode>("ids");
    const [copyQualifier, setCopyQualifier] = useState<"qualified" | "plain">("qualified");
    const [copyLayout, setCopyLayout] = useState<CoalitionCopyNameMode>("flat");
    const [copyIssue, setCopyIssue] = useState<CoalitionCopyIssue | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setCopyScope("selected");
        setCopyValue("ids");
        setCopyQualifier("qualified");
        setCopyLayout("flat");
        setCopyIssue(null);
        setCopied(false);
    }, [coalition?.key, open]);

    useEffect(() => {
        setCopyIssue(null);
        setCopied(false);
    }, [copyLayout, copyQualifier, copyScope, copyValue]);

    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timeoutId = globalThis.setTimeout(() => {
            setCopied(false);
        }, 1600);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, [copied]);

    const effectiveSelectedCoalitions = useMemo(() => {
        if (!coalition) {
            return [];
        }

        return selectedCoalitions.length > 0 ? selectedCoalitions : [coalition];
    }, [coalition, selectedCoalitions]);

    const selectedFallbackApplied = Boolean(coalition) && selectedCoalitions.length === 0;

    const copyTargets = useMemo(() => {
        return copyScope === "selected" ? effectiveSelectedCoalitions : allCoalitions;
    }, [allCoalitions, copyScope, effectiveSelectedCoalitions]);

    const previewOutput = useMemo(() => {
        return buildCoalitionCopyOutput(copyTargets, {
            mode: copyValue,
            qualified: copyQualifier === "qualified",
            nameMode: copyLayout,
        });
    }, [copyLayout, copyQualifier, copyTargets, copyValue]);

    const previewPlaceholder = useMemo(() => {
        if (copyTargets.length === 0) {
            return copyScope === "selected" ? "No selected coalitions" : "No shown coalitions";
        }

        return getCoalitionCopyEmptyMessage(copyValue, memberVisibility);
    }, [copyScope, copyTargets.length, copyValue, memberVisibility]);

    const issueClassName = useMemo(() => cn(
        "text-[11px] font-medium",
        copyIssue?.tone === "warning" && "text-amber-800 dark:text-amber-200",
        copyIssue?.tone === "error" && "text-destructive",
    ), [copyIssue?.tone]);

    const handleCopy = useCallback(async () => {
        if (copyTargets.length === 0) {
            setCopyIssue({
                tone: "warning",
                message: copyScope === "selected" ? "Nothing selected" : "Nothing shown",
            });
            setCopied(false);
            return;
        }

        if (!previewOutput.output) {
            setCopyIssue({
                tone: "warning",
                message: getCoalitionCopyEmptyMessage(copyValue, memberVisibility),
            });
            setCopied(false);
            return;
        }

        if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
            setCopyIssue({
                tone: "error",
                message: "Clipboard unavailable",
            });
            setCopied(false);
            return;
        }

        try {
            await navigator.clipboard.writeText(previewOutput.output);
            setCopied(true);
            setCopyIssue(previewOutput.skippedCount > 0
                ? {
                    tone: "warning",
                    message: `${previewOutput.skippedCount} skipped`,
                }
                : null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setCopyIssue({
                tone: "error",
                message,
            });
            setCopied(false);
        }
    }, [copyScope, copyTargets.length, copyValue, memberVisibility, previewOutput.output, previewOutput.skippedCount]);

    const handleOpenChange = useCallback((nextOpen: boolean) => {
        if (!nextOpen) {
            setCopyIssue(null);
            setCopied(false);
        }

        onOpenChange(nextOpen);
    }, [onOpenChange]);

    if (!coalition) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl gap-2 p-2.5 sm:max-h-[85vh]">
                <DialogHeader className="space-y-1 pr-10 text-left">
                    <DialogTitle className="text-left text-base font-semibold tracking-tight">Copy {coalition.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-2 overflow-y-auto pr-0.5">
                    <div className="space-y-1.5 rounded-sm border border-border/70 bg-background/70 px-2 py-2">
                        <CopyControlRow
                            label="Scope"
                            value={copyScope}
                            options={COPY_SCOPE_OPTIONS}
                            onChange={setCopyScope}
                        />
                        {copyScope === "selected" && selectedFallbackApplied ? (
                            <div className="text-[11px] text-muted-foreground">Using the clicked coalition.</div>
                        ) : null}
                        <CopyControlRow
                            label="Value"
                            value={copyValue}
                            options={COPY_VALUE_OPTIONS}
                            onChange={setCopyValue}
                        />
                        <CopyControlRow
                            label="Prefix"
                            value={copyQualifier}
                            options={COPY_QUALIFIER_OPTIONS}
                            onChange={setCopyQualifier}
                        />
                        <CopyControlRow
                            label="Layout"
                            value={copyLayout}
                            options={COPY_LAYOUT_OPTIONS}
                            onChange={setCopyLayout}
                        />
                    </div>

                    <div className="space-y-1.5 rounded-sm border border-border/70 bg-muted/10 px-2 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0 text-[11px] text-muted-foreground">
                                {copyIssue ? <span className={issueClassName}>{copyIssue.message}</span> : previewPlaceholder}
                            </div>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="h-7 shrink-0 px-3 text-[11px]"
                                onClick={handleCopy}
                                disabled={!previewOutput.output}
                            >
                                <LazyIcon name={copied ? "CheckIcon" : "Copy"} size={13} className="shrink-0" />
                                {copied ? "Copied" : "Copy"}
                            </Button>
                        </div>

                        <Textarea
                            value={previewOutput.output}
                            placeholder={previewPlaceholder}
                            readOnly
                            className="min-h-32 resize-y rounded-sm px-2 py-1.5 font-mono text-[11px] leading-4"
                            aria-label="Coalition copy preview"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

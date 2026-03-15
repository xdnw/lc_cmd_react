import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/components/api/SessionContext";
import { COMMAND_POPUP_OPEN_ATTR } from "@/components/cmd/commandKeyboard";
import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import { SearchMatchText } from "@/components/cmd/searchListPrimitives";
import { useDialog } from "@/components/layout/DialogContext";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import Badge from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import LazyIcon from "@/components/ui/LazyIcon";
import Loading from "@/components/ui/loading";
import type { WebCoalitions } from "@/lib/apitypes.d.ts";
import { LIST_COALITIONS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { usePermission } from "@/utils/PermUtil";

import LoginPickerPage from "../login_picker";
import {
    COALITION_COMMANDS,
    COALITION_LIST_QUERY_ARGS,
    coerceCoalitionCommandPath,
    filterCoalitions,
    formatCoalitionMemberToken,
    getCoalitionMemberQueryMatch,
    normalizeCoalitions,
    type CoalitionCommandPath,
    type CoalitionMemberRecord,
    type CoalitionMemberTokenValue,
    type CoalitionViewRecord,
} from "./coalitionsDomain";

type CommandResult = {
    status?: "success" | "error" | "action";
};

type CommandDialogOptions = {
    title: string;
    command: CoalitionCommandPath;
    description: string;
    initialValues?: Record<string, string>;
    header?: ReactNode;
};

type CoalitionMemberVisibilityFilter = "active" | "all" | "deleted";
type CoalitionCopyMode = "ids" | "names";
type CoalitionCopyScope = "visible" | "selected";
type CoalitionCopyNameMode = "flat" | "named";
type CoalitionCopyFeedbackTone = "success" | "warning" | "error";

type CoalitionCopyFeedback = {
    tone: CoalitionCopyFeedbackTone;
    message: string;
};

type CompactSegmentedOption<T extends string> = {
    value: T;
    label: string;
    activeClassName?: string;
    title?: string;
};

const MEMBER_VISIBILITY_OPTIONS: readonly CompactSegmentedOption<CoalitionMemberVisibilityFilter>[] = [
    {
        value: "active",
        label: "Live",
        title: "Show non-deleted members",
        activeClassName: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    },
    {
        value: "all",
        label: "All",
        title: "Show all members",
        activeClassName: "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200",
    },
    {
        value: "deleted",
        label: "Deleted",
        title: "Show deleted members only",
        activeClassName: "border-rose-500/40 bg-rose-500/15 text-rose-800 dark:text-rose-200",
    },
] as const;

const COPY_SCOPE_OPTIONS: readonly CompactSegmentedOption<CoalitionCopyScope>[] = [
    {
        value: "visible",
        label: "Visible",
        title: "Copy all shown coalitions",
        activeClassName: "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200",
    },
    {
        value: "selected",
        label: "Selected",
        title: "Copy only selected coalitions",
        activeClassName: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    },
] as const;

const COPY_QUALIFIER_OPTIONS: readonly CompactSegmentedOption<"qualified" | "plain">[] = [
    {
        value: "qualified",
        label: "Qualified",
        title: "Copy with canonical prefixes",
        activeClassName: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200",
    },
    {
        value: "plain",
        label: "Plain",
        title: "Copy without prefixes",
        activeClassName: "border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-200",
    },
] as const;

const COPY_NAME_OPTIONS: readonly CompactSegmentedOption<CoalitionCopyNameMode>[] = [
    {
        value: "flat",
        label: "Flat",
        title: "Copy a flat merged list without coalition names",
        activeClassName: "border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-200",
    },
    {
        value: "named",
        label: "Named",
        title: "Prefix each copied coalition with its name",
        activeClassName: "border-indigo-500/40 bg-indigo-500/15 text-indigo-800 dark:text-indigo-200",
    },
] as const;

const COPY_MENU_OPTIONS: readonly { value: CoalitionCopyMode; label: string }[] = [
    { value: "ids", label: "Copy ids" },
    { value: "names", label: "Copy names" },
] as const;

function useOpenCoalitionCommandDialog(onSuccess: () => void) {
    const { showDialog } = useDialog();

    return useCallback((options: CommandDialogOptions) => {
        showDialog(
            options.title,
            <CommandDialogForm
                commandPath={coerceCoalitionCommandPath(options.command)}
                initialValues={options.initialValues ?? {}}
                description={options.description}
                showResultDialog
                actionsLayout="sticky"
                onCompleteSuccess={onSuccess}
            />,
            {
                header: options.header,
                openInNewTab: true,
                focusNewTab: true,
                replaceActive: false,
            },
        );
    }, [onSuccess, showDialog]);
}

function getCopyTokenValue(mode: CoalitionCopyMode): Exclude<CoalitionMemberTokenValue, "canonical"> {
    return mode === "ids" ? "id" : "name";
}

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

function formatPlural(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

function CompactSegmentedControl<T extends string>({
    ariaLabel,
    value,
    options,
    onChange,
}: {
    ariaLabel: string;
    value: T;
    options: readonly CompactSegmentedOption<T>[];
    onChange: (value: T) => void;
}) {
    const optionClickHandlers = useMemo(
        () => options.map((option) => () => onChange(option.value)),
        [onChange, options],
    );

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className="inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-muted/25 p-0.5"
        >
            {options.map((option, index) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        title={option.title ?? option.label}
                        onClick={optionClickHandlers[index]}
                        className={cn(
                            "inline-flex h-6 items-center justify-center rounded-sm px-2 text-[10px] font-medium leading-none transition-colors",
                            isActive
                                ? cn("border border-border/70 bg-background text-foreground shadow-xs", option.activeClassName)
                                : "text-foreground/70 hover:bg-background hover:text-foreground",
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

function CoalitionCopyMenu({
    disabled,
    onCopy,
}: {
    disabled?: boolean;
    onCopy: (mode: CoalitionCopyMode) => void;
}) {
    const [open, setOpen] = useState(false);
    const copyHandlers = useMemo(
        () => COPY_MENU_OPTIONS.map((option) => () => onCopy(option.value)),
        [onCopy],
    );

    return (
        <div {...{ [COMMAND_POPUP_OPEN_ATTR]: open ? "true" : "false" }}>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger
                    disabled={disabled}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-6 gap-1 rounded-md px-2 text-[11px]")}
                >
                    <LazyIcon name="Copy" size={13} className="shrink-0" />
                    <span>Copy</span>
                    <LazyIcon name="ChevronDown" size={13} className="shrink-0 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-32">
                    {COPY_MENU_OPTIONS.map((option, index) => (
                        <DropdownMenuItem key={option.value} onClick={copyHandlers[index]}>
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function CoalitionMemberPreviewBadge({
    member,
    query,
}: {
    member: CoalitionMemberRecord;
    query: string;
}) {
    const queryMatch = useMemo(() => getCoalitionMemberQueryMatch(member, query), [member, query]);
    const showIdMatch = queryMatch.id && Boolean(member.idText);
    const showKindMatch = queryMatch.kind;

    return (
        <Badge
            variant={member.deleted ? "destructive" : "outline"}
            className="inline-flex max-w-full items-center gap-1 px-1.5 py-0.5 text-[10px]"
        >
            <span className="truncate">
                <SearchMatchText text={member.name} query={query} />
            </span>
            {showIdMatch ? (
                <span className="rounded bg-black/5 px-1 py-0.5 font-mono text-[9px] opacity-80 dark:bg-white/10">
                    id <SearchMatchText text={member.idText ?? ""} query={query} />
                </span>
            ) : null}
            {showKindMatch ? (
                <span className="rounded bg-black/5 px-1 py-0.5 text-[9px] opacity-80 dark:bg-white/10">
                    <SearchMatchText text={member.kindLabel} query={query} />
                </span>
            ) : null}
        </Badge>
    );
}

function CoalitionMemberPreview({
    members,
    query,
}: {
    members: CoalitionMemberRecord[];
    query: string;
}) {
    if (members.length === 0) {
        return <div className="text-[11px] text-foreground/55">No matching members.</div>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {members.map((member) => (
                <CoalitionMemberPreviewBadge key={member.key} member={member} query={query} />
            ))}
        </div>
    );
}

function CoalitionRow({
    coalition,
    query,
    isSelected,
    onManage,
    onSetSelected,
}: {
    coalition: CoalitionViewRecord;
    query: string;
    isSelected: boolean;
    onManage: (coalition: CoalitionViewRecord) => void;
    onSetSelected: (coalitionKey: string, nextSelected: boolean) => void;
}) {
    const summary = useMemo(() => {
        const parts = [`${coalition.visibleTotalMembers}/${coalition.totalMembers} shown`, `${coalition.visibleAllianceMembers.length} aa`, `${coalition.visibleGuildMembers.length} guild`];
        if (coalition.deletedMembers > 0) {
            parts.push(`${coalition.deletedMembers} deleted`);
        }
        return parts.join(" • ");
    }, [
        coalition.deletedMembers,
        coalition.totalMembers,
        coalition.visibleAllianceMembers.length,
        coalition.visibleGuildMembers.length,
        coalition.visibleTotalMembers,
    ]);

    const onManageClick = useCallback(() => {
        onManage(coalition);
    }, [coalition, onManage]);

    const onSelectionChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        onSetSelected(coalition.key, event.target.checked);
    }, [coalition.key, onSetSelected]);

    return (
        <div className={cn(
            "grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2.5",
            isSelected && "bg-emerald-500/6",
        )}>
            <div className="min-w-0 space-y-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                        <SearchMatchText text={coalition.name} query={query} />
                    </span>
                    <span className="text-[11px] text-foreground/55">{summary}</span>
                </div>
                <CoalitionMemberPreview members={coalition.visibleMembers} query={query} />
            </div>

            <div className="flex items-start gap-2">
                <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={onManageClick}>
                    Manage
                </Button>
                <label className="inline-flex h-6 items-center justify-center rounded-md border border-border/70 bg-background px-1.5">
                    <Input
                        type="checkbox"
                        className="h-4 w-4 rounded-sm"
                        checked={isSelected}
                        onChange={onSelectionChange}
                        aria-label={`Select ${coalition.name}`}
                        title={`Select ${coalition.name}`}
                    />
                </label>
            </div>
        </div>
    );
}

function CoalitionMembersSection({
    title,
    members,
    emptyMessage,
    coalitionName,
    canRemove,
    onMutationComplete,
}: {
    title: string;
    members: CoalitionMemberRecord[];
    emptyMessage: string;
    coalitionName: string;
    canRemove: boolean;
    onMutationComplete: (result?: CommandResult) => void;
}) {
    const sortedMembers = useMemo(() => {
        return members.slice().sort((left, right) => {
            if (left.deleted !== right.deleted) {
                return Number(left.deleted) - Number(right.deleted);
            }

            return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
        });
    }, [members]);

    return (
        <section className="overflow-hidden rounded-md border border-border/80 bg-background/80">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-2.5 py-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">{title}</h3>
                <span className="text-[11px] text-foreground/75">{sortedMembers.length}</span>
            </div>

            {sortedMembers.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-foreground/80">{emptyMessage}</div>
            ) : (
                <div className="divide-y divide-border/60">
                    {sortedMembers.map((member) => (
                        <CoalitionMemberRow
                            key={member.key}
                            member={member}
                            coalitionName={coalitionName}
                            canRemove={canRemove}
                            onMutationComplete={onMutationComplete}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function CoalitionMemberRow({
    member,
    coalitionName,
    canRemove,
    onMutationComplete,
}: {
    member: CoalitionMemberRecord;
    coalitionName: string;
    canRemove: boolean;
    onMutationComplete: (result?: CommandResult) => void;
}) {
    const removeToken = useMemo(() => formatCoalitionMemberToken(member), [member]);
    const removeDisabled = !canRemove || !removeToken;

    return (
        <div className="flex items-center gap-2 px-2.5 py-1.5">
            <div className="min-w-0 flex flex-1 flex-wrap items-center gap-1.5 text-sm text-foreground">
                <span className="truncate font-medium">{member.name}</span>
                {member.idText ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/75">
                        id {member.idText}
                    </span>
                ) : (
                    <span className="text-[11px] text-foreground/75">name token</span>
                )}
                {member.deleted ? <Badge variant="destructive" className="px-1.5 text-[10px]">Deleted</Badge> : null}
            </div>
            <ConfirmCommandActionButton
                command={COALITION_COMMANDS.remove}
                args={{
                    coalitionName,
                    alliances: removeToken,
                }}
                label="Remove"
                disabled={removeDisabled}
                showResultDialog
                onComplete={onMutationComplete}
                resetOnComplete="non-error"
                buttonVariant="destructive"
                buttonSize="sm"
                buttonClassName="h-6 px-2 text-[10px]"
                classes="!m-0 !h-6 !w-auto !px-2"
                cancelSize="sm"
                cancelClassName="h-6 px-2 text-[10px]"
            />
        </div>
    );
}

function CoalitionDetailDialogContent({
    coalitionKey,
    coalitionName,
    onCoalitionMutation,
}: {
    coalitionKey: string;
    coalitionName: string;
    onCoalitionMutation: () => void;
}) {
    const openCommandDialog = useOpenCoalitionCommandDialog(onCoalitionMutation);
    const listQuery = useQuery({
        ...bulkQueryOptions(LIST_COALITIONS.endpoint, COALITION_LIST_QUERY_ARGS),
        refetchOnMount: false,
    });
    const addPermission = usePermission(COALITION_COMMANDS.add, { showDialogOnError: false });
    const removePermission = usePermission(COALITION_COMMANDS.remove, { showDialogOnError: false });
    const deletePermission = usePermission(COALITION_COMMANDS.delete, { showDialogOnError: false });
    const renamePermission = usePermission(coerceCoalitionCommandPath(COALITION_COMMANDS.rename), { showDialogOnError: false });

    const coalition = useMemo(() => {
        const data = listQuery.data?.data as WebCoalitions | undefined;
        return normalizeCoalitions(data).find((entry) => entry.key === coalitionKey);
    }, [coalitionKey, listQuery.data]);

    const currentCoalitionName = coalition?.name ?? coalitionName;

    const canAdd = Boolean(addPermission.permission?.success);
    const canRemove = Boolean(removePermission.permission?.success);
    const canDelete = Boolean(deletePermission.permission?.success);
    const canRename = Boolean(renamePermission.permission?.success);

    const permissionErrors = useMemo(() => {
        const errors: string[] = [];
        if (addPermission.error) errors.push(`Add permission unavailable: ${addPermission.error}`);
        if (removePermission.error) errors.push(`Remove permission unavailable: ${removePermission.error}`);
        if (deletePermission.error) errors.push(`Delete permission unavailable: ${deletePermission.error}`);
        if (renamePermission.error) errors.push(`Rename permission unavailable: ${renamePermission.error}`);
        return errors;
    }, [addPermission.error, deletePermission.error, removePermission.error, renamePermission.error]);

    const handleMutationComplete = useCallback((result?: CommandResult) => {
        if (result?.status === "error") {
            return;
        }

        onCoalitionMutation();
    }, [onCoalitionMutation]);

    const openAddMembersDialog = useCallback(() => {
        openCommandDialog({
            title: `Add members to ${currentCoalitionName}`,
            command: COALITION_COMMANDS.add,
            description: "Add alliances or guilds to this coalition using the existing command form.",
            initialValues: {
                coalitionName: currentCoalitionName,
            },
        });
    }, [currentCoalitionName, openCommandDialog]);

    const openRenameCoalitionDialog = useCallback(() => {
        openCommandDialog({
            title: `Rename ${currentCoalitionName}`,
            command: COALITION_COMMANDS.rename,
            description: "Rename this coalition using the existing command form.",
            initialValues: {
                coalition: currentCoalitionName,
            },
        });
    }, [currentCoalitionName, openCommandDialog]);

    if (listQuery.isLoading) {
        return (
            <div className="py-4">
                <Loading variant="ripple" />
            </div>
        );
    }

    if (listQuery.error) {
        return <div className="text-sm text-destructive">Failed to load coalition details: {listQuery.error.message}</div>;
    }

    if (!coalition) {
        return (
            <div className="space-y-3 text-sm">
                <p className="text-foreground/80">This coalition is no longer present in the current list.</p>
                <Button size="sm" variant="outline" onClick={onCoalitionMutation}>
                    Refresh coalitions
                </Button>
            </div>
        );
    }

    const modalSummary = `${coalition.allianceMembers.length} alliances • ${coalition.guildMembers.length} guilds${coalition.deletedMembers > 0 ? ` • ${coalition.deletedMembers} deleted` : ""}`;

    return (
        <div className="space-y-2 text-foreground">
            {permissionErrors.length > 0 ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
                    {permissionErrors.join(" | ")}
                </div>
            ) : null}

            <div className="space-y-1 rounded-md border border-border/80 bg-background/80 px-2.5 py-2">
                <div className="text-sm font-semibold text-foreground">{currentCoalitionName}</div>
                <div className="text-[11px] text-foreground/70">{modalSummary}</div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/10 px-2.5 py-2">
                <div className="text-[11px] text-foreground/75">Manage coalition members and metadata.</div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={openAddMembersDialog}
                        disabled={!canAdd}
                    >
                        Add members
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={openRenameCoalitionDialog}
                        disabled={!canRename}
                    >
                        Rename
                    </Button>
                    <ConfirmCommandActionButton
                        command={COALITION_COMMANDS.delete}
                        args={{ coalitionName: currentCoalitionName }}
                        label="Delete"
                        disabled={!canDelete}
                        showResultDialog
                        onComplete={handleMutationComplete}
                        resetOnComplete="non-error"
                        buttonVariant="destructive"
                        buttonSize="sm"
                        buttonClassName="h-6 px-2 text-[11px]"
                        classes="!m-0 !h-6 !w-auto !px-2"
                        cancelSize="sm"
                        cancelClassName="h-6 px-2 text-[10px]"
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <CoalitionMembersSection
                    title="Alliances"
                    members={coalition.allianceMembers}
                    emptyMessage="No alliances in this coalition."
                    coalitionName={coalition.name}
                    canRemove={canRemove}
                    onMutationComplete={handleMutationComplete}
                />
                <CoalitionMembersSection
                    title="Guilds"
                    members={coalition.guildMembers}
                    emptyMessage="No guilds in this coalition."
                    coalitionName={coalition.name}
                    canRemove={canRemove}
                    onMutationComplete={handleMutationComplete}
                />
            </div>
        </div>
    );
}

export default function CoalitionsPage() {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const { showDialog } = useDialog();
    const [query, setQuery] = useState("");
    const [memberVisibility, setMemberVisibility] = useState<CoalitionMemberVisibilityFilter>("all");
    const [copyScope, setCopyScope] = useState<CoalitionCopyScope>("visible");
    const [copyQualifier, setCopyQualifier] = useState<"qualified" | "plain">("qualified");
    const [copyNameMode, setCopyNameMode] = useState<CoalitionCopyNameMode>("flat");
    const [copyFeedback, setCopyFeedback] = useState<CoalitionCopyFeedback | null>(null);
    const [selectedCoalitionKeys, setSelectedCoalitionKeys] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        if (copyFeedback?.tone !== "success") {
            return undefined;
        }

        const timeoutId = globalThis.setTimeout(() => {
            setCopyFeedback((current) => current?.tone === "success" ? null : current);
        }, 2500);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, [copyFeedback]);

    const listQuery = useQuery({
        ...bulkQueryOptions(LIST_COALITIONS.endpoint, COALITION_LIST_QUERY_ARGS),
        enabled: Boolean(session?.guild),
    });

    const createPermission = usePermission(COALITION_COMMANDS.create, {
        showDialogOnError: false,
        enabled: Boolean(session?.guild),
    });
    const generatePermission = usePermission(COALITION_COMMANDS.generate, {
        showDialogOnError: false,
        enabled: Boolean(session?.guild),
    });
    const sheetPermission = usePermission(COALITION_COMMANDS.sheet, {
        showDialogOnError: false,
        enabled: Boolean(session?.guild),
    });

    const canCreate = Boolean(createPermission.permission?.success);
    const canGenerate = Boolean(generatePermission.permission?.success);
    const canExportSheet = Boolean(sheetPermission.permission?.success);

    const normalizedCoalitions = useMemo(() => {
        return normalizeCoalitions(listQuery.data?.data as WebCoalitions | undefined);
    }, [listQuery.data]);

    useEffect(() => {
        const validKeys = new Set(normalizedCoalitions.map((coalition) => coalition.key));
        setSelectedCoalitionKeys((current) => {
            const next = new Set(Array.from(current).filter((key) => validKeys.has(key)));
            return next.size === current.size ? current : next;
        });
    }, [normalizedCoalitions]);

    const coalitions = useMemo(() => {
        return filterCoalitions(normalizedCoalitions, {
            query,
            memberVisibility,
        });
    }, [memberVisibility, normalizedCoalitions, query]);

    const selectedVisibleCoalitions = useMemo(() => {
        return coalitions.filter((coalition) => selectedCoalitionKeys.has(coalition.key));
    }, [coalitions, selectedCoalitionKeys]);

    const copyTargets = useMemo(() => {
        return copyScope === "selected" ? selectedVisibleCoalitions : coalitions;
    }, [coalitions, copyScope, selectedVisibleCoalitions]);

    const totals = useMemo(() => {
        return {
            totalCoalitions: normalizedCoalitions.length,
            shownCoalitions: coalitions.length,
        };
    }, [coalitions.length, normalizedCoalitions.length]);

    const topPermissionErrors = useMemo(() => {
        const errors: string[] = [];
        if (createPermission.error) errors.push(`Create permission unavailable: ${createPermission.error}`);
        if (generatePermission.error) errors.push(`Generate permission unavailable: ${generatePermission.error}`);
        if (sheetPermission.error) errors.push(`Sheet permission unavailable: ${sheetPermission.error}`);
        return errors;
    }, [createPermission.error, generatePermission.error, sheetPermission.error]);

    const refreshCoalitions = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: [LIST_COALITIONS.endpoint.name] });
    }, [queryClient]);

    const openCommandDialog = useOpenCoalitionCommandDialog(refreshCoalitions);

    const setCoalitionSelected = useCallback((coalitionKey: string, nextSelected: boolean) => {
        setSelectedCoalitionKeys((current) => {
            const next = new Set(current);
            if (nextSelected) {
                next.add(coalitionKey);
            } else {
                next.delete(coalitionKey);
            }
            return next;
        });
    }, []);

    const visibleCoalitionKeys = useMemo(() => coalitions.map((coalition) => coalition.key), [coalitions]);

    const allVisibleSelected = useMemo(() => {
        return visibleCoalitionKeys.length > 0 && visibleCoalitionKeys.every((key) => selectedCoalitionKeys.has(key));
    }, [selectedCoalitionKeys, visibleCoalitionKeys]);

    const toggleSelectVisible = useCallback(() => {
        setSelectedCoalitionKeys((current) => {
            const next = new Set(current);
            const shouldSelect = visibleCoalitionKeys.some((key) => !next.has(key));
            for (const key of visibleCoalitionKeys) {
                if (shouldSelect) {
                    next.add(key);
                } else {
                    next.delete(key);
                }
            }
            return next;
        });
    }, [visibleCoalitionKeys]);

    const openCoalitionDetails = useCallback((coalition: CoalitionViewRecord) => {
        showDialog(
            "Coalition details",
            <CoalitionDetailDialogContent
                coalitionKey={coalition.key}
                coalitionName={coalition.name}
                onCoalitionMutation={refreshCoalitions}
            />,
            {
                openInNewTab: true,
                focusNewTab: true,
                replaceActive: false,
            },
        );
    }, [refreshCoalitions, showDialog]);

    const onQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    }, []);

    const openCreateCoalitionDialog = useCallback(() => {
        openCommandDialog({
            title: "Create coalition",
            command: COALITION_COMMANDS.create,
            description: "Create a named coalition and optionally seed it with alliances or guilds.",
        });
    }, [openCommandDialog]);

    const openGenerateCoalitionDialog = useCallback(() => {
        openCommandDialog({
            title: "Generate coalition",
            command: COALITION_COMMANDS.generate,
            description: "Generate a named coalition from a treaty-web root alliance.",
        });
    }, [openCommandDialog]);

    const openCoalitionSheetDialog = useCallback(() => {
        openCommandDialog({
            title: "Coalition sheet",
            command: COALITION_COMMANDS.sheet,
            description: "Generate a sheet of this guild's coalitions.",
        });
    }, [openCommandDialog]);

    const handleCopyCoalitions = useCallback(async (mode: CoalitionCopyMode) => {
        if (copyTargets.length === 0) {
            setCopyFeedback({
                tone: "warning",
                message: copyScope === "selected"
                    ? "Select at least one shown coalition before copying."
                    : "No shown coalitions are available to copy.",
            });
            return;
        }

        const tokenValue = getCopyTokenValue(mode);
        const qualified = copyQualifier === "qualified";
        const includeNames = copyNameMode === "named";
        const rows = copyTargets.map((coalition) => {
            const rawTokens = coalition.visibleMembers
                .map((member) => formatCoalitionMemberToken(member, { value: tokenValue, qualified }))
                .filter(Boolean);

            return {
                coalitionName: coalition.name,
                tokens: Array.from(new Set(rawTokens)),
                skippedCount: coalition.visibleMembers.length - rawTokens.length,
            };
        });
        const copyableRows = rows.filter((row) => row.tokens.length > 0);
        const skippedTotal = rows.reduce((sum, row) => sum + row.skippedCount, 0);

        if (copyableRows.length === 0) {
            setCopyFeedback({
                tone: "warning",
                message: mode === "ids"
                    ? `No safe ids are available for ${getMemberVisibilityLabel(memberVisibility)}.`
                    : `No names are available for ${getMemberVisibilityLabel(memberVisibility)}.`,
            });
            return;
        }

        if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
            setCopyFeedback({
                tone: "error",
                message: "Clipboard access is unavailable in this browser context.",
            });
            return;
        }

        const output = includeNames
            ? copyableRows.map((row) => `${row.coalitionName}: ${row.tokens.join(", ")}`).join("\n")
            : Array.from(new Set(copyableRows.flatMap((row) => row.tokens))).join(", ");
        const copiedTokenCount = includeNames
            ? copyableRows.reduce((sum, row) => sum + row.tokens.length, 0)
            : Array.from(new Set(copyableRows.flatMap((row) => row.tokens))).length;

        try {
            await navigator.clipboard.writeText(output);
            if (skippedTotal > 0) {
                setCopyFeedback({
                    tone: "warning",
                    message: `Copied with skips. ${formatPlural(skippedTotal, "member")} had no ${mode === "ids" ? "safe id" : "copyable name"}.`,
                });
                return;
            }

            setCopyFeedback({
                tone: "success",
                message: `Copied ${formatPlural(copiedTokenCount, mode === "ids" ? "id" : "name")} from ${formatPlural(copyableRows.length, "coalition")}.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setCopyFeedback({
                tone: "error",
                message: `Copy failed: ${message}`,
            });
        }
    }, [copyNameMode, copyQualifier, copyScope, copyTargets, memberVisibility]);

    const pageHeaderConfig = useMemo<PageHeaderConfig | null>(() => {
        if (!session?.guild || listQuery.isLoading || listQuery.error) {
            return null;
        }

        return {
            sticky: true,
            title: (
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Coalitions</h1>
                    <span className="text-xs text-muted-foreground">
                        {totals.shownCoalitions} shown of {totals.totalCoalitions}
                    </span>
                </div>
            ),
            content: (
                <div className="space-y-1.5">
                    <div className="grid gap-2 xl:grid-cols-[minmax(16rem,1fr)_auto] xl:items-center">
                        <Input
                            value={query}
                            onChange={onQueryChange}
                            placeholder="Search coalitions, alliances, or guilds"
                            className="h-8"
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                            <CompactSegmentedControl
                                ariaLabel="Coalition member visibility"
                                value={memberVisibility}
                                options={MEMBER_VISIBILITY_OPTIONS}
                                onChange={setMemberVisibility}
                            />
                            <CompactSegmentedControl
                                ariaLabel="Copy target scope"
                                value={copyScope}
                                options={COPY_SCOPE_OPTIONS}
                                onChange={setCopyScope}
                            />
                            <CompactSegmentedControl
                                ariaLabel="Copy formatting"
                                value={copyQualifier}
                                options={COPY_QUALIFIER_OPTIONS}
                                onChange={setCopyQualifier}
                            />
                            <CompactSegmentedControl
                                ariaLabel="Coalition name in copy output"
                                value={copyNameMode}
                                options={COPY_NAME_OPTIONS}
                                onChange={setCopyNameMode}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                onClick={toggleSelectVisible}
                                disabled={visibleCoalitionKeys.length === 0}
                            >
                                {allVisibleSelected ? "Clear shown" : "Select shown"}
                            </Button>
                            <CoalitionCopyMenu disabled={copyTargets.length === 0} onCopy={handleCopyCoalitions} />
                            {listQuery.isFetching ? <span className="text-[11px] text-muted-foreground">Refreshing...</span> : null}
                        </div>
                    </div>
                    {copyFeedback ? (
                        <div
                            className={cn(
                                "rounded-md border px-2 py-1 text-[11px]",
                                copyFeedback.tone === "success" && "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200",
                                copyFeedback.tone === "warning" && "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-200",
                                copyFeedback.tone === "error" && "border-destructive/35 bg-destructive/10 text-destructive",
                            )}
                        >
                            {copyFeedback.message}
                        </div>
                    ) : null}
                </div>
            ),
            actions: (
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        onClick={openCreateCoalitionDialog}
                        disabled={!canCreate}
                        className="before:bg-emerald-600 hover:before:bg-emerald-500 active:before:bg-emerald-700"
                    >
                        Create coalition
                    </Button>
                    <Button size="sm" variant="outline" onClick={openGenerateCoalitionDialog} disabled={!canGenerate}>
                        Generate coalition
                    </Button>
                    <Button size="sm" variant="outline" onClick={openCoalitionSheetDialog} disabled={!canExportSheet}>
                        Export sheet
                    </Button>
                    <Button size="sm" variant="outline" onClick={refreshCoalitions} disabled={listQuery.isFetching}>
                        Refresh
                    </Button>
                </div>
            ),
        } satisfies PageHeaderConfig;
    }, [
        allVisibleSelected,
        canCreate,
        canExportSheet,
        canGenerate,
        copyFeedback,
        copyNameMode,
        copyQualifier,
        copyScope,
        copyTargets.length,
        handleCopyCoalitions,
        listQuery.error,
        listQuery.isFetching,
        listQuery.isLoading,
        memberVisibility,
        onQueryChange,
        openCoalitionSheetDialog,
        openCreateCoalitionDialog,
        openGenerateCoalitionDialog,
        query,
        refreshCoalitions,
        session?.guild,
        toggleSelectVisible,
        totals.shownCoalitions,
        totals.totalCoalitions,
        visibleCoalitionKeys.length,
    ]);

    usePageHeader(pageHeaderConfig);

    if (!session?.guild) {
        return <LoginPickerPage />;
    }

    if (listQuery.isLoading) {
        return (
            <div className="py-6">
                <Loading variant="ripple" />
            </div>
        );
    }

    if (listQuery.error) {
        return <div className="text-sm text-destructive">Failed to load coalitions: {listQuery.error.message}</div>;
    }

    return (
        <div className="pb-6">
            <div className="w-full px-3 sm:px-4">
                <div className="mx-auto max-w-6xl space-y-2">
                    {topPermissionErrors.length > 0 ? (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
                            {topPermissionErrors.join(" | ")}
                        </div>
                    ) : null}

                    {coalitions.length > 0 ? (
                        <section className="overflow-hidden rounded-md border border-border/70 bg-background/70">
                            <div className="divide-y divide-border/60">
                                {coalitions.map((coalition) => (
                                    <CoalitionRow
                                        key={coalition.key}
                                        coalition={coalition}
                                        query={query}
                                        isSelected={selectedCoalitionKeys.has(coalition.key)}
                                        onManage={openCoalitionDetails}
                                        onSetSelected={setCoalitionSelected}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : (
                        <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-foreground/70">
                            {totals.totalCoalitions === 0
                                ? "No coalitions were returned for the current guild context."
                                : "No coalitions match the current filters."}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

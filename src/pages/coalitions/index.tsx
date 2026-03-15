import { useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/components/api/SessionContext";
import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import { useDialog } from "@/components/layout/DialogContext";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Loading from "@/components/ui/loading";
import type { WebCoalitions } from "@/lib/apitypes.d.ts";
import { LIST_COALITIONS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import RowActionsDetailDialog, { type RowActionsDetailField } from "@/pages/custom_table/actions/RowActionsDetailDialog";
import { usePermission } from "@/utils/PermUtil";

import LoginPickerPage from "../login_picker";
import {
    COALITION_COMMANDS,
    COALITION_LIST_QUERY_ARGS,
    filterCoalitions,
    normalizeCoalitions,
    type CoalitionCommandPath,
    type CoalitionMemberRecord,
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

function useOpenCoalitionCommandDialog(onSuccess: () => void) {
    const { showDialog } = useDialog();

    return useCallback((options: CommandDialogOptions) => {
        showDialog(
            options.title,
            <CommandDialogForm
                commandPath={options.command}
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

function CoalitionMemberChips({ members }: { members: CoalitionMemberRecord[] }) {
    const previewMembers = members.slice(0, 6);
    const remaining = members.length - previewMembers.length;

    if (members.length === 0) {
        return <div className="rounded border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">No members match the current filters.</div>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {previewMembers.map((member) => (
                <Badge key={member.key} variant={member.deleted ? "destructive" : "outline"} className="max-w-full gap-1 truncate px-2 py-1 text-[11px]">
                    <span className="truncate">{member.name}</span>
                    <span className="text-[10px] opacity-70">{member.kindLabel}</span>
                </Badge>
            ))}
            {remaining > 0 ? <Badge variant="secondary">+{remaining} more</Badge> : null}
        </div>
    );
}

function CoalitionCard({
    coalition,
    showDeletedMembers,
    onManage,
}: {
    coalition: CoalitionViewRecord;
    showDeletedMembers: boolean;
    onManage: (coalitionName: string) => void;
}) {
    const hiddenDeletedCount = coalition.deletedMembers - coalition.visibleMembers.filter((member) => member.deleted).length;
    const onManageClick = useCallback(() => {
        onManage(coalition.name);
    }, [coalition.name, onManage]);

    return (
        <Card className="flex h-full flex-col">
            <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                        <CardTitle className="truncate text-base">{coalition.name}</CardTitle>
                        <CardDescription>
                            {coalition.visibleTotalMembers} visible member{coalition.visibleTotalMembers === 1 ? "" : "s"}
                            {coalition.totalMembers !== coalition.visibleTotalMembers ? ` of ${coalition.totalMembers}` : ""}
                        </CardDescription>
                    </div>
                    {coalition.deletedMembers > 0 ? (
                        <Badge variant={showDeletedMembers ? "destructive" : "secondary"}>
                            {coalition.deletedMembers} deleted
                        </Badge>
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{coalition.visibleAllianceMembers.length} alliances</Badge>
                    <Badge variant="outline">{coalition.visibleGuildMembers.length} guilds</Badge>
                    {hiddenDeletedCount > 0 ? <Badge variant="secondary">{hiddenDeletedCount} hidden</Badge> : null}
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
                <CoalitionMemberChips members={coalition.visibleMembers} />
            </CardContent>
            <CardFooter className="items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">{coalition.activeMembers} active</span>
                <Button size="sm" onClick={onManageClick}>
                    Manage
                </Button>
            </CardFooter>
        </Card>
    );
}

function CoalitionMembersSection({
    title,
    members,
    coalitionName,
    canRemove,
    onMutationComplete,
}: {
    title: string;
    members: CoalitionMemberRecord[];
    coalitionName: string;
    canRemove: boolean;
    onMutationComplete: (result?: CommandResult) => void;
}) {
    const sortedMembers = useMemo(() => {
        return members.slice().sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
    }, [members]);

    const hasUnsafeGuildIds = useMemo(() => {
        return sortedMembers.some((member) => member.kind === "guild" && !member.isSafeId);
    }, [sortedMembers]);

    return (
        <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{title}</h3>
                <Badge variant="outline">{sortedMembers.length}</Badge>
            </div>
            {hasUnsafeGuildIds ? (
                <p className="mb-2 text-[11px] text-muted-foreground">
                    Guild membership is still classified from the returned id threshold, but remove actions fall back to the canonical
                    <code className="mx-1 rounded bg-muted px-1 py-0.5">guild:</code>
                    name token when a guild id is not JS-safe.
                </p>
            ) : null}
            {sortedMembers.length === 0 ? (
                <div className="text-xs text-muted-foreground">No {title.toLowerCase()} in this coalition.</div>
            ) : (
                <div className="space-y-1">
                    {sortedMembers.map((member) => {
                        const removeDisabled = !canRemove || !member.displayToken;
                        return (
                            <div key={member.key} className="flex items-start gap-2 rounded border border-border px-2 py-1.5 hover:bg-muted/60">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="truncate text-sm font-medium">{member.name}</span>
                                        <Badge variant="outline">{member.kindLabel}</Badge>
                                        {member.deleted ? <Badge variant="destructive">Deleted</Badge> : null}
                                    </div>
                                    {member.idText ? (
                                        <div className="text-[11px] text-muted-foreground">
                                            {member.kind === "guild" ? "Guild" : "Alliance"} id {member.idText}
                                        </div>
                                    ) : null}
                                </div>
                                <ConfirmCommandActionButton
                                    command={COALITION_COMMANDS.remove}
                                    args={{
                                        coalitionName,
                                        alliances: member.displayToken,
                                    }}
                                    label="Remove"
                                    disabled={removeDisabled}
                                    showResultDialog
                                    onComplete={onMutationComplete}
                                    resetOnComplete="non-error"
                                    buttonVariant="destructive"
                                    buttonSize="sm"
                                    buttonClassName="h-6 px-2 text-[11px]"
                                    classes="!m-0 !h-6 !px-2 !w-auto"
                                    cancelSize="sm"
                                    cancelClassName="h-6 px-2 text-[11px]"
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CoalitionDetailDialogContent({
    coalitionName,
    onCoalitionMutation,
}: {
    coalitionName: string;
    onCoalitionMutation: () => void;
}) {
    const openCommandDialog = useOpenCoalitionCommandDialog(onCoalitionMutation);
    const listQuery = useQuery({
        ...bulkQueryOptions(LIST_COALITIONS.endpoint, COALITION_LIST_QUERY_ARGS),
        staleTime: 0,
    });
    const addPermission = usePermission(COALITION_COMMANDS.add, { showDialogOnError: false });
    const removePermission = usePermission(COALITION_COMMANDS.remove, { showDialogOnError: false });
    const deletePermission = usePermission(COALITION_COMMANDS.delete, { showDialogOnError: false });

    const coalition = useMemo(() => {
        const data = listQuery.data?.data as WebCoalitions | undefined;
        return normalizeCoalitions(data).find((entry) => entry.name === coalitionName);
    }, [coalitionName, listQuery.data]);

    const canAdd = Boolean(addPermission.permission?.success);
    const canRemove = Boolean(removePermission.permission?.success);
    const canDelete = Boolean(deletePermission.permission?.success);

    const permissionErrors = useMemo(() => {
        const errors: string[] = [];
        if (addPermission.error) errors.push(`Add permission unavailable: ${addPermission.error}`);
        if (removePermission.error) errors.push(`Remove permission unavailable: ${removePermission.error}`);
        if (deletePermission.error) errors.push(`Delete permission unavailable: ${deletePermission.error}`);
        return errors;
    }, [addPermission.error, deletePermission.error, removePermission.error]);

    const handleMutationComplete = useCallback((result?: CommandResult) => {
        if (result?.status === "error") {
            return;
        }

        onCoalitionMutation();
    }, [onCoalitionMutation]);

    const openAddMembersDialog = useCallback(() => {
        openCommandDialog({
            title: `Add members to ${coalitionName}`,
            command: COALITION_COMMANDS.add,
            description: "Add alliances or guilds to this coalition using the existing command form.",
            initialValues: {
                coalitionName,
            },
        });
    }, [coalitionName, openCommandDialog]);

    const detailFields = useMemo<readonly RowActionsDetailField[]>(() => {
        if (!coalition) {
            return [];
        }

        return [
            {
                key: "coalition-name",
                label: "Coalition",
                value: coalition.name,
            },
            {
                key: "total-members",
                label: "Members",
                value: String(coalition.totalMembers),
            },
            {
                key: "alliances",
                label: "Alliances",
                value: String(coalition.allianceMembers.length),
            },
            {
                key: "guilds",
                label: "Guilds",
                value: String(coalition.guildMembers.length),
            },
            {
                key: "deleted",
                label: "Deleted",
                value: String(coalition.deletedMembers),
            },
        ] as const;
    }, [coalition]);

    const deleteAction = useMemo(() => {
        return (
            <ConfirmCommandActionButton
                command={COALITION_COMMANDS.delete}
                args={{ coalitionName }}
                label="Delete coalition"
                disabled={!canDelete}
                showResultDialog
                onComplete={handleMutationComplete}
                resetOnComplete="non-error"
                buttonVariant="destructive"
                buttonSize="sm"
                buttonClassName="h-7 px-3"
                classes="!m-0 !h-7 !px-3 !w-auto"
                cancelSize="sm"
            />
        );
    }, [canDelete, coalitionName, handleMutationComplete]);

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
                <p className="text-muted-foreground">This coalition is no longer present in the current list.</p>
                <Button size="sm" variant="outline" onClick={onCoalitionMutation}>
                    Refresh coalitions
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3 pr-1">
            {permissionErrors.length > 0 ? (
                <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                    {permissionErrors.join(" | ")}
                </div>
            ) : null}
            <RowActionsDetailDialog
                fields={detailFields}
                footerActions={[
                    {
                        key: "add-members",
                        label: "Add members",
                        onClick: openAddMembersDialog,
                        disabled: !canAdd,
                        variant: "outline",
                    },
                    {
                        key: "delete-coalition",
                        content: deleteAction,
                    },
                ]}
                extraSections={[
                    <CoalitionMembersSection
                        key="alliances"
                        title="Alliance Members"
                        members={coalition.allianceMembers}
                        coalitionName={coalition.name}
                        canRemove={canRemove}
                        onMutationComplete={handleMutationComplete}
                    />,
                    <CoalitionMembersSection
                        key="guilds"
                        title="Guild Members"
                        members={coalition.guildMembers}
                        coalitionName={coalition.name}
                        canRemove={canRemove}
                        onMutationComplete={handleMutationComplete}
                    />,
                ]}
            />
        </div>
    );
}

export default function CoalitionsPage() {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const { showDialog } = useDialog();
    const [query, setQuery] = useState("");
    const [showDeletedMembers, setShowDeletedMembers] = useState(false);

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

    const coalitions = useMemo(() => {
        return filterCoalitions(normalizedCoalitions, {
            query,
            showDeletedMembers,
        });
    }, [normalizedCoalitions, query, showDeletedMembers]);

    const totals = useMemo(() => {
        const totalMembers = normalizedCoalitions.reduce((sum, coalition) => sum + coalition.totalMembers, 0);
        const deletedMembers = normalizedCoalitions.reduce((sum, coalition) => sum + coalition.deletedMembers, 0);
        const visibleMembers = coalitions.reduce((sum, coalition) => sum + coalition.visibleTotalMembers, 0);

        return {
            totalCoalitions: normalizedCoalitions.length,
            shownCoalitions: coalitions.length,
            totalMembers,
            visibleMembers,
            deletedMembers,
        };
    }, [coalitions, normalizedCoalitions]);

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

    const openCoalitionDetails = useCallback((coalitionName: string) => {
        showDialog(
            coalitionName,
            <CoalitionDetailDialogContent
                coalitionName={coalitionName}
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

    const toggleDeletedMembers = useCallback(() => {
        setShowDeletedMembers((current) => !current);
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
                    <span className="text-xs text-muted-foreground">
                        {totals.visibleMembers} visible members
                    </span>
                </div>
            ),
            content: (
                <div className="grid gap-2 lg:grid-cols-[minmax(18rem,32rem)_minmax(0,1fr)] lg:items-center">
                    <Input
                        value={query}
                        onChange={onQueryChange}
                        placeholder="Search coalitions, alliances, or guilds"
                        className="h-8"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant={showDeletedMembers ? "default" : "outline"}
                            size="sm"
                            onClick={toggleDeletedMembers}
                        >
                            {showDeletedMembers
                                ? "Showing deleted members"
                                : totals.deletedMembers > 0
                                    ? `Show deleted members (${totals.deletedMembers})`
                                    : "Hide deleted members"}
                        </Button>
                        {listQuery.isFetching ? <span className="text-[11px] text-muted-foreground">Refreshing coalition list...</span> : null}
                    </div>
                </div>
            ),
            actions: (
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={refreshCoalitions} disabled={listQuery.isFetching}>
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={openCreateCoalitionDialog}
                        disabled={!canCreate}
                    >
                        Create coalition
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={openGenerateCoalitionDialog}
                        disabled={!canGenerate}
                    >
                        Generate coalition
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={openCoalitionSheetDialog}
                        disabled={!canExportSheet}
                    >
                        Export sheet
                    </Button>
                </div>
            ),
        } satisfies PageHeaderConfig;
    }, [
        canCreate,
        canExportSheet,
        canGenerate,
        listQuery.error,
        listQuery.isFetching,
        listQuery.isLoading,
        openCoalitionSheetDialog,
        openCreateCoalitionDialog,
        openGenerateCoalitionDialog,
        onQueryChange,
        query,
        refreshCoalitions,
        session?.guild,
        showDeletedMembers,
        toggleDeletedMembers,
        totals.deletedMembers,
        totals.shownCoalitions,
        totals.totalCoalitions,
        totals.visibleMembers,
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
                <div className="mx-auto max-w-6xl space-y-3">
                    {topPermissionErrors.length > 0 ? (
                        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                            {topPermissionErrors.join(" | ")}
                        </div>
                    ) : null}

                    <div className="rounded border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        Coalition membership uses the backend list read model, and member kind is derived from the id threshold rule:
                        <code className="mx-1 rounded bg-background px-1 py-0.5">id &gt; 2147483647</code>
                        means guild, otherwise alliance.
                    </div>

                    {coalitions.length > 0 ? (
                        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                            {coalitions.map((coalition) => (
                                <CoalitionCard
                                    key={coalition.key}
                                    coalition={coalition}
                                    showDeletedMembers={showDeletedMembers}
                                    onManage={openCoalitionDetails}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                            {totals.totalCoalitions === 0
                                ? "No coalitions were returned for the current guild context."
                                : "No coalitions match the current search and deleted-member filters."}
                        </div>
                    )}

                    {totals.totalCoalitions > 0 ? (
                        <div className="text-[11px] text-muted-foreground">
                            {totals.totalMembers} total member entries across {totals.totalCoalitions} coalition{totals.totalCoalitions === 1 ? "" : "s"}.
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

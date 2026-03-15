import { useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiFormInputs } from "@/components/api/apiform";
import ArgInput from "@/components/cmd/ArgInput";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import { useSession } from "@/components/api/SessionContext";
import { useDialog } from "@/components/layout/DialogContext";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import { useDefaultPageSidebar, usePageSidebar } from "@/components/layout/PageSidebarContext";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Loading from "@/components/ui/loading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CommonEndpoint, QueryResult } from "@/lib/BulkQuery";
import { COMMANDS } from "@/lib/commands";
import type {
    AllianceRoleEntry,
    AutoRoleBulkResult,
    AutoRoleIssue,
    AutoRoleManagedRoles,
    AutoRoleMemberResult,
    AutoRoleResult,
    AutoRoleSyncState,
    CityRoleEntry,
    TaxRoleEntry,
    WebRoleAliases,
} from "@/lib/apitypes";
import {
    ADD_ALLIANCE_ROLE,
    ADD_CITY_ROLE,
    ADD_TAX_ROLE,
    AUTOROLE,
    AUTOROLEALL,
    LIST_AUTOROLE_ROLES,
    LIST_ROLE_ALIASES,
    REMOVE_ALLIANCE_ROLE,
    REMOVE_CITY_ROLE,
    REMOVE_TAX_ROLE,
} from "@/lib/endpoints";
import { bulkQueryOptions, singleQueryOptions } from "@/lib/queries";
import LoginPickerPage from "@/pages/login_picker";
import GuildSettingsSubset from "@/pages/settings/components/GuildSettingsSubset";
import { CM, type AnyCommandPath, type CommandArguments } from "@/utils/Command";
import { usePermission } from "@/utils/PermUtil";

import {
    AUTO_ROLE_SETTING_KEYS,
    buildRoleAliasEntries,
    formatAutoRoleIssueType,
    formatDiscordRoleLabel,
    formatUnmaskedReason,
    hasAutoRoleMemberActivity,
    mergeRoleNameMaps,
    summarizeManagedRoles,
    summarizeRoleAliases,
    type RoleAliasEntry,
    type RoleAliasMapping,
} from "./rolesDomain";

const ROLE_SET_ALIAS_COMMAND: ["role", "setalias"] = ["role", "setalias"];
const ROLE_AUTOROLE_COMMAND: ["role", "autorole"] = ["role", "autorole"];
const ROLE_AUTOASSIGN_COMMAND: ["role", "autoassign"] = ["role", "autoassign"];

type RoleSetAliasArgs = Partial<CommandArguments<typeof COMMANDS.commands, ["role", "setalias"]>>;
type RoleFormArgs = Record<string, string>;
type AliasFilterMode = "all" | "mapped" | "invalid";
type ManagedRolePermissionMode = "ready" | "readonly" | "error";

function coerceRoleCommandPath(path: [string, string]): AnyCommandPath {
    return path as unknown as AnyCommandPath;
}

function formatPlural(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    return "Unknown error";
}

function useEndpointAction<T, A extends { [key: string]: string | string[] | undefined }>({
    endpoint,
    failureTitle,
    onSuccessData,
}: {
    endpoint: CommonEndpoint<T, A, A>;
    failureTitle: string;
    onSuccessData?: (data: T) => void;
}) {
    const queryClient = useQueryClient();
    const { showDialog } = useDialog();

    const mutation = useMutation({
        mutationFn: (args: { readonly [key: string]: string | string[] }) => {
            return queryClient.fetchQuery(singleQueryOptions(endpoint.endpoint, args, 0, 10));
        },
        onSuccess: (result: QueryResult<T>) => {
            if (result.error) {
                showDialog(failureTitle, result.error);
                return;
            }

            if (!result.data) {
                showDialog(failureTitle, "No data returned.");
                return;
            }

            onSuccessData?.(result.data);
        },
        onError: (error) => {
            showDialog(failureTitle, getErrorMessage(error));
        },
    });

    const run = useCallback((args: { readonly [key: string]: string | string[] }) => {
        mutation.mutate(args);
    }, [mutation]);

    return {
        run,
        isPending: mutation.isPending,
    };
}

function InlineConfirmButton({
    label,
    confirmLabel,
    cancelLabel = "Cancel",
    onConfirm,
    disabled = false,
    pending = false,
    buttonVariant = "outline",
    confirmVariant = "destructive",
    size = "sm",
    className,
}: {
    label: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    disabled?: boolean;
    pending?: boolean;
    buttonVariant?: "default" | "outline" | "destructive" | "secondary";
    confirmVariant?: "default" | "outline" | "destructive" | "secondary";
    size?: "sm" | "default" | "lg" | "icon";
    className?: string;
}) {
    const [confirming, setConfirming] = useState(false);

    const startConfirming = useCallback(() => {
        if (disabled || pending) {
            return;
        }

        setConfirming(true);
    }, [disabled, pending]);

    const cancelConfirming = useCallback(() => {
        setConfirming(false);
    }, []);

    const handleConfirm = useCallback(() => {
        if (disabled || pending) {
            return;
        }

        onConfirm();
        setConfirming(false);
    }, [disabled, onConfirm, pending]);

    if (!confirming) {
        return (
            <Button type="button" variant={buttonVariant} size={size} className={className} disabled={disabled || pending} onClick={startConfirming}>
                {pending ? <Loading size={3} variant="ripple" /> : label}
            </Button>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" variant={confirmVariant} size={size} className={className} disabled={disabled || pending} onClick={handleConfirm}>
                {pending ? <Loading size={3} variant="ripple" /> : confirmLabel}
            </Button>
            <Button type="button" variant="outline" size={size} disabled={pending} onClick={cancelConfirming}>
                {cancelLabel}
            </Button>
        </div>
    );
}

function RoleIdBadge({ roleId, roleNames }: { roleId: number; roleNames?: Record<string, string> | null }) {
    return <Badge variant="outline">{formatDiscordRoleLabel(roleId, roleNames)}</Badge>;
}

function RoleIdList({
    title,
    roleIds,
    roleNames,
}: {
    title: string;
    roleIds: readonly number[];
    roleNames?: Record<string, string> | null;
}) {
    if (roleIds.length === 0) {
        return null;
    }

    return (
        <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="flex flex-wrap gap-1.5">
                {roleIds.map((roleId) => (
                    <RoleIdBadge key={`${title}-${roleId}`} roleId={roleId} roleNames={roleNames} />
                ))}
            </div>
        </div>
    );
}

function RenameList({
    title,
    renames,
    roleNames,
}: {
    title: string;
    renames: Record<string, string>;
    roleNames?: Record<string, string> | null;
}) {
    const items = Object.entries(renames);
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="grid gap-1">
                {items.map(([roleId, nextName]) => (
                    <div key={`${title}-${roleId}`} className="rounded-md border border-border/70 bg-muted/10 px-2 py-1.5 text-xs text-foreground/85">
                        <span className="font-medium">{formatDiscordRoleLabel(Number(roleId), roleNames)}</span>
                        <span className="text-muted-foreground">{" -> "}</span>
                        <span>{nextName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AutoRoleIssuesList({
    title,
    issues,
    roleNames,
}: {
    title: string;
    issues: readonly AutoRoleIssue[];
    roleNames?: Record<string, string> | null;
}) {
    if (issues.length === 0) {
        return null;
    }

    return (
        <div className="space-y-1.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="grid gap-1.5">
                {issues.map((issue, index) => (
                    <div key={`${title}-${issue.type}-${index}`} className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-xs text-foreground/85">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">{formatAutoRoleIssueType(issue.type)}</Badge>
                            {issue.role_id != null ? <Badge variant="outline">{formatDiscordRoleLabel(issue.role_id, roleNames)}</Badge> : null}
                            {issue.alliance_id != null ? <Badge variant="outline">Alliance #{issue.alliance_id}</Badge> : null}
                            {issue.nickname ? <Badge variant="outline">Nickname: {issue.nickname}</Badge> : null}
                            {issue.error_type ? <Badge variant="destructive">{issue.error_type}</Badge> : null}
                        </div>
                        {issue.detail ? <div className="mt-1 text-muted-foreground">{issue.detail}</div> : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AutoRoleSyncCard({ sync, roleNames }: { sync?: AutoRoleSyncState; roleNames?: Record<string, string> | null }) {
    if (!sync) {
        return null;
    }

    const facts = [
        `Nickname mode: ${sync.nickname_mode}`,
        `Alliance mask: ${sync.alliance_mask_mode}`,
        sync.alliance_rank ? `Minimum alliance rank: ${sync.alliance_rank}` : null,
        sync.top_x != null ? `Top X limit: ${sync.top_x}` : null,
        `Ally gov roles: ${sync.ally_gov_enabled ? "enabled" : "disabled"}`,
        `Member apps: ${sync.member_apps_enabled ? "enabled" : "disabled"}`,
        sync.registered_role != null ? `Registered role: ${formatDiscordRoleLabel(sync.registered_role, roleNames)}` : null,
        `Masked alliances: ${sync.masked_alliances.length}`,
        `Alliance ids: ${sync.alliance_ids.length}`,
        `Ally ids: ${sync.ally_ids.length}`,
        `Extension ids: ${sync.extension_ids.length}`,
        `Alliance role bindings: ${Object.keys(sync.alliance_roles).length}`,
        `City role bindings: ${sync.city_roles.length}`,
        `Tax role bindings: ${sync.tax_roles.length}`,
        `Applicant role bindings: ${Object.keys(sync.applicant_roles).length}`,
        `Member role bindings: ${Object.keys(sync.member_roles).length}`,
        `Conditional role bindings: ${sync.conditional_roles.length}`,
    ].filter((value): value is string => Boolean(value));

    return (
        <div className="space-y-1.5 rounded-md border border-border/70 bg-muted/10 p-3">
            <div className="text-sm font-semibold text-foreground">Current autorole sync state</div>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                {facts.map((fact) => (
                    <div key={fact} className="rounded-sm border border-border/60 bg-background px-2 py-1 text-xs text-foreground/85">
                        {fact}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AutoRoleMemberCard({
    result,
    roleNames,
}: {
    result: AutoRoleMemberResult;
    roleNames?: Record<string, string> | null;
}) {
    return (
        <div className="space-y-2 rounded-md border border-border/70 bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">{result.display_name || result.username}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>@{result.username}</span>
                        <Badge variant="outline">User #{result.user_id}</Badge>
                        {result.nation_id != null ? <Badge variant="outline">Nation #{result.nation_id}</Badge> : null}
                        {result.alliance_id != null ? <Badge variant="outline">Alliance #{result.alliance_id}</Badge> : null}
                    </div>
                </div>
                {hasAutoRoleMemberActivity(result) ? <Badge variant="outline">Has changes or issues</Badge> : <Badge variant="secondary">No changes</Badge>}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Planned</div>
                    <RoleIdList title="Create roles" roleIds={result.create_roles} roleNames={roleNames} />
                    <RoleIdList title="Add roles" roleIds={result.add_roles} roleNames={roleNames} />
                    <RoleIdList title="Remove roles" roleIds={result.remove_roles} roleNames={roleNames} />
                    {result.nickname ? <div className="text-xs text-foreground/85">Set nickname to <span className="font-medium">{result.nickname}</span></div> : null}
                    {result.clear_nickname ? <div className="text-xs text-foreground/85">Clear nickname</div> : null}
                </div>
                <div className="space-y-2">
                    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Applied</div>
                    <RoleIdList title="Added roles" roleIds={result.added_roles} roleNames={roleNames} />
                    <RoleIdList title="Removed roles" roleIds={result.removed_roles} roleNames={roleNames} />
                    {result.applied_nickname ? <div className="text-xs text-foreground/85">Applied nickname <span className="font-medium">{result.applied_nickname}</span></div> : null}
                    {result.cleared_nickname ? <div className="text-xs text-foreground/85">Cleared nickname</div> : null}
                </div>
            </div>

            <AutoRoleIssuesList title="Planning issues" issues={result.issues} roleNames={roleNames} />
            <AutoRoleIssuesList title="Execution issues" issues={result.execution_issues} roleNames={roleNames} />
        </div>
    );
}

function AutoRoleResultMeta({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-3">
            <div>
                <div className="text-sm font-semibold text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
            </div>
            {children}
        </div>
    );
}

function AliasMappingRow({
    entry,
    mapping,
    canEdit,
    onOpenAliasDialog,
    onAliasesChanged,
}: {
    entry: RoleAliasEntry;
    mapping: RoleAliasMapping;
    canEdit: boolean;
    onOpenAliasDialog: (args: { title: string; description: string; initialValues: RoleSetAliasArgs }) => void;
    onAliasesChanged: () => void;
}) {
    const editInitialValues = useMemo<RoleSetAliasArgs>(() => ({
        locutusRole: entry.roleName,
        discordRole: String(mapping.roleId),
        alliance: mapping.allianceId != null ? String(mapping.allianceId) : undefined,
    }), [entry.roleName, mapping.allianceId, mapping.roleId]);

    const removeArgs = useMemo<RoleSetAliasArgs>(() => ({
        locutusRole: entry.roleName,
        alliance: mapping.allianceId != null ? String(mapping.allianceId) : undefined,
        removeRole: "true",
    }), [entry.roleName, mapping.allianceId]);

    const handleOpenEditDialog = useCallback(() => {
        onOpenAliasDialog({
            title: `Edit ${entry.roleName}`,
            description: `Update the mapped Discord role for ${entry.roleName}.`,
            initialValues: editInitialValues,
        });
    }, [editInitialValues, entry.roleName, onOpenAliasDialog]);

    const handleAliasMutationComplete = useCallback((result?: { status?: "success" | "error" | "action" }) => {
        if (result?.status === "error") {
            return;
        }

        onAliasesChanged();
    }, [onAliasesChanged]);

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 text-xs">
            <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{mapping.scopeLabel}</Badge>
                    <span className="font-medium text-foreground/90">{mapping.discordRoleName ?? `Role #${mapping.roleId}`}</span>
                    <span className="text-muted-foreground">({mapping.roleId})</span>
                </div>
            </div>
            {canEdit ? (
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={handleOpenEditDialog}>
                        Edit
                    </Button>
                    <ConfirmCommandActionButton
                        command={coerceRoleCommandPath(ROLE_SET_ALIAS_COMMAND)}
                        args={removeArgs}
                        label="Remove"
                        confirmLabel="Confirm remove"
                        showResultDialog
                        onComplete={handleAliasMutationComplete}
                        buttonVariant="destructive"
                        buttonClassName="h-7 px-2"
                        cancelClassName="h-7 px-2"
                        classes="!m-0 !h-7 !w-auto !px-2"
                    />
                </div>
            ) : null}
        </div>
    );
}

function RoleAliasCard({
    entry,
    canEdit,
    onOpenAliasDialog,
    onAliasesChanged,
}: {
    entry: RoleAliasEntry;
    canEdit: boolean;
    onOpenAliasDialog: (args: { title: string; description: string; initialValues: RoleSetAliasArgs }) => void;
    onAliasesChanged: () => void;
}) {
    const handleOpenCreateDialog = useCallback(() => {
        onOpenAliasDialog({
            title: `Map ${entry.roleName}`,
            description: `Set a Discord role alias for ${entry.roleName}.`,
            initialValues: {
                locutusRole: entry.roleName,
            },
        });
    }, [entry.roleName, onOpenAliasDialog]);

    return (
        <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <div className="text-sm font-semibold text-foreground">{entry.roleName}</div>
                        {entry.isInvalid ? <Badge variant="destructive">Invalid target role</Badge> : null}
                        {entry.mappingCount === 0 ? <Badge variant="secondary">Unmapped</Badge> : <Badge variant="outline">{formatPlural(entry.mappingCount, "mapping")}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {entry.hasAllianceSpecificMappings ? "Includes alliance-scoped mappings." : "Global alias only or currently unmapped."}
                    </div>
                </div>
                {canEdit ? (
                    <Button type="button" variant="outline" size="sm" onClick={handleOpenCreateDialog}>
                        {entry.mappingCount > 0 ? "Add mapping" : "Set alias"}
                    </Button>
                ) : null}
            </div>

            {entry.mappings.length > 0 ? (
                <div className="space-y-2">
                    {entry.mappings.map((mapping) => (
                        <AliasMappingRow
                            key={mapping.key}
                            entry={entry}
                            mapping={mapping}
                            canEdit={canEdit}
                            onOpenAliasDialog={onOpenAliasDialog}
                            onAliasesChanged={onAliasesChanged}
                        />
                    ))}
                </div>
            ) : (
                <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                    No Discord role is mapped to this Locutus role yet.
                </div>
            )}
        </div>
    );
}

function ManagedRoleRemoveButton({
    endpoint,
    roleId,
    disabled,
    onSuccess,
}: {
    endpoint: CommonEndpoint<AutoRoleManagedRoles, { role?: string }, { role?: string }>;
    roleId: number;
    disabled: boolean;
    onSuccess: (data: AutoRoleManagedRoles) => void;
}) {
    const action = useEndpointAction({
        endpoint,
        failureTitle: `Could not remove role ${roleId}`,
        onSuccessData: onSuccess,
    });

    const handleConfirm = useCallback(() => {
        action.run({ role: String(roleId) });
    }, [action, roleId]);

    return (
        <InlineConfirmButton
            label="Remove"
            confirmLabel="Confirm remove"
            onConfirm={handleConfirm}
            disabled={disabled}
            pending={action.isPending}
            buttonVariant="outline"
            confirmVariant="destructive"
            size="sm"
        />
    );
}

function ManagedRoleRow({
    title,
    details,
    duplicateKey,
    roleId,
    roleNames,
    removeEndpoint,
    canManage,
    onManagedRolesChanged,
}: {
    title: string;
    details: ReactNode;
    duplicateKey: boolean;
    roleId: number;
    roleNames?: Record<string, string> | null;
    removeEndpoint: CommonEndpoint<AutoRoleManagedRoles, { role?: string }, { role?: string }>;
    canManage: boolean;
    onManagedRolesChanged: (data: AutoRoleManagedRoles) => void;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/70 bg-background px-2.5 py-2">
            <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                    <span>{title}</span>
                    <Badge variant="outline">{formatDiscordRoleLabel(roleId, roleNames)}</Badge>
                    {duplicateKey ? <Badge variant="destructive">Duplicate key</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">{details}</div>
            </div>
            {canManage ? (
                <ManagedRoleRemoveButton
                    endpoint={removeEndpoint}
                    roleId={roleId}
                    disabled={!canManage}
                    onSuccess={onManagedRolesChanged}
                />
            ) : null}
        </div>
    );
}

function ManagedRoleGroup({
    title,
    description,
    addForm,
    children,
}: {
    title: string;
    description: string;
    addForm: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-3">
            <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">{title}</div>
                <div className="text-xs leading-5 text-muted-foreground">{description}</div>
            </div>
            {addForm}
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function AutoroleSinglePanel({
    canRun,
    onResult,
    pending,
}: {
    canRun: boolean;
    onResult: (force: boolean, values: RoleFormArgs) => void;
    pending: boolean;
}) {
    const memberArgument = useMemo(() => CM.get(coerceRoleCommandPath(ROLE_AUTOROLE_COMMAND)).getArguments().find((arg) => arg.name === "member") ?? null, []);
    const [member, setMember] = useState("");

    const setMemberValue = useCallback((_: string, nextValue: string) => {
        setMember(nextValue);
    }, []);

    const handlePreview = useCallback(() => {
        onResult(false, { member });
    }, [member, onResult]);

    const handleRun = useCallback(() => {
        onResult(true, { member, force: "true" });
    }, [member, onResult]);

    const runDisabled = !canRun || pending || !member.trim();

    return (
        <AutoRoleResultMeta title="Single member" description="Preview or execute autorole for one guild member.">
            {memberArgument ? (
                <ArgInput
                    argName="member"
                    breakdown={memberArgument.getTypeBreakdown()}
                    initialValue={member}
                    setOutputValue={setMemberValue}
                />
            ) : (
                <div className="text-sm text-destructive">Could not load the member argument metadata.</div>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={runDisabled} onClick={handlePreview}>
                    {pending ? <Loading size={3} variant="ripple" /> : "Preview member"}
                </Button>
                <Button type="button" variant="destructive" size="sm" disabled={runDisabled} onClick={handleRun}>
                    {pending ? <Loading size={3} variant="ripple" /> : "Run member"}
                </Button>
            </div>
        </AutoRoleResultMeta>
    );
}

function AutoroleBulkPanel({
    canRun,
    onPreview,
    onRun,
    pending,
}: {
    canRun: boolean;
    onPreview: () => void;
    onRun: () => void;
    pending: boolean;
}) {
    return (
        <AutoRoleResultMeta title="Whole guild" description="Preview the guild-wide autorole pass or run it with force=true.">
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!canRun || pending} onClick={onPreview}>
                    {pending ? <Loading size={3} variant="ripple" /> : "Preview all"}
                </Button>
                <InlineConfirmButton
                    label="Run all"
                    confirmLabel="Confirm run all"
                    onConfirm={onRun}
                    disabled={!canRun}
                    pending={pending}
                    buttonVariant="destructive"
                    confirmVariant="destructive"
                    size="sm"
                />
            </div>
        </AutoRoleResultMeta>
    );
}

function SingleAutoRoleResultCard({
    result,
    roleNames,
}: {
    result: AutoRoleResult;
    roleNames?: Record<string, string> | null;
}) {
    return (
        <Card>
            <CardHeader className="space-y-1 border-b border-border/70 pb-3">
                <CardTitle className="text-base">Latest single-member autorole result</CardTitle>
                <CardDescription>
                    Preview and execution payloads share the same structured response; execution simply fills the applied fields.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
                <AutoRoleSyncCard sync={result.sync} roleNames={roleNames} />
                <RoleIdList title="Roles to create" roleIds={result.create_roles} roleNames={roleNames} />
                <RenameList title="Roles to rename" renames={result.rename_roles} roleNames={roleNames} />
                <RoleIdList title="Roles created" roleIds={result.created_roles} roleNames={roleNames} />
                <RenameList title="Roles renamed" renames={result.renamed_roles} roleNames={roleNames} />
                <AutoRoleIssuesList title="Top-level execution issues" issues={result.execution_issues} roleNames={roleNames} />
                <AutoRoleMemberCard result={result.result} roleNames={roleNames} />
            </CardContent>
        </Card>
    );
}

function BulkAutoRoleResultCard({
    result,
    roleNames,
}: {
    result: AutoRoleBulkResult;
    roleNames?: Record<string, string> | null;
}) {
    const interestingResults = useMemo(
        () => result.results.filter((memberResult) => hasAutoRoleMemberActivity(memberResult)),
        [result.results],
    );

    return (
        <Card>
            <CardHeader className="space-y-1 border-b border-border/70 pb-3">
                <CardTitle className="text-base">Latest bulk autorole result</CardTitle>
                <CardDescription>
                    Showing members with planned or applied changes by default to keep the result reviewable.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-xs">
                        <div className="text-muted-foreground">Members evaluated</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{result.results.length}</div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-xs">
                        <div className="text-muted-foreground">Members with changes/issues</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{interestingResults.length}</div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-xs">
                        <div className="text-muted-foreground">Masked non-members</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{result.masked_non_members.length}</div>
                    </div>
                    <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-xs">
                        <div className="text-muted-foreground">Top-level issues</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{result.execution_issues.length}</div>
                    </div>
                </div>
                <AutoRoleSyncCard sync={result.sync} roleNames={roleNames} />
                <RoleIdList title="Roles to create" roleIds={result.create_roles} roleNames={roleNames} />
                <RenameList title="Roles to rename" renames={result.rename_roles} roleNames={roleNames} />
                <RoleIdList title="Roles created" roleIds={result.created_roles} roleNames={roleNames} />
                <RenameList title="Roles renamed" renames={result.renamed_roles} roleNames={roleNames} />
                <AutoRoleIssuesList title="Top-level execution issues" issues={result.execution_issues} roleNames={roleNames} />
                {result.masked_non_members.length > 0 ? (
                    <div className="space-y-1.5 rounded-md border border-border/70 bg-muted/10 p-3">
                        <div className="text-sm font-semibold text-foreground">Masked non-members</div>
                        <div className="grid gap-1.5">
                            {result.masked_non_members.map((member) => (
                                <div key={`${member.user_id}-${member.reason}`} className="rounded-md border border-border/60 bg-background px-2.5 py-2 text-xs">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-medium text-foreground">{member.display_name || member.username}</span>
                                        <Badge variant="outline">@{member.username}</Badge>
                                        <Badge variant="outline">{formatUnmaskedReason(member.reason)}</Badge>
                                        {member.nation_id != null ? <Badge variant="outline">Nation #{member.nation_id}</Badge> : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
                {interestingResults.length > 0 ? (
                    <details className="rounded-md border border-border/70 bg-muted/10 p-3" open>
                        <summary className="cursor-pointer text-sm font-semibold text-foreground">
                            Review member changes ({interestingResults.length})
                        </summary>
                        <div className="mt-3 grid gap-2">
                            {interestingResults.map((memberResult) => (
                                <AutoRoleMemberCard key={`${memberResult.user_id}-${memberResult.nation_id ?? "none"}`} result={memberResult} roleNames={roleNames} />
                            ))}
                        </div>
                    </details>
                ) : (
                    <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                        No member-level role or nickname changes were planned or applied.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function RoleManagementPage() {
    const { session } = useSession();
    const defaultSidebar = useDefaultPageSidebar();
    const { showDialog } = useDialog();
    const [aliasSearch, setAliasSearch] = useState("");
    const [aliasFilterMode, setAliasFilterMode] = useState<AliasFilterMode>("all");
    const [singleResult, setSingleResult] = useState<AutoRoleResult | null>(null);
    const [bulkResult, setBulkResult] = useState<AutoRoleBulkResult | null>(null);
    const [runtimeRoleNames, setRuntimeRoleNames] = useState<Record<string, string>>({});

    const aliasQuery = useQuery({
        ...bulkQueryOptions(LIST_ROLE_ALIASES.endpoint, {}),
        enabled: Boolean(session?.guild),
    });
    const managedRolesQuery = useQuery({
        ...bulkQueryOptions(LIST_AUTOROLE_ROLES.endpoint, {}),
        enabled: Boolean(session?.guild),
    });

    const aliasPermission = usePermission(coerceRoleCommandPath(ROLE_SET_ALIAS_COMMAND), { showDialogOnError: false, enabled: Boolean(session?.guild) });
    const singleAutorolePermission = usePermission(coerceRoleCommandPath(ROLE_AUTOROLE_COMMAND), { showDialogOnError: false, enabled: Boolean(session?.guild) });
    const bulkAutorolePermission = usePermission(coerceRoleCommandPath(ROLE_AUTOASSIGN_COMMAND), { showDialogOnError: false, enabled: Boolean(session?.guild) });

    const canManageAliases = Boolean(aliasPermission.permission?.success);
    const canRunSingleAutorole = Boolean(singleAutorolePermission.permission?.success);
    const canRunBulkAutorole = Boolean(bulkAutorolePermission.permission?.success);
    const managedRolePermissionMode: ManagedRolePermissionMode = bulkAutorolePermission.error
        ? "error"
        : canRunBulkAutorole
        ? "ready"
        : "readonly";

    const aliasEntries = useMemo(
        () => buildRoleAliasEntries(aliasQuery.data?.data as WebRoleAliases | null | undefined),
        [aliasQuery.data?.data],
    );
    const aliasSummary = useMemo(() => summarizeRoleAliases(aliasEntries), [aliasEntries]);
    const managedRoleSummary = useMemo(
        () => summarizeManagedRoles(managedRolesQuery.data?.data as AutoRoleManagedRoles | null | undefined),
        [managedRolesQuery.data?.data],
    );
    const knownRoleNames = useMemo(
        () => mergeRoleNameMaps(aliasQuery.data?.data?.discord_role_names as Record<string, string> | undefined, runtimeRoleNames),
        [aliasQuery.data?.data?.discord_role_names, runtimeRoleNames],
    );

    const permissionMessages = useMemo(() => {
        const messages: string[] = [];
        if (aliasPermission.error) messages.push(`Role alias permission lookup failed: ${aliasPermission.error}`);
        if (singleAutorolePermission.error) messages.push(`Single autorole permission lookup failed: ${singleAutorolePermission.error}`);
        if (bulkAutorolePermission.error) messages.push(`Bulk autorole permission lookup failed: ${bulkAutorolePermission.error}`);
        return messages;
    }, [aliasPermission.error, bulkAutorolePermission.error, singleAutorolePermission.error]);

    const normalizedAliasSearch = aliasSearch.trim().toLowerCase();
    const filteredAliasEntries = useMemo(() => {
        return aliasEntries.filter((entry) => {
            if (aliasFilterMode === "mapped" && entry.mappingCount === 0) {
                return false;
            }

            if (aliasFilterMode === "invalid" && !entry.isInvalid) {
                return false;
            }

            if (!normalizedAliasSearch) {
                return true;
            }

            const searchableText = [
                entry.roleName,
                entry.mappings.map((mapping) => mapping.scopeLabel).join("\n"),
                entry.mappings.map((mapping) => mapping.discordRoleName ?? String(mapping.roleId)).join("\n"),
            ].join("\n").toLowerCase();

            return searchableText.includes(normalizedAliasSearch);
        });
    }, [aliasEntries, aliasFilterMode, normalizedAliasSearch]);

    const mergeRuntimeNames = useCallback((roleNames?: Record<string, string> | null) => {
        if (!roleNames) {
            return;
        }

        setRuntimeRoleNames((current) => mergeRoleNameMaps(current, roleNames));
    }, []);

    const refreshAliases = useCallback(() => {
        void aliasQuery.refetch();
    }, [aliasQuery]);

    const handleAliasSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setAliasSearch(event.target.value);
    }, []);

    const handleAliasFilterChange = useCallback((value: string) => {
        if (value === "all" || value === "mapped" || value === "invalid") {
            setAliasFilterMode(value);
        }
    }, []);

    const handleManagedRolesChanged = useCallback((_updatedManagedRoles: AutoRoleManagedRoles) => {
        void managedRolesQuery.refetch();
    }, [managedRolesQuery]);

    const handleManagedRolesResponse = useCallback((result: { data: AutoRoleManagedRoles }) => {
        handleManagedRolesChanged(result.data);
    }, [handleManagedRolesChanged]);

    const openAliasDialog = useCallback((args: { title: string; description: string; initialValues: RoleSetAliasArgs }) => {
        showDialog(
            args.title,
            <CommandDialogForm
                commandPath={coerceRoleCommandPath(ROLE_SET_ALIAS_COMMAND)}
                initialValues={args.initialValues as Record<string, string>}
                description={args.description}
                showResultDialog
                actionsLayout="sticky"
                onCompleteSuccess={refreshAliases}
            />,
        );
    }, [refreshAliases, showDialog]);

    const singleAutoroleAction = useEndpointAction({
        endpoint: AUTOROLE,
        failureTitle: "Could not run single-member autorole",
        onSuccessData: (data: AutoRoleResult) => {
            setSingleResult(data);
            mergeRuntimeNames(data.role_names);
        },
    });
    const bulkAutoroleAction = useEndpointAction({
        endpoint: AUTOROLEALL,
        failureTitle: "Could not run bulk autorole",
        onSuccessData: (data: AutoRoleBulkResult) => {
            setBulkResult(data);
            mergeRuntimeNames(data.role_names);
        },
    });

    const handleSingleAutoroleRequest = useCallback((force: boolean, values: RoleFormArgs) => {
        singleAutoroleAction.run(force ? values : { member: values.member });
    }, [singleAutoroleAction]);

    const handleBulkPreview = useCallback(() => {
        bulkAutoroleAction.run({});
    }, [bulkAutoroleAction]);

    const handleBulkRun = useCallback(() => {
        bulkAutoroleAction.run({ force: "true" });
    }, [bulkAutoroleAction]);

    const pageHeaderConfig = useMemo<PageHeaderConfig | null>(() => {
        if (!session?.guild) {
            return null;
        }

        return {
            sticky: true,
            title: (
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Role management</h1>
                    <span className="text-xs text-muted-foreground">Aliases, autorole tasks, managed role bindings, and AUTO_ROLE settings</span>
                </div>
            ),
            content: (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{aliasSummary.mappedRoles}/{aliasSummary.totalRoles} aliases mapped</Badge>
                    <Badge variant="outline">{aliasSummary.invalidRoles} invalid aliases</Badge>
                    <Badge variant="outline">{managedRoleSummary.total} managed roles</Badge>
                    <Badge variant="outline">{AUTO_ROLE_SETTING_KEYS.length} AUTO_ROLE settings</Badge>
                </div>
            ),
        } satisfies PageHeaderConfig;
    }, [aliasSummary.invalidRoles, aliasSummary.mappedRoles, aliasSummary.totalRoles, managedRoleSummary.total, session?.guild]);

    usePageSidebar(defaultSidebar);
    usePageHeader(pageHeaderConfig);

    if (!session?.guild) {
        return <LoginPickerPage />;
    }

    return (
        <div className="pb-8">
            <div className="w-full px-3 sm:px-4">
                <div className="mx-auto max-w-6xl space-y-4">
                    {permissionMessages.length > 0 ? (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
                            {permissionMessages.join(" | ")}
                        </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Card>
                            <CardHeader className="space-y-1 pb-2">
                                <CardTitle className="text-sm">Role aliases</CardTitle>
                                <CardDescription>{formatPlural(aliasSummary.totalMappings, "mapping")} across {formatPlural(aliasSummary.mappedRoles, "mapped role")}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-muted-foreground">
                                {aliasSummary.invalidRoles} invalid alias targets
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="space-y-1 pb-2">
                                <CardTitle className="text-sm">Managed roles</CardTitle>
                                <CardDescription>{managedRoleSummary.allianceRoles} alliance, {managedRoleSummary.cityRoles} city, {managedRoleSummary.taxRoles} tax</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-muted-foreground">
                                {managedRoleSummary.duplicateKeys} duplicate key warning(s)
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="space-y-1 pb-2">
                                <CardTitle className="text-sm">Autorole tasks</CardTitle>
                                <CardDescription>Single-member and guild-wide preview/run endpoints</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-muted-foreground">
                                Single: {canRunSingleAutorole ? "ready" : "read-only"} | Bulk: {canRunBulkAutorole ? "ready" : "read-only"}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="space-y-1 pb-2">
                                <CardTitle className="text-sm">AUTO_ROLE settings</CardTitle>
                                <CardDescription>Shared settings browser subset</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-muted-foreground">
                                {AUTO_ROLE_SETTING_KEYS.join(", ")}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <Card>
                            <CardHeader className="space-y-3 border-b border-border/70 pb-3">
                                <div className="space-y-1">
                                    <CardTitle className="text-base">Role aliases</CardTitle>
                                    <CardDescription>
                                        Manage the Discord roles Locutus uses for permission and alert aliases. Reads come from `list_role_aliases`; writes stay command-backed through `/role setalias`.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        value={aliasSearch}
                                        onChange={handleAliasSearchChange}
                                        placeholder="Search aliases"
                                        className="max-w-xs"
                                    />
                                    <Tabs value={aliasFilterMode} onValueChange={handleAliasFilterChange}>
                                        <TabsList>
                                            <TabsTrigger value="all">All</TabsTrigger>
                                            <TabsTrigger value="mapped">Mapped</TabsTrigger>
                                            <TabsTrigger value="invalid">Invalid</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <Button type="button" variant="outline" size="sm" onClick={refreshAliases}>
                                        Refresh aliases
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-3">
                                {aliasQuery.isLoading ? (
                                    <div className="py-6"><Loading variant="ripple" /></div>
                                ) : aliasQuery.error ? (
                                    <div className="text-sm text-destructive">Failed to load role aliases: {aliasQuery.error.message}</div>
                                ) : filteredAliasEntries.length > 0 ? (
                                    <div className="grid gap-3 lg:grid-cols-2">
                                        {filteredAliasEntries.map((entry) => (
                                            <RoleAliasCard
                                                key={entry.ordinal}
                                                entry={entry}
                                                canEdit={canManageAliases}
                                                onOpenAliasDialog={openAliasDialog}
                                                onAliasesChanged={refreshAliases}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">No alias rows match the current filters.</div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="space-y-1 border-b border-border/70 pb-3">
                                    <CardTitle className="text-base">Autorole preview and execution</CardTitle>
                                    <CardDescription>
                                        The autorole endpoints preview by default. Running with `force=true` executes the same planned changes.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-3">
                                    <AutoroleSinglePanel
                                        canRun={canRunSingleAutorole}
                                        onResult={handleSingleAutoroleRequest}
                                        pending={singleAutoroleAction.isPending}
                                    />
                                    <AutoroleBulkPanel
                                        canRun={canRunBulkAutorole}
                                        onPreview={handleBulkPreview}
                                        onRun={handleBulkRun}
                                        pending={bulkAutoroleAction.isPending}
                                    />
                                </CardContent>
                            </Card>

                            {singleResult ? <SingleAutoRoleResultCard result={singleResult} roleNames={knownRoleNames} /> : null}
                            {bulkResult ? <BulkAutoRoleResultCard result={bulkResult} roleNames={knownRoleNames} /> : null}
                        </div>
                    </div>

                    <Card>
                        <CardHeader className="space-y-1 border-b border-border/70 pb-3">
                            <CardTitle className="text-base">Alliance, city, and tax autorole bindings</CardTitle>
                            <CardDescription>
                                These bindings come from `list_autorole_roles`. Adds and removals use the dedicated role-management endpoints rather than command output parsing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-3">
                            {managedRolePermissionMode === "error" ? (
                                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
                                    Managed-role permissions could not be verified. Reads remain available, but writes stay disabled until the permission check succeeds.
                                </div>
                            ) : null}
                            {managedRolesQuery.isLoading ? (
                                <div className="py-6"><Loading variant="ripple" /></div>
                            ) : managedRolesQuery.error ? (
                                <div className="text-sm text-destructive">Failed to load managed roles: {managedRolesQuery.error.message}</div>
                            ) : (
                                <div className="grid gap-4 xl:grid-cols-3">
                                    <ManagedRoleGroup
                                        title="Alliance roles"
                                        description="Map specific alliances to autorole-managed Discord roles."
                                        addForm={managedRolePermissionMode === "ready" ? (
                                            <ApiFormInputs
                                                endpoint={ADD_ALLIANCE_ROLE}
                                                message={<div className="text-xs text-muted-foreground">Rename an existing Discord role into an alliance-scoped autorole binding.</div>}
                                                label="Add alliance role"
                                                handle_response={handleManagedRolesResponse}
                                            />
                                        ) : <div className="text-xs text-muted-foreground">Read-only: alliance role changes require bulk autorole permissions.</div>}
                                    >
                                        {(managedRolesQuery.data?.data?.alliance_roles ?? []).length > 0 ? (
                                            (managedRolesQuery.data?.data?.alliance_roles ?? []).map((entry: AllianceRoleEntry) => (
                                                <ManagedRoleRow
                                                    key={`alliance-${entry.role_id}-${entry.alliance_id}`}
                                                    title={`Alliance #${entry.alliance_id}`}
                                                    details={`Discord role binding for alliance ${entry.alliance_id}.`}
                                                    duplicateKey={entry.duplicate_key}
                                                    roleId={entry.role_id}
                                                    roleNames={knownRoleNames}
                                                    removeEndpoint={REMOVE_ALLIANCE_ROLE}
                                                    canManage={managedRolePermissionMode === "ready"}
                                                    onManagedRolesChanged={handleManagedRolesChanged}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-sm text-muted-foreground">No alliance autorole bindings.</div>
                                        )}
                                    </ManagedRoleGroup>

                                    <ManagedRoleGroup
                                        title="City roles"
                                        description="Bind city ranges to autorole-managed Discord roles."
                                        addForm={managedRolePermissionMode === "ready" ? (
                                            <ApiFormInputs
                                                endpoint={ADD_CITY_ROLE}
                                                message={<div className="text-xs text-muted-foreground">Rename an existing Discord role into a city-range autorole binding.</div>}
                                                label="Add city role"
                                                handle_response={handleManagedRolesResponse}
                                            />
                                        ) : <div className="text-xs text-muted-foreground">Read-only: city role changes require bulk autorole permissions.</div>}
                                    >
                                        {(managedRolesQuery.data?.data?.city_roles ?? []).length > 0 ? (
                                            (managedRolesQuery.data?.data?.city_roles ?? []).map((entry: CityRoleEntry) => (
                                                <ManagedRoleRow
                                                    key={`city-${entry.role_id}-${entry.range_start}-${entry.range_end}`}
                                                    title={`${entry.range_start}-${entry.range_end} cities`}
                                                    details={`Applies to nations within the ${entry.range_start}-${entry.range_end} city range.`}
                                                    duplicateKey={entry.duplicate_key}
                                                    roleId={entry.role_id}
                                                    roleNames={knownRoleNames}
                                                    removeEndpoint={REMOVE_CITY_ROLE}
                                                    canManage={managedRolePermissionMode === "ready"}
                                                    onManagedRolesChanged={handleManagedRolesChanged}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-sm text-muted-foreground">No city-range autorole bindings.</div>
                                        )}
                                    </ManagedRoleGroup>

                                    <ManagedRoleGroup
                                        title="Tax roles"
                                        description="Bind tax rates to autorole-managed Discord roles."
                                        addForm={managedRolePermissionMode === "ready" ? (
                                            <ApiFormInputs
                                                endpoint={ADD_TAX_ROLE}
                                                message={<div className="text-xs text-muted-foreground">Rename an existing Discord role into a tax-rate autorole binding.</div>}
                                                label="Add tax role"
                                                handle_response={handleManagedRolesResponse}
                                            />
                                        ) : <div className="text-xs text-muted-foreground">Read-only: tax role changes require bulk autorole permissions.</div>}
                                    >
                                        {(managedRolesQuery.data?.data?.tax_roles ?? []).length > 0 ? (
                                            (managedRolesQuery.data?.data?.tax_roles ?? []).map((entry: TaxRoleEntry) => (
                                                <ManagedRoleRow
                                                    key={`tax-${entry.role_id}-${entry.money_rate}-${entry.rss_rate}`}
                                                    title={`${entry.money_rate}/${entry.rss_rate} tax`}
                                                    details={`Applies to members on the ${entry.money_rate}/${entry.rss_rate} tax bracket.`}
                                                    duplicateKey={entry.duplicate_key}
                                                    roleId={entry.role_id}
                                                    roleNames={knownRoleNames}
                                                    removeEndpoint={REMOVE_TAX_ROLE}
                                                    canManage={managedRolePermissionMode === "ready"}
                                                    onManagedRolesChanged={handleManagedRolesChanged}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-sm text-muted-foreground">No tax-rate autorole bindings.</div>
                                        )}
                                    </ManagedRoleGroup>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <GuildSettingsSubset
                        title="AUTO_ROLE settings"
                        description="This is a thin wrapper over the shared guild settings browser, scoped to the AUTO_ROLE settings that shape autorole planning and execution."
                        settings={AUTO_ROLE_SETTING_KEYS}
                        emptyMessage="No AUTO_ROLE settings are currently available for this guild."
                    />
                </div>
            </div>
        </div>
    );
}

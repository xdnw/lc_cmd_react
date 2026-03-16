import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiFormInputs } from "@/components/api/apiform";
import { useSession } from "@/components/api/SessionContext";
import ArgInput from "@/components/cmd/ArgInput";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import { useDialog } from "@/components/layout/DialogContext";
import LocalSidebarModeTabs, { type LocalSidebarMode } from "@/components/layout/LocalSidebarModeTabs";
import { usePageHeader, type PageHeaderConfig } from "@/components/layout/PageHeaderContext";
import { useDefaultPageSidebar, usePageSidebar } from "@/components/layout/PageSidebarContext";
import {
    type SidebarNavConfig,
    type SidebarNavItem,
    type SidebarNavStatus,
} from "@/components/layout/SidebarNav";
import useDocumentSectionNavigation from "@/components/layout/useDocumentSectionNavigation";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loading from "@/components/ui/loading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CommonEndpoint, QueryResult } from "@/lib/BulkQuery";
import type {
    AutoRoleBulkResult,
    AutoRoleIssue,
    AutoRoleMemberResult,
    AutoRoleResult,
    AutoRoleSyncState,
    WebAllianceAutoRole,
    WebAutoRoleRoles,
    WebCityAutoRole,
    WebRoleAliases,
    WebTaxAutoRole,
    WebTable,
} from "@/lib/apitypes";
import { COMMANDS } from "@/lib/commands";
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
    TABLE,
} from "@/lib/endpoints";
import { bulkQueryOptions, singleQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";
import LoginPickerPage from "@/pages/login_picker";
import SettingsSubsetSection from "@/pages/settings/components/SettingsSubsetSection";
import {
    deriveSettingsSubsetModel,
    type SettingRow,
} from "@/pages/settings/settingsDomain";
import { useGuildSettingsData } from "@/pages/settings/useGuildSettingsData";
import { useGuildSettingDialogs } from "@/pages/settings/useGuildSettingDialogs";
import { CM, type AnyCommandPath, type CommandArguments } from "@/utils/Command";
import { usePermission } from "@/utils/PermUtil";

import {
    AUTO_ROLE_SETTING_KEYS,
    buildRoleAliasEntries,
    formatAliasScopeLabel,
    formatAllianceLabel,
    formatAutoRoleIssueType,
    formatCityRoleRangeLabel,
    formatDiscordRoleName,
    formatTaxRoleRateLabel,
    formatUnmaskedReason,
    getRoleMention,
    hasAutoRoleMemberActivity,
    mergeRoleNameMaps,
    summarizeManagedRoles,
    type RoleAliasEntry,
    type RoleAliasMapping,
} from "./rolesDomain";

const ROLE_SET_ALIAS_COMMAND: ["role", "setalias"] = ["role", "setalias"];
const ROLE_AUTOROLE_COMMAND: ["role", "autorole"] = ["role", "autorole"];
const ROLE_AUTOASSIGN_COMMAND: ["role", "autoassign"] = ["role", "autoassign"];
const ALLIANCE_NAME_QUERY_COLUMNS = ["{getid}", "{getname}"];

type RoleSetAliasArgs = Partial<CommandArguments<typeof COMMANDS.commands, ["role", "setalias"]>>;
type RoleFormArgs = Record<string, string>;
type AliasFilterMode = "all" | "mapped" | "invalid";
type ManagedRolePermissionMode = "ready" | "readonly" | "error";
type ManagedRoleLike = { role_id: number; duplicate_key: boolean };
type EndpointArgMap = { [key: string]: string | string[] | undefined };
type AutoRoleManagedRoles = WebAutoRoleRoles;
type AllianceRoleEntry = WebAllianceAutoRole;
type CityRoleEntry = WebCityAutoRole;
type TaxRoleEntry = WebTaxAutoRole;
type RolesSidebarSection = {
    id: string;
    label: string;
    meta?: ReactNode;
    items?: RolesSidebarItem[];
};
type RolesSidebarItem = {
    id: string;
    label: string;
    meta?: ReactNode;
    title?: string;
    status?: SidebarNavStatus;
};

const ROLE_SIDEBAR_SECTION_IDS = {
    aliases: "roles.aliases",
    autorole: "roles.autorole",
    autoroleSingle: "roles.autorole.single",
    autoroleBulk: "roles.autorole.bulk",
    autoroleSingleResult: "roles.autorole.single-result",
    autoroleBulkResult: "roles.autorole.bulk-result",
    managedRoles: "roles.managed",
    managedAlliance: "roles.managed.alliance",
    managedCity: "roles.managed.city",
    managedTax: "roles.managed.tax",
    settings: "roles.settings",
} as const;

function coerceRoleCommandPath(path: [string, string]): AnyCommandPath {
    return path as unknown as AnyCommandPath;
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

function addAllianceId(ids: Set<number>, allianceId: number | null | undefined) {
    if (typeof allianceId !== "number" || !Number.isFinite(allianceId) || allianceId <= 0) {
        return;
    }

    ids.add(allianceId);
}

function collectAllianceIdsFromIssues(ids: Set<number>, issues: readonly AutoRoleIssue[]) {
    issues.forEach((issue) => addAllianceId(ids, issue.alliance_id));
}

function collectAllianceIdsFromMemberResult(ids: Set<number>, result: AutoRoleMemberResult) {
    addAllianceId(ids, result.alliance_id);
    collectAllianceIdsFromIssues(ids, result.issues);
    collectAllianceIdsFromIssues(ids, result.execution_issues);
}

function buildAllianceSelection(allianceIds: readonly number[]): string {
    return allianceIds.map((allianceId) => `AA:${allianceId}`).join(",");
}

function parseAllianceNames(table?: WebTable | null): Record<string, string> {
    const rows = Array.isArray(table?.cells) ? table.cells.slice(1) : [];

    return rows.reduce<Record<string, string>>((map, row) => {
        if (!Array.isArray(row)) {
            return map;
        }

        const allianceId = Number(row[0]);
        const allianceName = typeof row[1] === "string" ? row[1].trim() : "";
        if (!Number.isFinite(allianceId) || !allianceName) {
            return map;
        }

        map[String(allianceId)] = allianceName;
        return map;
    }, {});
}

function useEndpointAction<T, A extends { [key: string]: string | string[] | undefined }>(params: {
    endpoint: CommonEndpoint<T, A, A>;
    failureTitle: string;
    onSuccessData?: (data: T) => void;
}) {
    const { endpoint, failureTitle, onSuccessData } = params;
    const queryClient = useQueryClient();
    const { showDialog } = useDialog();

    const mutation = useMutation({
        mutationFn: (args: A) => {
            const sanitizedArgs = Object.fromEntries(
                Object.entries(args).filter(([, value]) => value !== undefined),
            ) as { [key: string]: string | string[] };

            return queryClient.fetchQuery(singleQueryOptions(endpoint.endpoint, sanitizedArgs, 0, 10));
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

    const run = useCallback((args: A) => {
        mutation.mutate(args);
    }, [mutation]);

    return {
        run,
        isPending: mutation.isPending,
    };
}

function PageSection({
    title,
    actions,
    children,
    className,
}: {
    title: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("space-y-4", className)}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            {children}
        </section>
    );
}

function SectionPanel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-3 rounded-md border border-border/70 bg-muted/10 p-3">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            {children}
        </div>
    );
}

function SectionAnchor({
    sectionId,
    getSectionRef,
    children,
    className,
}: {
    sectionId: string;
    getSectionRef: (sectionId: string) => (node: HTMLElement | null) => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div id={sectionId} ref={getSectionRef(sectionId)} className={cn("scroll-mt-28", className)}>
            {children}
        </div>
    );
}

function getRoleSettingSidebarStatus(row: SettingRow): SidebarNavStatus {
    if (!row.flags.isAllowed) {
        return "disabled";
    }

    if (row.flags.invalid) {
        return "error";
    }

    if (!row.editor.inputSupport.supported) {
        return "warning";
    }

    return row.value.hasValue ? "set" : "unset";
}

function getRoleSettingSectionId(settingKey: string): string {
    return `${ROLE_SIDEBAR_SECTION_IDS.settings}.${settingKey}`;
}

function buildRolesSidebarItems({
    sections,
    activeSectionId,
    onSelect,
}: {
    sections: readonly RolesSidebarSection[];
    activeSectionId: string | null;
    onSelect: (sectionId: string) => void;
}): SidebarNavItem[] {
    return sections.flatMap((section) => {
        const childIds = new Set(section.items?.map((item) => item.id) ?? []);
        const sectionInActivePath = activeSectionId != null && childIds.has(activeSectionId);

        const sectionItem: SidebarNavItem = {
            id: section.id,
            label: section.label,
            level: 0,
            tone: "section",
            status: "default",
            meta: section.meta,
            active: activeSectionId === section.id,
            inActivePath: sectionInActivePath,
            onSelect: () => onSelect(section.id),
        };

        const childItems = (section.items ?? []).map((item) => ({
            id: item.id,
            label: item.label,
            level: 1,
            tone: "item",
            title: item.title,
            status: item.status ?? "default",
            meta: item.meta,
            active: activeSectionId === item.id,
            onSelect: () => onSelect(item.id),
        } satisfies SidebarNavItem));

        return [sectionItem, ...childItems];
    });
}

function getRolesSidebarTriggerValue(items: readonly SidebarNavItem[]): string {
    const activeItem = items.find((item) => item.active) ?? items.find((item) => item.inActivePath);
    return activeItem?.label ?? "Browse roles";
}

function buildRolesSidebarConfig({
    items,
    headerContent,
    hasGuild,
}: {
    items: readonly SidebarNavItem[];
    headerContent: ReactNode;
    hasGuild: boolean;
}): SidebarNavConfig {
    return {
        ariaLabel: "Role management navigation",
        layout: "tree",
        headerContent,
        items,
        emptyMessage: hasGuild ? "No role sections available." : "Select a guild to browse role management.",
        mobileTriggerLabel: "Roles",
        mobileTriggerValue: getRolesSidebarTriggerValue(items),
        mobileButtonLabel: "Roles",
        mobileSheetTitle: "Roles",
        mobileSheetSubtitle: "Server role management",
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

function CopyableRoleChip({
    roleId,
    roleNames,
    className,
}: {
    roleId: string | number;
    roleNames?: Record<string, string> | null;
    className?: string;
}) {
    const [copied, setCopied] = useState(false);
    const normalizedRoleId = String(roleId);
    const label = formatDiscordRoleName(normalizedRoleId, roleNames);
    const canCopy = typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function";

    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            setCopied(false);
        }, 1200);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [copied]);

    const handleCopy = useCallback(() => {
        if (!canCopy) {
            return;
        }

        void navigator.clipboard.writeText(getRoleMention(normalizedRoleId)).then(() => {
            setCopied(true);
        });
    }, [canCopy, normalizedRoleId]);

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={canCopy ? `Copy ${getRoleMention(normalizedRoleId)}` : undefined}
            className={cn(
                "inline-flex items-center rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground transition",
                canCopy ? "hover:border-foreground/30 hover:bg-background" : "cursor-default",
                copied && "border-primary/40 bg-primary/5 text-primary",
                className,
            )}
        >
            {label}
        </button>
    );
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
        <div className="space-y-1.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="flex flex-wrap gap-1.5">
                {roleIds.map((roleId) => (
                    <CopyableRoleChip key={`${title}-${roleId}`} roleId={roleId} roleNames={roleNames} />
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
        <div className="space-y-1.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="grid gap-1.5">
                {items.map(([roleId, nextName]) => (
                    <div key={`${title}-${roleId}`} className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 py-2 text-xs text-foreground/85">
                        <CopyableRoleChip roleId={roleId} roleNames={roleNames} />
                        <span className="text-muted-foreground">-&gt;</span>
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
    allianceNames,
}: {
    title: string;
    issues: readonly AutoRoleIssue[];
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
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
                            {issue.role_id != null ? <CopyableRoleChip roleId={issue.role_id} roleNames={roleNames} /> : null}
                            {issue.alliance_id != null ? <Badge variant="outline">{formatAllianceLabel(issue.alliance_id, allianceNames)}</Badge> : null}
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

function AutoRoleSyncSection({
    sync,
    roleNames,
}: {
    sync?: AutoRoleSyncState;
    roleNames?: Record<string, string> | null;
}) {
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
        sync.registered_role != null ? `Registered role: ${formatDiscordRoleName(String(sync.registered_role), roleNames)}` : null,
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
        <SectionPanel title="Current autorole sync state">
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {facts.map((fact) => (
                    <div key={fact} className="rounded-sm border border-border/60 bg-background px-2 py-1 text-xs text-foreground/85">
                        {fact}
                    </div>
                ))}
            </div>
        </SectionPanel>
    );
}

function AutoRoleMemberCard({
    result,
    roleNames,
    allianceNames,
}: {
    result: AutoRoleMemberResult;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
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
                        {result.alliance_id != null ? <Badge variant="outline">{formatAllianceLabel(result.alliance_id, allianceNames)}</Badge> : null}
                    </div>
                </div>
                {hasAutoRoleMemberActivity(result) ? <Badge variant="outline">Changes</Badge> : <Badge variant="secondary">No changes</Badge>}
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

            <AutoRoleIssuesList title="Planning issues" issues={result.issues} roleNames={roleNames} allianceNames={allianceNames} />
            <AutoRoleIssuesList title="Execution issues" issues={result.execution_issues} roleNames={roleNames} allianceNames={allianceNames} />
        </div>
    );
}

function AliasMappingItem({
    entry,
    mapping,
    roleNames,
    allianceNames,
    canEdit,
    onOpenAliasDialog,
    onAliasesChanged,
}: {
    entry: RoleAliasEntry;
    mapping: RoleAliasMapping;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
    canEdit: boolean;
    onOpenAliasDialog: (args: { title: string; initialValues: RoleSetAliasArgs }) => void;
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
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-2 text-xs">
            <span className="text-muted-foreground">{formatAliasScopeLabel(mapping, allianceNames)}</span>
            <CopyableRoleChip roleId={mapping.roleId} roleNames={roleNames} />
            {canEdit ? (
                <>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5" onClick={handleOpenEditDialog}>
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
                        buttonClassName="h-6 px-2"
                        cancelClassName="h-6 px-2"
                        classes="!m-0 !h-6 !w-auto !px-2"
                    />
                </>
            ) : null}
        </div>
    );
}

function RoleAliasRow({
    entry,
    roleNames,
    allianceNames,
    canEdit,
    onOpenAliasDialog,
    onAliasesChanged,
}: {
    entry: RoleAliasEntry;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
    canEdit: boolean;
    onOpenAliasDialog: (args: { title: string; initialValues: RoleSetAliasArgs }) => void;
    onAliasesChanged: () => void;
}) {
    const handleOpenCreateDialog = useCallback(() => {
        onOpenAliasDialog({
            title: `Map ${entry.roleName}`,
            initialValues: {
                locutusRole: entry.roleName,
            },
        });
    }, [entry.roleName, onOpenAliasDialog]);

    return (
        <div
            className={cn(
                "rounded-md border px-3 py-2",
                entry.mappingCount > 0 ? "border-border/70 bg-background" : "border-dashed border-border/60 bg-muted/10",
                entry.isInvalid && "border-destructive/40 bg-destructive/5",
            )}
        >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-foreground">{entry.roleName}</div>
                        {entry.isInvalid ? <Badge variant="destructive">Invalid</Badge> : null}
                    </div>
                    {entry.mappings.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {entry.mappings.map((mapping) => (
                                <AliasMappingItem
                                    key={mapping.key}
                                    entry={entry}
                                    mapping={mapping}
                                    roleNames={roleNames}
                                    allianceNames={allianceNames}
                                    canEdit={canEdit}
                                    onOpenAliasDialog={onOpenAliasDialog}
                                    onAliasesChanged={onAliasesChanged}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
                {canEdit ? (
                    <Button type="button" variant={entry.mappingCount > 0 ? "outline" : "default"} size="sm" onClick={handleOpenCreateDialog}>
                        {entry.mappingCount > 0 ? "Add mapping" : "Set alias"}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

function ManagedRoleRemoveButton<T, A extends EndpointArgMap>({
    endpoint,
    removeArgs,
    failureTitle,
    disabled,
    onSuccess,
}: {
    endpoint: CommonEndpoint<T, A, A>;
    removeArgs: A;
    failureTitle: string;
    disabled: boolean;
    onSuccess: () => void;
}) {
    const action = useEndpointAction({
        endpoint,
        failureTitle,
        onSuccessData: () => {
            onSuccess();
        },
    });

    const handleConfirm = useCallback(() => {
        action.run(removeArgs);
    }, [action, removeArgs]);

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

function ManagedRoleRow<T, A extends EndpointArgMap>({
    label,
    roleId,
    duplicateKey,
    roleNames,
    removeEndpoint,
    removeArgs,
    canManage,
    onManagedRolesChanged,
}: {
    label: string;
    roleId: number;
    duplicateKey: boolean;
    roleNames?: Record<string, string> | null;
    removeEndpoint: CommonEndpoint<T, A, A>;
    removeArgs: A;
    canManage: boolean;
    onManagedRolesChanged: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
            <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{label}</span>
                <CopyableRoleChip roleId={roleId} roleNames={roleNames} />
                {duplicateKey ? <Badge variant="destructive">Duplicate</Badge> : null}
            </div>
            {canManage ? (
                <ManagedRoleRemoveButton
                    endpoint={removeEndpoint}
                    removeArgs={removeArgs}
                    failureTitle={`Could not remove ${label}`}
                    disabled={!canManage}
                    onSuccess={onManagedRolesChanged}
                />
            ) : null}
        </div>
    );
}

function ManagedRoleBlock<T extends ManagedRoleLike, TResponse, TArgs extends EndpointArgMap>({
    title,
    addForm,
    emptyMessage,
    items,
    getKey,
    getLabel,
    getRemoveArgs,
    roleNames,
    removeEndpoint,
    canManage,
    onManagedRolesChanged,
}: {
    title: string;
    addForm: ReactNode;
    emptyMessage: string;
    items: readonly T[];
    getKey: (entry: T) => string;
    getLabel: (entry: T) => string;
    getRemoveArgs: (entry: T) => TArgs;
    roleNames?: Record<string, string> | null;
    removeEndpoint: CommonEndpoint<TResponse, TArgs, TArgs>;
    canManage: boolean;
    onManagedRolesChanged: () => void;
}) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {addForm}
            {items.length > 0 ? (
                <div className="space-y-2">
                    {items.map((entry) => (
                        <ManagedRoleRow
                            key={getKey(entry)}
                            label={getLabel(entry)}
                            roleId={entry.role_id}
                            duplicateKey={entry.duplicate_key}
                            roleNames={roleNames}
                            removeEndpoint={removeEndpoint}
                            removeArgs={getRemoveArgs(entry)}
                            canManage={canManage}
                            onManagedRolesChanged={onManagedRolesChanged}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-sm text-muted-foreground">{emptyMessage}</div>
            )}
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
        <SectionPanel title="Single member">
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
        </SectionPanel>
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
        <SectionPanel title="Whole guild">
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
        </SectionPanel>
    );
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-3 rounded-md border border-border/70 p-4">
            <div className="text-base font-semibold text-foreground">{title}</div>
            {children}
        </div>
    );
}

function SingleAutoRoleResultSection({
    result,
    roleNames,
    allianceNames,
}: {
    result: AutoRoleResult;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
}) {
    return (
        <ResultSection title="Latest single-member autorole result">
            <AutoRoleSyncSection sync={result.sync} roleNames={roleNames} />
            <RoleIdList title="Roles to create" roleIds={result.create_roles} roleNames={roleNames} />
            <RenameList title="Roles to rename" renames={result.rename_roles} roleNames={roleNames} />
            <RoleIdList title="Roles created" roleIds={result.created_roles} roleNames={roleNames} />
            <RenameList title="Roles renamed" renames={result.renamed_roles} roleNames={roleNames} />
            <AutoRoleIssuesList title="Top-level execution issues" issues={result.execution_issues} roleNames={roleNames} allianceNames={allianceNames} />
            <AutoRoleMemberCard result={result.result} roleNames={roleNames} allianceNames={allianceNames} />
        </ResultSection>
    );
}

function BulkAutoRoleResultSection({
    result,
    roleNames,
    allianceNames,
}: {
    result: AutoRoleBulkResult;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
}) {
    const interestingResults = useMemo(
        () => result.results.filter((memberResult) => hasAutoRoleMemberActivity(memberResult)),
        [result.results],
    );

    return (
        <ResultSection title="Latest bulk autorole result">
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
            <AutoRoleSyncSection sync={result.sync} roleNames={roleNames} />
            <RoleIdList title="Roles to create" roleIds={result.create_roles} roleNames={roleNames} />
            <RenameList title="Roles to rename" renames={result.rename_roles} roleNames={roleNames} />
            <RoleIdList title="Roles created" roleIds={result.created_roles} roleNames={roleNames} />
            <RenameList title="Roles renamed" renames={result.renamed_roles} roleNames={roleNames} />
            <AutoRoleIssuesList title="Top-level execution issues" issues={result.execution_issues} roleNames={roleNames} allianceNames={allianceNames} />
            {result.masked_non_members.length > 0 ? (
                <SectionPanel title="Masked non-members">
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
                </SectionPanel>
            ) : null}
            {interestingResults.length > 0 ? (
                <details className="rounded-md border border-border/70 bg-muted/10 p-3" open>
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">
                        Review member changes ({interestingResults.length})
                    </summary>
                    <div className="mt-3 grid gap-2">
                        {interestingResults.map((memberResult) => (
                            <AutoRoleMemberCard
                                key={`${memberResult.user_id}-${memberResult.nation_id ?? "none"}`}
                                result={memberResult}
                                roleNames={roleNames}
                                allianceNames={allianceNames}
                            />
                        ))}
                    </div>
                </details>
            ) : (
                <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                    No member-level role or nickname changes were planned or applied.
                </div>
            )}
        </ResultSection>
    );
}

export default function RoleManagementPage() {
    const { session } = useSession();
    const defaultSidebar = useDefaultPageSidebar();
    const { showDialog } = useDialog();
    const [aliasSearch, setAliasSearch] = useState("");
    const [aliasFilterMode, setAliasFilterMode] = useState<AliasFilterMode>("all");
    const [sidebarMode, setSidebarMode] = useState<LocalSidebarMode>("local");
    const [singleResult, setSingleResult] = useState<AutoRoleResult | null>(null);
    const [bulkResult, setBulkResult] = useState<AutoRoleBulkResult | null>(null);
    const [runtimeRoleNames, setRuntimeRoleNames] = useState<Record<string, string>>({});
    const [settingsWarning, setSettingsWarning] = useState<string | null>(null);
    const {
        hasGuild,
        listQuery: settingsListQuery,
        normalized: normalizedSettings,
        refetchAll: refetchAllSettings,
        refreshSingleSetting,
        viewTableTo,
    } = useGuildSettingsData();

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
    const managedRoles = useMemo(
        () => managedRolesQuery.data?.data as AutoRoleManagedRoles | null | undefined,
        [managedRolesQuery.data?.data],
    );
    const knownRoleNames = useMemo(
        () => mergeRoleNameMaps(aliasQuery.data?.data?.discord_role_names as Record<string, string> | undefined, runtimeRoleNames),
        [aliasQuery.data?.data?.discord_role_names, runtimeRoleNames],
    );
    const autoRoleSettingsSubset = useMemo(
        () => deriveSettingsSubsetModel(normalizedSettings.rows, AUTO_ROLE_SETTING_KEYS),
        [normalizedSettings.rows],
    );

    const allianceIds = useMemo(() => {
        const ids = new Set<number>();

        aliasEntries.forEach((entry) => {
            entry.mappings.forEach((mapping) => addAllianceId(ids, mapping.allianceId));
        });
        (managedRoles?.alliance_roles ?? []).forEach((entry) => addAllianceId(ids, entry.alliance_id));

        if (singleResult) {
            collectAllianceIdsFromIssues(ids, singleResult.execution_issues);
            collectAllianceIdsFromMemberResult(ids, singleResult.result);
        }

        if (bulkResult) {
            collectAllianceIdsFromIssues(ids, bulkResult.execution_issues);
            bulkResult.results.forEach((result) => collectAllianceIdsFromMemberResult(ids, result));
        }

        return Array.from(ids).sort((left, right) => left - right);
    }, [aliasEntries, bulkResult, managedRoles?.alliance_roles, singleResult]);

    const allianceSelection = useMemo(() => buildAllianceSelection(allianceIds), [allianceIds]);
    const allianceNamesQuery = useQuery({
        ...bulkQueryOptions(TABLE.endpoint, {
            type: "DBAlliance",
            selection_str: allianceSelection,
            columns: ALLIANCE_NAME_QUERY_COLUMNS,
        }),
        enabled: Boolean(session?.guild) && allianceIds.length > 0,
    });
    const allianceNames = useMemo(
        () => parseAllianceNames(allianceNamesQuery.data?.data as WebTable | null | undefined),
        [allianceNamesQuery.data?.data],
    );

    const permissionMessages = useMemo(() => {
        const messages: string[] = [];
        if (aliasPermission.error) {
            messages.push(`Role alias permission lookup failed: ${aliasPermission.error}`);
        }
        if (singleAutorolePermission.error) {
            messages.push(`Single autorole permission lookup failed: ${singleAutorolePermission.error}`);
        }
        if (bulkAutorolePermission.error) {
            messages.push(`Bulk autorole permission lookup failed: ${bulkAutorolePermission.error}`);
        }
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
                ...entry.mappings.flatMap((mapping) => [
                    formatAliasScopeLabel(mapping, allianceNames),
                    mapping.scopeLabel,
                    formatDiscordRoleName(mapping.roleId, knownRoleNames),
                    String(mapping.roleId),
                ]),
            ].join("\n").toLowerCase();

            return searchableText.includes(normalizedAliasSearch);
        });
    }, [aliasEntries, aliasFilterMode, allianceNames, knownRoleNames, normalizedAliasSearch]);

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

    const refreshManagedRoles = useCallback(() => {
        void managedRolesQuery.refetch();
    }, [managedRolesQuery]);

    const handleRefreshAutoRoleSetting = useCallback((settingKey: string) => {
        void refreshSingleSetting(settingKey).then((errorMessage) => {
            setSettingsWarning(errorMessage);
        });
    }, [refreshSingleSetting]);

    const { openEditDialog: openAutoRoleSettingEditDialog, openHelpDialog: openAutoRoleSettingHelpDialog } = useGuildSettingDialogs(handleRefreshAutoRoleSetting);

    const handleRefreshAutoRoleSettings = useCallback(() => {
        setSettingsWarning(null);
        refetchAllSettings();
    }, [refetchAllSettings]);

    const handleSidebarModeChange = useCallback((nextMode: LocalSidebarMode) => {
        setSidebarMode(nextMode);
    }, []);

    const handleManagedRolesResponse = useCallback((_result: { data: unknown }) => {
        refreshManagedRoles();
    }, [refreshManagedRoles]);

    const openAliasDialog = useCallback((args: { title: string; initialValues: RoleSetAliasArgs }) => {
        showDialog(
            args.title,
            <CommandDialogForm
                commandPath={coerceRoleCommandPath(ROLE_SET_ALIAS_COMMAND)}
                initialValues={args.initialValues as Record<string, string>}
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
            title: <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Role management</h1>,
        } satisfies PageHeaderConfig;
    }, [session?.guild]);

    const managedRoleReadOnlyMessage = bulkAutorolePermission.error ?? "Requires bulk autorole permission.";
    const managedRoleCanWrite = managedRolePermissionMode === "ready";
    const getAllianceRoleKey = useCallback((entry: AllianceRoleEntry) => `alliance-${entry.role_id}-${entry.alliance_id}`, []);
    const getAllianceRoleLabel = useCallback((entry: AllianceRoleEntry) => formatAllianceLabel(entry.alliance_id, allianceNames), [allianceNames]);
    const getAllianceRoleRemoveArgs = useCallback((entry: AllianceRoleEntry) => ({ alliance: String(entry.alliance_id) }), []);
    const getCityRoleKey = useCallback((entry: CityRoleEntry) => `city-${entry.role_id}-${entry.range_start}-${entry.range_end}`, []);
    const getCityRoleLabel = useCallback((entry: CityRoleEntry) => formatCityRoleRangeLabel(entry.range_start, entry.range_end), []);
    const getCityRoleRemoveArgs = useCallback((entry: CityRoleEntry) => ({ range: formatCityRoleRangeLabel(entry.range_start, entry.range_end) }), []);
    const getTaxRoleKey = useCallback((entry: TaxRoleEntry) => `tax-${entry.role_id}-${entry.money_rate}-${entry.rss_rate}`, []);
    const getTaxRoleLabel = useCallback((entry: TaxRoleEntry) => formatTaxRoleRateLabel(entry.money_rate, entry.rss_rate), []);
    const getTaxRoleRemoveArgs = useCallback((entry: TaxRoleEntry) => ({ rate: formatTaxRoleRateLabel(entry.money_rate, entry.rss_rate) }), []);
    const managedRoleSummary = useMemo(() => summarizeManagedRoles(managedRoles), [managedRoles]);
    const autoRoleSettingItems = useMemo(() => autoRoleSettingsSubset.flattenedItems.flatMap((item) => {
        if (item.kind !== "setting") {
            return [];
        }

        return [{
            id: getRoleSettingSectionId(item.row.settingKey),
            label: item.row.settingKey,
            title: `${item.row.settingKey} - ${item.row.metadata.helpShort}`,
            status: getRoleSettingSidebarStatus(item.row),
        } satisfies RolesSidebarItem];
    }), [autoRoleSettingsSubset.flattenedItems]);
    const sidebarSections = useMemo<RolesSidebarSection[]>(() => {
        const sections: RolesSidebarSection[] = [
            {
                id: ROLE_SIDEBAR_SECTION_IDS.aliases,
                label: "Role aliases",
                meta: filteredAliasEntries.length,
            },
            {
                id: ROLE_SIDEBAR_SECTION_IDS.autorole,
                label: "Autorole",
                items: [
                    { id: ROLE_SIDEBAR_SECTION_IDS.autoroleSingle, label: "Single member" },
                    { id: ROLE_SIDEBAR_SECTION_IDS.autoroleBulk, label: "Whole guild" },
                    ...(singleResult ? [{ id: ROLE_SIDEBAR_SECTION_IDS.autoroleSingleResult, label: "Latest single-member result" }] : []),
                    ...(bulkResult ? [{ id: ROLE_SIDEBAR_SECTION_IDS.autoroleBulkResult, label: "Latest bulk result" }] : []),
                ],
            },
            {
                id: ROLE_SIDEBAR_SECTION_IDS.managedRoles,
                label: "Alliance, city, and tax roles",
                meta: managedRoleSummary.total,
                items: managedRolesQuery.isLoading || managedRolesQuery.error
                    ? []
                    : [
                        { id: ROLE_SIDEBAR_SECTION_IDS.managedAlliance, label: "Alliance roles", meta: managedRoleSummary.allianceRoles },
                        { id: ROLE_SIDEBAR_SECTION_IDS.managedCity, label: "City roles", meta: managedRoleSummary.cityRoles },
                        { id: ROLE_SIDEBAR_SECTION_IDS.managedTax, label: "Tax roles", meta: managedRoleSummary.taxRoles },
                    ],
            },
            {
                id: ROLE_SIDEBAR_SECTION_IDS.settings,
                label: "AUTO_ROLE settings",
                meta: autoRoleSettingsSubset.presentRows.length,
                items: autoRoleSettingItems,
            },
        ];

        return sections;
    }, [autoRoleSettingItems, autoRoleSettingsSubset.presentRows.length, bulkResult, filteredAliasEntries.length, managedRoleSummary, managedRolesQuery.error, managedRolesQuery.isLoading, singleResult]);
    const sidebarSectionIds = useMemo(
        () => sidebarSections.flatMap((section) => [section.id, ...(section.items ?? []).map((item) => item.id)]),
        [sidebarSections],
    );
    const { activeSectionId, getSectionRef, scrollToSection } = useDocumentSectionNavigation(sidebarSectionIds, {
        activationOffset: 192,
    });
    const handleSelectSidebarSection = useCallback((sectionId: string) => {
        scrollToSection(sectionId);
    }, [scrollToSection]);
    const sidebarItems = useMemo(() => buildRolesSidebarItems({
        sections: sidebarSections,
        activeSectionId,
        onSelect: handleSelectSidebarSection,
    }), [activeSectionId, handleSelectSidebarSection, sidebarSections]);
    const renderAutoRoleSettingItem = useCallback(({ item, defaultNode }: { item: Parameters<NonNullable<React.ComponentProps<typeof SettingsSubsetSection>["renderItem"]>>[0]["item"]; index: number; defaultNode: ReactNode }) => {
        if (item.kind !== "setting") {
            return defaultNode;
        }

        return (
            <SectionAnchor
                key={item.key}
                sectionId={getRoleSettingSectionId(item.row.settingKey)}
                getSectionRef={getSectionRef}
            >
                {defaultNode}
            </SectionAnchor>
        );
    }, [getSectionRef]);
    const sidebarHeaderContent = useMemo(() => (
        <LocalSidebarModeTabs
            localLabel="Roles"
            mode={sidebarMode}
            isRefreshing={aliasQuery.isFetching || managedRolesQuery.isFetching || settingsListQuery.isFetching || allianceNamesQuery.isFetching}
            onModeChange={handleSidebarModeChange}
        />
    ), [aliasQuery.isFetching, allianceNamesQuery.isFetching, handleSidebarModeChange, managedRolesQuery.isFetching, settingsListQuery.isFetching, sidebarMode]);
    const rolesSidebarConfig = useMemo<SidebarNavConfig>(() => buildRolesSidebarConfig({
        items: sidebarItems,
        headerContent: sidebarHeaderContent,
        hasGuild,
    }), [hasGuild, sidebarHeaderContent, sidebarItems]);
    const mainSidebarConfig = useMemo<SidebarNavConfig | null>(() => {
        if (!defaultSidebar) {
            return null;
        }

        return {
            ...defaultSidebar,
            headerContent: sidebarHeaderContent,
        };
    }, [defaultSidebar, sidebarHeaderContent]);
    const activeSidebarConfig = sidebarMode === "local" ? rolesSidebarConfig : mainSidebarConfig;

    usePageSidebar(activeSidebarConfig);
    usePageHeader(pageHeaderConfig);

    if (!hasGuild) {
        return <LoginPickerPage />;
    }

    return (
        <div className="pb-8">
            <div className="w-full px-3 sm:px-4">
                <div className="mx-auto max-w-6xl space-y-8">
                    {permissionMessages.length > 0 ? (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
                            {permissionMessages.join(" | ")}
                        </div>
                    ) : null}

                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.aliases} getSectionRef={getSectionRef}>
                        <PageSection
                            title="Role aliases"
                            actions={(
                                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
                                    <Input
                                        value={aliasSearch}
                                        onChange={handleAliasSearchChange}
                                        placeholder="Search aliases"
                                        className="min-w-48 flex-1 lg:w-56 lg:flex-none"
                                    />
                                    <Tabs value={aliasFilterMode} onValueChange={handleAliasFilterChange} className="w-auto shrink-0">
                                        <TabsList>
                                            <TabsTrigger value="all">All</TabsTrigger>
                                            <TabsTrigger value="mapped">Mapped</TabsTrigger>
                                            <TabsTrigger value="invalid">Invalid</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={refreshAliases}>
                                        Refresh aliases
                                    </Button>
                                </div>
                            )}
                        >
                            {aliasQuery.isLoading ? (
                                <div className="py-6"><Loading variant="ripple" /></div>
                            ) : aliasQuery.error ? (
                                <div className="text-sm text-destructive">Failed to load role aliases: {aliasQuery.error.message}</div>
                            ) : filteredAliasEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredAliasEntries.map((entry) => (
                                        <RoleAliasRow
                                            key={entry.ordinal}
                                            entry={entry}
                                            roleNames={knownRoleNames}
                                            allianceNames={allianceNames}
                                            canEdit={canManageAliases}
                                            onOpenAliasDialog={openAliasDialog}
                                            onAliasesChanged={refreshAliases}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">No alias rows match the current filters.</div>
                            )}
                        </PageSection>
                    </SectionAnchor>

                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.autorole} getSectionRef={getSectionRef}>
                        <PageSection title="Autorole">
                            <div className="grid gap-3 lg:grid-cols-2">
                                <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.autoroleSingle} getSectionRef={getSectionRef}>
                                    <AutoroleSinglePanel
                                        canRun={canRunSingleAutorole}
                                        onResult={handleSingleAutoroleRequest}
                                        pending={singleAutoroleAction.isPending}
                                    />
                                </SectionAnchor>
                                <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.autoroleBulk} getSectionRef={getSectionRef}>
                                    <AutoroleBulkPanel
                                        canRun={canRunBulkAutorole}
                                        onPreview={handleBulkPreview}
                                        onRun={handleBulkRun}
                                        pending={bulkAutoroleAction.isPending}
                                    />
                                </SectionAnchor>
                            </div>
                            {singleResult ? (
                                <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.autoroleSingleResult} getSectionRef={getSectionRef}>
                                    <SingleAutoRoleResultSection result={singleResult} roleNames={knownRoleNames} allianceNames={allianceNames} />
                                </SectionAnchor>
                            ) : null}
                            {bulkResult ? (
                                <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.autoroleBulkResult} getSectionRef={getSectionRef}>
                                    <BulkAutoRoleResultSection result={bulkResult} roleNames={knownRoleNames} allianceNames={allianceNames} />
                                </SectionAnchor>
                            ) : null}
                        </PageSection>
                    </SectionAnchor>

                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.managedRoles} getSectionRef={getSectionRef}>
                        <PageSection title="Alliance, city, and tax roles">
                            {managedRolePermissionMode === "error" ? (
                                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
                                    {bulkAutorolePermission.error}
                                </div>
                            ) : null}
                            {managedRolesQuery.isLoading ? (
                                <div className="py-6"><Loading variant="ripple" /></div>
                            ) : managedRolesQuery.error ? (
                                <div className="text-sm text-destructive">Failed to load managed roles: {managedRolesQuery.error.message}</div>
                            ) : (
                                <div className="space-y-6">
                                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.managedAlliance} getSectionRef={getSectionRef}>
                                        <ManagedRoleBlock
                                            title="Alliance roles"
                                            addForm={managedRoleCanWrite ? (
                                                <ApiFormInputs
                                                    endpoint={ADD_ALLIANCE_ROLE}
                                                    label="Add alliance role"
                                                    handle_response={handleManagedRolesResponse}
                                                />
                                            ) : managedRolePermissionMode === "readonly" ? <div className="text-sm text-muted-foreground">{managedRoleReadOnlyMessage}</div> : null}
                                            emptyMessage="No alliance roles."
                                            items={managedRoles?.alliance_roles ?? []}
                                            getKey={getAllianceRoleKey}
                                            getLabel={getAllianceRoleLabel}
                                            getRemoveArgs={getAllianceRoleRemoveArgs}
                                            roleNames={knownRoleNames}
                                            removeEndpoint={REMOVE_ALLIANCE_ROLE}
                                            canManage={managedRoleCanWrite}
                                            onManagedRolesChanged={refreshManagedRoles}
                                        />
                                    </SectionAnchor>

                                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.managedCity} getSectionRef={getSectionRef}>
                                        <ManagedRoleBlock
                                            title="City roles"
                                            addForm={managedRoleCanWrite ? (
                                                <ApiFormInputs
                                                    endpoint={ADD_CITY_ROLE}
                                                    label="Add city role"
                                                    handle_response={handleManagedRolesResponse}
                                                />
                                            ) : managedRolePermissionMode === "readonly" ? <div className="text-sm text-muted-foreground">{managedRoleReadOnlyMessage}</div> : null}
                                            emptyMessage="No city roles."
                                            items={managedRoles?.city_roles ?? []}
                                            getKey={getCityRoleKey}
                                            getLabel={getCityRoleLabel}
                                            getRemoveArgs={getCityRoleRemoveArgs}
                                            roleNames={knownRoleNames}
                                            removeEndpoint={REMOVE_CITY_ROLE}
                                            canManage={managedRoleCanWrite}
                                            onManagedRolesChanged={refreshManagedRoles}
                                        />
                                    </SectionAnchor>

                                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.managedTax} getSectionRef={getSectionRef}>
                                        <ManagedRoleBlock
                                            title="Tax roles"
                                            addForm={managedRoleCanWrite ? (
                                                <ApiFormInputs
                                                    endpoint={ADD_TAX_ROLE}
                                                    label="Add tax role"
                                                    handle_response={handleManagedRolesResponse}
                                                />
                                            ) : managedRolePermissionMode === "readonly" ? <div className="text-sm text-muted-foreground">{managedRoleReadOnlyMessage}</div> : null}
                                            emptyMessage="No tax roles."
                                            items={managedRoles?.tax_roles ?? []}
                                            getKey={getTaxRoleKey}
                                            getLabel={getTaxRoleLabel}
                                            getRemoveArgs={getTaxRoleRemoveArgs}
                                            roleNames={knownRoleNames}
                                            removeEndpoint={REMOVE_TAX_ROLE}
                                            canManage={managedRoleCanWrite}
                                            onManagedRolesChanged={refreshManagedRoles}
                                        />
                                    </SectionAnchor>
                                </div>
                            )}
                        </PageSection>
                    </SectionAnchor>

                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.settings} getSectionRef={getSectionRef}>
                        <SettingsSubsetSection
                            title="AUTO_ROLE settings"
                            subset={autoRoleSettingsSubset}
                            emptyMessage="No AUTO_ROLE settings are currently available for this guild."
                            renderAs="section"
                            showAvailabilitySummary={false}
                            warning={settingsWarning}
                            schemaErrorCount={normalizedSettings.schemaErrors.length}
                            rowParseErrorCount={normalizedSettings.rowParseErrors.length}
                            isLoading={settingsListQuery.isLoading}
                            error={settingsListQuery.error}
                            onRefreshAll={handleRefreshAutoRoleSettings}
                            onRefreshSetting={handleRefreshAutoRoleSetting}
                            onEdit={openAutoRoleSettingEditDialog}
                            onShowHelp={openAutoRoleSettingHelpDialog}
                            viewTableTo={viewTableTo}
                            renderItem={renderAutoRoleSettingItem}
                        />
                    </SectionAnchor>
                </div>
            </div>
        </div>
    );
}

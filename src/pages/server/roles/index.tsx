import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiFormInputs } from "@/components/api/apiform";
import { useSession } from "@/components/api/SessionContext";
import ArgInput from "@/components/cmd/ArgInput";
import CommandDialogForm from "@/components/cmd/CommandDialogForm";
import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import SearchBar from "@/components/cmd/SearchBar";
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
import usePageSearchListKeyboard, { getPageSearchShortcutLabel } from "@/components/layout/usePageSearchListKeyboard";
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
    getAutoRoleMemberDisplayName,
    getRoleMention,
    hasAutoRoleMemberActivity,
    mergeRoleNameMaps,
    summarizeAutoRoleBulkResult,
    summarizeManagedRoles,
    type AutoRoleBulkIssueBucket,
    type AutoRoleBulkIssueMemberEntry,
    type AutoRoleBulkNicknameBucket,
    type AutoRoleBulkRoleBucket,
    type AutoRoleMaskedMemberBucket,
    type AutoRoleMemberReference,
    type AutoRoleTopLevelIssueBucket,
    type RoleAliasEntry,
    type RoleAliasMapping,
} from "./rolesDomain";

const ROLE_SET_ALIAS_COMMAND: ["role", "setalias"] = ["role", "setalias"];
const ROLE_AUTOROLE_COMMAND: ["role", "autorole"] = ["role", "autorole"];
const ROLE_AUTOASSIGN_COMMAND: ["role", "autoassign"] = ["role", "autoassign"];
const ENTITY_NAME_QUERY_COLUMNS = ["{getid}", "{getname}"];

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

function addNationId(ids: Set<number>, nationId: number | null | undefined) {
    if (typeof nationId !== "number" || !Number.isFinite(nationId) || nationId <= 0) {
        return;
    }

    ids.add(nationId);
}

function collectAllianceIdsFromIssues(ids: Set<number>, issues: readonly AutoRoleIssue[]) {
    issues.forEach((issue) => addAllianceId(ids, issue.alliance_id));
}

function collectAllianceIdsFromMemberResult(ids: Set<number>, result: AutoRoleMemberResult) {
    addAllianceId(ids, result.alliance_id);
    collectAllianceIdsFromIssues(ids, result.issues);
    collectAllianceIdsFromIssues(ids, result.execution_issues);
}

function collectNationIdsFromMemberResult(ids: Set<number>, result: AutoRoleMemberResult) {
    addNationId(ids, result.nation_id);
}

function buildEntitySelection(ids: readonly number[], prefix = ""): string {
    return ids.map((id) => `${prefix}${id}`).join(",");
}

function parseEntityNames(table?: WebTable | null): Record<string, string> {
    const rows = Array.isArray(table?.cells) ? table.cells.slice(1) : [];

    return rows.reduce<Record<string, string>>((map, row) => {
        if (!Array.isArray(row)) {
            return map;
        }

        const entityId = Number(row[0]);
        const entityName = typeof row[1] === "string" ? row[1].trim() : "";
        if (!Number.isFinite(entityId) || !entityName) {
            return map;
        }

        map[String(entityId)] = entityName;
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
        <section className={cn("overflow-hidden rounded-xl border border-border/70 bg-card/50 shadow-sm", className)}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-muted/20 px-3 py-2.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            <div className="space-y-3 px-3 py-3">{children}</div>
        </section>
    );
}

function SectionPanel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-2.5 rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
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
        `Nickname: ${sync.nickname_mode}`,
        `Mask: ${sync.alliance_mask_mode}`,
        sync.alliance_rank ? `Minimum rank: ${sync.alliance_rank}` : null,
        sync.top_x != null ? `Top X: ${sync.top_x}` : null,
        `Ally gov: ${sync.ally_gov_enabled ? "on" : "off"}`,
        `Member apps: ${sync.member_apps_enabled ? "on" : "off"}`,
        sync.registered_role != null ? `Registered: ${formatDiscordRoleName(String(sync.registered_role), roleNames)}` : null,
        `Mask list: ${sync.masked_alliances.length} alliances`,
        `Selection: ${sync.alliance_ids.length} alliances, ${sync.ally_ids.length} allies, ${sync.extension_ids.length} extensions`,
        `Bindings: ${Object.keys(sync.alliance_roles).length} alliance, ${sync.city_roles.length} city, ${sync.tax_roles.length} tax`,
        `Member bindings: ${Object.keys(sync.applicant_roles).length} applicant, ${Object.keys(sync.member_roles).length} member, ${sync.conditional_roles.length} conditional`,
    ].filter((value): value is string => Boolean(value));

    return (
        <SectionPanel title="Autorole settings">
            <div className="flex flex-wrap gap-1.5">
                {facts.map((fact) => (
                    <div key={fact} className="rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground/85">
                        {fact}
                    </div>
                ))}
            </div>
        </SectionPanel>
    );
}

function getPwNationUrl(nationId: number): string {
    return `https://politicsandwar.com/nation/id=${nationId}`;
}

function getPwAllianceUrl(allianceId: number): string {
    return `https://politicsandwar.com/alliance/id=${allianceId}`;
}

function EntityLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline decoration-border/70 underline-offset-4 transition hover:text-primary"
        >
            {label}
        </a>
    );
}

function MemberLabel({
    displayName,
    username,
}: {
    displayName: string;
    username: string;
}) {
    const normalizedUsername = username.trim();
    const normalizedDisplayName = displayName.trim();
    const displayLabel = normalizedUsername && normalizedDisplayName.localeCompare(normalizedUsername, undefined, { sensitivity: "base" }) === 0
        ? `@${normalizedUsername}`
        : normalizedDisplayName;
    const showUsername = Boolean(normalizedUsername) && displayLabel !== `@${normalizedUsername}`;

    return (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-foreground">{displayLabel}</span>
            {showUsername ? <span className="text-muted-foreground">@{normalizedUsername}</span> : null}
        </span>
    );
}

function MemberReferenceLabel({ member }: { member: AutoRoleMemberReference }) {
    return <MemberLabel displayName={member.displayName} username={member.username} />;
}

function AutoRoleMemberLinks({
    nationId,
    allianceId,
    nationNames,
    allianceNames,
}: {
    nationId?: number | null;
    allianceId?: number | null;
    nationNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
}) {
    if (nationId == null && allianceId == null) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {nationId != null ? (
                <span>
                    Nation{" "}
                    <EntityLink
                        href={getPwNationUrl(nationId)}
                        label={nationNames?.[String(nationId)]?.trim() || `Nation #${nationId}`}
                    />
                </span>
            ) : null}
            {allianceId != null ? (
                <span>
                    Alliance{" "}
                    <EntityLink href={getPwAllianceUrl(allianceId)} label={formatAllianceLabel(allianceId, allianceNames)} />
                </span>
            ) : null}
        </div>
    );
}

function AutoRoleMemberList({ members }: { members: readonly AutoRoleMemberReference[] }) {
    return (
        <ul className="grid gap-1.5 text-sm">
            {members.map((member) => (
                <li key={member.userId} className="rounded-md border border-border/60 bg-background px-2.5 py-1.5">
                    <MemberReferenceLabel member={member} />
                </li>
            ))}
        </ul>
    );
}

function formatIssueContext(issue: AutoRoleIssue, roleNames?: Record<string, string> | null, allianceNames?: Record<string, string> | null): string {
    const details = [
        issue.role_id != null ? `Role: ${formatDiscordRoleName(String(issue.role_id), roleNames)}` : null,
        issue.alliance_id != null ? `Alliance: ${formatAllianceLabel(issue.alliance_id, allianceNames)}` : null,
        issue.nickname ? `Nickname: ${issue.nickname}` : null,
        issue.error_type ? issue.error_type : null,
        issue.detail ? issue.detail : null,
    ].filter((value): value is string => Boolean(value));

    return details.join(" | ");
}

function BulkDisclosure({
    summary,
    children,
    tone = "default",
}: {
    summary: ReactNode;
    children: ReactNode;
    tone?: "default" | "warning";
}) {
    return (
        <details className={cn(
            "rounded-md border bg-background px-2.5 py-1.5",
            tone === "warning" ? "border-amber-500/35 bg-amber-500/5" : "border-border/70",
        )}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">{summary}</summary>
            <div className="mt-2">{children}</div>
        </details>
    );
}

function BulkRoleBucketList({
    title,
    buckets,
    roleNames,
}: {
    title: string;
    buckets: readonly AutoRoleBulkRoleBucket[];
    roleNames?: Record<string, string> | null;
}) {
    if (buckets.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="space-y-1.5">
                {buckets.map((bucket) => (
                    <BulkDisclosure
                        key={`${title}-${bucket.roleId}`}
                        summary={<>{formatDiscordRoleName(String(bucket.roleId), roleNames)} ({bucket.members.length})</>}
                    >
                        <AutoRoleMemberList members={bucket.members} />
                    </BulkDisclosure>
                ))}
            </div>
        </div>
    );
}

function BulkNicknameBucketList({
    title,
    buckets,
}: {
    title: string;
    buckets: readonly AutoRoleBulkNicknameBucket[];
}) {
    if (buckets.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="space-y-1.5">
                {buckets.map((bucket) => (
                    <BulkDisclosure
                        key={`${title}-${bucket.nickname}`}
                        summary={<><span className="font-semibold">{bucket.nickname}</span> ({bucket.members.length})</>}
                    >
                        <AutoRoleMemberList members={bucket.members} />
                    </BulkDisclosure>
                ))}
            </div>
        </div>
    );
}

function BulkMemberDisclosureList({
    title,
    summary,
    members,
}: {
    title: string;
    summary: string;
    members: readonly AutoRoleMemberReference[];
}) {
    if (members.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <BulkDisclosure summary={<>{summary} ({members.length})</>}>
                <AutoRoleMemberList members={members} />
            </BulkDisclosure>
        </div>
    );
}

function BulkIssueMemberList({
    entries,
    roleNames,
    allianceNames,
}: {
    entries: readonly AutoRoleBulkIssueMemberEntry[];
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
}) {
    return (
        <ul className="grid gap-1.5 text-sm">
            {entries.map((entry) => {
                const detailText = entry.issues
                    .map((issue) => formatIssueContext(issue, roleNames, allianceNames))
                    .filter(Boolean)
                    .join(" | ");

                return (
                    <li key={`${entry.member.userId}-${entry.member.displayName}`} className="rounded-md border border-border/60 bg-background px-2.5 py-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <MemberReferenceLabel member={entry.member} />
                        </div>
                        {detailText ? <div className="mt-1 text-xs text-muted-foreground">{detailText}</div> : null}
                    </li>
                );
            })}
        </ul>
    );
}

function BulkIssueBucketList({
    title,
    buckets,
    roleNames,
    allianceNames,
}: {
    title: string;
    buckets: readonly AutoRoleBulkIssueBucket[];
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
}) {
    if (buckets.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="space-y-1.5">
                {buckets.map((bucket) => (
                    <BulkDisclosure
                        key={`${title}-${bucket.type}`}
                        tone="warning"
                        summary={<>{formatAutoRoleIssueType(bucket.type)} ({bucket.members.length})</>}
                    >
                        <BulkIssueMemberList entries={bucket.members} roleNames={roleNames} allianceNames={allianceNames} />
                    </BulkDisclosure>
                ))}
            </div>
        </div>
    );
}

function BulkTopLevelIssueList({
    buckets,
    roleNames,
    allianceNames,
}: {
    buckets: readonly AutoRoleTopLevelIssueBucket[];
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
}) {
    if (buckets.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Top-level issues</div>
            <div className="space-y-1.5">
                {buckets.map((bucket) => (
                    <BulkDisclosure
                        key={`top-level-${bucket.type}`}
                        tone="warning"
                        summary={<>{formatAutoRoleIssueType(bucket.type)} ({bucket.issues.length})</>}
                    >
                        <div className="grid gap-1.5 text-sm">
                            {bucket.issues.map((issue, index) => {
                                const detailText = formatIssueContext(issue, roleNames, allianceNames);

                                return (
                                    <div key={`${bucket.type}-${index}`} className="rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-muted-foreground">
                                        {detailText || formatAutoRoleIssueType(issue.type)}
                                    </div>
                                );
                            })}
                        </div>
                    </BulkDisclosure>
                ))}
            </div>
        </div>
    );
}

function BulkMaskedMemberList({ buckets }: { buckets: readonly AutoRoleMaskedMemberBucket[] }) {
    if (buckets.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Masked non-members</div>
            <div className="space-y-1.5">
                {buckets.map((bucket) => (
                    <BulkDisclosure
                        key={`masked-${bucket.reason}`}
                        summary={<>{formatUnmaskedReason(bucket.reason)} ({bucket.members.length})</>}
                    >
                        <AutoRoleMemberList members={bucket.members} />
                    </BulkDisclosure>
                ))}
            </div>
        </div>
    );
}

function AutoRoleMemberResultSummary({
    result,
    roleNames,
    allianceNames,
    nationNames,
}: {
    result: AutoRoleMemberResult;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
    nationNames?: Record<string, string> | null;
}) {
    const hasPlanned = result.create_roles.length > 0
        || result.add_roles.length > 0
        || result.remove_roles.length > 0
        || Boolean(result.nickname)
        || result.clear_nickname;
    const hasApplied = result.added_roles.length > 0
        || result.removed_roles.length > 0
        || Boolean(result.applied_nickname)
        || result.cleared_nickname;

    return (
        <SectionPanel title="Member result">
            <div className="space-y-2 rounded-md border border-border/70 bg-background px-2.5 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <MemberLabel displayName={getAutoRoleMemberDisplayName(result)} username={result.username} />
                    {hasAutoRoleMemberActivity(result) ? <Badge variant="outline">Changes</Badge> : <Badge variant="secondary">No changes</Badge>}
                </div>
                <AutoRoleMemberLinks
                    nationId={result.nation_id}
                    allianceId={result.alliance_id}
                    nationNames={nationNames}
                    allianceNames={allianceNames}
                />

                {(hasPlanned || hasApplied) ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {hasPlanned ? (
                            <div className="space-y-2">
                                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Planned changes</div>
                                <RoleIdList title="Create roles" roleIds={result.create_roles} roleNames={roleNames} />
                                <RoleIdList title="Add roles" roleIds={result.add_roles} roleNames={roleNames} />
                                <RoleIdList title="Remove roles" roleIds={result.remove_roles} roleNames={roleNames} />
                                {result.nickname ? <div className="text-sm text-foreground/85">Set nickname to <span className="font-medium">{result.nickname}</span></div> : null}
                                {result.clear_nickname ? <div className="text-sm text-foreground/85">Clear nickname</div> : null}
                            </div>
                        ) : null}
                        {hasApplied ? (
                            <div className="space-y-2">
                                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Applied changes</div>
                                <RoleIdList title="Added roles" roleIds={result.added_roles} roleNames={roleNames} />
                                <RoleIdList title="Removed roles" roleIds={result.removed_roles} roleNames={roleNames} />
                                {result.applied_nickname ? <div className="text-sm text-foreground/85">Applied nickname <span className="font-medium">{result.applied_nickname}</span></div> : null}
                                {result.cleared_nickname ? <div className="text-sm text-foreground/85">Cleared nickname</div> : null}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">No planned or applied member changes.</div>
                )}
            </div>

            <AutoRoleIssuesList title="Planning issues" issues={result.issues} roleNames={roleNames} allianceNames={allianceNames} />
            <AutoRoleIssuesList title="Execution issues" issues={result.execution_issues} roleNames={roleNames} allianceNames={allianceNames} />
        </SectionPanel>
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
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs">
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
                "rounded-md border px-2.5 py-1.5",
                entry.mappingCount > 0 ? "border-border/70 bg-background" : "border-dashed border-border/60 bg-muted/10",
                entry.isInvalid && "border-destructive/40 bg-destructive/5",
            )}
        >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <div className="text-sm font-semibold text-foreground">{entry.roleName}</div>
                        {entry.roleDescription ? (
                            <div className="min-w-0 text-xs leading-5 text-muted-foreground/85 lg:flex-1 lg:truncate" title={entry.roleDescription}>
                                {entry.roleDescription}
                            </div>
                        ) : null}
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
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-sm">
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

function ResultSection({
    title,
    actions,
    children,
}: {
    title: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-primary/15 bg-primary/3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 bg-primary/5 px-2.5 py-2">
                <div className="text-base font-semibold text-foreground">{title}</div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            <div className="space-y-3 px-2.5 py-2.5">{children}</div>
        </div>
    );
}

function SingleAutoRoleResultSection({
    result,
    roleNames,
    allianceNames,
    nationNames,
    onDismiss,
}: {
    result: AutoRoleResult;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
    nationNames?: Record<string, string> | null;
    onDismiss: () => void;
}) {
    return (
        <ResultSection
            title="Latest single-member autorole result"
            actions={<Button type="button" variant="outline" size="sm" onClick={onDismiss}>Dismiss</Button>}
        >
            <AutoRoleSyncSection sync={result.sync} roleNames={roleNames} />
            <RoleIdList title="Roles to create" roleIds={result.create_roles} roleNames={roleNames} />
            <RenameList title="Roles to rename" renames={result.rename_roles} roleNames={roleNames} />
            <RoleIdList title="Roles created" roleIds={result.created_roles} roleNames={roleNames} />
            <RenameList title="Roles renamed" renames={result.renamed_roles} roleNames={roleNames} />
            <AutoRoleIssuesList title="Top-level execution issues" issues={result.execution_issues} roleNames={roleNames} allianceNames={allianceNames} />
            <AutoRoleMemberResultSummary result={result.result} roleNames={roleNames} allianceNames={allianceNames} nationNames={nationNames} />
        </ResultSection>
    );
}

function BulkAutoRoleResultSection({
    result,
    roleNames,
    allianceNames,
    onDismiss,
}: {
    result: AutoRoleBulkResult;
    roleNames?: Record<string, string> | null;
    allianceNames?: Record<string, string> | null;
    onDismiss: () => void;
}) {
    const summary = useMemo(() => summarizeAutoRoleBulkResult(result), [result]);
    const interestingResults = useMemo(
        () => result.results.filter((memberResult) => hasAutoRoleMemberActivity(memberResult)),
        [result.results],
    );
    const hasPlannedChanges = summary.plannedAdds.length > 0
        || summary.plannedRemovals.length > 0
        || summary.plannedNicknames.length > 0
        || summary.plannedNicknameClears.length > 0;
    const hasAppliedChanges = summary.appliedAdds.length > 0
        || summary.appliedRemovals.length > 0
        || summary.appliedNicknames.length > 0
        || summary.appliedNicknameClears.length > 0;
    const hasBottomIssues = summary.topLevelIssues.length > 0
        || summary.planningIssues.length > 0
        || summary.executionIssues.length > 0
        || summary.maskedNonMembers.length > 0;

    return (
        <ResultSection
            title="Latest bulk autorole result"
            actions={<Button type="button" variant="outline" size="sm" onClick={onDismiss}>Dismiss</Button>}
        >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border border-border/70 bg-muted/10 px-2.5 py-1.5 text-xs">
                    <div className="text-muted-foreground">Members evaluated</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{result.results.length}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/10 px-2.5 py-1.5 text-xs">
                    <div className="text-muted-foreground">Members with changes/issues</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{interestingResults.length}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/10 px-2.5 py-1.5 text-xs">
                    <div className="text-muted-foreground">Masked non-members</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{result.masked_non_members.length}</div>
                </div>
                <div className="rounded-md border border-border/70 bg-muted/10 px-2.5 py-1.5 text-xs">
                    <div className="text-muted-foreground">Top-level issues</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{result.execution_issues.length}</div>
                </div>
            </div>
            <AutoRoleSyncSection sync={result.sync} roleNames={roleNames} />
            {(result.create_roles.length > 0 || Object.keys(result.rename_roles).length > 0 || result.created_roles.length > 0 || Object.keys(result.renamed_roles).length > 0) ? (
                <SectionPanel title="Server role changes">
                    <RoleIdList title="Roles to create" roleIds={result.create_roles} roleNames={roleNames} />
                    <RenameList title="Roles to rename" renames={result.rename_roles} roleNames={roleNames} />
                    <RoleIdList title="Roles created" roleIds={result.created_roles} roleNames={roleNames} />
                    <RenameList title="Roles renamed" renames={result.renamed_roles} roleNames={roleNames} />
                </SectionPanel>
            ) : null}
            {hasPlannedChanges ? (
                <SectionPanel title="Planned member changes">
                    <BulkRoleBucketList title="Add roles" buckets={summary.plannedAdds} roleNames={roleNames} />
                    <BulkRoleBucketList title="Remove roles" buckets={summary.plannedRemovals} roleNames={roleNames} />
                    <BulkNicknameBucketList title="Set nicknames" buckets={summary.plannedNicknames} />
                    <BulkMemberDisclosureList title="Clear nicknames" summary="Clear nickname" members={summary.plannedNicknameClears} />
                </SectionPanel>
            ) : null}
            {hasAppliedChanges ? (
                <SectionPanel title="Applied member changes">
                    <BulkRoleBucketList title="Added roles" buckets={summary.appliedAdds} roleNames={roleNames} />
                    <BulkRoleBucketList title="Removed roles" buckets={summary.appliedRemovals} roleNames={roleNames} />
                    <BulkNicknameBucketList title="Applied nicknames" buckets={summary.appliedNicknames} />
                    <BulkMemberDisclosureList title="Cleared nicknames" summary="Cleared nickname" members={summary.appliedNicknameClears} />
                </SectionPanel>
            ) : null}
            {!hasPlannedChanges && !hasAppliedChanges ? (
                <div className="rounded-md border border-border/70 bg-muted/10 px-2.5 py-1.5 text-sm text-muted-foreground">
                    No grouped member role or nickname changes were produced in this run.
                </div>
            ) : null}
            {hasBottomIssues ? (
                <SectionPanel title="Issues and exceptions">
                    <BulkTopLevelIssueList buckets={summary.topLevelIssues} roleNames={roleNames} allianceNames={allianceNames} />
                    <BulkIssueBucketList title="Planning issues" buckets={summary.planningIssues} roleNames={roleNames} allianceNames={allianceNames} />
                    <BulkIssueBucketList title="Execution issues" buckets={summary.executionIssues} roleNames={roleNames} allianceNames={allianceNames} />
                    <BulkMaskedMemberList buckets={summary.maskedNonMembers} />
                </SectionPanel>
            ) : null}
        </ResultSection>
    );
}

export default function RoleManagementPage() {
    const { session } = useSession();
    const defaultSidebar = useDefaultPageSidebar();
    const { showDialog } = useDialog();
    const aliasSectionScopeRef = useRef<HTMLDivElement | null>(null);
    const aliasSearchRef = useRef<HTMLInputElement | null>(null);
    const aliasRowRefs = useRef<Record<string, HTMLElement | null>>({});
    const [aliasSearch, setAliasSearch] = useState("");
    const [aliasFilterMode, setAliasFilterMode] = useState<AliasFilterMode>("all");
    const [sidebarMode, setSidebarMode] = useState<LocalSidebarMode>("local");
    const [singleResult, setSingleResult] = useState<AutoRoleResult | null>(null);
    const [bulkResult, setBulkResult] = useState<AutoRoleBulkResult | null>(null);
    const [runtimeRoleNames, setRuntimeRoleNames] = useState<Record<string, string>>({});
    const [settingsWarning, setSettingsWarning] = useState<string | null>(null);
    const [activeAliasIndex, setActiveAliasIndex] = useState(0);
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

    const nationIds = useMemo(() => {
        const ids = new Set<number>();

        if (singleResult) {
            collectNationIdsFromMemberResult(ids, singleResult.result);
        }

        if (bulkResult) {
            bulkResult.results.forEach((memberResult) => collectNationIdsFromMemberResult(ids, memberResult));
            bulkResult.masked_non_members.forEach((member) => addNationId(ids, member.nation_id));
        }

        return Array.from(ids).sort((left, right) => left - right);
    }, [bulkResult, singleResult]);

    const allianceSelection = useMemo(() => buildEntitySelection(allianceIds, "AA:"), [allianceIds]);
    const allianceNamesQuery = useQuery({
        ...bulkQueryOptions(TABLE.endpoint, {
            type: "DBAlliance",
            selection_str: allianceSelection,
            columns: ENTITY_NAME_QUERY_COLUMNS,
        }),
        enabled: Boolean(session?.guild) && allianceIds.length > 0,
    });
    const allianceNames = useMemo(
        () => parseEntityNames(allianceNamesQuery.data?.data as WebTable | null | undefined),
        [allianceNamesQuery.data?.data],
    );
    const nationSelection = useMemo(() => buildEntitySelection(nationIds), [nationIds]);
    const nationNamesQuery = useQuery({
        ...bulkQueryOptions(TABLE.endpoint, {
            type: "DBNation",
            selection_str: nationSelection,
            columns: ENTITY_NAME_QUERY_COLUMNS,
        }),
        enabled: Boolean(session?.guild) && nationIds.length > 0,
    });
    const nationNames = useMemo(
        () => parseEntityNames(nationNamesQuery.data?.data as WebTable | null | undefined),
        [nationNamesQuery.data?.data],
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
    const handleAliasSearchClear = useCallback(() => {
        setAliasSearch("");
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

    const openAliasPrimaryAction = useCallback((entry: RoleAliasEntry) => {
        if (!canManageAliases) {
            return;
        }

        openAliasDialog({
            title: `Map ${entry.roleName}`,
            initialValues: {
                locutusRole: entry.roleName,
            },
        });
    }, [canManageAliases, openAliasDialog]);

    const aliasKeyboardResetKey = useMemo(() => `${aliasSearch}\u0001${aliasFilterMode}`, [aliasFilterMode, aliasSearch]);
    const setAliasRowRef = useCallback((rowKey: string, node: HTMLElement | null) => {
        aliasRowRefs.current[rowKey] = node;
    }, []);
    const aliasRowRefHandlers = useMemo(
        () => filteredAliasEntries.map((entry) => (node: HTMLElement | null) => setAliasRowRef(String(entry.ordinal), node)),
        [filteredAliasEntries, setAliasRowRef],
    );
    const scrollAliasIndexIntoView = useCallback((index: number) => {
        const entry = filteredAliasEntries[index];
        if (!entry) {
            return;
        }

        aliasRowRefs.current[String(entry.ordinal)]?.scrollIntoView({ block: "nearest" });
    }, [filteredAliasEntries]);
    const getAliasKeyboardItemId = useCallback((entry: RoleAliasEntry, _index: number) => `role-alias-option-${entry.ordinal}`, []);
    const aliasKeyboardActions = useMemo(() => [{
        trigger: "enter" as const,
        isEnabled: () => canManageAliases,
        run: (entry: RoleAliasEntry) => openAliasPrimaryAction(entry),
    }], [canManageAliases, openAliasPrimaryAction]);
    const aliasKeyboard = usePageSearchListKeyboard({
        enabled: hasGuild && !aliasQuery.isLoading && !aliasQuery.error,
        scopeRef: aliasSectionScopeRef,
        searchRef: aliasSearchRef,
        searchValue: aliasSearch,
        onSearchValueChange: setAliasSearch,
        onSearchClear: handleAliasSearchClear,
        items: filteredAliasEntries,
        activeIndex: activeAliasIndex,
        onActiveIndexChange: setActiveAliasIndex,
        getItemId: getAliasKeyboardItemId,
        listboxLabel: "Role alias results",
        scrollToIndex: scrollAliasIndexIntoView,
        resetActiveIndexKey: aliasKeyboardResetKey,
        actions: aliasKeyboardActions,
    });

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

    const handleDismissSingleResult = useCallback(() => {
        setSingleResult(null);
    }, []);

    const handleDismissBulkResult = useCallback(() => {
        setBulkResult(null);
    }, []);

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
            isRefreshing={aliasQuery.isFetching || managedRolesQuery.isFetching || settingsListQuery.isFetching || allianceNamesQuery.isFetching || nationNamesQuery.isFetching}
            onModeChange={handleSidebarModeChange}
        />
    ), [aliasQuery.isFetching, allianceNamesQuery.isFetching, handleSidebarModeChange, managedRolesQuery.isFetching, nationNamesQuery.isFetching, settingsListQuery.isFetching, sidebarMode]);
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
        <div className="pb-6">
            <div className="w-full px-2.5 sm:px-3.5">
                <div className="mx-auto max-w-6xl space-y-5">
                    {permissionMessages.length > 0 ? (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-950 dark:text-amber-200">
                            {permissionMessages.join(" | ")}
                        </div>
                    ) : null}

                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.aliases} getSectionRef={getSectionRef}>
                        <div ref={aliasSectionScopeRef}>
                            <PageSection
                                title="Role aliases"
                                actions={(
                                    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
                                        <SearchBar
                                            ref={aliasSearchRef}
                                            value={aliasSearch}
                                            onChange={handleAliasSearchChange}
                                            onClear={handleAliasSearchClear}
                                            onKeyDown={aliasKeyboard.onSearchKeyDown}
                                            placeholder={`Press ${getPageSearchShortcutLabel()} to search aliases`}
                                            className="min-w-48 flex-1 lg:w-56 lg:flex-none"
                                            hint="Arrow keys navigate, Enter adds or sets a mapping."
                                            inputProps={aliasKeyboard.searchInputProps}
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
                                    <div className="py-4"><Loading variant="ripple" /></div>
                                ) : aliasQuery.error ? (
                                    <div className="text-sm text-destructive">Failed to load role aliases: {aliasQuery.error.message}</div>
                                ) : filteredAliasEntries.length > 0 ? (
                                    <div {...aliasKeyboard.listProps} className="space-y-2">
                                        {filteredAliasEntries.map((entry, index) => (
                                            <div
                                                key={entry.ordinal}
                                                ref={aliasRowRefHandlers[index]}
                                                {...aliasKeyboard.getItemProps(entry, index)}
                                                className={aliasKeyboard.activeIndex === index ? "rounded-md ring-1 ring-primary/35" : undefined}
                                            >
                                                <RoleAliasRow
                                                    entry={entry}
                                                    roleNames={knownRoleNames}
                                                    allianceNames={allianceNames}
                                                    canEdit={canManageAliases}
                                                    onOpenAliasDialog={openAliasDialog}
                                                    onAliasesChanged={refreshAliases}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">No alias rows match the current filters.</div>
                                )}
                            </PageSection>
                        </div>
                    </SectionAnchor>

                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.autorole} getSectionRef={getSectionRef}>
                        <PageSection title="Autorole">
                            <div className="grid gap-2.5 lg:grid-cols-2">
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
                                    <SingleAutoRoleResultSection result={singleResult} roleNames={knownRoleNames} allianceNames={allianceNames} nationNames={nationNames} onDismiss={handleDismissSingleResult} />
                                </SectionAnchor>
                            ) : null}
                            {bulkResult ? (
                                <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.autoroleBulkResult} getSectionRef={getSectionRef}>
                                    <BulkAutoRoleResultSection result={bulkResult} roleNames={knownRoleNames} allianceNames={allianceNames} onDismiss={handleDismissBulkResult} />
                                </SectionAnchor>
                            ) : null}
                        </PageSection>
                    </SectionAnchor>

                    <SectionAnchor sectionId={ROLE_SIDEBAR_SECTION_IDS.managedRoles} getSectionRef={getSectionRef}>
                        <PageSection title="Alliance, city, and tax roles">
                            {managedRolePermissionMode === "error" ? (
                                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-950 dark:text-amber-200">
                                    {bulkAutorolePermission.error}
                                </div>
                            ) : null}
                            {managedRolesQuery.isLoading ? (
                                <div className="py-4"><Loading variant="ripple" /></div>
                            ) : managedRolesQuery.error ? (
                                <div className="text-sm text-destructive">Failed to load managed roles: {managedRolesQuery.error.message}</div>
                            ) : (
                                <div className="space-y-4">
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
                            className="rounded-xl border border-border/70 bg-card/50 px-3 py-3 shadow-sm"
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

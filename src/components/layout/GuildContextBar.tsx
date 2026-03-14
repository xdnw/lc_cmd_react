import { useMemo, type ReactNode } from "react";

import { useSession } from "@/components/api/SessionContext";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LazyIcon from "@/components/ui/LazyIcon";
import type { WebSession } from "@/lib/apitypes";
import { cn } from "@/lib/utils";
import { hasToken } from "@/utils/Auth";

type ContextAction = {
  label: string;
  to: string;
  requireGuild?: boolean;
  destructive?: boolean;
};

function buildAllianceLabels(names?: string[], ids?: number[]): string[] {
  const safeIds = ids ?? [];
  const safeNames = names ?? [];
  const maxLength = Math.max(safeIds.length, safeNames.length);

  return Array.from({ length: maxLength }, (_, index) => {
    const name = safeNames[index]?.trim();
    const id = safeIds[index];

    if (name && id) {
      return `${name} (${id})`;
    }
    if (name) {
      return name;
    }
    if (id) {
      return `Alliance ${id}`;
    }

    return "";
  }).filter(Boolean);
}

function getDiscordAction(session: WebSession | null): { label: string; destructive?: boolean } | null {
  if (!session?.nation || !session?.user) {
    return null;
  }

  if (!session.registered) {
    return { label: "Link Discord" };
  }

  if (session.registered_nation && session.registered_nation !== session.nation) {
    return { label: "Repair link", destructive: true };
  }

  return null;
}

function buildContextActions({
  hasGuild,
  hasAlliances,
  discordAction,
}: {
  hasGuild: boolean;
  hasAlliances: boolean;
  discordAction: { label: string; destructive?: boolean } | null;
}): ContextAction[] {
  const actions: ContextAction[] = [];

  if (hasGuild && !hasAlliances) {
    actions.push({
      label: "Alliance setup",
      to: "/settings",
      requireGuild: true,
      destructive: true,
    });
  }

  if (discordAction) {
    actions.push({
      label: discordAction.label,
      to: "/unregister",
      destructive: discordAction.destructive,
    });
  }

  return actions;
}

function ActionLinkButton({
  to,
  label,
  requireGuild = false,
  variant = "outline",
  className,
}: {
  to: string;
  label: string;
  requireGuild?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
}) {
  return (
    <Button asChild size="sm" variant={variant} className={className}>
      <ContextPreservingLink to={to} requireGuild={requireGuild}>
        {label}
      </ContextPreservingLink>
    </Button>
  );
}

function CompactMenuTriggerContent({ label }: { label: string }) {
  return (
    <>
      <span className="truncate">{label}</span>
      <LazyIcon name="ChevronDown" size={12} className="shrink-0 text-muted-foreground" />
    </>
  );
}

function MenuDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-2 py-1 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 wrap-break-word text-foreground">{value}</span>
    </div>
  );
}

function MenuLinkItem({
  to,
  label,
  requireGuild = false,
}: {
  to: string;
  label: string;
  requireGuild?: boolean;
}) {
  return (
    <DropdownMenuItem>
      <ContextPreservingLink to={to} requireGuild={requireGuild} className="w-full">
        {label}
      </ContextPreservingLink>
    </DropdownMenuItem>
  );
}

function AllianceMenu({
  allianceLabels,
  delegateServerName,
  faServerName,
  maServerName,
  className,
}: {
  allianceLabels: string[];
  delegateServerName?: string;
  faServerName?: string;
  maServerName?: string;
  className?: string;
}) {
  const triggerLabel = allianceLabels.length > 0
    ? `${allianceLabels.length} alliance${allianceLabels.length === 1 ? "" : "s"}`
    : "Servers";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "shrink-0 text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <CompactMenuTriggerContent label={triggerLabel} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {allianceLabels.length > 0 ? (
          <>
            <DropdownMenuLabel>Registered alliances</DropdownMenuLabel>
            {allianceLabels.map((label) => (
              <div key={label} className="px-2 py-1 text-xs text-foreground">
                {label}
              </div>
            ))}
          </>
        ) : null}

        {delegateServerName || faServerName || maServerName ? (
          <>
            {allianceLabels.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>Shared servers</DropdownMenuLabel>
            {delegateServerName ? <MenuDetailRow label="Delegate" value={delegateServerName} /> : null}
            {faServerName ? <MenuDetailRow label="FA" value={faServerName} /> : null}
            {maServerName ? <MenuDetailRow label="MA" value={maServerName} /> : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GuildMenu({
  session,
  tokenExists,
  guildName,
  hasGuild,
  allianceLabels,
  delegateServerName,
  faServerName,
  maServerName,
}: {
  session: WebSession;
  tokenExists: boolean;
  guildName: string;
  hasGuild: boolean;
  allianceLabels: string[];
  delegateServerName?: string;
  faServerName?: string;
  maServerName?: string;
}) {
  const nationLabel = session.nation_name?.trim() || (session.nation ? `Nation ${session.nation}` : null);
  const allianceLabel = session.alliance_name?.trim() || (session.alliance ? `Alliance ${session.alliance}` : null);
  const discordStatus = !session.registered
    ? "Not linked"
    : session.registered_nation && session.nation && session.registered_nation !== session.nation
      ? "Needs repair"
      : "Linked";
  const showAccountLink = Boolean(session.nation || session.user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: hasGuild ? "outline" : "secondary", size: "sm" }),
          "max-w-46 shrink-0 gap-1.5 px-2 sm:max-w-56",
        )}
      >
        {session.guild_icon ? (
          <img
            src={session.guild_icon}
            alt={guildName}
            className="h-4 w-4 shrink-0 rounded-sm object-cover"
          />
        ) : null}
        <CompactMenuTriggerContent label={guildName} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Guild context</DropdownMenuLabel>
        <MenuDetailRow label="Guild" value={guildName} />
        {nationLabel ? <MenuDetailRow label="Nation" value={nationLabel} /> : null}
        {allianceLabel ? <MenuDetailRow label="Alliance" value={allianceLabel} /> : null}
        <MenuDetailRow label="Discord" value={discordStatus} />

        {allianceLabels.length > 0 || delegateServerName || faServerName || maServerName ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Servers</DropdownMenuLabel>
            {allianceLabels.length > 0 ? (
              <MenuDetailRow label="Alliances" value={`${allianceLabels.length} connected`} />
            ) : null}
            {delegateServerName ? <MenuDetailRow label="Delegate" value={delegateServerName} /> : null}
            {faServerName ? <MenuDetailRow label="FA" value={faServerName} /> : null}
            {maServerName ? <MenuDetailRow label="MA" value={maServerName} /> : null}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <MenuLinkItem to="/guild_select" label={hasGuild ? "Switch guild" : "Select guild"} />
        {showAccountLink ? <MenuLinkItem to="/unregister" label="Manage linked account" /> : null}
        {tokenExists ? <MenuLinkItem to="/logout" label="Logout" /> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContextActions({ actions }: { actions: readonly ContextAction[] }) {
  if (actions.length === 0) {
    return null;
  }

  const isDestructive = actions.some((action) => action.destructive);

  return (
    <>
      <div className="hidden items-center gap-1 lg:flex">
        {actions.map((action) => (
          <ActionLinkButton
            key={`${action.to}-${action.label}`}
            to={action.to}
            label={action.label}
            requireGuild={action.requireGuild}
            variant="outline"
            className={cn(
              "shrink-0",
              action.destructive ? "text-destructive hover:text-destructive" : undefined,
            )}
          />
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Open context actions"
          className={cn(
            buttonVariants({ variant: "outline", size: "iconSm" }),
            "shrink-0 lg:hidden",
            isDestructive ? "text-destructive hover:text-destructive" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LazyIcon name={isDestructive ? "TriangleAlert" : "Settings"} size={14} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Context actions</DropdownMenuLabel>
          {actions.map((action) => (
            <MenuLinkItem
              key={`${action.to}-${action.label}-menu`}
              to={action.to}
              label={action.label}
              requireGuild={action.requireGuild}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function GuildContextControls() {
  const { session, error, isLoading, isFetching, refetchSession } = useSession();
  const tokenExists = hasToken();

  const allianceLabels = useMemo(
    () => buildAllianceLabels(session?.guild_alliances_names, session?.guild_alliances),
    [session?.guild_alliances, session?.guild_alliances_names],
  );

  if (!tokenExists && !session) {
    return null;
  }

  const hasGuild = Boolean(session?.guild);
  const hasAlliances = allianceLabels.length > 0;
  const isRefreshing = isLoading || isFetching;
  const isLoadingContext = tokenExists && !session && isRefreshing;
  const guildName = session?.guild_name?.trim() || (hasGuild ? `Guild ${session?.guild}` : "Select guild");
  const hasSessionError = Boolean(error) || (!session && !isRefreshing);
  const discordAction = getDiscordAction(session ?? null);
  const delegateServerName = session?.delegate_server_name || (session?.delegates_to ? `Guild ${session.delegates_to}` : undefined);
  const faServerName = session?.fa_server_name || (session?.fa_server ? `Guild ${session.fa_server}` : undefined);
  const maServerName = session?.ma_server_name || (session?.ma_server ? `Guild ${session.ma_server}` : undefined);
  const contextActions = useMemo(
    () => buildContextActions({ hasGuild, hasAlliances, discordAction }),
    [discordAction, hasAlliances, hasGuild],
  );

  if (isLoadingContext) {
    return (
      <>
        <span className="shrink-0 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
          Loading context
        </span>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          disabled
          aria-label="Refreshing session"
          className="shrink-0 text-muted-foreground"
        >
          <LazyIcon name="RotateCcw" size={14} className="animate-spin" />
        </Button>
      </>
    );
  }

  if (hasSessionError) {
    return (
      <>
        <span className="shrink-0 rounded-full border border-destructive/35 bg-destructive/5 px-2.5 py-1 text-xs text-destructive">
          Session unavailable
        </span>
        <Button type="button" variant="outline" size="sm" onClick={refetchSession} className="shrink-0">
          Retry
        </Button>
        {tokenExists ? <ActionLinkButton to="/logout" label="Logout" variant="outline" className="shrink-0" /> : null}
      </>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <GuildMenu
        session={session}
        tokenExists={tokenExists}
        guildName={guildName}
        hasGuild={hasGuild}
        allianceLabels={allianceLabels}
        delegateServerName={delegateServerName}
        faServerName={faServerName}
        maServerName={maServerName}
      />

      {hasAlliances || delegateServerName || faServerName || maServerName ? (
        <AllianceMenu
          allianceLabels={allianceLabels}
          delegateServerName={delegateServerName}
          faServerName={faServerName}
          maServerName={maServerName}
          className="hidden md:inline-flex"
        />
      ) : null}

      <ContextActions actions={contextActions} />

      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        onClick={refetchSession}
        disabled={isRefreshing}
        aria-label="Refresh session"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <LazyIcon name="RotateCcw" size={14} className={isRefreshing ? "animate-spin" : undefined} />
      </Button>
    </>
  );
}

export default function GuildContextBar() {
  const { session } = useSession();
  const tokenExists = hasToken();

  if (!tokenExists && !session) {
    return null;
  }

  return (
    <div className="border-b border-border/70 bg-background/92 backdrop-blur supports-backdrop-filter:bg-background/78">
      <div className="overflow-x-auto px-2 py-2 md:px-3">
        <div className="flex min-w-max items-center gap-2">
          <GuildContextControls />
        </div>
      </div>
    </div>
  );
}

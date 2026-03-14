import { useMemo } from "react";

import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { useSession } from "@/components/api/SessionContext";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LazyIcon from "@/components/ui/LazyIcon";
import { cn } from "@/lib/utils";

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

function SummaryChip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function ActionLinkButton({
  to,
  label,
  iconName,
  requireGuild = false,
  variant = "outline",
}: {
  to: string;
  label: string;
  iconName?: string;
  requireGuild?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}) {
  return (
    <Button asChild size="sm" variant={variant}>
      <ContextPreservingLink to={to} requireGuild={requireGuild}>
        {iconName ? <LazyIcon name={iconName} size={14} /> : null}
        {label}
      </ContextPreservingLink>
    </Button>
  );
}

export default function GuildContextBar() {
  const { session, isLoading, isFetching } = useSession();

  const allianceLabels = useMemo(
    () => buildAllianceLabels(session?.guild_alliances_names, session?.guild_alliances),
    [session?.guild_alliances, session?.guild_alliances_names],
  );

  const hasGuild = Boolean(session?.guild);
  const hasAlliances = allianceLabels.length > 0;
  const guildName = session?.guild_name?.trim() || (hasGuild ? `Guild ${session?.guild}` : "No guild selected");
  const guildDescription = !hasGuild
    ? "Choose a guild to unlock guild-scoped workflows and keep the active workspace visible."
    : hasAlliances
      ? "Guild context is active and alliance registrations are available to guided pages."
      : "Guild context is active, but alliance registrations still need attention.";

  return (
    <div className="border-b border-border/70 bg-background/92 backdrop-blur supports-backdrop-filter:bg-background/78">
      <div className="flex flex-col gap-3 px-2 py-2 md:px-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {session?.guild_icon ? (
              <img
                src={session.guild_icon}
                alt={guildName}
                className="mt-0.5 h-9 w-9 shrink-0 rounded-md border border-border/60 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/60">
                <LazyIcon name="Users" size={18} />
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{guildName}</span>
                {!hasGuild ? <Badge variant="outline">Guild required</Badge> : null}
                {hasGuild && hasAlliances ? <Badge variant="secondary">Ready</Badge> : null}
                {hasGuild && !hasAlliances ? <Badge variant="destructive">Needs setup</Badge> : null}
                {session?.delegates_to ? <Badge variant="outline">Delegated</Badge> : null}
                {session?.guild ? (
                  <span className="truncate text-xs text-muted-foreground">{session.guild}</span>
                ) : null}
                {(isLoading || isFetching) ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <LazyIcon name="RotateCcw" size={12} className="animate-spin" />
                    Refreshing
                  </span>
                ) : null}
              </div>

              <p className="max-w-4xl text-xs leading-5 text-muted-foreground">{guildDescription}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasGuild ? (
              <>
                <ActionLinkButton to="/guild_member" label="Member Overview" iconName="Users" requireGuild variant="secondary" />
                <ActionLinkButton to="/settings" label="Server Settings" iconName="Settings" requireGuild />
                <ActionLinkButton to="/guild_select" label="Switch Guild" iconName="ChevronRight" />
              </>
            ) : (
              <>
                <ActionLinkButton to="/guild_select" label="Select Guild" iconName="Users" variant="secondary" />
                <ActionLinkButton to="/commands" label="Commands" iconName="Search" />
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session?.nation_name ? (
            <SummaryChip>
              <LazyIcon name="User" size={12} />
              <span className="font-medium text-foreground">Nation</span>
              <span>{session.nation_name}</span>
              {session.alliance_name ? <span className="text-muted-foreground">in {session.alliance_name}</span> : null}
            </SummaryChip>
          ) : null}

          {hasAlliances ? (
            <SummaryChip>
              <LazyIcon name="Shield" size={12} />
              <span className="font-medium text-foreground">Alliances</span>
              <span>
                {allianceLabels.length <= 2
                  ? allianceLabels.join(", ")
                  : `${allianceLabels.slice(0, 2).join(", ")} +${allianceLabels.length - 2}`}
              </span>
            </SummaryChip>
          ) : hasGuild ? (
            <SummaryChip className="border-destructive/35 bg-destructive/5 text-destructive">
              <LazyIcon name="TriangleAlert" size={12} />
              <span>No alliances registered yet</span>
            </SummaryChip>
          ) : null}

          {session?.delegates_to ? (
            <SummaryChip>
              <LazyIcon name="ArrowRightToLine" size={12} />
              <span className="font-medium text-foreground">Delegates to</span>
              <span>{session.delegate_server_name || `Guild ${session.delegates_to}`}</span>
            </SummaryChip>
          ) : null}

          {session?.fa_server ? (
            <SummaryChip>
              <LazyIcon name="GitPullRequest" size={12} />
              <span className="font-medium text-foreground">FA server</span>
              <span>{session.fa_server_name || `Guild ${session.fa_server}`}</span>
            </SummaryChip>
          ) : null}

          {session?.ma_server ? (
            <SummaryChip>
              <LazyIcon name="MessageSquareText" size={12} />
              <span className="font-medium text-foreground">MA server</span>
              <span>{session.ma_server_name || `Guild ${session.ma_server}`}</span>
            </SummaryChip>
          ) : null}
        </div>

        {hasGuild && !hasAlliances ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-destructive">
              <LazyIcon name="TriangleAlert" size={12} />
              This guild still needs readiness work before alliance-scoped tools feel trustworthy.
            </span>
            <ActionLinkButton to="/settings" label="Open Server Settings" iconName="Settings" requireGuild variant="ghost" />
            <ActionLinkButton to="/commands" label="Open Commands" iconName="Search" variant="ghost" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

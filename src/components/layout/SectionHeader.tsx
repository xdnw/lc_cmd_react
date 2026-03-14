import type { ReactNode } from "react";

import type { AppRouteHeaderAction, AppRouteHeaderBadge } from "@/appRoutes";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LazyIcon from "@/components/ui/LazyIcon";
import { cn } from "@/lib/utils";

function HeaderActionButton({
  action,
  fallbackVariant,
}: {
  action: AppRouteHeaderAction;
  fallbackVariant: AppRouteHeaderAction["variant"];
}) {
  return (
    <Button asChild size="sm" variant={action.variant ?? fallbackVariant ?? "outline"}>
      <ContextPreservingLink
        to={action.to}
        preserveSearchParams={action.preserveSearchParams}
        additionalSearchParams={action.additionalSearchParams}
        requireGuild={action.requireGuild}
      >
        {action.iconName ? <LazyIcon name={action.iconName} size={14} /> : null}
        {action.label}
      </ContextPreservingLink>
    </Button>
  );
}

function HeaderBadge({ badge }: { badge: AppRouteHeaderBadge }) {
  return (
    <Badge variant={badge.variant ?? "outline"} className="h-5 px-2 text-[10px] uppercase tracking-[0.12em]">
      {badge.label}
    </Badge>
  );
}

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  summary?: ReactNode;
  badge?: AppRouteHeaderBadge;
  primaryActions?: readonly AppRouteHeaderAction[];
  secondaryActions?: readonly AppRouteHeaderAction[];
  children?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  summary,
  badge,
  primaryActions = [],
  secondaryActions = [],
  children,
  className,
}: SectionHeaderProps) {
  const hasActions = primaryActions.length > 0 || secondaryActions.length > 0;

  return (
    <header
      className={cn(
        "rounded-xl border border-border/70 bg-card/85 px-3 py-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/70",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {(eyebrow || badge) && (
            <div className="flex flex-wrap items-center gap-2">
              {eyebrow ? (
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {eyebrow}
                </span>
              ) : null}
              {badge ? <HeaderBadge badge={badge} /> : null}
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
            {summary ? (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{summary}</p>
            ) : null}
          </div>

          {children ? <div className="pt-1">{children}</div> : null}
        </div>

        {hasActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[45%] lg:justify-end">
            {secondaryActions.map((action) => (
              <HeaderActionButton key={`${action.label}-${action.to}`} action={action} fallbackVariant="ghost" />
            ))}
            {primaryActions.map((action) => (
              <HeaderActionButton key={`${action.label}-${action.to}`} action={action} fallbackVariant="outline" />
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

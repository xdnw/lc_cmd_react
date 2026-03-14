import { useCallback, useEffect, useMemo, useState } from "react";

import { APP_PRIMARY_NAV_ITEMS, type AppNavSection } from "@/appRoutes";
import { useSession } from "@/components/api/SessionContext";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LazyIcon from "@/components/ui/LazyIcon";
import { cn } from "@/lib/utils";

export interface PrimaryNavRailProps {
  activeSection?: AppNavSection;
  mode?: "desktop" | "mobile";
  className?: string;
}

function RailItem({
  active,
  label,
  summary,
  to,
  iconName,
  requireGuild = false,
  onNavigate,
}: {
  active: boolean;
  label: string;
  summary: string;
  to: string;
  iconName: string;
  requireGuild?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ContextPreservingLink
      to={to}
      requireGuild={requireGuild}
      onClick={onNavigate}
      className={cn(
        "group flex w-full flex-col gap-1 rounded-lg border px-2 py-2 text-left transition-colors",
        active
          ? "border-primary/30 bg-primary/8 text-foreground shadow-sm"
          : "border-border/70 bg-background/70 text-muted-foreground hover:border-border hover:bg-accent/55 hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
            active ? "border-primary/35 bg-primary/12 text-primary" : "border-border/70 bg-muted/55",
          )}
        >
          <LazyIcon name={iconName} size={16} />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{label}</span>
          {requireGuild ? <Badge variant="outline">Guild</Badge> : null}
        </span>
      </span>
      <span className="pl-9 text-[11px] leading-4 text-muted-foreground group-hover:text-muted-foreground/90">{summary}</span>
    </ContextPreservingLink>
  );
}

function RailContent({
  activeSection,
  onNavigate,
}: {
  activeSection?: AppNavSection;
  onNavigate?: () => void;
}) {
  const activeItem = useMemo(
    () => APP_PRIMARY_NAV_ITEMS.find((item) => item.id === activeSection) ?? null,
    [activeSection],
  );
  const { session } = useSession();

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border/70 bg-background/92 p-2 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/78">
      <div className="border-b border-border/70 px-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Navigate</div>
            <div className="pt-1 text-sm font-medium text-foreground">{activeItem?.label ?? "Browse sections"}</div>
          </div>
          {session?.guild ? <Badge variant="secondary">Guild ready</Badge> : <Badge variant="outline">Pick guild</Badge>}
        </div>
        <p className="pt-1 text-[11px] leading-4 text-muted-foreground">
          {activeItem?.summary ?? "Move between the app's shared top-level sections without losing orientation."}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pt-2">
        {APP_PRIMARY_NAV_ITEMS.map((item) => (
          <RailItem
            key={item.id}
            active={item.id === activeSection}
            label={item.label}
            summary={item.summary}
            to={item.to}
            iconName={item.iconName}
            requireGuild={item.requireGuild}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export default function PrimaryNavRail({
  activeSection,
  mode = "desktop",
  className,
}: PrimaryNavRailProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileRail = useCallback(() => {
    setMobileOpen(true);
  }, []);
  const closeMobileRail = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (mode !== "mobile" || !mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, mode]);

  if (mode === "mobile") {
    return (
      <div className={cn("md:hidden", className)}>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/80 px-2 py-2 shadow-sm">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Section</div>
            <div className="pt-0.5 text-sm font-medium text-foreground">{activeSection ?? "Browse sections"}</div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openMobileRail}>
            <LazyIcon name="MoreHorizontal" size={14} />
            Sections
          </Button>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close section navigation"
              className="absolute inset-0"
              onClick={closeMobileRail}
            />
            <div className="absolute inset-y-0 left-0 w-[min(19rem,86vw)] p-2">
              <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/95 px-2 py-2 shadow-sm">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sections</div>
                    <div className="pt-0.5 text-sm font-medium text-foreground">App navigation</div>
                  </div>
                  <Button type="button" variant="ghost" size="iconSm" onClick={closeMobileRail}>
                    <LazyIcon name="X" size={14} />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
                <RailContent activeSection={activeSection} onNavigate={closeMobileRail} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("hidden h-full md:block", className)}>
      <RailContent activeSection={activeSection} />
    </div>
  );
}

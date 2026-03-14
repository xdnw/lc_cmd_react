import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { type SearchParamInput } from "@/components/layout/contextPreservingNavigation";
import { RAIL_SURFACE_CLASSNAME } from "@/components/layout/railSurface";
import Badge from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LazyIcon from "@/components/ui/LazyIcon";
import { cn } from "@/lib/utils";

export type SidebarNavLayout = "cards" | "tree";
export type SidebarNavStatus = "default" | "set" | "unset" | "warning" | "error" | "disabled";
export type SidebarNavTone = "section" | "subsection" | "item";

export interface SidebarNavQuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface SidebarNavItem {
  id: string;
  label: string;
  title?: string;
  description?: ReactNode;
  meta?: ReactNode;
  iconName?: string;
  badgeLabel?: string;
  badgeVariant?: string;
  active?: boolean;
  inActivePath?: boolean;
  disabled?: boolean;
  status?: SidebarNavStatus;
  tone?: SidebarNavTone;
  level?: number;
  to?: string;
  requireGuild?: boolean;
  preserveSearchParams?: readonly string[];
  additionalSearchParams?: Record<string, SearchParamInput>;
  onSelect?: () => void;
  quickAction?: SidebarNavQuickAction;
}

export interface SidebarNavConfig {
  ariaLabel?: string;
  layout?: SidebarNavLayout;
  eyebrow?: string;
  title?: string;
  subtitle?: ReactNode;
  headerMeta?: ReactNode;
  items: readonly SidebarNavItem[];
  emptyMessage?: string;
  mobileTriggerLabel?: string;
  mobileTriggerValue?: ReactNode;
  mobileButtonLabel?: string;
  mobileSheetTitle?: string;
  mobileSheetSubtitle?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export interface SidebarNavProps {
  config: SidebarNavConfig;
  mode?: "desktop" | "mobile";
  className?: string;
}

function getStatusClasses(status: SidebarNavStatus | undefined): string {
  switch (status) {
    case "set":
      return "bg-emerald-500/80 ring-1 ring-emerald-500/20";
    case "unset":
      return "bg-transparent ring-1 ring-border/90";
    case "warning":
      return "bg-amber-500/80 ring-1 ring-amber-500/25";
    case "error":
      return "bg-destructive ring-1 ring-destructive/25";
    case "disabled":
      return "bg-muted-foreground/35 ring-1 ring-muted-foreground/15";
    default:
      return "bg-muted-foreground/60 ring-1 ring-muted-foreground/10";
  }
}

function getToneClasses(tone: SidebarNavTone | undefined): string {
  switch (tone) {
    case "section":
      return "text-[11px] font-semibold tracking-tight";
    case "subsection":
      return "text-[11px] font-medium";
    default:
      return "text-[12px]";
  }
}

function getActiveSidebarItem(items: readonly SidebarNavItem[]): SidebarNavItem | null {
  return items.find((item) => item.active) ?? items.find((item) => item.inActivePath) ?? null;
}

function CardSidebarItem({
  item,
  onNavigate,
}: {
  item: SidebarNavItem;
  onNavigate?: () => void;
}) {
  const handleSelect = useCallback(() => {
    item.onSelect?.();
    onNavigate?.();
  }, [item, onNavigate]);

  const isCurrent = Boolean(item.active);
  const itemClassName = cn(
    "group flex w-full flex-col gap-1 rounded-lg border px-2 py-2 text-left transition-colors",
    isCurrent
      ? "border-primary/30 bg-primary/8 text-foreground shadow-sm"
      : "border-border/70 bg-background/70 text-muted-foreground hover:border-border hover:bg-accent/55 hover:text-foreground",
    item.disabled ? "cursor-not-allowed opacity-50" : null,
  );

  const descriptionClassName = cn(
    "text-[11px] leading-4 text-muted-foreground group-hover:text-muted-foreground/90",
    item.iconName ? "pl-9" : null,
  );

  const content = (
    <>
      <span className="flex items-center gap-2">
        {item.iconName ? (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
              isCurrent ? "border-primary/35 bg-primary/12 text-primary" : "border-border/70 bg-muted/55",
            )}
          >
            <LazyIcon name={item.iconName} size={16} />
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{item.label}</span>
          {item.badgeLabel ? <Badge variant={item.badgeVariant ?? "outline"}>{item.badgeLabel}</Badge> : null}
        </span>
      </span>
      {item.description ? <span className={descriptionClassName}>{item.description}</span> : null}
    </>
  );

  if (item.to && !item.disabled) {
    return (
      <ContextPreservingLink
        to={item.to}
        requireGuild={item.requireGuild}
        preserveSearchParams={item.preserveSearchParams}
        additionalSearchParams={item.additionalSearchParams}
        onClick={handleSelect}
        className={itemClassName}
      >
        {content}
      </ContextPreservingLink>
    );
  }

  return (
    <button type="button" disabled={item.disabled} onClick={handleSelect} className={itemClassName}>
      {content}
    </button>
  );
}

function TreeSidebarItem({
  item,
  onNavigate,
  registerItemRef,
}: {
  item: SidebarNavItem;
  onNavigate?: () => void;
  registerItemRef: (id: string, node: HTMLButtonElement | null) => void;
}) {
  const isCurrent = Boolean(item.active);
  const isCurrentPath = Boolean(item.inActivePath);
  const indent = `${(item.level ?? 0) * 10}px`;

  const handleRef = useCallback(
    (node: HTMLButtonElement | null) => {
      registerItemRef(item.id, node);
    },
    [item.id, registerItemRef],
  );

  const handleSelect = useCallback(() => {
    item.onSelect?.();
    onNavigate?.();
  }, [item, onNavigate]);

  const handleQuickActionClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      item.quickAction?.onClick();
      onNavigate?.();
    },
    [item.quickAction, onNavigate],
  );

  return (
    <div
      className={cn(
        "group flex min-w-0 items-center gap-1",
        (item.level ?? 0) === 0 ? "pt-0.5 first:pt-0" : null,
      )}
      style={{ paddingLeft: indent }}
    >
      <button
        ref={handleRef}
        type="button"
        title={item.title ?? item.label}
        aria-current={isCurrent ? "location" : undefined}
        disabled={item.disabled}
        onClick={handleSelect}
        className={cn(
          "flex h-6 min-w-0 flex-1 items-center gap-1.5 px-1 text-left transition-colors",
          getToneClasses(item.tone),
          isCurrent
            ? "bg-accent text-foreground"
            : isCurrentPath
              ? "bg-muted/35 text-foreground"
              : "text-muted-foreground hover:bg-accent/55 hover:text-foreground",
          item.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        )}
      >
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", getStatusClasses(item.status))}
        />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.meta ? <span className="shrink-0 text-[10px] text-muted-foreground">{item.meta}</span> : null}
      </button>

      {item.quickAction ? (
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          title={item.quickAction.label}
          aria-label={item.quickAction.label}
          disabled={item.quickAction.disabled}
          onClick={handleQuickActionClick}
          className={cn(
            "h-5 w-5 rounded-sm text-muted-foreground transition-opacity",
            isCurrent || isCurrentPath ? "opacity-100" : "opacity-55 hover:opacity-100",
          )}
        >
          {item.quickAction.icon}
        </Button>
      ) : null}
    </div>
  );
}

function SidebarNavContent({
  config,
  onNavigate,
}: {
  config: SidebarNavConfig;
  onNavigate?: () => void;
}) {
  const layout = config.layout ?? "cards";
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeItem = useMemo(() => getActiveSidebarItem(config.items), [config.items]);
  const registerItemRef = useCallback((id: string, node: HTMLButtonElement | null) => {
    itemRefs.current[id] = node;
  }, []);

  useEffect(() => {
    if (layout !== "tree" || !activeItem?.id) {
      return;
    }

    itemRefs.current[activeItem.id]?.scrollIntoView({ block: "nearest" });
  }, [activeItem?.id, layout]);

  const hasHeader = Boolean(config.eyebrow || config.title || config.subtitle || config.headerMeta);
  const navClassName = cn(
    RAIL_SURFACE_CLASSNAME,
    layout === "cards" ? "p-2" : null,
    config.className,
  );

  const contentClassName = layout === "cards"
    ? cn("min-h-0 flex-1 space-y-2 overflow-y-auto", hasHeader ? "pt-2" : null, config.contentClassName)
    : cn(
      "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-0.5 py-0.5",
      hasHeader ? "max-h-[calc(100vh-7.75rem)]" : "max-h-[calc(100vh-1.5rem)]",
      config.contentClassName,
    );

  return (
    <nav aria-label={config.ariaLabel ?? config.title ?? "Section navigation"} className={navClassName}>
      {hasHeader ? (
        <div className={cn("border-b border-border/70", layout === "cards" ? "px-1 pb-2" : "px-2 py-1.5")}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {config.eyebrow ? (
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {config.eyebrow}
                </div>
              ) : null}
              {config.title ? <div className="pt-1 text-sm font-medium text-foreground">{config.title}</div> : null}
            </div>
            {config.headerMeta ? <div className="shrink-0">{config.headerMeta}</div> : null}
          </div>
          {config.subtitle ? <div className="pt-1 text-[11px] leading-4 text-muted-foreground">{config.subtitle}</div> : null}
        </div>
      ) : null}

      <div className={contentClassName}>
        {config.items.length > 0 ? (
          layout === "cards" ? (
            config.items.map((item) => <CardSidebarItem key={item.id} item={item} onNavigate={onNavigate} />)
          ) : (
            <div className="space-y-0.5">
              {config.items.map((item) => (
                <TreeSidebarItem
                  key={item.id}
                  item={item}
                  onNavigate={onNavigate}
                  registerItemRef={registerItemRef}
                />
              ))}
            </div>
          )
        ) : (
          <div className={cn("text-[11px] text-muted-foreground", layout === "cards" ? "px-1 py-2" : "px-1 py-2")}>
            {config.emptyMessage ?? "No sections available."}
          </div>
        )}
      </div>
    </nav>
  );
}

export default function SidebarNav({
  config,
  mode = "desktop",
  className,
}: SidebarNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = useMemo(() => getActiveSidebarItem(config.items), [config.items]);
  const openMobileSidebar = useCallback(() => {
    setMobileOpen(true);
  }, []);
  const closeMobileSidebar = useCallback(() => {
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
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {config.mobileTriggerLabel ?? "Navigate"}
            </div>
            <div className="truncate pt-0.5 text-sm font-medium text-foreground">
              {config.mobileTriggerValue ?? activeItem?.label ?? config.title ?? "Browse"}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openMobileSidebar}>
            <LazyIcon name="MoreHorizontal" size={14} />
            {config.mobileButtonLabel ?? "Open"}
          </Button>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0"
              onClick={closeMobileSidebar}
            />
            <div className="absolute inset-y-0 left-0 w-[min(19rem,86vw)] p-2">
              <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/95 px-2 py-2 shadow-sm">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {config.mobileSheetTitle ?? config.title ?? "Navigation"}
                    </div>
                    <div className="truncate pt-0.5 text-sm font-medium text-foreground">
                      {config.mobileSheetSubtitle ?? config.subtitle ?? "Navigate this view"}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="iconSm" onClick={closeMobileSidebar}>
                    <LazyIcon name="X" size={14} />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
                <SidebarNavContent config={config} onNavigate={closeMobileSidebar} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("hidden h-full md:block", className)}>
      <SidebarNavContent config={config} />
    </div>
  );
}

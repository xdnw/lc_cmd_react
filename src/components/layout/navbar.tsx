import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";

import {
  buildNavbarIconItems,
  getAppRouteLabel,
  getAppRoutePrimaryPath,
  getAppSectionEntry,
  resolveAppRouteConfig,
  type AppRouteConfig,
} from "@/appRoutes";
import { useSession } from "@/components/api/SessionContext";
import { useCommandLauncher } from "@/components/cmd/CommandLauncherContext";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { GuildContextControls } from "@/components/layout/GuildContextBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LazyIcon from "@/components/ui/LazyIcon";
import { ModeToggle } from "@/components/ui/mode-toggle.tsx";
import { cn } from "@/lib/utils";
import { hasToken } from "@/utils/Auth";

type BreadcrumbItem = {
  key: string;
  label: string;
  to?: string;
  requireGuild?: boolean;
  current?: boolean;
  hideOnMobile?: boolean;
};

function humanizeSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCurrentBreadcrumbLabel(routeConfig: AppRouteConfig | null, pathname: string): string | null {
  const routeLabel = getAppRouteLabel(routeConfig);
  if (routeLabel) {
    return routeLabel;
  }

  const routeSegments = (routeConfig ? getAppRoutePrimaryPath(routeConfig) : pathname).split("/").filter(Boolean);
  const staticSegments = routeSegments.filter((segment) => !segment.startsWith(":"));
  const lastStaticSegment = staticSegments[staticSegments.length - 1];
  if (lastStaticSegment) {
    return humanizeSegment(lastStaticSegment);
  }

  const actualSegments = decodeURI(pathname).split("/").filter(Boolean);
  const lastActualSegment = actualSegments[actualSegments.length - 1];
  return lastActualSegment ? humanizeSegment(lastActualSegment) : null;
}

export function buildNavbarBreadcrumbItems(routeConfigs: readonly AppRouteConfig[], pathname: string): BreadcrumbItem[] {
  const matchedRoute = resolveAppRouteConfig(routeConfigs, pathname);
  const items: BreadcrumbItem[] = [
    {
      key: "home",
      label: "Home",
      to: "/home",
    },
  ];

  const section = matchedRoute?.shell?.section;
  const sectionItem = getAppSectionEntry(routeConfigs, section);
  if (sectionItem && sectionItem.to !== "/home") {
    items.push({
      key: `section-${sectionItem.label.toLowerCase()}`,
      label: sectionItem.label,
      to: sectionItem.to,
      requireGuild: sectionItem.requireGuild,
    });
  }

  const currentLabel = getCurrentBreadcrumbLabel(matchedRoute, pathname);
  const lastItem = items[items.length - 1];

  if (currentLabel && currentLabel !== lastItem.label) {
    items.push({
      key: "current",
      label: currentLabel,
      current: true,
    });
  } else {
    lastItem.current = true;
    lastItem.to = undefined;
  }

  if (items.length > 2) {
    items[1].hideOnMobile = true;
  }

  return items;
}

function BreadcrumbLink({
  item,
  hideLabelOnMobile = false,
}: {
  item: BreadcrumbItem;
  hideLabelOnMobile?: boolean;
}) {
  const content = (
    <>
      {item.key === "home" ? <LazyIcon name="House" size={12} className="shrink-0" /> : null}
      <span className={cn("truncate", hideLabelOnMobile ? "hidden sm:inline" : undefined)}>{item.label}</span>
    </>
  );

  const baseClassName = cn(
    "inline-flex min-w-0 max-w-[14rem] items-center gap-1 rounded-full px-2 py-1 transition-colors",
    item.current ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:bg-background hover:text-foreground",
  );

  if (!item.to || item.current) {
    return (
      <span aria-current={item.current ? "page" : undefined} className={baseClassName}>
        {content}
      </span>
    );
  }

  return (
    <ContextPreservingLink to={item.to} requireGuild={item.requireGuild} className={baseClassName}>
      {content}
    </ContextPreservingLink>
  );
}

function NavbarBreadcrumbs({ routeConfigs }: { routeConfigs: readonly AppRouteConfig[] }) {
  const location = useLocation();
  const items = useMemo(
    () => buildNavbarBreadcrumbItems(routeConfigs, location.pathname),
    [location.pathname, routeConfigs],
  );

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="inline-flex min-w-0 items-center gap-1 rounded-full border border-border/70 bg-muted/45 p-1 text-[11px] text-muted-foreground shadow-xs sm:text-xs">
        {items.map((item, index) => {
          const hiddenClassName = item.hideOnMobile ? "hidden md:flex" : "flex";

          return (
            <React.Fragment key={item.key}>
              {index > 0 ? (
                <li aria-hidden className={cn("items-center text-muted-foreground/70", hiddenClassName)}>
                  <LazyIcon name="ChevronRight" size={12} />
                </li>
              ) : null}
              <li className={cn("min-w-0", hiddenClassName)}>
                <BreadcrumbLink item={item} hideLabelOnMobile={item.key === "home" && items.length > 1} />
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function NavbarUtilityLinks({ routeConfigs }: { routeConfigs: readonly AppRouteConfig[] }) {
  const location = useLocation();
  const items = useMemo(
    () => buildNavbarIconItems(routeConfigs, location.pathname),
    [location.pathname, routeConfigs],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {items.map((item) => (
        <Button
          key={item.key}
          asChild
          variant={item.active ? "secondary" : "ghost"}
          size="iconSm"
          className={cn(
            "shrink-0 rounded-md text-muted-foreground hover:text-foreground",
            item.active ? "text-foreground" : undefined,
          )}
        >
          <ContextPreservingLink
            to={item.to}
            requireGuild={item.requireGuild}
            preserveSearchParams={item.preserveSearchParams}
            additionalSearchParams={item.additionalSearchParams}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            title={item.label}
          >
            <LazyIcon name={item.iconName} size={14} />
            <span className="sr-only">{item.label}</span>
          </ContextPreservingLink>
        </Button>
      ))}
    </div>
  );
}

function SearchLauncherTrigger() {
  const { openBrowser } = useCommandLauncher();

  const openCommandLauncher = React.useCallback(() => {
    openBrowser({ query: "" });
  }, [openBrowser]);

  const handleInputPointerDown = React.useCallback((event: React.PointerEvent<HTMLInputElement>) => {
    event.preventDefault();
    openCommandLauncher();
  }, [openCommandLauncher]);

  const handleInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== " " && event.key !== "/") {
      return;
    }

    event.preventDefault();
    openCommandLauncher();
  }, [openCommandLauncher]);

  return (
    <>
      <div className="hidden min-w-60 items-center md:flex lg:w-88">
        <Input
          id="navbar-search"
          className="h-8 w-full rounded-r-none border-r-0 bg-background/80 px-2 text-xs"
          type="search"
          placeholder="Search commands or pages"
          aria-label="Open command launcher"
          aria-haspopup="dialog"
          readOnly
          value=""
          onPointerDown={handleInputPointerDown}
          onKeyDown={handleInputKeyDown}
        />
        <button
          type="button"
          onClick={openCommandLauncher}
          aria-label="Open command launcher"
          className="flex h-8 items-center justify-center rounded-r border border-input border-l-0 bg-secondary px-2 text-secondary-foreground hover:bg-secondary/80"
        >
          <LazyIcon name="Search" size={14} />
        </button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        onClick={openCommandLauncher}
        aria-label="Open command launcher"
        className="shrink-0 rounded-md text-muted-foreground hover:text-foreground md:hidden"
      >
        <LazyIcon name="Search" size={14} />
      </Button>
    </>
  );
}

function NavbarAuthShortcut({ showContextBar }: { showContextBar: boolean }) {
  const { session, isLoading, isFetching } = useSession();
  const tokenExists = hasToken();
  const isAuthenticated = tokenExists || Boolean(session);

  if (showContextBar && isAuthenticated) {
    return null;
  }

  if (isLoading || isFetching) {
    return null;
  }

  const to = isAuthenticated ? "/logout" : "/login";
  const label = isAuthenticated ? "Logout" : "Login";
  const iconName = isAuthenticated ? "LogOut" : "KeyRound";

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden shrink-0 text-muted-foreground hover:text-foreground sm:inline-flex">
        <ContextPreservingLink to={to}>
          <LazyIcon name={iconName} size={14} />
          <span>{label}</span>
        </ContextPreservingLink>
      </Button>
      <Button asChild variant="ghost" size="iconSm" className="shrink-0 rounded-md text-muted-foreground hover:text-foreground sm:hidden">
        <ContextPreservingLink to={to} aria-label={label}>
          <LazyIcon name={iconName} size={14} />
        </ContextPreservingLink>
      </Button>
    </>
  );
}

export default function Navbar({
  routeConfigs,
  showContextBar,
}: {
  routeConfigs: readonly AppRouteConfig[];
  showContextBar: boolean;
}) {
  return (
    <header className="border-b border-border/70 bg-background/92 backdrop-blur supports-backdrop-filter:bg-background/78">
      <div className="flex min-h-12 items-center gap-2 px-2 py-1.5 md:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
          {showContextBar ? (
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <GuildContextControls />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <NavbarBreadcrumbs routeConfigs={routeConfigs} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <NavbarUtilityLinks routeConfigs={routeConfigs} />
          <SearchLauncherTrigger />
          <ModeToggle />
          <NavbarAuthShortcut showContextBar={showContextBar} />
        </div>
      </div>
    </header>
  );
}

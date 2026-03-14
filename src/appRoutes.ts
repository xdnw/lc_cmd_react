import type { ComponentType } from "react";
import { matchPath } from "react-router-dom";

import { CMD_BROWSER_SEARCH_PARAM_KEYS } from "@/components/cmd/cmdBrowserState";

export type AppNavSection = "Home" | "Member" | "Economy" | "War" | "Stats" | "Server" | "Commands";
export type AppRouteSearchParamInput = string | readonly string[] | null | undefined;
export type AppRoutePath = string | readonly string[];
export type AppRouteElement = () => Promise<{ default: ComponentType }>;

export interface AppRouteLinkConfig {
  requireGuild?: boolean;
  preserveSearchParams?: readonly string[];
  additionalSearchParams?: Record<string, AppRouteSearchParamInput>;
}

export interface AppRouteShellConfig {
  section?: AppNavSection;
  showContextBar?: boolean;
  showPrimaryNav?: boolean;
}

export type RecentPageCachePolicy = {
  mode: "none" | "recent";
  ignoredSearchParams?: readonly string[];
};

export interface AppRouteNavigation extends AppRouteLinkConfig {
  sectionPath?: string;
  sidebarLabel?: string;
}

export interface AppRouteConfig {
  path: AppRoutePath;
  element: AppRouteElement;
  protected: boolean;
  cachePolicy?: RecentPageCachePolicy;
  label?: string;
  shell?: AppRouteShellConfig;
  navigation?: AppRouteNavigation;
}

export interface AppSectionHeaderTab extends AppRouteLinkConfig {
  key: string;
  label: string;
  to: string;
  active: boolean;
}

export interface AppSidebarSectionItem extends AppRouteLinkConfig {
  key: string;
  label: string;
  to: string;
  active: boolean;
  inActivePath: boolean;
}

export interface AppSidebarSection {
  key: string;
  label: AppNavSection;
  active: boolean;
  items: AppSidebarSectionItem[];
}

interface VisibleSectionRoute extends AppRouteLinkConfig {
  key: string;
  section: AppNavSection;
  label: string;
  to: string;
}

const RECENT_PAGE_CACHE_POLICY: RecentPageCachePolicy = {
  mode: "recent",
};

const COMMAND_BROWSER_PAGE_CACHE_POLICY: RecentPageCachePolicy = {
  mode: "recent",
  ignoredSearchParams: CMD_BROWSER_SEARCH_PARAM_KEYS,
};

function defineRoute(
  path: AppRoutePath,
  config: Omit<AppRouteConfig, "path" | "protected"> & { protected?: boolean },
): AppRouteConfig {
  return {
    path,
    protected: false,
    ...config,
  };
}

function createPrototypeRoute({
  path,
  label,
  section,
  showPrimaryNav = true,
  element,
}: {
  path: AppRoutePath;
  label: string;
  section: AppNavSection;
  showPrimaryNav?: boolean;
  element: AppRouteElement;
}): AppRouteConfig {
  return defineRoute(path, {
    label,
    element,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section,
      showPrimaryNav,
    },
  });
}

export function getAppRoutePaths(routeConfig: AppRouteConfig): readonly string[] {
  return typeof routeConfig.path === "string" ? [routeConfig.path] : routeConfig.path;
}

export function getAppRoutePrimaryPath(routeConfig: AppRouteConfig): string {
  return getAppRoutePaths(routeConfig)[0];
}

function getAppRouteSectionPath(routeConfig: AppRouteConfig | null): string | null {
  if (!routeConfig) {
    return null;
  }

  const explicitSectionPath = routeConfig.navigation?.sectionPath?.trim();
  if (explicitSectionPath) {
    return explicitSectionPath;
  }

  return routeConfig.navigation?.sidebarLabel?.trim() ? getAppRoutePrimaryPath(routeConfig) : null;
}

function collectVisibleSectionRoutes(routeList: readonly AppRouteConfig[]): VisibleSectionRoute[] {
  const visibleRoutes: VisibleSectionRoute[] = [];
  const seen = new Set<string>();

  for (const config of routeList) {
    const section = config.shell?.section;
    const label = config.navigation?.sidebarLabel?.trim();
    const to = getAppRouteSectionPath(config);

    if (!section || !label || !to || config.shell?.showPrimaryNav === false) {
      continue;
    }

    const key = `${section}:${to}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    visibleRoutes.push({
      key,
      section,
      label,
      to,
      requireGuild: config.navigation?.requireGuild,
      preserveSearchParams: config.navigation?.preserveSearchParams,
      additionalSearchParams: config.navigation?.additionalSearchParams,
    });
  }

  return visibleRoutes;
}

export const routeConfigs: AppRouteConfig[] = [
  defineRoute("/home", {
    label: "Home",
    navigation: {
      sidebarLabel: "Home",
    },
    element: () => import("./pages/home"),
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Home",
    },
  }),

  createPrototypeRoute({
    path: "/plans",
    label: "Prototype Hub",
    section: "Home",
    showPrimaryNav: false,
    element: () => import("./pages/plans"),
  }),
  createPrototypeRoute({
    path: "/plans/guild-select",
    label: "Guild Select",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.GuildSelectPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/home",
    label: "Home",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.HomePlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/home/member-overview",
    label: "Member Overview",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.MemberOverviewPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/home/announcements",
    label: "Announcements",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.AnnouncementsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/manage-balance",
    label: "Manage Balance",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.ManageBalancePlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/manage-escrow",
    label: "Manage Escrow",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.ManageEscrowPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/ledger",
    label: "Ledger",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.LedgerPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/grant-templates",
    label: "Grant Templates",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.GrantTemplatesPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/grant-requests",
    label: "Grant Requests",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.GrantRequestsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/grant-send",
    label: "Grant Send",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.GrantSendPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/tax",
    label: "Tax",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.TaxPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/economy/trade",
    label: "Trade",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.TradePlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/war/targets",
    label: "Targets",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.TargetsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/war/counters",
    label: "Counters",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.CountersPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/war/rooms",
    label: "Rooms",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.RoomsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/war/sheets",
    label: "Sheets",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.SheetsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/war/militarization",
    label: "Militarization",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.MilitarizationPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/war/blitz",
    label: "Blitz",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.BlitzPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/deposits",
    label: "Deposits",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.DepositsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/escrow",
    label: "Escrow",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.MemberEscrowPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/interviews",
    label: "Interviews",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.InterviewsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/recruitment",
    label: "Recruitment",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.RecruitmentPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/audits",
    label: "Audits",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.AuditsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/coalitions",
    label: "Coalitions",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.CoalitionsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/treaties",
    label: "Treaties",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.TreatiesPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/members/spheres",
    label: "Spheres",
    section: "Member",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.SpheresPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/server/setup",
    label: "Setup",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerSetupPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/server/settings",
    label: "Settings",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerSettingsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/server/roles",
    label: "Roles",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerRolesPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/server/channels",
    label: "Channels",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerChannelsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/server/menus",
    label: "Menus",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerMenusPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/server/embeds",
    label: "Embeds",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerEmbedsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/reports/kpi",
    label: "KPI",
    section: "Stats",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.KpiPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/reports/tables",
    label: "Tables",
    section: "Stats",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.TablesPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/reports/graphs",
    label: "Graphs",
    section: "Stats",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.GraphsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/reports/rankings",
    label: "Rankings",
    section: "Stats",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.RankingsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/reports/conflicts",
    label: "Conflicts",
    section: "Stats",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.ConflictsPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/reports/multi",
    label: "Multi Investigation",
    section: "Stats",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.MultiInvestigationPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/commands/browser",
    label: "Command Browser",
    section: "Commands",
    element: () => import("./pages/plans/commandsPlans").then((module) => ({ default: module.CommandBrowserPlanPage })),
  }),
  createPrototypeRoute({
    path: "/plans/commands/runner",
    label: "Command Runner",
    section: "Commands",
    element: () => import("./pages/plans/commandsPlans").then((module) => ({ default: module.CommandRunnerPlanPage })),
  }),

  defineRoute("/guild_select", {
    label: "Guild Select",
    element: () => import("@/pages/guild_picker"),
    protected: true,
    shell: {
      section: "Home",
    },
  }),
  defineRoute("/unregister", {
    label: "Unregister",
    element: () => import("@/pages/unregister"),
    protected: true,
    shell: {
      section: "Home",
      showContextBar: true,
      showPrimaryNav: false,
    },
  }),
  defineRoute("/login", {
    label: "Login",
    element: () => import("@/pages/login_picker"),
    shell: {
      section: "Home",
      showContextBar: true,
      showPrimaryNav: false,
    },
  }),
  defineRoute("/login/:token", {
    label: "Login",
    element: () => import("./pages/login"),
    shell: {
      section: "Home",
      showContextBar: false,
      showPrimaryNav: false,
    },
  }),
  defineRoute("/oauth2", {
    label: "OAuth2",
    element: () => import("./pages/oauth2"),
    shell: {
      section: "Home",
      showContextBar: false,
      showPrimaryNav: false,
    },
  }),
  defineRoute("/logout", {
    label: "Logout",
    element: () => import("./pages/logout"),
    shell: {
      section: "Home",
      showContextBar: false,
      showPrimaryNav: false,
    },
  }),
  defineRoute("/nation_picker", {
    label: "Nation Picker",
    element: () => import("@/pages/nation_picker"),
    shell: {
      section: "Home",
      showContextBar: false,
      showPrimaryNav: false,
    },
  }),
  defineRoute("/register", {
    label: "Register",
    element: () => import("@/pages/unregister"),
    shell: {
      section: "Home",
      showContextBar: true,
      showPrimaryNav: false,
    },
  }),

  defineRoute("/guild_member", {
    label: "Member Overview",
    navigation: {
      sidebarLabel: "Member Overview",
      requireGuild: true,
    },
    element: () => import("@/pages/guild_member"),
    protected: true,
    shell: {
      section: "Member",
    },
  }),
  defineRoute(["/announcements", "/announcement"] as const, {
    label: "Announcements",
    navigation: {
      sidebarLabel: "Announcements",
      requireGuild: true,
    },
    element: () => import("@/pages/announcements"),
    protected: true,
    shell: {
      section: "Member",
    },
  }),
  defineRoute("/announcement/:id", {
    label: "Announcement",
    navigation: {
      sectionPath: "/announcements",
      requireGuild: true,
    },
    element: () => import("@/pages/announcement"),
    protected: true,
    shell: {
      section: "Member",
    },
  }),
  defineRoute(["/balance", "/balance/:category"] as const, {
    label: "Holdings",
    navigation: {
      sidebarLabel: "Holdings",
      requireGuild: true,
    },
    element: () => import("@/pages/balance"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Member",
    },
  }),

  defineRoute("/records", {
    label: "Ledger",
    navigation: {
      sidebarLabel: "Ledger",
      requireGuild: true,
    },
    element: () => import("./pages/records"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Economy",
    },
  }),

  defineRoute(["/raid", "/raid/:nation"] as const, {
    label: "Raid Finder",
    navigation: {
      sidebarLabel: "Raid Finder",
    },
    element: () => import("./pages/raid"),
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "War",
    },
  }),

  defineRoute("/custom_table", {
    label: "Tables",
    navigation: {
      sidebarLabel: "Tables",
    },
    element: () => import("./pages/custom_table/TablePage"),
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/view_table", {
    label: "Table View",
    navigation: {
      sectionPath: "/custom_table",
    },
    element: () => import("@/pages/view_table"),
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/col_mil_graph", {
    label: "Military Graph",
    element: () => import("./pages/graphs/col_mil_graph"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/col_tier_graph", {
    label: "Tier Graph",
    element: () => import("./pages/graphs/col_tier_graph"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute(["/edit_graph", "/edit_graph/:type"] as const, {
    label: "Edit Graph",
    element: () => import("./pages/graphs/edit_graph"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/view_graph/:type", {
    label: "View Graph",
    element: () => import("./pages/graphs/view_graph"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/view_graph", {
    label: "View Graph",
    element: () => import("./pages/graphs/edit_graph"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/alliance/:alliance", {
    label: "Alliance",
    element: () => import("./pages/a2/alliance/alliance"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/multi/:nation", {
    label: "Multi Investigation",
    element: () => import("./pages/a2/nation/multi"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/multi_v2/:nation?", {
    label: "Multi Investigation",
    element: () => import("./pages/a2/nation/multi_2"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/conflicts", {
    label: "Conflicts",
    navigation: {
      sidebarLabel: "Conflicts",
    },
    element: () => import("@/pages/a2/conflict/conflicts"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/temporary-conflicts", {
    label: "Temporary Conflicts",
    navigation: {
      sectionPath: "/conflicts",
    },
    element: () => import("@/pages/a2/conflict/temporaryConflicts"),
    shell: {
      section: "Stats",
    },
  }),
  defineRoute("/status", {
    label: "Status",
    navigation: {
      sidebarLabel: "Status",
    },
    element: () => import("./pages/a2/admin/status"),
    shell: {
      section: "Stats",
    },
  }),

  defineRoute("/settings", {
    label: "Server Settings",
    navigation: {
      sidebarLabel: "Server Settings",
      requireGuild: true,
    },
    element: () => import("@/pages/settings"),
    protected: true,
    shell: {
      section: "Server",
    },
  }),

  defineRoute(["/commands", "/command"] as const, {
    label: "Command Browser",
    navigation: {
      sidebarLabel: "Command Browser",
    },
    element: () => import("./pages/commands"),
    cachePolicy: COMMAND_BROWSER_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
    },
  }),
  defineRoute("/command/:command", {
    label: "Command",
    navigation: {
      sectionPath: "/commands",
    },
    element: () => import("./pages/command"),
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
    },
  }),
  defineRoute("/view_command/:command", {
    label: "Command Preview",
    navigation: {
      sectionPath: "/commands",
    },
    element: () => import("./pages/command/view_command"),
    shell: {
      section: "Commands",
    },
  }),
  defineRoute("/placeholders/:placeholder", {
    label: "Placeholders",
    navigation: {
      sectionPath: "/commands",
    },
    element: () => import("@/pages/ph_list"),
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
    },
  }),
];

export function resolveAppRouteConfig(routeList: readonly AppRouteConfig[], pathname: string): AppRouteConfig | null {
  let bestMatch: { config: AppRouteConfig; score: number } | null = null;

  for (const config of routeList) {
    for (const routePath of getAppRoutePaths(config)) {
      const match = matchPath({ path: routePath, end: true }, pathname);
      if (!match) {
        continue;
      }

      const staticSegmentCount = routePath.split("/").filter(Boolean).filter((segment) => !segment.startsWith(":"))
        .length;
      const score = (match.pathname.length * 10) + staticSegmentCount;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { config, score };
      }
    }
  }

  return bestMatch?.config ?? null;
}

export function getAppRouteLabel(routeConfig: AppRouteConfig | null): string | null {
  const label = routeConfig?.label?.trim();
  if (label) {
    return label;
  }

  const sidebarLabel = routeConfig?.navigation?.sidebarLabel?.trim();
  return sidebarLabel || null;
}

export function getAppSectionEntry(
  routeList: readonly AppRouteConfig[],
  section: AppNavSection | undefined,
): Pick<AppSidebarSectionItem, "label" | "to" | "requireGuild"> | null {
  if (!section) {
    return null;
  }

  const sectionRoute = collectVisibleSectionRoutes(routeList).find((route) => route.section === section);
  if (!sectionRoute) {
    return null;
  }

  return {
    label: section,
    to: sectionRoute.to,
    requireGuild: sectionRoute.requireGuild,
  };
}

export function buildAppSidebarSections(routeList: readonly AppRouteConfig[], pathname: string): AppSidebarSection[] {
  const matchedRoute = resolveAppRouteConfig(routeList, pathname);
  const activeSection = matchedRoute?.shell?.section;
  const activeSectionPath = getAppRouteSectionPath(matchedRoute);
  const sections: AppSidebarSection[] = [];
  const sectionMap = new Map<AppNavSection, AppSidebarSection>();

  for (const route of collectVisibleSectionRoutes(routeList)) {
    let section = sectionMap.get(route.section);
    if (!section) {
      section = {
        key: `section-${route.section.toLowerCase()}`,
        label: route.section,
        active: false,
        items: [],
      };
      sectionMap.set(route.section, section);
      sections.push(section);
    }

    const isActiveRoute = activeSectionPath === route.to;
    section.items.push({
      key: route.key,
      label: route.label,
      to: route.to,
      active: isActiveRoute,
      inActivePath: isActiveRoute,
      requireGuild: route.requireGuild,
      preserveSearchParams: route.preserveSearchParams,
      additionalSearchParams: route.additionalSearchParams,
    });
  }

  return sections.map((section) => ({
    ...section,
    active: section.label === activeSection || section.items.some((item) => item.inActivePath),
  }));
}

export function buildSectionHeaderTabs(
  routeList: readonly AppRouteConfig[],
  pathname: string,
): AppSectionHeaderTab[] {
  const matchedRoute = resolveAppRouteConfig(routeList, pathname);
  const section = matchedRoute?.shell?.section;
  const activeSectionPath = getAppRouteSectionPath(matchedRoute);

  if (!section || !activeSectionPath) {
    return [];
  }

  return collectVisibleSectionRoutes(routeList)
    .filter((route) => route.section === section)
    .map((route) => ({
      key: route.key,
      label: route.label,
      to: route.to,
      active: activeSectionPath === route.to,
      requireGuild: route.requireGuild,
      preserveSearchParams: route.preserveSearchParams,
      additionalSearchParams: route.additionalSearchParams,
    } satisfies AppSectionHeaderTab));
}

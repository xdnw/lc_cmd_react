import type { ComponentType } from "react";
import { matchPath } from "react-router-dom";

import { CMD_BROWSER_SEARCH_PARAM_KEYS } from "@/components/cmd/cmdBrowserState";

export const APP_NAV_SECTIONS = [
  "Home",
  "Economy",
  "War",
  "Members",
  "Server",
  "Reports",
  "Commands",
] as const;

export type AppNavSection = (typeof APP_NAV_SECTIONS)[number];

export interface AppRouteSectionTab {
  label: string;
  to: string;
  requireGuild?: boolean;
  preserveSearchParams?: readonly string[];
  additionalSearchParams?: Record<string, string | readonly string[] | null | undefined>;
}

export interface AppRouteShellConfig {
  section?: AppNavSection;
  showContextBar?: boolean;
  showPrimaryNav?: boolean;
}

export interface AppPrimaryNavItem {
  id: AppNavSection;
  label: AppNavSection;
  to: string;
  iconName: string;
  summary: string;
  requireGuild?: boolean;
}

export type RecentPageCachePolicy = {
  mode: "none" | "recent";
  ignoredSearchParams?: readonly string[];
};

export interface AppRouteConfig {
  key: string;
  path: string;
  element: () => Promise<{ default: ComponentType }>;
  protected: boolean;
  cachePolicy?: RecentPageCachePolicy;
  label?: string;
  sectionTab?: AppRouteSectionTab | null;
  shell?: AppRouteShellConfig;
}

const RECENT_PAGE_CACHE_POLICY: RecentPageCachePolicy = {
  mode: "recent",
};

const COMMAND_BROWSER_PAGE_CACHE_POLICY: RecentPageCachePolicy = {
  mode: "recent",
  ignoredSearchParams: CMD_BROWSER_SEARCH_PARAM_KEYS,
};

export interface AppSectionHeaderTab extends AppRouteSectionTab {
  key: string;
  active: boolean;
}

const HOME_SECTION_TAB: AppRouteSectionTab = {
  label: "Home",
  to: "/home",
};

const GUILD_SELECT_SECTION_TAB: AppRouteSectionTab = {
  label: "Guild Select",
  to: "/guild_select",
  requireGuild: true,
};

const ANNOUNCEMENTS_SECTION_TAB: AppRouteSectionTab = {
  label: "Announcements",
  to: "/announcements",
  requireGuild: true,
};

const MEMBER_OVERVIEW_SECTION_TAB: AppRouteSectionTab = {
  label: "Member Overview",
  to: "/guild_member",
  requireGuild: true,
};

const COMMAND_BROWSER_SECTION_TAB: AppRouteSectionTab = {
  label: "Command Browser",
  to: "/commands",
};

const HOLDINGS_SECTION_TAB: AppRouteSectionTab = {
  label: "Holdings",
  to: "/balance",
  requireGuild: true,
};

const LEDGER_SECTION_TAB: AppRouteSectionTab = {
  label: "Ledger",
  to: "/records",
  requireGuild: true,
};

const RAID_FINDER_SECTION_TAB: AppRouteSectionTab = {
  label: "Raid Finder",
  to: "/raid",
};

const TABLES_SECTION_TAB: AppRouteSectionTab = {
  label: "Tables",
  to: "/custom_table",
};

const CONFLICTS_SECTION_TAB: AppRouteSectionTab = {
  label: "Conflicts",
  to: "/conflicts",
};

const STATUS_SECTION_TAB: AppRouteSectionTab = {
  label: "Status",
  to: "/status",
};

const SERVER_SETTINGS_SECTION_TAB: AppRouteSectionTab = {
  label: "Server Settings",
  to: "/settings",
  requireGuild: true,
};

function createPrototypeRoute({
  key,
  path,
  label,
  title,
  section,
  showPrimaryNav = true,
  element,
}: {
  key: string;
  path: string;
  label?: string;
  title?: string;
  summary?: string;
  section?: AppNavSection;
  showPrimaryNav?: boolean;
  element: () => Promise<{ default: ComponentType }>;
}): AppRouteConfig {
  return {
    key,
    path,
    label: label ?? title,
    element,
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section,
      showPrimaryNav,
    },
  };
}

export const APP_PRIMARY_NAV_ITEMS: readonly AppPrimaryNavItem[] = [
  {
    id: "Home",
    label: "Home",
    to: "/home",
    iconName: "House",
    summary: "Featured entry points and landing surfaces.",
  },
  {
    id: "Economy",
    label: "Economy",
    to: "/balance",
    iconName: "Sheet",
    summary: "Holdings, transfers, and transaction history.",
    requireGuild: true,
  },
  {
    id: "War",
    label: "War",
    to: "/raid",
    iconName: "Shield",
    summary: "Raid finder and war-facing workflows.",
  },
  {
    id: "Members",
    label: "Members",
    to: "/guild_member",
    iconName: "Users",
    summary: "Member overview and daily guild work.",
    requireGuild: true,
  },
  {
    id: "Server",
    label: "Server",
    to: "/settings",
    iconName: "Settings",
    summary: "Settings, repair paths, and guild configuration.",
    requireGuild: true,
  },
  {
    id: "Reports",
    label: "Reports",
    to: "/custom_table",
    iconName: "BookOpenText",
    summary: "Tables, graphs, and investigation surfaces.",
  },
  {
    id: "Commands",
    label: "Commands",
    to: "/commands",
    iconName: "Search",
    summary: "Raw command browsing and advanced fallback.",
  },
] as const;

export const routeConfigs: AppRouteConfig[] = [
  { 
    key: "home", 
    path: "/home", 
    label: "Home",
    sectionTab: HOME_SECTION_TAB,
    element: () => import("./pages/home"), 
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Home",
    },
  },
  createPrototypeRoute({
    key: "plans_hub",
    path: "/plans",
    title: "Prototype Hub",
    summary: "Jump between the rebuilt route previews.",
    section: "Home",
    showPrimaryNav: false,
    element: () => import("./pages/plans"),
  }),
  createPrototypeRoute({
    key: "plans_guild_select",
    path: "/plans/guild-select",
    title: "Guild Select",
    summary: "Workspace picker with readiness and recovery rails.",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.GuildSelectPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_home",
    path: "/plans/home",
    title: "Home",
    summary: "Role-aware landing page and recent-work handoff.",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.HomePlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_member_overview",
    path: "/plans/home/member-overview",
    title: "Member Overview",
    summary: "Daily member board with finance, announcements, and war context.",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.MemberOverviewPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_announcements",
    path: "/plans/home/announcements",
    title: "Announcements",
    summary: "Inbox, reading pane, composer, and archive workspace.",
    section: "Home",
    element: () => import("./pages/plans/homePlans").then((module) => ({ default: module.AnnouncementsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_manage_balance",
    path: "/plans/economy/manage-balance",
    title: "Manage Balance",
    summary: "Account-scoped banking desk.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.ManageBalancePlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_manage_escrow",
    path: "/plans/economy/manage-escrow",
    title: "Manage Escrow",
    summary: "Blocked-balance operations desk.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.ManageEscrowPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_ledger",
    path: "/plans/economy/ledger",
    title: "Ledger",
    summary: "Typed transaction history with a detail rail.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.LedgerPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_grant_templates",
    path: "/plans/economy/grant-templates",
    title: "Grant Templates",
    summary: "Template library, builder, and send handoff.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.GrantTemplatesPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_grant_requests",
    path: "/plans/economy/grant-requests",
    title: "Grant Requests",
    summary: "Member submit and reviewer queue.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.GrantRequestsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_grant_send",
    path: "/plans/economy/grant-send",
    title: "Grant Send",
    summary: "Guided send workflow with funding preview.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.GrantSendPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_tax",
    path: "/plans/economy/tax",
    title: "Tax",
    summary: "Overview, member review, records, and automation.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.TaxPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_trade",
    path: "/plans/economy/trade",
    title: "Trade",
    summary: "Chart-first market dashboard.",
    section: "Economy",
    element: () => import("./pages/plans/economyPlans").then((module) => ({ default: module.TradePlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_targets",
    path: "/plans/war/targets",
    title: "Targets",
    summary: "Filter-heavy target discovery desk.",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.TargetsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_counters",
    path: "/plans/war/counters",
    title: "Counters",
    summary: "Multi-mode counter planner.",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.CountersPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_rooms",
    path: "/plans/war/rooms",
    title: "Rooms",
    summary: "Create, monitor, and clean up war rooms.",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.RoomsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_sheets",
    path: "/plans/war/sheets",
    title: "Sheets",
    summary: "Validation and export workspace for war sheets.",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.SheetsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_militarization",
    path: "/plans/war/militarization",
    title: "Militarization",
    summary: "Trend and comparison charts for readiness.",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.MilitarizationPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_blitz",
    path: "/plans/war/blitz",
    title: "Blitz",
    summary: "Plan, validate, and room handoff.",
    section: "War",
    element: () => import("./pages/plans/warPlans").then((module) => ({ default: module.BlitzPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_deposits",
    path: "/plans/members/deposits",
    title: "Deposits",
    summary: "Member holdings and deposit breakdown.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.DepositsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_member_escrow",
    path: "/plans/members/escrow",
    title: "Escrow",
    summary: "Read-only blocked balance explanation.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.MemberEscrowPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_interviews",
    path: "/plans/members/interviews",
    title: "Interviews",
    summary: "Mentor queue and applicant detail rail.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.InterviewsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_recruitment",
    path: "/plans/members/recruitment",
    title: "Recruitment",
    summary: "Policy and outreach builder.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.RecruitmentPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_audits",
    path: "/plans/members/audits",
    title: "Audits",
    summary: "Severity-grouped audit queue.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.AuditsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_coalitions",
    path: "/plans/members/coalitions",
    title: "Coalitions",
    summary: "Foreign-affairs directory and actions.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.CoalitionsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_treaties",
    path: "/plans/members/treaties",
    title: "Treaties",
    summary: "Treaty desk with relationship health.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.TreatiesPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_spheres",
    path: "/plans/members/spheres",
    title: "Spheres",
    summary: "Read-only analysis and comparisons.",
    section: "Members",
    element: () => import("./pages/plans/membersPlans").then((module) => ({ default: module.SpheresPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_server_setup",
    path: "/plans/server/setup",
    title: "Setup",
    summary: "Readiness board and recovery actions.",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerSetupPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_server_settings",
    path: "/plans/server/settings",
    title: "Settings",
    summary: "Merged settings browser and edit dialog.",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerSettingsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_server_roles",
    path: "/plans/server/roles",
    title: "Roles",
    summary: "Aliases, self roles, auto roles, and bulk tools.",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerRolesPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_server_channels",
    path: "/plans/server/channels",
    title: "Channels",
    summary: "Repair-heavy channel workflows.",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerChannelsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_server_menus",
    path: "/plans/server/menus",
    title: "Menus",
    summary: "Menu library and editor.",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerMenusPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_server_embeds",
    path: "/plans/server/embeds",
    title: "Embeds",
    summary: "Embed library, canvas, and preview.",
    section: "Server",
    element: () => import("./pages/plans/serverPlans").then((module) => ({ default: module.ServerEmbedsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_kpi",
    path: "/plans/reports/kpi",
    title: "KPI",
    summary: "Layout builder with reusable report cards.",
    section: "Reports",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.KpiPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_tables",
    path: "/plans/reports/tables",
    title: "Tables",
    summary: "Curated table studio around saved views.",
    section: "Reports",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.TablesPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_graphs",
    path: "/plans/reports/graphs",
    title: "Graphs",
    summary: "Graph gallery with visible chart controls.",
    section: "Reports",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.GraphsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_rankings",
    path: "/plans/reports/rankings",
    title: "Rankings",
    summary: "Ranking explorer with trend context.",
    section: "Reports",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.RankingsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_conflicts",
    path: "/plans/reports/conflicts",
    title: "Conflicts",
    summary: "Conflict browser with staff mode.",
    section: "Reports",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.ConflictsPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_multi_investigation",
    path: "/plans/reports/multi",
    title: "Multi Investigation",
    summary: "Overlap investigation desk.",
    section: "Reports",
    element: () => import("./pages/plans/reportsPlans").then((module) => ({ default: module.MultiInvestigationPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_command_browser",
    path: "/plans/commands/browser",
    title: "Command Browser",
    summary: "Discovery-first command catalog.",
    section: "Commands",
    element: () => import("./pages/plans/commandsPlans").then((module) => ({ default: module.CommandBrowserPlanPage })),
  }),
  createPrototypeRoute({
    key: "plans_command_runner",
    path: "/plans/commands/runner",
    title: "Command Runner",
    summary: "Argument form, preview, output, and history.",
    section: "Commands",
    element: () => import("./pages/plans/commandsPlans").then((module) => ({ default: module.CommandRunnerPlanPage })),
  }),
  {
    key: "unregister",
    path: "/unregister",
    element: () => import("@/pages/unregister"),
    protected: true,
    shell: {
      showContextBar: true,
      showPrimaryNav: false,
    },
  },
  {
    key: "guild_select",
    path: "/guild_select",
    label: "Guild Select",
    sectionTab: GUILD_SELECT_SECTION_TAB,
    element: () => import("@/pages/guild_picker"),
    protected: true,
    shell: {
      section: "Home",
    },
  },
  {
    key: "guild_member",
    path: "/guild_member",
    label: "Member Overview",
    sectionTab: MEMBER_OVERVIEW_SECTION_TAB,
    element: () => import("@/pages/guild_member"),
    protected: true,
    shell: {
      section: "Members",
    },
  },
  {
    key: "announcements",
    path: "/announcements",
    label: "Announcements",
    sectionTab: ANNOUNCEMENTS_SECTION_TAB,
    element: () => import("@/pages/announcements"),
    protected: true,
    shell: {
      section: "Home",
    },
  },
  {
    key: "announcement_id",
    path: "/announcement/:id",
    label: "Announcement",
    sectionTab: ANNOUNCEMENTS_SECTION_TAB,
    element: () => import("@/pages/announcement"),
    protected: true,
    shell: {
      section: "Home",
    },
  },
  {
    key: "announcement",
    path: "/announcement",
    label: "Announcements",
    sectionTab: ANNOUNCEMENTS_SECTION_TAB,
    element: () => import("@/pages/announcements"),
    protected: true,
    shell: {
      section: "Home",
    },
  },
  {
    key: "commands",
    path: "/commands",
    label: "Command Browser",
    sectionTab: COMMAND_BROWSER_SECTION_TAB,
    element: () => import("./pages/commands"),
    protected: false,
    cachePolicy: COMMAND_BROWSER_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
    },
  },
  {
    key: "command",
    path: "/command",
    label: "Command Browser",
    sectionTab: COMMAND_BROWSER_SECTION_TAB,
    element: () => import("./pages/commands"),
    protected: false,
    cachePolicy: COMMAND_BROWSER_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
    },
  },
  {
    key: "command_detail",
    path: "/command/:command",
    label: "Command",
    sectionTab: COMMAND_BROWSER_SECTION_TAB,
    element: () => import("./pages/command"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
    },
  },
  {
    key: "view_command",
    path: "/view_command/:command",
    label: "Command Preview",
    sectionTab: COMMAND_BROWSER_SECTION_TAB,
    element: () => import("./pages/command/view_command"),
    protected: false,
    shell: {
      section: "Commands",
    },
  },
  {
    key: "placeholders",
    path: "/placeholders/:placeholder",
    label: "Placeholders",
    sectionTab: COMMAND_BROWSER_SECTION_TAB,
    element: () => import("@/pages/ph_list"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
    },
  },
  {
    key: "balance",
    path: "/balance",
    label: "Holdings",
    sectionTab: HOLDINGS_SECTION_TAB,
    element: () => import("@/pages/balance"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Economy",
    },
  },
  {
    key: "balance_category",
    path: "/balance/:category",
    label: "Holdings",
    sectionTab: HOLDINGS_SECTION_TAB,
    element: () => import("@/pages/balance"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Economy",
    },
  },
  {
    key: "records",
    path: "/records",
    label: "Ledger",
    sectionTab: LEDGER_SECTION_TAB,
    element: () => import("./pages/records"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Economy",
    },
  },
  {
    key: "raid_nation",
    path: "/raid/:nation",
    label: "Raid Finder",
    sectionTab: RAID_FINDER_SECTION_TAB,
    element: () => import("./pages/raid"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "War",
    },
  },
  {
    key: "raid",
    path: "/raid",
    label: "Raid Finder",
    sectionTab: RAID_FINDER_SECTION_TAB,
    element: () => import("./pages/raid"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "War",
    },
  },
  {
    key: "login",
    path: "/login",
    element: () => import("@/pages/login_picker"),
    protected: false,
    shell: {
      showContextBar: true,
      showPrimaryNav: false,
    },
  },
  {
    key: "login_token",
    path: "/login/:token",
    element: () => import("./pages/login"),
    protected: false,
    shell: {
      showContextBar: false,
      showPrimaryNav: false,
    },
  },
  {
    key: "oauth2",
    path: "/oauth2",
    element: () => import("./pages/oauth2"),
    protected: false,
    shell: {
      showContextBar: false,
      showPrimaryNav: false,
    },
  },
  {
    key: "logout",
    path: "/logout",
    element: () => import("./pages/logout"),
    protected: false,
    shell: {
      showContextBar: false,
      showPrimaryNav: false,
    },
  },
  {
    key: "nation_picker",
    path: "/nation_picker",
    element: () => import("@/pages/nation_picker"),
    protected: false,
    shell: {
      showContextBar: false,
      showPrimaryNav: false,
    },
  },
  {
    key: "register",
    path: "/register",
    element: () => import("@/pages/unregister"),
    protected: false,
    shell: {
      showContextBar: true,
      showPrimaryNav: false,
    },
  },
  {
    key: "custom_table",
    path: "/custom_table",
    label: "Tables",
    sectionTab: TABLES_SECTION_TAB,
    element: () => import("./pages/custom_table/TablePage"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "view_table",
    path: "/view_table",
    label: "Table View",
    sectionTab: TABLES_SECTION_TAB,
    element: () => import("@/pages/view_table"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "settings",
    path: "/settings",
    label: "Server Settings",
    sectionTab: SERVER_SETTINGS_SECTION_TAB,
    element: () => import("@/pages/settings"),
    protected: true,
    shell: {
      section: "Server",
    },
  },
  {
    key: "col_mil_graph",
    path: "/col_mil_graph",
    element: () => import("./pages/graphs/col_mil_graph"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "col_tier_graph",
    path: "/col_tier_graph",
    element: () => import("./pages/graphs/col_tier_graph"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "edit_graph_type",
    path: "/edit_graph/:type",
    element: () => import("./pages/graphs/edit_graph"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "edit_graph",
    path: "/edit_graph",
    element: () => import("./pages/graphs/edit_graph"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "view_graph_type",
    path: "/view_graph/:type",
    element: () => import("./pages/graphs/view_graph"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "view_graph",
    path: "/view_graph",
    element: () => import("./pages/graphs/edit_graph"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "alliance",
    path: "/alliance/:alliance",
    element: () => import("./pages/a2/alliance/alliance"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "multi",
    path: "/multi/:nation",
    element: () => import("./pages/a2/nation/multi"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "multi_v2",
    path: "/multi_v2/:nation?",
    element: () => import("./pages/a2/nation/multi_2"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "conflicts",
    path: "/conflicts",
    label: "Conflicts",
    sectionTab: CONFLICTS_SECTION_TAB,
    element: () => import("@/pages/a2/conflict/conflicts"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "temporary_conflicts",
    path: "/temporary-conflicts",
    label: "Temporary Conflicts",
    sectionTab: CONFLICTS_SECTION_TAB,
    element: () => import("@/pages/a2/conflict/temporaryConflicts"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "status",
    path: "/status",
    label: "Status",
    sectionTab: STATUS_SECTION_TAB,
    element: () => import("./pages/a2/admin/status"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
];

export function resolveAppRouteConfig(routeList: readonly AppRouteConfig[], pathname: string): AppRouteConfig | null {
  let bestMatch: { config: AppRouteConfig; score: number } | null = null;

  for (const config of routeList) {
    const match = matchPath({ path: config.path, end: true }, pathname);
    if (!match) {
      continue;
    }

    const score = match.pathname.length;
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { config, score };
    }
  }

  return bestMatch?.config ?? null;
}

export function getAppRouteLabel(routeConfig: AppRouteConfig | null): string | null {
  const label = routeConfig?.label?.trim();
  if (label) {
    return label;
  }

  const sectionTabLabel = routeConfig?.sectionTab?.label?.trim();
  return sectionTabLabel || null;
}

export function buildSectionHeaderTabs(
  routeList: readonly AppRouteConfig[],
  pathname: string,
): AppSectionHeaderTab[] {
  const matchedRoute = resolveAppRouteConfig(routeList, pathname);
  const section = matchedRoute?.shell?.section;
  const activeTo = matchedRoute?.sectionTab?.to ?? null;

  if (!section) {
    return [];
  }

  const seen = new Set<string>();

  return routeList.flatMap((config) => {
    if (config.shell?.section !== section || !config.sectionTab) {
      return [];
    }

    if (seen.has(config.sectionTab.to)) {
      return [];
    }

    seen.add(config.sectionTab.to);
    return [{
      key: `${section}-${config.sectionTab.to}`,
      ...config.sectionTab,
      active: activeTo === config.sectionTab.to,
    } satisfies AppSectionHeaderTab];
  });
}

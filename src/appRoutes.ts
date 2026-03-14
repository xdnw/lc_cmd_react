import type { ComponentType } from "react";
import { matchPath } from "react-router-dom";

import { CMD_BROWSER_SEARCH_PARAM_KEYS } from "@/components/cmd/cmdBrowserState";

export type AppButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

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

export interface AppRouteHeaderBadge {
  label: string;
  variant?: AppButtonVariant;
}

export interface AppRouteHeaderAction {
  label: string;
  to: string;
  variant?: AppButtonVariant;
  iconName?: string;
  requireGuild?: boolean;
  preserveSearchParams?: readonly string[];
  additionalSearchParams?: Record<string, string | readonly string[] | null | undefined>;
}

export interface AppRouteHeaderConfig {
  title: string;
  summary?: string;
  badge?: AppRouteHeaderBadge;
  primaryActions?: readonly AppRouteHeaderAction[];
  secondaryActions?: readonly AppRouteHeaderAction[];
}

export interface AppRouteShellConfig {
  section?: AppNavSection;
  showContextBar?: boolean;
  showPrimaryNav?: boolean;
  header?: AppRouteHeaderConfig | null;
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
  shell?: AppRouteShellConfig;
}

const RECENT_PAGE_CACHE_POLICY: RecentPageCachePolicy = {
  mode: "recent",
};

const COMMAND_BROWSER_PAGE_CACHE_POLICY: RecentPageCachePolicy = {
  mode: "recent",
  ignoredSearchParams: CMD_BROWSER_SEARCH_PARAM_KEYS,
};

const ENDPOINT_BADGE: AppRouteHeaderBadge = {
  label: "Endpoint-native",
  variant: "outline",
};

const SETTINGS_BADGE: AppRouteHeaderBadge = {
  label: "Settings-backed",
  variant: "secondary",
};

const COMMAND_BADGE: AppRouteHeaderBadge = {
  label: "Command fallback",
  variant: "secondary",
};

const LANDING_BADGE: AppRouteHeaderBadge = {
  label: "Landing",
  variant: "outline",
};

const READINESS_BADGE: AppRouteHeaderBadge = {
  label: "Readiness",
  variant: "outline",
};

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
    element: () => import("./pages/home"), 
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Home",
      header: {
        title: "Home",
        summary: "Use the landing page for discovery, featured tools, and quick entry into guild work.",
        badge: LANDING_BADGE,
        primaryActions: [
          { label: "Guild Select", to: "/guild_select", variant: "outline", iconName: "Users" },
          { label: "Commands", to: "/commands", variant: "secondary", iconName: "Search" },
        ],
      },
    },
  },
  {
    key: "unregister",
    path: "/unregister",
    element: () => import("@/pages/unregister"),
    protected: true,
    shell: {
      showContextBar: true,
      showPrimaryNav: false,
      header: null,
    },
  },
  {
    key: "guild_select",
    path: "/guild_select",
    element: () => import("@/pages/guild_picker"),
    protected: true,
    shell: {
      section: "Home",
      header: {
        title: "Guild Select",
        summary: "Choose the active Discord guild and confirm whether it is ready for alliance work.",
        badge: READINESS_BADGE,
        primaryActions: [
          { label: "Home", to: "/home", variant: "outline", iconName: "House" },
          { label: "Commands", to: "/commands", variant: "secondary", iconName: "Search" },
        ],
      },
    },
  },
  {
    key: "guild_member",
    path: "/guild_member",
    element: () => import("@/pages/guild_member"),
    protected: true,
    shell: {
      section: "Members",
      header: {
        title: "Member Overview",
        summary: "Keep announcements, audits, wars, bank access, and raid tools in one daily workspace.",
        badge: ENDPOINT_BADGE,
        primaryActions: [
          { label: "Announcements", to: "/announcements", variant: "secondary", iconName: "MessageCircle", requireGuild: true },
          { label: "Holdings", to: "/balance", variant: "outline", iconName: "Sheet", requireGuild: true },
          { label: "Server Settings", to: "/settings", variant: "outline", iconName: "Settings", requireGuild: true },
        ],
      },
    },
  },
  {
    key: "announcements",
    path: "/announcements",
    element: () => import("@/pages/announcements"),
    protected: true,
    shell: {
      section: "Home",
      header: {
        title: "Announcements",
        summary: "Review guild announcements and jump into shareable detail views when needed.",
        badge: ENDPOINT_BADGE,
        primaryActions: [
          { label: "Member Overview", to: "/guild_member", variant: "outline", iconName: "Users", requireGuild: true },
        ],
      },
    },
  },
  {
    key: "announcement_id",
    path: "/announcement/:id",
    element: () => import("@/pages/announcement"),
    protected: true,
    shell: {
      section: "Home",
    },
  },
  {
    key: "announcement",
    path: "/announcement",
    element: () => import("@/pages/announcements"),
    protected: true,
    shell: {
      section: "Home",
      header: {
        title: "Announcements",
        summary: "Review guild announcements and jump into shareable detail views when needed.",
        badge: ENDPOINT_BADGE,
      },
    },
  },
  {
    key: "commands",
    path: "/commands",
    element: () => import("./pages/commands"),
    protected: false,
    cachePolicy: COMMAND_BROWSER_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
      header: {
        title: "Command Browser",
        summary: "Search the raw command catalog, apply filters, and open advanced fallback flows without leaving the shell.",
        badge: COMMAND_BADGE,
        primaryActions: [
          { label: "Guild Select", to: "/guild_select", variant: "outline", iconName: "Users" },
        ],
      },
    },
  },
  {
    key: "command",
    path: "/command",
    element: () => import("./pages/commands"),
    protected: false,
    cachePolicy: COMMAND_BROWSER_PAGE_CACHE_POLICY,
    shell: {
      section: "Commands",
      header: {
        title: "Command Browser",
        summary: "Search the raw command catalog, apply filters, and open advanced fallback flows without leaving the shell.",
        badge: COMMAND_BADGE,
      },
    },
  },
  {
    key: "command_detail",
    path: "/command/:command",
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
    element: () => import("./pages/command/view_command"),
    protected: false,
    shell: {
      section: "Commands",
    },
  },
  {
    key: "placeholders",
    path: "/placeholders/:placeholder",
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
    element: () => import("@/pages/balance"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Economy",
      header: {
        title: "Holdings",
        summary: "Review the active balance, breakdowns, and withdrawal-ready totals for the current guild context.",
        badge: ENDPOINT_BADGE,
        primaryActions: [
          { label: "Ledger", to: "/records", variant: "secondary", iconName: "BookOpenText", requireGuild: true },
          { label: "Member Overview", to: "/guild_member", variant: "outline", iconName: "Users", requireGuild: true },
        ],
      },
    },
  },
  {
    key: "balance_category",
    path: "/balance/:category",
    element: () => import("@/pages/balance"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Economy",
      header: {
        title: "Holdings",
        summary: "Review the active balance, breakdowns, and withdrawal-ready totals for the current guild context.",
        badge: ENDPOINT_BADGE,
        primaryActions: [
          { label: "Ledger", to: "/records", variant: "secondary", iconName: "BookOpenText", requireGuild: true },
        ],
      },
    },
  },
  {
    key: "records",
    path: "/records",
    element: () => import("./pages/records"),
    protected: true,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "Economy",
      header: {
        title: "Ledger",
        summary: "Inspect transaction history and keep the balance workflow within the same economy context.",
        badge: ENDPOINT_BADGE,
        primaryActions: [
          { label: "Holdings", to: "/balance", variant: "secondary", iconName: "Sheet", requireGuild: true },
        ],
      },
    },
  },
  {
    key: "raid_nation",
    path: "/raid/:nation",
    element: () => import("./pages/raid"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "War",
      header: {
        title: "Raid Finder",
        summary: "Search for targets in range while keeping your current nation and guild context visible.",
        badge: ENDPOINT_BADGE,
        primaryActions: [
          { label: "Commands", to: "/commands", variant: "outline", iconName: "Search" },
          { label: "Conflicts", to: "/conflicts", variant: "outline", iconName: "Shield" },
        ],
      },
    },
  },
  {
    key: "raid",
    path: "/raid",
    element: () => import("./pages/raid"),
    protected: false,
    cachePolicy: RECENT_PAGE_CACHE_POLICY,
    shell: {
      section: "War",
      header: {
        title: "Raid Finder",
        summary: "Search for targets in range while keeping your current nation and guild context visible.",
        badge: ENDPOINT_BADGE,
      },
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
      header: null,
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
      header: null,
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
      header: null,
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
      header: null,
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
      header: null,
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
      header: null,
    },
  },
  {
    key: "custom_table",
    path: "/custom_table",
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
    element: () => import("@/pages/settings"),
    protected: true,
    shell: {
      section: "Server",
      header: {
        title: "Server Settings",
        summary: "Browse guild settings with category context, delegated-state visibility, and direct repair paths.",
        badge: SETTINGS_BADGE,
        primaryActions: [
          { label: "Guild Select", to: "/guild_select", variant: "outline", iconName: "Users" },
          { label: "Commands", to: "/commands", variant: "secondary", iconName: "Search" },
        ],
      },
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
    element: () => import("@/pages/a2/conflict/conflicts"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "temporary_conflicts",
    path: "/temporary-conflicts",
    element: () => import("@/pages/a2/conflict/temporaryConflicts"),
    protected: false,
    shell: {
      section: "Reports",
    },
  },
  {
    key: "status",
    path: "/status",
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

import type { AppNavSection } from "@/appRoutes";
import type { SidebarNavConfig, SidebarNavItem } from "@/components/layout/SidebarNav";

export interface PlanRouteEntry {
  id: string;
  title: string;
  path: string;
  section: AppNavSection;
  group: string;
  summary: string;
}

const PLAN_ROUTE_GROUPS: readonly {
  id: string;
  title: string;
  items: readonly PlanRouteEntry[];
}[] = [
  {
    id: "entry",
    title: "Entry",
    items: [
      { id: "plans-hub", title: "Prototype Hub", path: "/plans", section: "Home", group: "Entry", summary: "Walk the rebuilt prototypes by section." },
      { id: "plans-guild-select", title: "Guild Select", path: "/plans/guild-select", section: "Home", group: "Entry", summary: "Pick a guild and resolve readiness blockers." },
      { id: "plans-home", title: "Home", path: "/plans/home", section: "Home", group: "Entry", summary: "Role-aware landing page and recent work." },
    ],
  },
  {
    id: "home",
    title: "Home",
    items: [
      { id: "plans-member-overview", title: "Member Overview", path: "/plans/home/member-overview", section: "Home", group: "Home", summary: "Daily board for announcements, finance, and war follow-up." },
      { id: "plans-announcements", title: "Announcements", path: "/plans/home/announcements", section: "Home", group: "Home", summary: "Inbox, reading pane, composer, and archive." },
    ],
  },
  {
    id: "economy",
    title: "Economy",
    items: [
      { id: "plans-manage-balance", title: "Manage Balance", path: "/plans/economy/manage-balance", section: "Economy", group: "Economy", summary: "Account-scoped banking desk." },
      { id: "plans-manage-escrow", title: "Manage Escrow", path: "/plans/economy/manage-escrow", section: "Economy", group: "Economy", summary: "Blocked-balance operations desk." },
      { id: "plans-ledger", title: "Ledger", path: "/plans/economy/ledger", section: "Economy", group: "Economy", summary: "Typed transaction history with a detail rail." },
      { id: "plans-grant-templates", title: "Grant Templates", path: "/plans/economy/grant-templates", section: "Economy", group: "Economy", summary: "Template library and builder." },
      { id: "plans-grant-requests", title: "Grant Requests", path: "/plans/economy/grant-requests", section: "Economy", group: "Economy", summary: "Member submit and reviewer queue." },
      { id: "plans-grant-send", title: "Grant Send", path: "/plans/economy/grant-send", section: "Economy", group: "Economy", summary: "Guided send workflow with funding preview." },
      { id: "plans-tax", title: "Tax", path: "/plans/economy/tax", section: "Economy", group: "Economy", summary: "Operations surface for overview, members, and automation." },
      { id: "plans-trade", title: "Trade", path: "/plans/economy/trade", section: "Economy", group: "Economy", summary: "Market dashboard with charts, rankings, and alerts." },
    ],
  },
  {
    id: "war",
    title: "War",
    items: [
      { id: "plans-targets", title: "Targets", path: "/plans/war/targets", section: "War", group: "War", summary: "Filter-heavy target discovery desk." },
      { id: "plans-counters", title: "Counters", path: "/plans/war/counters", section: "War", group: "War", summary: "Counter planner with multi-mode flows." },
      { id: "plans-rooms", title: "Rooms", path: "/plans/war/rooms", section: "War", group: "War", summary: "Create, track, and clean up war rooms." },
      { id: "plans-sheets", title: "Sheets", path: "/plans/war/sheets", section: "War", group: "War", summary: "Validation and export workspace for war sheets." },
      { id: "plans-militarization", title: "Militarization", path: "/plans/war/militarization", section: "War", group: "War", summary: "Trend and comparison charts for readiness." },
      { id: "plans-blitz", title: "Blitz", path: "/plans/war/blitz", section: "War", group: "War", summary: "Plan, validate, and room handoff." },
    ],
  },
  {
    id: "members",
    title: "Members",
    items: [
      { id: "plans-deposits", title: "Deposits", path: "/plans/members/deposits", section: "Members", group: "Members", summary: "Member holdings and deposit breakdown." },
      { id: "plans-member-escrow", title: "Escrow", path: "/plans/members/escrow", section: "Members", group: "Members", summary: "Read-only blocked balance explanation." },
      { id: "plans-interviews", title: "Interviews", path: "/plans/members/interviews", section: "Members", group: "Members", summary: "Mentor queue and detail rail." },
      { id: "plans-recruitment", title: "Recruitment", path: "/plans/members/recruitment", section: "Members", group: "Members", summary: "Policy and outreach builder." },
      { id: "plans-audits", title: "Audits", path: "/plans/members/audits", section: "Members", group: "Members", summary: "Severity-grouped audit queue." },
      { id: "plans-coalitions", title: "Coalitions", path: "/plans/members/coalitions", section: "Members", group: "Members", summary: "Foreign-affairs directory and actions." },
      { id: "plans-treaties", title: "Treaties", path: "/plans/members/treaties", section: "Members", group: "Members", summary: "Treaty desk with relationship health." },
      { id: "plans-spheres", title: "Spheres", path: "/plans/members/spheres", section: "Members", group: "Members", summary: "Read-only analysis and comparisons." },
    ],
  },
  {
    id: "server",
    title: "Server",
    items: [
      { id: "plans-server-setup", title: "Setup", path: "/plans/server/setup", section: "Server", group: "Server", summary: "Readiness board and recovery actions." },
      { id: "plans-server-settings", title: "Settings", path: "/plans/server/settings", section: "Server", group: "Server", summary: "Merged settings browser and edit dialog." },
      { id: "plans-server-roles", title: "Roles", path: "/plans/server/roles", section: "Server", group: "Server", summary: "Aliases, self roles, auto roles, and bulk tools." },
      { id: "plans-server-channels", title: "Channels", path: "/plans/server/channels", section: "Server", group: "Server", summary: "Repair-heavy channel workflows." },
      { id: "plans-server-menus", title: "Menus", path: "/plans/server/menus", section: "Server", group: "Server", summary: "Menu library and editor." },
      { id: "plans-server-embeds", title: "Embeds", path: "/plans/server/embeds", section: "Server", group: "Server", summary: "Embed library, canvas, and preview." },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    items: [
      { id: "plans-kpi", title: "KPI", path: "/plans/reports/kpi", section: "Reports", group: "Reports", summary: "Layout builder with reusable cards and detail surfaces." },
      { id: "plans-tables", title: "Tables", path: "/plans/reports/tables", section: "Reports", group: "Reports", summary: "Curated table studio around saved views." },
      { id: "plans-graphs", title: "Graphs", path: "/plans/reports/graphs", section: "Reports", group: "Reports", summary: "Graph gallery with visible chart controls." },
      { id: "plans-rankings", title: "Rankings", path: "/plans/reports/rankings", section: "Reports", group: "Reports", summary: "Ranking explorer with trend context." },
      { id: "plans-conflicts", title: "Conflicts", path: "/plans/reports/conflicts", section: "Reports", group: "Reports", summary: "Conflict browser with staff mode." },
      { id: "plans-multi", title: "Multi Investigation", path: "/plans/reports/multi", section: "Reports", group: "Reports", summary: "Overlap investigation desk." },
    ],
  },
  {
    id: "commands",
    title: "Commands",
    items: [
      { id: "plans-command-browser", title: "Browser", path: "/plans/commands/browser", section: "Commands", group: "Commands", summary: "Discovery-first command catalog." },
      { id: "plans-command-runner", title: "Runner", path: "/plans/commands/runner", section: "Commands", group: "Commands", summary: "Argument form, preview, output, and history." },
    ],
  },
] as const;

export const PLAN_ROUTE_ENTRIES: readonly PlanRouteEntry[] = PLAN_ROUTE_GROUPS.flatMap((group) => group.items);

export function buildPlanSidebarConfig(pathname: string): SidebarNavConfig {
  const items: SidebarNavItem[] = [];

  for (const group of PLAN_ROUTE_GROUPS) {
    items.push({
      id: `heading-${group.id}`,
      label: group.title,
      tone: "section",
      status: "default",
      level: 0,
      disabled: true,
    });

    for (const item of group.items) {
      const isActive = pathname === item.path;
      items.push({
        id: item.id,
        label: item.title,
        description: item.summary,
        to: item.path,
        tone: "item",
        status: isActive ? "set" : "default",
        level: 1,
        active: isActive,
        inActivePath: isActive,
      });
    }
  }

  const activeItem = PLAN_ROUTE_ENTRIES.find((entry) => entry.path === pathname) ?? PLAN_ROUTE_ENTRIES[0];

  return {
    ariaLabel: "Prototype navigation",
    layout: "tree",
    eyebrow: "Prototype",
    title: activeItem?.group ?? "Prototype",
    subtitle: "Preview the planned screens as product UIs, not as documentation.",
    items,
    mobileTriggerLabel: "Prototype page",
    mobileTriggerValue: activeItem?.title ?? "Prototype Hub",
    mobileButtonLabel: "Prototype pages",
    mobileSheetTitle: "Prototype pages",
    mobileSheetSubtitle: "Jump between rebuilt route previews.",
  };
}

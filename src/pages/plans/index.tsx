/**
 * WARNING: HALLUCINATORY GARBAGE.
 * This file is AI-generated speculation and is not trustworthy.
 * Do not use it as source of truth, implementation guidance, planning input,
 * architectural guidance, or evidence that any described feature or substrate exists.
 * Keep it only as an idea scrap in case a small part is someday worth salvaging.
 */
import { Link } from "react-router-dom";

import { PLAN_ROUTE_ENTRIES } from "./navigation";
import {
  PlanHero,
  PlanLinkedCards,
  PlanMiniList,
  PlanPanel,
  PlanTable,
  PlanValuePair,
  usePlanSidebar,
} from "./ui";

const sectionRows = [
  ["Home", "Guild Select, Home, Member Overview, Announcements", "Entry, landing, and daily loop"],
  ["Economy", "Manage Balance, Escrow, Ledger, Grants, Tax, Trade", "Account-scoped operations and review desks"],
  ["War", "Targets, Counters, Rooms, Sheets, Militarization, Blitz", "Dense operator views with rails and drawers"],
  ["Members", "Deposits, Escrow, Interviews, Recruitment, Audits, FA", "Member self plus staff lifecycle surfaces"],
  ["Server", "Setup, Settings, Roles, Channels, Menus, Embeds", "Admin console, repair flows, and builders"],
  ["Reports + Commands", "KPI, Tables, Graphs, Rankings, Conflicts, Runner", "Studios, galleries, and execution surfaces"],
] as const;

const featureLinks = [
  { label: "Guild Select", to: "/plans/guild-select", detail: "Start with workspace selection, readiness state, and fast recovery actions." },
  { label: "Server Setup", to: "/plans/server/setup", detail: "See the rebuilt readiness board instead of a flat checklist." },
  { label: "Manage Balance", to: "/plans/economy/manage-balance", detail: "Review the banking desk as an account-scoped operator screen." },
  { label: "Targets", to: "/plans/war/targets", detail: "Walk the real filter rail, results table, and target drawer layout." },
  { label: "Audits", to: "/plans/members/audits", detail: "Inspect the queue-oriented staff desk with a right-side detail rail." },
  { label: "Command Runner", to: "/plans/commands/runner", detail: "Open the execution surface with preview, output, and embedded history." },
] as const;

export default function PlanHubPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Prototype Hub"
        title="Rebuilt Route Previews"
        description="These routes are now treated like product screens. The goal is to make it obvious how the planned app should feel to use: where filters live, what the main working area is, what stays in a detail rail, and which surfaces belong in dialogs instead of standalone pages."
        stats={[
          { label: "Standalone routes", value: "32", tone: "success" },
          { label: "Embedded surfaces", value: "2", tone: "warning" },
          { label: "Shared doc chrome", value: "0", tone: "success" },
        ]}
        actions={[
          { label: "Open Guild Select", to: "/plans/guild-select", variant: "outline" },
          { label: "Open Server Setup", to: "/plans/server/setup", variant: "secondary" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr),22rem]">
        <PlanPanel title="What Changed" description="This area is now organized around evaluating screen design, not reading plan metadata.">
          <div className="grid gap-3 md:grid-cols-2">
            <PlanValuePair label="Route pages" value="Built as dashboards, desks, studios, browsers, and builders." />
            <PlanValuePair label="Embedded ownership" value="Command history and alliance profile stay inside their owning pages." />
            <PlanValuePair label="Navigation" value="Prototype routes are grouped by actual app section, not by doc category." />
            <PlanValuePair label="Evaluation lens" value="Focus on layout, hierarchy, and workflow handoff instead of prose." />
          </div>
        </PlanPanel>

        <PlanPanel title="Route Count" description="Every clickable item below goes to a hand-built preview page.">
          <div className="space-y-2">
            {PLAN_ROUTE_ENTRIES.map((entry) => (
              <Link
                key={entry.path}
                to={entry.path}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-muted/25 px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/45"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">{entry.title}</div>
                  <div className="text-xs leading-5 text-muted-foreground">{entry.summary}</div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{entry.group}</div>
              </Link>
            ))}
          </div>
        </PlanPanel>
      </div>

      <PlanLinkedCards title="Suggested Walkthrough" links={featureLinks} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr),22rem]">
        <PlanPanel title="Section Coverage" description="The rebuilt previews favor the strongest visual structure for each domain.">
          <PlanTable
            headers={["Section", "Pages", "Visual emphasis"]}
            rows={sectionRows}
          />
        </PlanPanel>

        <PlanPanel title="Embedded Surfaces" description="These were kept out of the route list on purpose.">
          <PlanMiniList
            items={[
              "Command history is opened from the command browser and runner as a real modal surface.",
              "Alliance profile is embedded inside KPI and ranking workflows as a detail overlay.",
              "The rest of the route previews stay focused on the main working screen for each domain.",
            ]}
          />
        </PlanPanel>
      </div>
    </div>
  );
}

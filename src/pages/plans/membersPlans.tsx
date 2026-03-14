/**
 * WARNING: HALLUCINATORY GARBAGE.
 * This file is AI-generated speculation and is not trustworthy.
 * Do not use it as source of truth, implementation guidance, planning input,
 * architectural guidance, or evidence that any described feature or substrate exists.
 * Keep it only as an idea scrap in case a small part is someday worth salvaging.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  PlanActionList,
  PlanCanvas,
  PlanChipRow,
  PlanHero,
  PlanMiniList,
  PlanPanel,
  PlanTable,
  usePlanSidebar,
} from "./ui";

export function DepositsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Members"
        title="Deposits"
        description="Deposits is a member-self finance page, so it should feel calm and immediately legible: total holdings first, breakdown second, and only a small action rail for the adjacent flows that actually belong somewhere else."
        stats={[
          { label: "Total holdings", value: "$482m", tone: "success" },
          { label: "Deposits", value: "$301m", tone: "neutral" },
          { label: "Escrow blocked", value: "$44m", tone: "warning" },
        ]}
        actions={[
          { label: "Open Escrow", to: "/plans/members/escrow", variant: "outline" },
          { label: "Back To Overview", to: "/plans/home/member-overview", variant: "secondary" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
        <PlanPanel title="Holdings Breakdown" description="The core explanation should live in one table.">
          <PlanTable headers={["Bucket", "Value", "Note"]} rows={[["Regular deposits", "$214m", "Available for normal flows"], ["Grant-linked", "$57m", "Pending grant-related movement"], ["Escrow-linked", "$30m", "Waiting on release or expiry"], ["Liquid holdings", "$181m", "Immediately visible personal total"]]} />
        </PlanPanel>
        <PlanPanel title="Next Steps" description="These links acknowledge adjacent ownership instead of hiding it.">
          <PlanActionList actions={[{ label: "Open member escrow", detail: "See why funds are blocked and when they may clear.", tone: "warning" }, { label: "Return to overview", detail: "Go back to the daily board without losing member context." }, { label: "Start a grant request", detail: "Move into the member request flow when deposits are insufficient." }]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function MemberEscrowPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Members"
        title="Escrow"
        description="The member escrow route is intentionally read-only. It exists to explain blocked money clearly, not to tease staff-only repair actions. The page uses simple tabs so the member can understand current, expired, and ignored rows without getting lost."
        stats={[
          { label: "Held now", value: "$44m", tone: "warning" },
          { label: "Expired", value: "1 row", tone: "danger" },
          { label: "Ignored", value: "1 row", tone: "neutral" },
        ]}
        actions={[
          { label: "Open Deposits", to: "/plans/members/deposits", variant: "secondary" },
          { label: "View Staff Escrow", to: "/plans/economy/manage-escrow", variant: "outline" },
        ]}
      />

      <Tabs defaultValue="escrow">
        <TabsList>
          <TabsTrigger value="escrow">Escrow</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="ignored">Ignored</TabsTrigger>
        </TabsList>
        <TabsContent value="escrow" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanPanel title="Blocked Rows" description="The main content is a simple explanation table.">
              <PlanTable headers={["Reason", "Held", "Started", "Meaning"]} rows={[["Grant hold", "$28m", "2d ago", "Releases after the grant condition is met"], ["Manual review", "$16m", "Today", "Officer review required"]]} />
            </PlanPanel>
            <PlanPanel title="What To Do" description="Keep escalation guidance visible but modest.">
              <PlanMiniList items={["If a row looks wrong, contact the listed reviewer or guild staff.", "Expired rows should mention when they are expected to clear.", "This route should not imply that a member can release or edit holds themselves."]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="expired" className="mt-3">
          <PlanCanvas label="Expired rows" description="A small review surface showing stale holds and what the member should expect next." height="h-64" />
        </TabsContent>
        <TabsContent value="ignored" className="mt-3">
          <PlanCanvas label="Ignored rows" description="Explain which rows are intentionally excluded from active totals and why." height="h-64" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function InterviewsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Members"
        title="Interviews"
        description="Interviews should read like a queue desk. State buckets on the left, applicants in the middle, and a real action rail on the right make it much easier to see what needs attention now and what can wait."
        stats={[
          { label: "Waiting", value: "4", tone: "warning" },
          { label: "Scheduled", value: "6", tone: "success" },
          { label: "Needs handoff", value: "2", tone: "neutral" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Queue States" description="State grouping should be as visible as the applicants themselves.">
          <PlanActionList actions={[{ label: "Waiting for mentor", detail: "No owner assigned yet.", tone: "warning" }, { label: "Scheduled", detail: "A time and owner already exist.", tone: "success" }, { label: "Blocked on applicant", detail: "Needs a response or missing info." }, { label: "Audit handoff", detail: "Ready to move into the next review stage." }]} />
        </PlanPanel>
        <PlanPanel title="Interview Queue" description="The center remains a dense list with just enough context.">
          <PlanTable headers={["Applicant", "State", "Mentor", "Last touch"]} rows={[["Rose Ember", "Scheduled", "Northlight", "15m ago"], ["Ash Harbor", "Needs follow-up", "Nightglass", "1h ago"], ["Silent Vale", "Audit handoff", "Stormcall", "Today"]]} />
        </PlanPanel>
        <PlanPanel title="Selected Applicant" description="The right rail is where the work happens.">
          <PlanMiniList items={["Current queue state and interview notes.", "Relevant member or nation context.", "Actions for reassign, remind, complete, or pass into audits."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function RecruitmentPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Members"
        title="Recruitment"
        description="Recruitment is a policy-and-message workspace, so the route should be tabbed around the four real jobs staff do here: applicant mail, recruit messages, timed outreach, and incentive policy."
        stats={[
          { label: "Mail templates", value: "5", tone: "neutral" },
          { label: "Timed gap", value: "Backend missing", tone: "warning" },
          { label: "Referral programs", value: "2", tone: "success" },
        ]}
      />

      <Tabs defaultValue="mail">
        <TabsList>
          <TabsTrigger value="mail">Applicant mail</TabsTrigger>
          <TabsTrigger value="messages">Recruit messages</TabsTrigger>
          <TabsTrigger value="timed">Timed messages</TabsTrigger>
          <TabsTrigger value="incentives">Incentives</TabsTrigger>
        </TabsList>
        <TabsContent value="mail" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanCanvas label="Policy editor" description="Guild mail templates, send rules, and examples should live in one calm editing surface." height="h-72" />
            <PlanMiniList items={["Show examples and preview state.", "Explain who receives each message family.", "Keep testing and command fallback secondary."]} />
          </div>
        </TabsContent>
        <TabsContent value="messages" className="mt-3">
          <PlanCanvas label="Message library" description="A browsable set of reusable outreach variants with tone and target cues." height="h-72" />
        </TabsContent>
        <TabsContent value="timed" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanCanvas label="Scheduled inventory" description="This part is blocked on backend support, so the layout should reserve space without pretending the data exists." height="h-72" />
            <PlanMiniList items={["Make the missing endpoint obvious.", "Do not fake an inventory list if the route cannot really show one yet.", "Keep the rest of the recruitment route functional anyway."]} />
          </div>
        </TabsContent>
        <TabsContent value="incentives" className="mt-3">
          <PlanCanvas label="Referral + incentive policy" description="A policy-focused surface for payout rules, referral program state, and exceptions." height="h-72" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function AuditsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Members"
        title="Audits"
        description="Audits is intentionally queue-shaped. A summary strip lives above the main table, severity groups stay visible, and the selected member gets a dedicated rail so the reviewer can rerun, escalate, or fix without leaving the desk."
        stats={[
          { label: "Critical", value: "5", tone: "danger" },
          { label: "Warnings", value: "17", tone: "warning" },
          { label: "Resolved today", value: "9", tone: "success" },
        ]}
        actions={[
          { label: "Open Interviews", to: "/plans/members/interviews", variant: "outline" },
          { label: "Back To Overview", to: "/plans/home/member-overview", variant: "secondary" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Severity Groups" description="Keep the left rail oriented around urgency.">
          <PlanActionList actions={[{ label: "Critical", detail: "Needs immediate staff action.", tone: "warning" }, { label: "Warnings", detail: "Review during regular staff workflow." }, { label: "Recent runs", detail: "Understand what changed most recently.", tone: "success" }]} />
        </PlanPanel>
        <PlanPanel title="Findings" description="The main table is where staff triage the queue.">
          <PlanTable headers={["Severity", "Member", "Finding", "Owner"]} rows={[["Critical", "Rosewater", "Missing required role", "Admin"], ["Warning", "Ashline", "Outdated war room state", "Milcom"], ["Critical", "Nightglass", "Grant mismatch", "Economy"]]} />
        </PlanPanel>
        <PlanPanel title="Member Rail" description="Selected member context and next actions stay close to the findings.">
          <PlanMiniList items={["Recent audit run history.", "Member state and linked routes.", "Actions to rerun, open interviews, open settings repair, or move into table views."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function CoalitionsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Members" title="Coalitions" description="Coalitions is a foreign-affairs directory with a list-detail-action rhythm. The route should make it easy to scan the coalition set, inspect one item, and then apply candidate or export actions from the same screen." stats={[{ label: "Active", value: "7", tone: "success" }, { label: "Candidates", value: "3", tone: "warning" }, { label: "Dormant", value: "2", tone: "neutral" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Filters" description="Filter by status, purpose, or regional grouping.">
          <PlanChipRow items={["Active", "Candidate", "Dormant", "Defense", "Intel", "Economic"]} />
        </PlanPanel>
        <PlanPanel title="Directory" description="The center list is the real browsing surface.">
          <PlanTable headers={["Coalition", "Type", "Alliances", "State"]} rows={[["Northern Shield", "Defense", "5", "Active"], ["Aurora Watch", "Intel", "3", "Candidate"], ["Eastern Trade Ring", "Economic", "7", "Dormant"]]} />
        </PlanPanel>
        <PlanPanel title="Detail + Actions" description="The right rail holds notes and the next move.">
          <PlanMiniList items={["Selected coalition summary and notes.", "Generated candidate suggestions.", "Export and command-backed mutation actions."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function TreatiesPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Members" title="Treaties" description="Treaties is a relationship desk. The center should be a table-first view of the actual treaty set, while the side rail keeps coalition context, health signals, and related report links visible for quick foreign-affairs follow-up." stats={[{ label: "Healthy", value: "9", tone: "success" }, { label: "Needs review", value: "2", tone: "warning" }, { label: "Dormant", value: "1", tone: "neutral" }]} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),22rem]">
        <PlanPanel title="Treaty Desk" description="The main view should be easy to scan and compare.">
          <PlanTable headers={["Partner", "Type", "Health", "Next review"]} rows={[["Aurora Bloc", "MDP", "Healthy", "14d"], ["Starlake", "Protectorate", "Needs review", "3d"], ["Iron Wake", "Intel pact", "Dormant", "30d"]]} />
        </PlanPanel>
        <PlanPanel title="Context Rail" description="Keep foreign-affairs follow-up nearby.">
          <PlanMiniList items={["Coalition overlaps and notes.", "Alliance-profile report links.", "Review cadence and expiry context."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function SpheresPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Members" title="Spheres" description="Spheres is an analysis page, so it should be visual first and control-driven second. The route keeps metric controls to one side, a large chart in the center, and drilldowns on the opposite rail so comparisons remain the point of the experience." stats={[{ label: "Compared groups", value: "4", tone: "neutral" }, { label: "Trend", value: "Stable rise", tone: "success" }, { label: "Saved comparisons", value: "3", tone: "neutral" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Controls" description="Metric family, timeframe, and compare scope stay pinned.">
          <PlanChipRow items={["Power", "Cities", "Militarization", "30d", "90d", "Compare rivals"]} />
        </PlanPanel>
        <PlanPanel title="Chart" description="A large visual canvas should dominate the route.">
          <Tabs defaultValue="trend">
            <TabsList>
              <TabsTrigger value="trend">Trend</TabsTrigger>
              <TabsTrigger value="tiers">Tier distribution</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
            </TabsList>
            <TabsContent value="trend" className="mt-3">
              <PlanCanvas label="Sphere trend" description="A large chart surface for macro movement over time." height="h-80" />
            </TabsContent>
            <TabsContent value="tiers" className="mt-3">
              <PlanCanvas label="Tier distribution" description="A visual view of composition and distribution." height="h-80" />
            </TabsContent>
            <TabsContent value="compare" className="mt-3">
              <PlanCanvas label="Compare" description="A side-by-side view for two or more spheres with summary overlays." height="h-80" />
            </TabsContent>
          </Tabs>
        </PlanPanel>
        <PlanPanel title="Drilldowns" description="Related routes stay adjacent to the analysis.">
          <PlanMiniList items={["Open coalitions", "Open rankings", "Save this comparison", "Share into reports"]} />
        </PlanPanel>
      </div>
    </div>
  );
}

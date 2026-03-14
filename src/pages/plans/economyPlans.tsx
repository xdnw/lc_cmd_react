/**
 * WARNING: HALLUCINATORY GARBAGE.
 * This file is AI-generated speculation and is not trustworthy.
 * Do not use it as source of truth, implementation guidance, planning input,
 * architectural guidance, or evidence that any described feature or substrate exists.
 * Keep it only as an idea scrap in case a small part is someday worth salvaging.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";

import {
  PlanActionList,
  PlanCanvas,
  PlanChipRow,
  PlanHero,
  PlanMiniList,
  PlanPanel,
  PlanTable,
  PlanValuePair,
  usePlanSidebar,
} from "./ui";

function AutomationPreviewDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Preview automation run</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tax Automation Preview</DialogTitle>
        </DialogHeader>
        <PlanTable
          headers={["Nation", "Current", "Next", "Reason"]}
          rows={[
            ["Rosewater", "A", "A", "No change"],
            ["Nightglass", "C", "B", "Income threshold met"],
            ["Ashline", "B", "Manual review", "Missing sync evidence"],
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ManageBalancePlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Manage Balance"
        description="The balance route now reads like a staff desk. Account choice is explicit, the middle area shows real balance posture and action context, and the right rail keeps recent movement close enough that operators can sanity-check before they commit to a transfer or correction."
        stats={[
          { label: "Selected account", value: "Offshore Alpha", tone: "success" },
          { label: "Available", value: "$4.2b", tone: "neutral" },
          { label: "Escrow blocked", value: "$410m", tone: "warning" },
        ]}
        actions={[
          { label: "Open Escrow", to: "/plans/economy/manage-escrow", variant: "outline" },
          { label: "Open Ledger", to: "/plans/economy/ledger", variant: "secondary" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Accounts" description="Accounts stay visible as first-class rows, not as hidden state.">
          <PlanTable
            headers={["Account", "Access", "State"]}
            rows={[["Offshore Alpha", "Manage", "Healthy"], ["Alliance main", "Manage", "Needs review"], ["Grant reserve", "View", "Healthy"], ["Member deposits", "Manage", "Restricted"]]}
          />
        </PlanPanel>

        <PlanPanel title="Balance Desk" description="Totals, breakdowns, and actions stay on the same working surface.">
          <div className="grid gap-3 lg:grid-cols-2">
            <PlanPanel title="Breakdown" description="Operators should not need a second page to understand composition.">
              <PlanTable headers={["Bucket", "Amount", "Note"]} rows={[["Cash", "$1.9b", "Primary transfer source"], ["Resources", "$1.1b", "Auto-valued"], ["Deposits", "$780m", "Restricted"], ["Escrow", "$410m", "Blocked"]]} />
            </PlanPanel>
            <PlanPanel title="Action Rail" description="Preview-first action cards live beside the numbers they affect.">
              <PlanActionList
                actions={[
                  { label: "Transfer out", detail: "Open a confirmation step with affordability and route preview.", tone: "success" },
                  { label: "Move to escrow", detail: "Send funds into a hold with expiry and policy notes.", tone: "warning" },
                  { label: "Correction", detail: "Open a repair flow with related ledger evidence in the same context." },
                ]}
              />
            </PlanPanel>
          </div>
        </PlanPanel>

        <PlanPanel title="Recent Movement" description="A small rail grounds the operator in what just happened.">
          <PlanTable
            headers={["When", "Action", "Amount"]}
            rows={[["10m ago", "Grant payout", "$125m"], ["42m ago", "Escrow release", "$60m"], ["Today", "Deposit correction", "$18m"]]}
          />
        </PlanPanel>
      </div>
    </div>
  );
}

export function ManageEscrowPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Manage Escrow"
        description="Escrow becomes its own operations desk. The important part is the split between bucket tabs in the middle and the correction rail on the right, so a reviewer can understand why something is blocked before they touch it."
        stats={[
          { label: "Held total", value: "$410m", tone: "warning" },
          { label: "Expired rows", value: "6", tone: "danger" },
          { label: "Ignored", value: "2", tone: "neutral" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Account Context" description="Escrow inherits account scope from the banking desk.">
          <PlanMiniList items={["Offshore Alpha selected", "Transfers and releases share the same account context", "One expiry wave is due in 18 hours"]} />
        </PlanPanel>
        <PlanPanel title="Escrow Buckets" description="The center changes by bucket, but keeps the same review shape.">
          <Tabs defaultValue="escrow">
            <TabsList>
              <TabsTrigger value="escrow">Escrow</TabsTrigger>
              <TabsTrigger value="ignored">Ignored</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="escrow" className="mt-3">
              <PlanTable headers={["Owner", "Held", "Reason", "Next step"]} rows={[["Grant 182", "$40m", "Awaiting claim", "Review expiry"], ["Member deposits", "$12m", "Manual hold", "Open correction"]]} />
            </TabsContent>
            <TabsContent value="ignored" className="mt-3">
              <PlanCanvas label="Ignored rows" description="Rows stay reviewable, with reasons and dates visible instead of silently dropping out of totals." />
            </TabsContent>
            <TabsContent value="expired" className="mt-3">
              <PlanCanvas label="Expired review" description="Expired holds become their own queue with release and cleanup paths." />
            </TabsContent>
            <TabsContent value="timeline" className="mt-3">
              <PlanCanvas label="Flow history" description="A visual timeline keeps the lifecycle of an escrow row readable for staff." />
            </TabsContent>
          </Tabs>
        </PlanPanel>
        <PlanPanel title="Correction Rail" description="Decisions stay close to the selected row.">
          <PlanMiniList items={["Explain why the row is blocked or ignored.", "Show release, ignore, or repair actions with preview-first wording.", "Link directly into ledger evidence for the selected row."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function LedgerPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Ledger"
        description="The ledger is a table-first review surface with a pinned filter rail and a detail drawer. It should feel dense but readable: operators narrow the result set from the left, scan typed records in the middle, and inspect structured details on the right."
        stats={[
          { label: "Visible records", value: "148", tone: "neutral" },
          { label: "Corrections flagged", value: "4", tone: "warning" },
          { label: "Account scope", value: "Offshore Alpha", tone: "success" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Filters" description="Saved filter sets keep the operator from rebuilding common searches.">
          <PlanChipRow items={["Transfers", "Tax", "Offshore", "Entity search", "Large amounts", "Needs correction"]} />
        </PlanPanel>
        <PlanPanel title="Typed Records" description="Rows should read as structured events, not log strings.">
          <PlanTable
            headers={["When", "Type", "Actor", "Summary", "Amount"]}
            rows={[["10:42", "GrantSend", "Econ officer", "Infrastructure grant -> Nation 421", "$125m"], ["10:15", "EscrowRelease", "Escrow bot", "Expired hold released", "$40m"], ["09:50", "TaxExpense", "Automation", "Bracket sweep", "$88m"]]}
          />
        </PlanPanel>
        <PlanPanel title="Detail Drawer" description="The drawer gives the selected record a real home.">
          <div className="space-y-3">
            <PlanValuePair label="Selected type" value="GrantSend" />
            <PlanValuePair label="Owner" value="Nightglass" />
            <PlanValuePair label="Correction state" value="No repair pending" />
            <PlanCanvas label="Structured detail" description="Typed fields, linked entities, and follow-up actions sit together here." height="h-40" />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

export function GrantTemplatesPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Grant Templates"
        description="Grant templates work best as a three-state studio: browse the library, edit the policy builder, then hand off into send with defaults already loaded. The route should make policy reuse feel faster than improvising from scratch."
        stats={[
          { label: "Templates", value: "11", tone: "neutral" },
          { label: "Needs review", value: "2", tone: "warning" },
          { label: "Ready to send", value: "7", tone: "success" },
        ]}
      />

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="handoff">Send handoff</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr)]">
            <PlanPanel title="Filters" description="Subtype, receiver class, funding source, and policy state.">
              <PlanChipRow items={["Infrastructure", "Military", "Rebuild", "Officer approval", "Offshore funded"]} />
            </PlanPanel>
            <PlanPanel title="Template Shelf" description="A library list that explains policy intent at a glance.">
              <PlanTable headers={["Template", "Subtype", "Policy", "Last used"]} rows={[["Infra growth", "Infrastructure", "Default growth grant", "Today"], ["Military catchup", "Military", "Officer-approved only", "Yesterday"], ["City rebuild", "City", "Requires rebuild proof", "3d ago"]]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="builder" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),22rem]">
            <PlanPanel title="Template Builder" description="Subtype-specific editing sits in the main canvas.">
              <PlanCanvas label="Builder form" description="Policy fields, receiver rules, funding defaults, and approval notes stay in one editing surface." height="h-72" />
            </PlanPanel>
            <PlanPanel title="Validation" description="The side rail calls out send-readiness and policy concerns.">
              <PlanMiniList items={["Subtype fields are complete.", "Funding source matches template policy.", "One receiver rule is narrower than the default grant workflow."]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="handoff" className="mt-3">
          <PlanPanel title="Send Preview" description="The selected template should flow straight into the send wizard with editable defaults.">
            <PlanCanvas label="Send handoff" description="Receiver, subtype values, and funding choices are preloaded into the final grant flow." />
          </PlanPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function GrantRequestsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Grant Requests"
        description="The request route needs to behave like two related workspaces: a member-facing submission flow and a staff-facing review queue. The page makes that split explicit instead of pretending one dense form can do both jobs well."
        stats={[
          { label: "New", value: "5", tone: "warning" },
          { label: "In review", value: "3", tone: "neutral" },
          { label: "Blocked", value: "2", tone: "danger" },
        ]}
      />

      <Tabs defaultValue="reviewer">
        <TabsList>
          <TabsTrigger value="member">Member submit</TabsTrigger>
          <TabsTrigger value="reviewer">Reviewer queue</TabsTrigger>
        </TabsList>
        <TabsContent value="member" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanPanel title="Request Form" description="A member should have a focused input flow with policy guidance nearby.">
              <PlanCanvas label="Submit request" description="Reason, requested amount, grant category, and supporting proof live inside one guided form." height="h-72" />
            </PlanPanel>
            <PlanPanel title="Policy Hints" description="The right rail explains what gets approved and what gets rejected.">
              <PlanMiniList items={["Infrastructure requests need the latest city and infra snapshot.", "Rebuild requests need proof of recent loss.", "Submitted items should show expected reviewer turnaround."]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="reviewer" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
            <PlanPanel title="Queue Groups" description="Urgency and policy mismatch should be visible before opening rows.">
              <PlanActionList actions={[{ label: "New", detail: "Fresh items waiting for initial review." }, { label: "Needs evidence", detail: "Requests missing attachments or support." }, { label: "Template available", detail: "These can hand off into a known policy flow.", tone: "success" }]} />
            </PlanPanel>
            <PlanPanel title="Request Queue" description="The main queue keeps the review process table-first.">
              <PlanTable headers={["State", "Requester", "Category", "Ask", "Flag"]} rows={[["New", "Rosewater", "Infra", "$110m", "Needs funding source"], ["Review", "Nightglass", "Military", "$85m", "Template available"], ["Blocked", "Ashline", "Rebuild", "$230m", "Missing evidence"]]} />
            </PlanPanel>
            <PlanPanel title="Selected Request" description="The right rail becomes the decision workspace.">
              <PlanMiniList items={["Request summary and evidence list.", "Reviewer notes and policy match clues.", "Approve, deny, or open in Grant Send with context preserved."]} />
            </PlanPanel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function GrantSendPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Grant Send"
        description="Grant send should feel like a guided workflow, not a sprawling form. The center handles the current step, while the right rail keeps a live funding and eligibility summary visible from the first click to the final confirmation."
        stats={[
          { label: "Current step", value: "Funding", tone: "warning" },
          { label: "Funding source", value: "Offshore Alpha", tone: "success" },
          { label: "Affordability", value: "Pass", tone: "success" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),22rem]">
        <PlanPanel title="Wizard" description="The stepper lives above a large central editing area.">
          <PlanChipRow items={["1 Type", "2 Receiver", "3 Arguments", "4 Funding", "5 Confirm"]} />
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <PlanCanvas label="Subtype editor" description="Grant-specific fields stay visible with contextual help and validation." height="h-64" />
            <PlanCanvas label="Funding decisions" description="Account source, escrow option, expiry, and approval choices sit beside the form." height="h-64" />
          </div>
        </PlanPanel>
        <PlanPanel title="Live Summary" description="A fixed rail keeps the operator oriented while moving between steps.">
          <PlanMiniList items={["Receiver eligibility and nation context.", "Chosen account and affordability result.", "Command preview or send summary before confirmation."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function TaxPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Tax"
        description="Tax is a multi-mode operations route. Rather than splitting policy, member exceptions, records, and automation into separate pages, the route uses tabs so staff can keep the same context while they shift between review and action."
        stats={[
          { label: "Bracket health", value: "Mostly healthy", tone: "success" },
          { label: "Exceptions", value: "9", tone: "warning" },
          { label: "Automation blockers", value: "3", tone: "danger" },
        ]}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanPanel title="Policy Summary" description="The overview should answer what the current regime actually is.">
              <PlanCanvas label="Policy posture" description="Tax rates, expense posture, and exceptional rules are summarized in one operator card." height="h-52" />
            </PlanPanel>
            <PlanPanel title="Actions" description="Small but meaningful workflow entry points.">
              <PlanActionList actions={[{ label: "Sync tax records", detail: "Refresh the current operating view." }, { label: "Review exceptions", detail: "Open the member tab filtered to unusual cases.", tone: "warning" }, { label: "Preview automation", detail: "See what will change before commands run.", tone: "success" }]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="members" className="mt-3">
          <PlanPanel title="Member Tax Table" description="This is the review center for exceptions and mismatches.">
            <PlanTable headers={["Member", "Bracket", "Exception", "Status"]} rows={[["Rosewater", "A", "None", "Healthy"], ["Nightglass", "C", "Manual override", "Review"], ["Ashline", "B", "Missing nation sync", "Blocked"]]} />
          </PlanPanel>
        </TabsContent>
        <TabsContent value="records" className="mt-3">
          <PlanPanel title="Tax Records" description="Tax records should inherit the same structured event posture as the ledger.">
            <PlanCanvas label="Tax record timeline" description="A review surface for tax-specific record slices without inventing a second ledger paradigm." />
          </PlanPanel>
        </TabsContent>
        <TabsContent value="automation" className="mt-3">
          <PlanPanel title="Automation" description="Bulk preview should be front-and-center before any change is applied." aside={<AutomationPreviewDialog />}>
            <PlanMiniList items={["Show exactly who will move brackets and why.", "Flag rows that still need manual review.", "Keep the final apply action separate from the preview itself."]} />
          </PlanPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function TradePlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Economy"
        title="Trade"
        description="Trade works as a chart-first dashboard. The top row gives the room a market pulse, and the tabbed body lets staff move between price action, rankings, profit analysis, and alerts without leaving the same visual frame."
        stats={[
          { label: "Top mover", value: "Oil +6.2%", tone: "success" },
          { label: "Volatility", value: "Medium", tone: "warning" },
          { label: "Alerts firing", value: "4", tone: "danger" },
        ]}
      />

      <Tabs defaultValue="market">
        <TabsList>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="market" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanPanel title="Price Canvas" description="Large enough to feel like a real analysis surface.">
              <PlanCanvas label="Resource chart" description="The main graph area carries the route, with compare and time-range changes happening nearby." height="h-80" />
            </PlanPanel>
            <PlanPanel title="Controls" description="Keep quick scenario changes nearby.">
              <PlanMiniList items={["Resource picker", "Time range", "Compare mode", "Export", "Alert thresholds"]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="rankings" className="mt-3">
          <PlanPanel title="Trade Rankings" description="A route-level ranking view, not a hidden chart subpanel.">
            <PlanTable headers={["Rank", "Subject", "Metric"]} rows={[["1", "Rose Coalition", "Import efficiency 91.2"], ["2", "Night River", "Profit margin 88.7"], ["3", "Storm Annex", "Growth 81.3"]]} />
          </PlanPanel>
        </TabsContent>
        <TabsContent value="profit" className="mt-3">
          <PlanPanel title="Profit Analysis" description="Comparison cards and explanation space belong together.">
            <div className="grid gap-3 lg:grid-cols-2">
              <PlanCanvas label="Profit comparison" description="A large visual block for comparing strategies or resources over time." height="h-56" />
              <PlanCanvas label="Formula explanation" description="The route should explain why a comparison looks good or bad without sending the user elsewhere." height="h-56" />
            </div>
          </PlanPanel>
        </TabsContent>
        <TabsContent value="alerts" className="mt-3">
          <PlanPanel title="Alerts Board" description="Alerts should feel actionable, not like a notification dump.">
            <PlanTable headers={["Alert", "Threshold", "State"]} rows={[["Oil spike", "+5% in 24h", "Firing"], ["Food crash", "-4% in 12h", "Watching"], ["Steel spread", "> 8%", "Muted"]]} />
          </PlanPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

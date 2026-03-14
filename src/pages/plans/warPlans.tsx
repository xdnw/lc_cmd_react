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

export function TargetsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="War"
        title="Targets"
        description="Targets is rebuilt as a real operations desk: mode tabs across the top, a visible filter rail on the left, dense results in the middle, and a right-hand drawer for the selected nation. That lets targeting feel like a command center instead of a form glued to a table."
        stats={[
          { label: "Raid matches", value: "36", tone: "success" },
          { label: "Saved presets", value: "5", tone: "neutral" },
          { label: "High-risk", value: "4", tone: "warning" },
        ]}
        actions={[
          { label: "Open Counters", to: "/plans/war/counters", variant: "secondary" },
          { label: "Open Rooms", to: "/plans/war/rooms", variant: "outline" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Filter Rail" description="Saved presets and score or threat filters should remain pinned while results update.">
          <PlanChipRow items={["Daily raids", "Beige snipes", "Unblockade", "Treasure watch", "Spy targets"]} />
          <div className="mt-3">
            <PlanMiniList items={["Score and infra range", "Activity and VM state", "DNR status and beige rules", "Alliance and coalition context"]} />
          </div>
        </PlanPanel>
        <PlanPanel title="Result Desk" description="Mode changes should not change the whole page shape.">
          <Tabs defaultValue="raid">
            <TabsList>
              <TabsTrigger value="raid">Raid</TabsTrigger>
              <TabsTrigger value="war">War targets</TabsTrigger>
              <TabsTrigger value="spy">Spy targets</TabsTrigger>
            </TabsList>
            <TabsContent value="raid" className="mt-3">
              <PlanTable headers={["Nation", "Score", "Loot", "Risk"]} rows={[["Rose Harbor", "1,890", "$46m", "Low"], ["Iron Hollow", "2,105", "$61m", "Medium"], ["Valewatch", "1,732", "$29m", "Low"]]} />
            </TabsContent>
            <TabsContent value="war" className="mt-3">
              <PlanTable headers={["Nation", "Readiness", "Threat", "Why now"]} rows={[["Night River", "Partial", "High", "Fresh war slot"], ["Cinder Lake", "Healthy", "Medium", "Alliance call target"]]} />
            </TabsContent>
            <TabsContent value="spy" className="mt-3">
              <PlanTable headers={["Nation", "Intel value", "Openness", "Risk"]} rows={[["Ash Harbor", "High", "Good", "Medium"], ["North Ash", "Medium", "Partial", "Low"]]} />
            </TabsContent>
          </Tabs>
        </PlanPanel>
        <PlanPanel title="Target Drawer" description="The selected target gets a permanent home on the right.">
          <PlanMiniList items={["Nation summary and why it matched.", "War, counter, or room launch actions.", "Saved preset notes and risk indicators."]} />
          <div className="mt-3">
            <PlanActionList actions={[{ label: "Open counter planner", detail: "Carry this nation into counter selection.", tone: "success" }, { label: "Open war room flow", detail: "Prepare the coordination path for this target." }, { label: "Command fallback", detail: "Show the raw command route only as a secondary action." }]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

export function CountersPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="War"
        title="Counters"
        description="Counters stays one desk with multiple entry modes. The value is consistency: single target, war URL, auto, and sheet mode all keep the same candidate-table and summary-rail shape so the operator never loses orientation."
        stats={[
          { label: "Candidate depth", value: "18", tone: "neutral" },
          { label: "Ready now", value: "7", tone: "success" },
          { label: "Needs ping", value: "4", tone: "warning" },
        ]}
      />

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single</TabsTrigger>
          <TabsTrigger value="url">War URL</TabsTrigger>
          <TabsTrigger value="auto">Auto</TabsTrigger>
          <TabsTrigger value="sheet">Sheet</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
            <PlanPanel title="Enemy" description="Selection and filters remain compact.">
              <PlanMiniList items={["Enemy nation picker", "Score fit filter", "Readiness threshold", "Exclude recent assignments"]} />
            </PlanPanel>
            <PlanPanel title="Candidate Table" description="The center table is the real decision surface.">
              <PlanTable headers={["Counter", "Fit", "Readiness", "Notes"]} rows={[["Nightglass", "High", "Ready", "Best econ fit"], ["Stormcall", "Medium", "Needs ping", "Slightly overextended"], ["Ashline", "Fallback", "Ready", "Low-cost option"]]} />
            </PlanPanel>
            <PlanPanel title="Plan Summary" description="What was chosen and why should be readable in one glance.">
              <PlanMiniList items={["Chosen counters and alternates.", "Coverage and expected outcome.", "Send or publish actions once the backend is ready."]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="url" className="mt-3">
          <PlanCanvas label="War URL mode" description="Paste a war URL and land on the same candidate and summary layout without reorienting the user." height="h-72" />
        </TabsContent>
        <TabsContent value="auto" className="mt-3">
          <PlanCanvas label="Auto suggestions" description="Generated suggestions should still be reviewable and editable before they become a plan." height="h-72" />
        </TabsContent>
        <TabsContent value="sheet" className="mt-3">
          <PlanCanvas label="Sheet mode" description="Structured sheet rows belong in the same layout once the backend gap is closed." height="h-72" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function RoomsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="War"
        title="Rooms"
        description="Rooms should feel like a war-room control center rather than a one-off command prompt. Creation, batch create, active room monitoring, and cleanup all belong under one roof so staff can manage the full lifecycle without hopping across unrelated tools."
        stats={[
          { label: "Active rooms", value: "22", tone: "success" },
          { label: "Stale rooms", value: "5", tone: "warning" },
          { label: "Blocked creates", value: "1", tone: "danger" },
        ]}
      />

      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="batch">Batch create</TabsTrigger>
          <TabsTrigger value="active">Active rooms</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),22rem]">
            <PlanPanel title="Create Flow" description="The main form defines participants, naming, and category targets.">
              <PlanCanvas label="Room creation form" description="Inputs, category selection, and warning hints stay together in a builder-like canvas." height="h-72" />
            </PlanPanel>
            <PlanPanel title="Preview Rail" description="The preview should stop bad room creation before it happens.">
              <PlanMiniList items={["Membership check", "Category target preview", "Warning rows for existing or conflicting rooms"]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="batch" className="mt-3">
          <PlanPanel title="Batch Preview" description="Batch room creation is a table-first review step.">
            <PlanTable headers={["Room", "Attackers", "Target", "Status"]} rows={[["wave-01", "3", "Night River", "Ready"], ["wave-02", "2", "Cinder Lake", "Category missing"]]} />
          </PlanPanel>
        </TabsContent>
        <TabsContent value="active" className="mt-3">
          <PlanPanel title="Active Rooms" description="Operators should be able to see health and next actions at a glance.">
            <PlanTable headers={["Room", "State", "Last update"]} rows={[["war-0421", "Healthy", "5m ago"], ["raid-ember", "Quiet", "41m ago"], ["intel-rose", "Needs attention", "2h ago"]]} />
          </PlanPanel>
        </TabsContent>
        <TabsContent value="cleanup" className="mt-3">
          <PlanPanel title="Cleanup Desk" description="Cleanup should look safe and reviewable.">
            <PlanActionList actions={[{ label: "Archive completed rooms", detail: "Move quiet or resolved rooms out of the active cluster." }, { label: "Delete empty rooms", detail: "Clean up abandoned channels after a review step.", tone: "warning" }]} />
          </PlanPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SheetsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="War"
        title="Sheets"
        description="Sheets is built as a multi-mode worksheet. The tabs reflect actual operator goals: import, validate, monitor, cost out, and export. The important part is that each mode still feels like a consistent review surface rather than a raw tool wrapper."
        stats={[
          { label: "Imported rows", value: "48", tone: "neutral" },
          { label: "Validation warnings", value: "9", tone: "warning" },
          { label: "Export formats", value: "3", tone: "success" },
        ]}
      />

      <Tabs defaultValue="blitz">
        <TabsList>
          <TabsTrigger value="blitz">Blitz</TabsTrigger>
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="active">Active wars</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>
        <TabsContent value="blitz" className="mt-3">
          <PlanCanvas label="Import + preview" description="The sheet URL and parsing summary lead into a real row preview surface, not a block of raw command output." height="h-72" />
        </TabsContent>
        <TabsContent value="validate" className="mt-3">
          <PlanTable headers={["Row", "Issue", "Severity"]} rows={[["12", "Attacker out of range", "High"], ["18", "Duplicate slot", "Medium"], ["27", "Missing defender", "High"]]} />
        </TabsContent>
        <TabsContent value="active" className="mt-3">
          <PlanCanvas label="Active wars sheet" description="A live table view for in-progress war tracking and coordination review." height="h-72" />
        </TabsContent>
        <TabsContent value="costs" className="mt-3">
          <PlanCanvas label="Cost summary" description="Aggregated cost outputs should be readable and comparable inside the route." height="h-72" />
        </TabsContent>
        <TabsContent value="exports" className="mt-3">
          <PlanActionList actions={[{ label: "Discord summary", detail: "Prepare a shareable compact view." }, { label: "CSV export", detail: "Download the current reviewed sheet." }, { label: "Room handoff", detail: "Pass cleaned rows into room creation.", tone: "success" }]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function MilitarizationPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="War"
        title="Militarization"
        description="Militarization is chart-first. The surrounding chrome should stay quiet so the graph and compare rail can do the work: the user changes metric or timeframe, reads the trend, then opens a related report or target flow from the comparison rail."
        stats={[
          { label: "Compared alliances", value: "4", tone: "neutral" },
          { label: "Trend", value: "Rising", tone: "success" },
          { label: "Volatility", value: "Moderate", tone: "warning" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Controls" description="Metrics, scope, and timeframe remain compact and visible.">
          <PlanChipRow items={["Ground focus", "Air focus", "30d", "90d", "Compare with rivals"]} />
        </PlanPanel>
        <PlanPanel title="Trend Canvas" description="The route is anchored by one large chart surface.">
          <PlanCanvas label="Readiness trend" description="A large time-series chart should dominate the middle so the route reads like analysis, not settings." height="h-80" />
        </PlanPanel>
        <PlanPanel title="Compare Rail" description="Summary cards and report links remain adjacent to the graph.">
          <PlanMiniList items={["Alliance snapshots for the current point in time.", "Rankings and report drilldowns.", "Quick jump into targeting if a readiness gap matters operationally."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function BlitzPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="War"
        title="Blitz"
        description="Blitz is a three-phase route: plan, validate, and room handoff. The prototype makes those stages obvious and keeps them in one screen so the operator can see how the workflow tightens as it gets closer to execution."
        stats={[
          { label: "Assignments", value: "24", tone: "neutral" },
          { label: "Validation issues", value: "5", tone: "warning" },
          { label: "Room ready", value: "19", tone: "success" },
        ]}
      />

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="rooms">Room handoff</TabsTrigger>
        </TabsList>
        <TabsContent value="plan" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanPanel title="Planner" description="Attackers, targets, and assumptions belong inside a single working canvas.">
              <PlanCanvas label="Plan builder" description="The route should let staff shape a blitz plan visually before asking for validation." height="h-72" />
            </PlanPanel>
            <PlanPanel title="Snapshot" description="A rail shows the current shape of the plan.">
              <PlanMiniList items={["Attackers assigned", "Target count", "Risk clusters", "Expected room output"]} />
            </PlanPanel>
          </div>
        </TabsContent>
        <TabsContent value="validate" className="mt-3">
          <PlanTable headers={["Line", "Problem", "Severity"]} rows={[["7", "Two attackers overlap", "High"], ["12", "Target no longer valid", "High"], ["21", "Coverage thin", "Medium"]]} />
        </TabsContent>
        <TabsContent value="rooms" className="mt-3">
          <PlanActionList actions={[{ label: "Create validated rooms", detail: "Only green rows should move into room creation.", tone: "success" }, { label: "Return flagged rows", detail: "Send weak or invalid rows back into planning.", tone: "warning" }]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

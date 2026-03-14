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
  PlanCanvas,
  PlanChipRow,
  PlanHero,
  PlanMiniList,
  PlanPanel,
  PlanTable,
  usePlanSidebar,
} from "./ui";

function AllianceProfileDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Open alliance profile</Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Alliance Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-4">
            <PlanPanel title="Score" description="Current snapshot"><div className="text-lg font-semibold">91.3</div></PlanPanel>
            <PlanPanel title="Growth" description="30 day"><div className="text-lg font-semibold">+4.8%</div></PlanPanel>
            <PlanPanel title="Revenue" description="Weekly"><div className="text-lg font-semibold">$6.2b</div></PlanPanel>
            <PlanPanel title="Militarization" description="Trend"><div className="text-lg font-semibold">Rising</div></PlanPanel>
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),20rem]">
            <PlanCanvas label="Alliance charts" description="Stat and trend graphs stay in the main body of the detail surface." height="h-72" />
            <PlanPanel title="Related routes" description="This surface should link back into the surrounding report loop.">
              <PlanMiniList items={["Open rankings", "Open conflicts", "Open treaties", "Open graphs"]} />
            </PlanPanel>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KpiPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Reports" title="KPI" description="KPI is a layout builder, not a single report. The screen needs a library of layouts, a large dashboard canvas, and a palette or inspector so people can understand how cards fit together without losing the current arrangement." stats={[{ label: "Layouts", value: "6", tone: "neutral" }, { label: "Cards on canvas", value: "8", tone: "success" }, { label: "Unsaved changes", value: "1", tone: "warning" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Layouts" description="Saved dashboards stay close to the working canvas.">
          <PlanMiniList items={["Executive summary", "War room snapshot", "Economy board", "Foreign affairs brief"]} />
        </PlanPanel>
        <PlanPanel title="Canvas" description="The center should feel like a dashboard builder, not a text form.">
          <div className="grid gap-3 lg:grid-cols-2">
            <PlanCanvas label="Table card" description="A saved table view rendered as a compact KPI card." height="h-40" />
            <PlanCanvas label="Graph card" description="A chart card rendered beside ranking or metric blocks." height="h-40" />
            <PlanCanvas label="Ranking card" description="A compact leaderboard tile with drilldown affordance." height="h-40" />
            <PlanCanvas label="Detail card" description="A card that can open alliance profile context without leaving the dashboard." height="h-40" />
          </div>
        </PlanPanel>
        <PlanPanel title="Palette + Inspector" description="Card settings and related surfaces belong in the right rail.">
          <AllianceProfileDialog />
          <div className="mt-3">
            <PlanMiniList items={["Card ordering and width settings.", "Data source selection for each block.", "Links back into tables, graphs, and rankings."]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

export function TablesPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Reports" title="Tables" description="Tables should look like a proper report studio. The builder rail handles type, filters, columns, and sort; the main area renders a live table preview; and saved views stay visible enough that they feel like a first-class workflow rather than an afterthought." stats={[{ label: "Saved views", value: "14", tone: "success" }, { label: "Templates", value: "9", tone: "neutral" }, { label: "Current type", value: "DBNation", tone: "neutral" }]} />

      <div className="grid gap-3 xl:grid-cols-[20rem,minmax(0,1fr)]">
        <PlanPanel title="Builder Rail" description="Selection, columns, and sort should be controllable from one side.">
          <PlanChipRow items={["Type: DBNation", "Saved views", "Template gallery", "Columns", "Sort", "Export"]} />
          <div className="mt-3">
            <PlanMiniList items={["Placeholder type picker", "Selection builder", "Column reorder", "Renderer choices", "Sort controls"]} />
          </div>
        </PlanPanel>
        <PlanPanel title="Live Table" description="The center keeps the actual report visible while the query is being shaped.">
          <PlanTable headers={["Nation", "Infra", "Score", "Alliance"]} rows={[["Rosewater", "2,100", "1,930", "Rose Coalition"], ["Nightglass", "1,870", "1,802", "Storm Annex"], ["Ashline", "2,340", "2,011", "Northline Reserve"]]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function GraphsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Reports" title="Graphs" description="Graphs is a gallery and chart workspace. The left side should let people choose a use-case or saved argument set, while the center gives enough room for the chart and the right rail keeps parameter memory and links nearby." stats={[{ label: "Graph families", value: "7", tone: "neutral" }, { label: "Recent configs", value: "4", tone: "success" }, { label: "Shared presets", value: "6", tone: "neutral" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Use Cases" description="Discovery should start from why, not just from endpoint names.">
          <PlanMiniList items={["War readiness", "Economy movement", "Foreign affairs", "Membership growth", "Trade and market"]} />
        </PlanPanel>
        <PlanPanel title="Chart" description="The chart remains the visual center of the route.">
          <PlanCanvas label="Selected graph" description="A large graph area with visible controls and a strong sense of what is currently being compared." height="h-80" />
        </PlanPanel>
        <PlanPanel title="Recent + Related" description="Shortcuts keep graph work sticky.">
          <PlanMiniList items={["Re-run recent comparison", "Save preset", "Open in KPI", "Open allied report route"]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function RankingsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Reports" title="Rankings" description="Rankings should behave like an explorer. Family selection belongs on the left, the ranking table dominates the middle, and the right side offers trend context plus a direct bridge into the alliance detail surface." stats={[{ label: "Family", value: "Alliance power", tone: "neutral" }, { label: "Trending up", value: "12", tone: "success" }, { label: "Watch list", value: "5", tone: "warning" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Families" description="The route starts with choosing what kind of ranking matters.">
          <PlanChipRow items={["Alliance", "Nation", "Trade", "Growth", "Military", "Time-based"]} />
        </PlanPanel>
        <PlanPanel title="Ranking Table" description="This is the main exploration surface.">
          <PlanTable headers={["Rank", "Subject", "Metric", "Trend"]} rows={[["1", "Aurora Bloc", "Power index 91.3", "+2.1"], ["2", "Night River", "Power index 88.6", "+0.4"], ["3", "Iron Wake", "Power index 82.1", "-1.3"]]} />
        </PlanPanel>
        <PlanPanel title="Trend + Detail" description="A small rail should be enough to link deeper.">
          <AllianceProfileDialog />
          <div className="mt-3">
            <PlanMiniList items={["Mini trend context", "Open graphs", "Open tables preset", "Open alliance profile"]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

export function ConflictsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Reports" title="Conflicts" description="Conflicts stays table-first, but it should still feel like a complete browser. Browse mode and staff mode share the same route, so analysts and editors keep the same surrounding context while they switch between review and maintenance work." stats={[{ label: "Active", value: "9", tone: "success" }, { label: "Cooling", value: "4", tone: "neutral" }, { label: "Staff edits pending", value: "2", tone: "warning" }]} />

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="staff">Staff mode</TabsTrigger>
        </TabsList>
        <TabsContent value="browse" className="mt-3">
          <PlanPanel title="Conflict Browser" description="A dense table with enough structure to scan fast.">
            <PlanTable headers={["Conflict", "Participants", "State", "Wars"]} rows={[["Spring Breaker", "3 vs 4", "Active", "142"], ["North Sea incident", "1 vs 2", "Cooling", "39"], ["Cinder March", "5 vs 5", "Planned", "0"]]} />
          </PlanPanel>
        </TabsContent>
        <TabsContent value="staff" className="mt-3">
          <PlanPanel title="Staff Edit Surface" description="Bulk tools and repair paths can live in a right rail or mode-specific bar without changing the page identity.">
            <PlanMiniList items={["Bulk actions", "Metadata fixes", "Command-backed mutators", "Refresh and sync tools"]} />
          </PlanPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function MultiInvestigationPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Reports" title="Multi Investigation" description="Multi investigation is a dense analysis desk. Subject selection and explanation stay on the left, while the middle carries the overlap signals and the summary strip, keeping the page focused on suspicious patterns instead of generic report chrome." stats={[{ label: "Subjects", value: "4", tone: "neutral" }, { label: "High-confidence overlaps", value: "2", tone: "danger" }, { label: "Needs review", value: "5", tone: "warning" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr)]">
        <PlanPanel title="Subjects" description="Selection and case framing stay compact.">
          <PlanMiniList items={["Nation and alliance selector", "Saved case entry", "Known notes or tags", "Escalation level"]} />
        </PlanPanel>
        <PlanPanel title="Signals" description="The center is where the actual investigation happens.">
          <div className="grid gap-3 lg:grid-cols-3">
            <PlanCanvas label="Summary strip" description="A compact explanation of what makes this case worth attention." height="h-32" />
            <PlanCanvas label="Overlap graph" description="A small visual read on how the selected subjects intersect." height="h-32" />
            <PlanCanvas label="Decision context" description="Escalation, confidence, and next-step guidance." height="h-32" />
          </div>
          <div className="mt-3">
            <PlanTable headers={["Signal", "Subject A", "Subject B", "Weight"]} rows={[["IP overlap", "Rose Ember", "Ash Harbor", "High"], ["Login cadence", "Nightglass", "Stormcall", "Medium"], ["Banking path", "Rose Ember", "Stormcall", "Review"]]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

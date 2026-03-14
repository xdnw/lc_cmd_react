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

function CommandHistoryDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Open history</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Command History</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr)]">
          <PlanPanel title="Filters" description="History should still be filterable inside the modal.">
            <PlanChipRow items={["grant send", "war room", "server", "success", "warning", "today"]} />
          </PlanPanel>
          <PlanPanel title="Recent runs" description="The modal needs enough context to reopen a run without guesswork.">
            <PlanTable headers={["When", "Command", "Status", "Reopen"]} rows={[["12m ago", "/grant send infra", "Success", "Open in runner"], ["28m ago", "/war room create", "Warning", "Open preview"], ["2h ago", "/settings audit", "Error", "Inspect output"]]} />
          </PlanPanel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CommandBrowserPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Commands" title="Browser" description="The browser should be a discovery surface, not a raw dump. Filters and favorites live on the left, the catalog takes the center, and the right rail explains the currently highlighted command while still exposing command history as a true embedded surface." stats={[{ label: "Favorites", value: "8", tone: "success" }, { label: "Recent", value: "5", tone: "neutral" }, { label: "Guild scoped", value: "Most", tone: "warning" }]} actions={[{ label: "Open Runner", to: "/plans/commands/runner", variant: "secondary" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Discovery" description="Search, family filters, and favorites remain visible.">
          <PlanChipRow items={["Economy", "War", "Server", "Favorites", "Recent", "Guild required"]} />
          <div className="mt-3">
            <PlanMiniList items={["Full-text search", "Family grouping", "Favorite commands", "Recently used"]} />
          </div>
        </PlanPanel>
        <PlanPanel title="Catalog" description="The center stays about choosing the right command, not running it inline.">
          <PlanTable headers={["Command", "Family", "Use case"]} rows={[["grant send", "Economy", "Execute approved grant payouts"], ["war room create", "War", "Create battle coordination rooms"], ["settings audit", "Server", "Inspect missing or invalid settings"]]} />
        </PlanPanel>
        <PlanPanel title="Context Rail" description="The selected command gets guidance and quick follow-up actions.">
          <CommandHistoryDialog />
          <div className="mt-3">
            <PlanMiniList items={["Short command summary and role hints.", "Example arguments or common variants.", "Button to open the full runner with current context preserved."]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

export function CommandRunnerPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero eyebrow="Commands" title="Runner" description="The runner is a proper execution surface. The form belongs in the center, a preview should update as arguments change, the output deserves a dedicated pane, and history remains an embedded modal rather than turning into route sprawl." stats={[{ label: "Command", value: "grant send", tone: "neutral" }, { label: "Variant saved", value: "2", tone: "success" }, { label: "Last run", value: "12m ago", tone: "neutral" }]} />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Saved Variants" description="The left rail keeps common argument sets close.">
          <PlanMiniList items={["Infra growth", "Military catch-up", "Rebuild rush", "Officer dry-run"]} />
        </PlanPanel>
        <PlanPanel title="Command Workspace" description="Form, preview, and output share a stable central frame.">
          <Tabs defaultValue="form">
            <TabsList>
              <TabsTrigger value="form">Form</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
            </TabsList>
            <TabsContent value="form" className="mt-3">
              <PlanCanvas label="Argument form" description="Type-aware inputs and validation messages stay in the main canvas, not in a tiny side column." height="h-72" />
            </TabsContent>
            <TabsContent value="preview" className="mt-3">
              <PlanCanvas label="Command preview" description="A real command string preview plus warnings and execution notes should appear before send." height="h-72" />
            </TabsContent>
            <TabsContent value="output" className="mt-3">
              <PlanCanvas label="Output surface" description="Structured result summary and raw fallback output stay together in one readable panel." height="h-72" />
            </TabsContent>
          </Tabs>
        </PlanPanel>
        <PlanPanel title="History + Notes" description="The right rail keeps context visible while the user edits inputs.">
          <CommandHistoryDialog />
          <div className="mt-3">
            <PlanMiniList items={["Show when the current variant last ran.", "Keep guild and nation context visible.", "Link back into the browser for command discovery if the user picked the wrong tool."]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

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

function SettingEditPreview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Preview edit dialog</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Setting</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),18rem]">
          <PlanPanel title="Editor" description="The input stays center stage, with validation and inherited state close by.">
            <PlanCanvas label="Input control" description="A real editor area for current value, suggested replacement, validation status, and save or clear actions." height="h-40" />
          </PlanPanel>
          <PlanPanel title="Context" description="Why this value exists and what changes if you save.">
            <PlanMiniList
              items={[
                "Inherited or local state explanation.",
                "Relevant permission and support hints.",
                "Trace or audit links when a richer backend exists.",
              ]}
            />
          </PlanPanel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ServerSetupPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Server"
        title="Setup"
        description="Setup should feel like an operations board, not a checklist. Each module gets its own status block, the center area highlights the broken pieces, and the right rail keeps the recommended recovery action close enough that the next click is obvious."
        stats={[
          { label: "Healthy modules", value: "3", tone: "success" },
          { label: "Needs review", value: "2", tone: "warning" },
          { label: "Hard blockers", value: "1", tone: "danger" },
        ]}
        actions={[
          { label: "Open Settings", to: "/plans/server/settings", variant: "secondary" },
          { label: "Back To Guild Select", to: "/plans/guild-select", variant: "outline" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Setup Modules" description="The left rail acts like a board navigator for the recovery flow.">
          <PlanActionList
            actions={[
              { label: "Foundation", detail: "Guild identity, bot access, and baseline configuration are healthy.", tone: "success" },
              { label: "Alliance", detail: "Registration is stale and blocks economy tools.", tone: "warning" },
              { label: "Recruitment", detail: "Timed message inventory is missing backend support.", tone: "warning" },
              { label: "War", detail: "Category permissions prevent room creation.", tone: "warning" },
            ]}
          />
        </PlanPanel>

        <PlanPanel title="Readiness Board" description="The middle should feel like a board of concrete states, not prose.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <PlanCanvas label="Foundation" description="Core connection and identity checks are complete." height="h-32" />
            <PlanCanvas label="Alliance repair" description="The guild needs a clean alliance association before banking routes unlock." height="h-32" />
            <PlanCanvas label="Role access" description="One officer role is missing a required permission path." height="h-32" />
            <PlanCanvas label="Recruitment" description="Message policy exists, but scheduled inventory is still unresolved." height="h-32" />
            <PlanCanvas label="Banking" description="Core access is present, but one transfer account has no visible route owner." height="h-32" />
            <PlanCanvas label="War" description="Room category and sheet outputs need repair before operators can proceed." height="h-32" />
          </div>
        </PlanPanel>

        <PlanPanel title="Recovery Rail" description="The right side tells the admin what to do next and why.">
          <PlanMiniList
            items={[
              "Recommend the next best fix, not every possible fix.",
              "Show whether the issue is resolvable in-browser or still command-only.",
              "Keep owner or permission clues visible so the page remains operational instead of decorative.",
            ]}
          />
        </PlanPanel>
      </div>
    </div>
  );
}

export function ServerSettingsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Server"
        title="Settings"
        description="The settings browser now borrows the best parts of the existing implementation: a search-first top bar, a left navigation tree, a dense center list, and a real edit dialog instead of route sprawl. The prototype is about the shape of the working screen, not about restating setting metadata."
        stats={[
          { label: "Visible rows", value: "114", tone: "neutral" },
          { label: "Unset", value: "18", tone: "warning" },
          { label: "Invalid", value: "3", tone: "danger" },
        ]}
        actions={[
          { label: "Open Setup", to: "/plans/server/setup", variant: "outline" },
          { label: "Open Roles", to: "/plans/server/roles", variant: "secondary" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Category Tree" description="The navigation remains compact but descriptive.">
          <PlanActionList
            actions={[
              { label: "Recruitment", detail: "Mail templates, message rules, and outreach policy." },
              { label: "Economy", detail: "Tax automation, banking controls, and role gates." },
              { label: "War", detail: "Room categories, default channels, and coordination options." },
              { label: "Access", detail: "Who can touch the higher-risk workflows." },
            ]}
          />
        </PlanPanel>

        <PlanPanel title="Settings Browser" description="Search and state filters sit above a dense list; editing stays in modal overlays.">
          <div className="rounded-2xl border border-border/70 bg-background/95 px-3 py-3">
            <div className="flex flex-wrap gap-2 border-b border-border/70 pb-3">
              <div className="rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 text-xs text-muted-foreground">Search settings</div>
              <div className="rounded-full border border-border/70 px-3 py-1.5 text-xs">Unset (18)</div>
              <div className="rounded-full border border-border/70 px-3 py-1.5 text-xs">Invalid (3)</div>
              <div className="rounded-full border border-border/70 px-3 py-1.5 text-xs">Unsupported (5)</div>
            </div>
            <div className="mt-3">
              <PlanTable
                headers={["Setting", "Category", "State", "Editor"]}
                rows={[
                  ["recruit_mail_template", "Recruitment", "Set", "Input supported"],
                  ["tax_bracket_auto", "Economy", "Unset", "Command fallback"],
                  ["war_room_category", "War", "Invalid", "Needs audit trace"],
                  ["mentor_ping_role", "Access", "Set", "Input supported"],
                ]}
              />
            </div>
          </div>
        </PlanPanel>

        <PlanPanel title="Detail Rail" description="Quick help, inheritance clues, and edit shortcuts live here.">
          <div className="space-y-3">
            <PlanValuePair label="Highlighted setting" value="war_room_category" />
            <PlanValuePair label="Delegated state" value="Local override" />
            <PlanValuePair label="Editor support" value="Select + validation" />
            <SettingEditPreview />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

export function ServerRolesPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Server"
        title="Roles"
        description="Roles works better as a grouped management surface than as a pile of unrelated commands. The route is organized by intent, so aliases, self roles, auto roles, opt-outs, and bulk actions each get their own area while still reading as one cohesive admin console."
        stats={[
          { label: "Aliases", value: "12", tone: "neutral" },
          { label: "Self roles", value: "8", tone: "success" },
          { label: "Broken bindings", value: "2", tone: "warning" },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <PlanPanel title="Alias Library" description="Operators should be able to scan the active vocabulary instantly.">
          <PlanTable headers={["Alias", "Role", "State"]} rows={[["mentor", "Mentor", "Healthy"], ["econ", "Economy officer", "Healthy"], ["raidlead", "Raid Lead", "Needs review"]]} />
        </PlanPanel>
        <PlanPanel title="Self Roles" description="Member-manageable roles stay visible as a separate concern.">
          <PlanMiniList items={["Game alerts", "War pings", "Recruitment watchers", "Trade watchers"]} />
        </PlanPanel>
        <PlanPanel title="Auto Roles" description="A summary board for automatic assignment behavior.">
          <PlanCanvas label="Rules board" description="Automatic assignment logic, triggers, and exceptions stay in one visual area." height="h-44" />
        </PlanPanel>
        <PlanPanel title="Bulk Tools" description="Mass actions should feel powerful but contained.">
          <PlanMiniList items={["Bulk add by query", "Bulk remove by audit result", "Dry-run summary before apply"]} />
        </PlanPanel>
        <PlanPanel title="Opt-outs" description="Exceptions should be searchable rather than buried.">
          <PlanTable headers={["Member", "Flow", "Reason"]} rows={[["Rosewater", "Auto tax role", "Manual override"], ["Ashline", "Recruit alerts", "Muted by staff"]]} />
        </PlanPanel>
        <PlanPanel title="Repair Rail" description="A small side region for state mismatches and next actions.">
          <PlanMiniList items={["Two aliases point at deleted roles.", "One self-role bundle is missing button routing.", "Auto-role rule order should be reviewable before saving."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function ServerChannelsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Server"
        title="Channels"
        description="This route stays command-backed, but the screen should still feel intentional: workflow selection on the left, a real editor or preview surface in the middle, and warnings or dry-run output on the right."
        stats={[
          { label: "Interview flows", value: "2", tone: "neutral" },
          { label: "War room issues", value: "1", tone: "warning" },
          { label: "Permissions blockers", value: "3", tone: "danger" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Workflow Picker" description="Repair work is easier when it starts from a recognizable job, not from raw arguments.">
          <PlanActionList
            actions={[
              { label: "Interview channels", detail: "Create or repair the onboarding structure." },
              { label: "War rooms", detail: "Build or fix room categories and permission defaults." },
              { label: "Alert channels", detail: "Reconnect routing for staff and public alerts." },
              { label: "Bulk sort", detail: "Apply cleanup or layout rules to crowded categories." },
            ]}
          />
        </PlanPanel>
        <PlanPanel title="Editor + Preview" description="The center should still feel like a workbench even when commands remain the backend owner.">
          <Tabs defaultValue="editor">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Dry run</TabsTrigger>
              <TabsTrigger value="result">Result</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="mt-3">
              <PlanCanvas label="Workflow editor" description="Scoped arguments, command hints, and layout choices stay grouped in one operator canvas." />
            </TabsContent>
            <TabsContent value="preview" className="mt-3">
              <PlanTable headers={["Channel", "Action", "Risk"]} rows={[["#war-0421", "Move to archive", "Low"], ["#interview-rose", "Repair permissions", "Medium"]]} />
            </TabsContent>
            <TabsContent value="result" className="mt-3">
              <PlanCanvas label="Execution summary" description="Structured result rows should sit where the operator can compare them against the requested change." />
            </TabsContent>
          </Tabs>
        </PlanPanel>
        <PlanPanel title="Warnings" description="The right rail explains why a dry-run might be unsafe or blocked.">
          <PlanMiniList items={["A room category is missing the expected officer role.", "One target channel already exists under a conflicting parent.", "A cleanup rule would affect manually pinned rooms."]} />
        </PlanPanel>
      </div>
    </div>
  );
}

export function ServerMenusPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Server"
        title="Menus"
        description="Menus should feel like a real builder screen: library on the left, editable canvas in the middle, live preview and target inspection on the right. The screen is about building confidence before anything gets published."
        stats={[
          { label: "Active menus", value: "14", tone: "neutral" },
          { label: "Drafts", value: "3", tone: "warning" },
          { label: "Broken targets", value: "1", tone: "danger" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Library" description="The menu library reads like a design shelf, not a dump of names.">
          <PlanTable headers={["Menu", "Target", "State"]} rows={[["Role picker", "#roles", "Live"], ["War opts", "Pinned message", "Draft"], ["Economy nav", "#start-here", "Broken target"]]} />
        </PlanPanel>
        <PlanPanel title="Editor" description="The center is a real composition area for title, body, and button stack.">
          <PlanCanvas label="Menu composer" description="Buttons, labels, routing, and helper text sit in a central editing canvas with enough room to feel like a builder." height="h-72" />
        </PlanPanel>
        <PlanPanel title="Preview + Inspector" description="Operators need to see both appearance and placement.">
          <div className="space-y-3">
            <PlanCanvas label="Live preview" description="Render the menu as the final message block, including button density and spacing." height="h-40" />
            <PlanTable headers={["Target", "Channel", "Status"]} rows={[["Pinned message", "#roles", "Healthy"], ["Fallback route", "#start-here", "Route mismatch"]]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

export function ServerEmbedsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Server"
        title="Embeds"
        description="The embed editor should behave like a proper studio. A library shelf sits to one side, the body and fields live in the center, and the preview rail stays visible so the operator never has to imagine the result."
        stats={[
          { label: "Saved embeds", value: "22", tone: "neutral" },
          { label: "Drafts", value: "4", tone: "warning" },
          { label: "Ready to send", value: "3", tone: "success" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
        <PlanPanel title="Embed Shelf" description="A browsable list with drafts and publish state.">
          <PlanTable headers={["Embed", "Use case", "State"]} rows={[["Welcome", "Onboarding", "Live"], ["Grant approval", "Economy", "Draft"], ["War room alert", "War", "Live"]]} />
        </PlanPanel>
        <PlanPanel title="Body + Fields" description="The main editing canvas should keep the structure visible as you work.">
          <PlanCanvas label="Field editor" description="Title, body, color, images, fields, and footer stack vertically in one composition surface." height="h-72" />
        </PlanPanel>
        <PlanPanel title="Preview Rail" description="The preview rail combines render fidelity with send-readiness checks.">
          <div className="space-y-3">
            <PlanCanvas label="Rendered embed" description="A faithful message preview with field density, buttons, and image treatment." height="h-44" />
            <PlanChipRow items={["Buttons attached", "Attachment ready", "Command fallback available"]} />
          </div>
        </PlanPanel>
      </div>
    </div>
  );
}

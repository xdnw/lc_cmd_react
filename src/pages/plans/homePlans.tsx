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
  PlanLinkedCards,
  PlanMiniList,
  PlanPanel,
  PlanTable,
  usePlanSidebar,
} from "./ui";

export function GuildSelectPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Entry"
        title="Guild Select"
        description="The rebuilt guild picker behaves like a triage board: pick a workspace on the left, inspect readiness in the middle, and see exactly who or what is blocking entry on the right. The point is to make the next action feel obvious instead of dumping the user into a generic picker."
        stats={[
          { label: "Ready guilds", value: "4", tone: "success" },
          { label: "Needs repair", value: "2", tone: "warning" },
          { label: "Hard blocked", value: "1", tone: "danger" },
        ]}
        actions={[
          { label: "Go To Home", to: "/plans/home", variant: "secondary" },
          { label: "Open Server Setup", to: "/plans/server/setup", variant: "outline" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),20rem]">
        <PlanPanel title="Guilds" description="Recent workspaces, setup state, and ownership cues stay visible in the picker itself.">
          <div className="space-y-2">
            {[
              ["Rose Coalition", "Ready", "2 minutes ago"],
              ["Northline Reserve", "Alliance mismatch", "Yesterday"],
              ["Storm Annex", "Missing banking", "4 days ago"],
              ["Harbor Desk", "Ready", "Last week"],
            ].map((guild) => (
              <div key={guild[0]} className="rounded-2xl border border-border/70 bg-muted/25 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground">{guild[0]}</div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{guild[1]}</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Last entered {guild[2]}</div>
              </div>
            ))}
          </div>
        </PlanPanel>

        <PlanPanel title="Workspace Readiness" description="The center area answers one question: can this guild be used right now, and if not, why not?">
          <div className="grid gap-3 lg:grid-cols-3">
            <PlanCanvas label="Foundation" description="Bot access, guild identity, and baseline configuration are healthy." height="h-32" />
            <PlanCanvas label="Alliance Scope" description="The linked alliance is stale and needs repair before economy tools unlock." height="h-32" />
            <PlanCanvas label="War Tooling" description="Room category permissions are intact and the war surfaces can open cleanly." height="h-32" />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <PlanPanel title="Ready Next Steps" description="When a guild is healthy, the route should hand the user off immediately.">
              <PlanActionList
                actions={[
                  { label: "Enter Home", detail: "Use the role-aware landing page for normal work.", tone: "success" },
                  { label: "Open Member Overview", detail: "Jump straight into the daily member board.", tone: "success" },
                  { label: "Go To Server Settings", detail: "Open config without forcing a second picker.", tone: "default" },
                ]}
              />
            </PlanPanel>
            <PlanPanel title="Blocked Next Steps" description="When a guild is not healthy, the route should explain the recovery path instead of hiding it.">
              <PlanActionList
                actions={[
                  { label: "Repair alliance registration", detail: "Send the operator into setup with the alliance module already focused.", tone: "warning" },
                  { label: "Open command fallback", detail: "Use commands only when there is no guided browser repair path.", tone: "default" },
                  { label: "Escalate permissions", detail: "Show who needs to fix role or Discord access before the operator can continue.", tone: "warning" },
                ]}
              />
            </PlanPanel>
          </div>
        </PlanPanel>

        <PlanPanel title="Context Rail" description="A small rail keeps accountability and recovery details nearby.">
          <PlanMiniList
            items={[
              "Show the current identity, delegated context, and whether the operator can manage the selected guild.",
              "Surface the exact role or owner expected to fix a blocker.",
              "Keep a short checklist of the best recovery path instead of a long paragraph.",
            ]}
          />
        </PlanPanel>
      </div>
    </div>
  );
}

export function HomePlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Landing"
        title="Home"
        description="This version feels like a front door to real work. The main row is about urgency and role, not a random card gallery: public exploration stays available, but logged-in users land on featured tasks, recent work, and their active guild state first."
        stats={[
          { label: "Unread announcements", value: "3", tone: "warning" },
          { label: "Recent task", value: "Targets", tone: "success" },
          { label: "Guild state", value: "Needs setup", tone: "danger" },
        ]}
        actions={[
          { label: "Open Member Overview", to: "/plans/home/member-overview", variant: "secondary" },
          { label: "Open Announcements", to: "/plans/home/announcements", variant: "outline" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr),22rem]">
        <PlanPanel title="Featured Work" description="Large cards explain why a route matters right now, not just what its name is.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Member Overview", "Daily board", "Unread announcements, blocked escrow, and active wars all funnel here."],
              ["Manage Balance", "Officer desk", "Account-scoped bank work and recent ledger movement need review."],
              ["Targets", "War night", "Saved raid preset and active coordination handoff are waiting."],
              ["Server Setup", "Needs attention", "The selected guild is not fully ready, so setup should be promoted."],
              ["Tables", "Analysis", "Saved views and foreign-affairs reporting remain one click away."],
              ["Commands", "Fallback", "Advanced command work stays visible but no longer dominates the page."],
            ].map((card) => (
              <div key={card[0]} className="rounded-3xl border border-border/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.14),rgba(15,23,42,0.04))] p-4 shadow-xs">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{card[1]}</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{card[0]}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{card[2]}</div>
              </div>
            ))}
          </div>
        </PlanPanel>

        <PlanPanel title="Continue Where You Left Off" description="Recent work should feel like a quick handoff back into the last real task.">
          <PlanTable
            headers={["Surface", "Context", "Resume"]}
            rows={[
              ["Targets", "Rose Coalition / raid preset", "Jump back into saved filters"],
              ["Manage Balance", "Offshore Alpha", "Resume transfer review"],
              ["Member Overview", "Current nation", "Open daily board"],
            ]}
          />
        </PlanPanel>
      </div>

      <PlanPanel title="Role-Aware Modes" description="The same landing page can promote different work depending on who just arrived.">
        <Tabs defaultValue="member">
          <TabsList>
            <TabsTrigger value="member">Member</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
          </TabsList>
          <TabsContent value="member" className="mt-3">
            <PlanChipRow items={["Announcements first", "Holdings and deposits", "War and raids", "Personal blockers"]} />
          </TabsContent>
          <TabsContent value="staff" className="mt-3">
            <PlanChipRow items={["Economy desk", "Members queue", "War operations", "Saved reports"]} />
          </TabsContent>
          <TabsContent value="admin" className="mt-3">
            <PlanChipRow items={["Server setup", "Settings repair", "Channels and roles", "Menus and embeds"]} />
          </TabsContent>
          <TabsContent value="public" className="mt-3">
            <PlanChipRow items={["Conflicts", "Tables", "Graphs", "Status", "Commands"]} />
          </TabsContent>
        </Tabs>
      </PlanPanel>
    </div>
  );
}

export function MemberOverviewPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Daily Loop"
        title="Member Overview"
        description="This page works like a stitched-together command center. The left side holds the things a member should notice first, while the right side keeps personal finance, grants, and blockers together instead of scattering them across unrelated routes."
        stats={[
          { label: "Unread posts", value: "2", tone: "warning" },
          { label: "Escrow blocked", value: "$44m", tone: "danger" },
          { label: "Open wars", value: "3", tone: "success" },
        ]}
        actions={[
          { label: "Open Deposits", to: "/plans/members/deposits", variant: "secondary" },
          { label: "Open Targets", to: "/plans/war/targets", variant: "outline" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)]">
        <div className="grid gap-3">
          <PlanPanel title="Unread Announcements" description="A headline card with enough detail that opening the inbox feels intentional.">
            <PlanTable
              headers={["Channel", "Subject", "Why it matters"]}
              rows={[["War night", "Hit sheet posted", "Your assigned target changed 18 minutes ago"], ["Economy", "Grant window", "Your pending request needs updated receipts"]]}
            />
          </PlanPanel>
          <PlanPanel title="War And Raid Board" description="The member should see open conflict context without going into a separate combat dashboard immediately.">
            <div className="grid gap-3 lg:grid-cols-3">
              <PlanCanvas label="Assigned target" description="Night River sits inside your current raid range and has a fresh loot snapshot." height="h-32" />
              <PlanCanvas label="War rooms" description="Two active coordination rooms are waiting for your check-in." height="h-32" />
              <PlanCanvas label="Readiness" description="One military check is stale and should be rerun before the next wave." height="h-32" />
            </div>
          </PlanPanel>
        </div>

        <div className="grid gap-3">
          <PlanPanel title="Holdings" description="The finance side compresses what matters before the user opens deeper pages.">
            <PlanTable
              headers={["Bucket", "Amount"]}
              rows={[["Total holdings", "$482m"], ["Deposits", "$301m"], ["Blocked in escrow", "$44m"], ["Recent grant change", "+$18m"]]}
            />
          </PlanPanel>
          <PlanPanel title="Personal Issues" description="A small rail for problems that should not get lost under the main board.">
            <PlanMiniList
              items={[
                "Escrow has one row pending officer release.",
                "A grant request is waiting on more evidence.",
                "One setup warning is inherited from guild readiness and should deep-link back to repair.",
              ]}
            />
          </PlanPanel>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementsPlanPage() {
  usePlanSidebar();

  return (
    <div className="space-y-3 pb-4">
      <PlanHero
        eyebrow="Inbox"
        title="Announcements"
        description="The route behaves like a proper messaging workspace. Reading, filtering, drafting, and archiving all belong here, so the main screen keeps a dense inbox in the middle and a real reading pane or composer beside it instead of bouncing users between pages."
        stats={[
          { label: "Unread", value: "7", tone: "warning" },
          { label: "Pinned", value: "2", tone: "success" },
          { label: "Scheduled", value: "1", tone: "neutral" },
        ]}
        actions={[
          { label: "Back To Home", to: "/plans/home", variant: "outline" },
          { label: "Open Overview", to: "/plans/home/member-overview", variant: "secondary" },
        ]}
      />

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[18rem,minmax(0,1fr),22rem]">
            <PlanPanel title="Filters" description="Unread, audience, delivery state, and search belong in a compact rail.">
              <PlanChipRow items={["Unread", "Pinned", "All members", "Milcom", "Scheduled", "Search: tax"]} />
            </PlanPanel>
            <PlanPanel title="Inbox" description="A dense list should make triage fast and scannable.">
              <PlanTable
                headers={["State", "Subject", "Audience", "Updated"]}
                rows={[
                  ["Unread", "War night schedule", "Milcom + raiders", "12m ago"],
                  ["Pinned", "Tax update", "All members", "3h ago"],
                  ["Read", "Grant request window", "Economy staff", "Yesterday"],
                ]}
              />
            </PlanPanel>
            <PlanPanel title="Reading Pane" description="The selected item opens inline so users can act without losing the list.">
              <PlanMiniList
                items={[
                  "Header area shows audience chips, pin state, and delivery status.",
                  "Body area renders the message content and attachments.",
                  "Quick actions let staff pin, archive, edit, or open the composer with a clone.",
                ]}
              />
            </PlanPanel>
          </div>
        </TabsContent>

        <TabsContent value="compose" className="mt-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),22rem]">
            <PlanPanel title="Draft Builder" description="The main form stays focused on subject, audience, body, and schedule.">
              <PlanCanvas label="Draft form" description="Subject, rich body, audience rules, delivery timing, and validation all live in one editing canvas." />
            </PlanPanel>
            <PlanPanel title="Send Preview" description="The right rail answers who gets this and what happens next.">
              <PlanMiniList
                items={[
                  "Audience size and segment breakdown.",
                  "Scheduling impact and timezone check.",
                  "Post-send shortcuts into archive, edit, or follow-up surfaces.",
                ]}
              />
            </PlanPanel>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="mt-3">
          <PlanLinkedCards
            title="Archive View"
            links={[
              { label: "Pinned archive", to: "/plans/home/announcements", detail: "Browse long-lived notices and restore them into active view." },
              { label: "Delivery review", to: "/plans/home/announcements", detail: "Check who saw the message and whether a resend is needed." },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

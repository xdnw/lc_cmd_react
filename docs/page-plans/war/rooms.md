# War Rooms

- Status: `Wrap`
- Primary route: `/war/rooms`
- Legacy aliases: none; current flow is command-only
- Nav group: War
- Primary users: milcom and staff creating, sorting, and cleaning up war rooms
- Current references: `src/pages/command/index.tsx`, `src/pages/settings/index.tsx`, command metadata for `war room *`, `settings_war_room *`, and bulk-action patterns in `src/pages/a2/conflict/conflicts.tsx`

## Why It Exists

- War rooms are one of the clearest places where the browser can outperform raw commands.
- The work is a mix of planning, previewing, creating, sorting, and cleanup, all around Discord state.
- Near-term this is a guided command console plus readiness links, not a full Discord room inventory page.

## Workflows

- Primary: create war rooms for selected enemies and attackers.
- Secondary: batch-create from sheets, list active rooms, sort categories, pin updates, cleanup stale rooms.
- Why users arrive here: active wars, counter planning, blitz execution, housekeeping after conflict shifts.
- Upstream entry points: `Counters`, `War Sheets`, target drawer actions, command fallback.
- Downstream hand-offs: Discord room follow-up, `Channels` for category structure issues, and back into `Targets` or `Counters` when plans change.

## Layout and Look

- Tabs: `Create`, `Batch Create`, `Active Rooms`, `Cleanup`.
- `Create` and `Batch Create` should emphasize preview before action.
- `Active Rooms` should feel like a room board grouped by category or status.
- `Cleanup` should feel intentionally dangerous and require confirmation.

## Information and Interactions

- Create: choose enemy, attackers, category behavior, ping/mail toggles, and preview room membership.
- Batch Create: upload or select blitz sheet, choose allowed nations, preview per-room outcomes.
- Active Rooms: list existing rooms, participants, enemy, category, stale status, and actions like pin or recategorize.
- Cleanup: delete planning rooms, delete by enemy, purge with strong warnings.
- If category setup is missing or invalid, route the user into `Server > Channels` or `Server > Setup` instead of just failing the flow.

## Components

- Existing shared: bulk-action patterns from conflicts, dialog helpers, command preview helpers.
- New shared or page-specific: `WarRoomPlanner`, `RoomMembershipPreview`, `CategoryPreview`, `WarRoomBoard`, `DangerActionPanel`.

## Data and Endpoints

- Existing endpoints: `COMMAND`, `INPUT_OPTIONS`, `PERMISSION`, and `TABLE` for related readiness settings.
- Existing table / graph / placeholder substrate: `settings_war_room *` and channel-linked settings can expose readiness.
- Current backend gap: `war room create` needs preview rows showing room name, enemy, attackers, chosen category, and warnings before channel creation.
- Current backend gap: `war room from_sheet` needs the same preview plus source-row information for batch flows.
- Not current: room list/detail, category inventory, and `job_status`; those are only needed if this page becomes a live room board.

## Command Bindings

- Existing commands: `war room create`, `war room from_sheet`, `war room list`, `war room pin`, `war room sort`, `war room setcategory`, `war room delete_for_enemies`, `war room delete_planning`, `war room purge`, plus `channel close current` for room closure.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: room-creating and destructive actions must show affected enemies, members, categories, and final command strings before submit.

## Navigation

- Links to: `/war/counters`, `/war/sheets`, `/war/targets`, relevant room detail or enemy detail views.
- Linked from: counter planner, target quick actions, command launcher, server setup links for war-room readiness.

## Permissions and Context

- Requires login, selected guild, and room-management permissions.
- Category and role choices depend on current Discord guild configuration.

## Risks and Open Questions

- This page can ship create and cleanup flows now, but a live room board would still need room-state reads later.
- Need to decide whether room detail lives inline, in a drawer, or in Discord-only links.
- Batch-create UX has to make long-running operations and partial failures obvious.
- The page should not imply that the app already has a native Discord room inventory when it currently does not.


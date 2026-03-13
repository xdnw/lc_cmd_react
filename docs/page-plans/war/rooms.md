# War Rooms

- Status: `New`
- Primary route: `/war/rooms`
- Legacy aliases: none; current flow is command-only
- Nav group: War
- Primary users: milcom and staff creating, sorting, and cleaning up war rooms
- Current references: command metadata for `war room *`, bulk-action patterns in `src/pages/a2/conflict/conflicts.tsx`

## Why It Exists

- War rooms are one of the clearest places where the browser can outperform raw commands.
- The work is a mix of planning, previewing, creating, sorting, and cleanup, all around Discord state.

## Workflows

- Primary: create war rooms for selected enemies and attackers.
- Secondary: batch-create from sheets, list active rooms, sort categories, pin updates, cleanup stale rooms.
- Why users arrive here: active wars, counter planning, blitz execution, housekeeping after conflict shifts.

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

## Components

- Existing shared: bulk-action patterns from conflicts, dialog helpers, command preview helpers.
- New shared or page-specific: `WarRoomPlanner`, `RoomMembershipPreview`, `CategoryPreview`, `WarRoomBoard`, `DangerActionPanel`.

## Data and Endpoints

- Existing endpoints: none dedicated to room lists or room state.
- Existing table / graph / placeholder substrate: no current web-native surface for Discord room inventory.
- New endpoints likely needed: room list, room detail, category inventory, and background job status endpoints are likely required if this page is meant to be more than a command wrapper.

## Command Bindings

- Existing commands: `war room create`, `war room from_sheet`, `war room list`, `war room pin`, `war room sort`, `war room setcategory`, `war room delete_for_enemies`, `war room delete_planning`, `war room purge`, plus `channel close current` for room closure.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: room-creating and destructive actions must show affected enemies, members, categories, and final command strings before submit.

## Navigation

- Links to: `/war/counters`, `/war/sheets`, `/war/targets`, relevant room detail or enemy detail views.
- Linked from: counter planner, target quick actions, command launcher.

## Permissions and Context

- Requires login, selected guild, and room-management permissions.
- Category and role choices depend on current Discord guild configuration.

## Risks and Open Questions

- This page is hard to do well without read endpoints for Discord room state.
- Need to decide whether room detail lives inline, in a drawer, or in Discord-only links.
- Batch-create UX has to make long-running operations and partial failures obvious.

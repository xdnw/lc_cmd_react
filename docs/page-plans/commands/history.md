<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Command History

- Classification: `modal/detail surface`
- Status: `New`
- Primary route or owner: command history modal opened from `/commands` and `/command/:command`
- Nav group: `Commands`
- Primary actor: `everyone`
- Scope: `guild`
- Current code:
  - no dedicated history UI yet
  - `src/pages/commands/index.tsx`
  - `src/pages/command/index.tsx`
- Read substrate:
  - Endpoints: future `command_history`
  - Response types: history rows keyed by run id, command path, guild, channel, actor, status, and timestamp
  - Table / graph / placeholder types: none
  - Required columns / filters: `command`, `guild_id`, `channel_id`, `user_id`, `status`, `cursor`
- Write substrate:
  - Endpoints / command families: none
  - Existing form / action components: modal trigger buttons from the browser and runner pages
  - Reload / invalidation targets: history modal query only

## Why It Exists

- Owns: recent command-run inspection and reuse flows.
- Does not own: command discovery or command execution themselves.
- Current gap: history is planned as a server-backed modal, but there is no dedicated brief or endpoint contract yet.

## Workflows

1. Open history from the browser
   - Entry: history button in `/commands`
   - Preconditions: selected guild or relevant public history scope exists
   - Reads: `command_history`
   - UI path: open modal, filter by command, guild, channel, or status
   - Mutations: none
   - Handoff / exit: reopen a past command in `/command/:command`
2. Open history from the runner
   - Entry: command-scoped history button in `/command/:command`
   - Preconditions: current command path known
   - Reads: `command_history` filtered to the current command first
   - UI path: inspect runs for the current command, choose one to reuse
   - Mutations: none
   - Handoff / exit: repopulate the runner with a historical argument set

## Layout Structure

- Top-level regions: modal header, filter row, history list, detail preview.
- Tabs / panels / drawers: none required initially.
- URL state: not required for the first modal version.
- Empty / loading / error states: keep failures inside the modal.

## Information Model

- Primary objects shown: run id, command path, argument preview, guild, channel, actor, status, timestamp.
- Filters / grouping: command, guild, channel, actor, status.
- Row or card actions: reopen in runner, copy argument set, inspect status.
- Detail / modal surfaces: the history modal is the primary surface.

## Components

- Reuse: shared modal primitives, command browser row actions, runner page actions.
- Add: `CommandHistoryButton`, `CommandHistoryDialog`, `CommandHistoryList`, `CommandHistoryFilters`.
- Extend: browser and runner pages to use the same history dialog contract.
- Merge: keep history in one shared modal instead of separate browser and runner implementations.

## Implementation Delta

- Route changes: none required for MVP.
- Read model changes: add `command_history` endpoint.
- Mutation changes: none.
- Cache / reload changes: history reads should stay local to the dialog.
- Avoid: local-only history storage that cannot filter by guild or channel.

## Route And Navigation

- Linked from: `/commands`, `/command/:command`.
- Links to: `/command/:command`.
- Header / nav actions: filter and reopen actions only.
- Preserved context: current command path when opened from the runner.

## Permissions And Context

- Auth and scope requirements: selected guild for guild-scoped history.
- Role gates: history visibility should respect the same command visibility rules as the source command.
- Setup dependency / recovery: not applicable.
- Delegation / inherited context: not applicable.

## Commands And Mutations

- Existing commands: none.
- Preview / confirm: reopening a historical run should still land in the runner preview flow.
- Permission checks: history endpoint should only return rows the viewer can inspect.
- Side effects / cache refresh: none.

## Open Questions And Backend Gaps

- Add `command_history` before building any persistent history UI.

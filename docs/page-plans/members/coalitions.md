# Coalitions

- Classification: `route`
- Status: `New`
- Primary route or owner: `/members/coalitions`
- Nav group: `Members`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - `src/lib/endpoints.ts` exposes `LIST_COALITIONS`
  - command metadata for `coalition *`
  - coalition-related flows in `src/pages/a2/conflict/conflicts`
- Read substrate:
  - Endpoints: `LIST_COALITIONS`
  - Response types: `WebCoalitions`
  - Table / graph / placeholder types: coalition rows and alliance member lists from the response
  - Required columns / filters: coalition name, member alliances, deleted state, filter text
- Write substrate:
  - Endpoints / command families: `COMMAND`, `coalition create`, `coalition add`, `coalition remove`, `coalition delete`, `coalition generate`, `coalition sheet`
  - Existing form / action components: command-backed forms, dialogs, table rows
  - Reload / invalidation targets: coalition list and any linked report or war views

## Why It Exists

- Owns: guild-managed coalition lists and their maintenance actions.
- Does not own: public alliance comparison reports or treaty analysis.
- Current gap: the backend already exposes coalition reads, but there is no dedicated workflow page for managing them.

## Workflows

1. Review coalition definitions
   - Entry: `/members/coalitions`
   - Preconditions: selected guild
   - Reads: `LIST_COALITIONS`
   - UI path: inspect coalition rows, filter by name, open member alliances
   - Mutations: none
   - Handoff / exit: into conflict or report pages
2. Maintain coalition membership
   - Entry: selected coalition or action rail
   - Preconditions: FA or admin permission
   - Reads: current coalition rows and target alliance context
   - UI path: create, add, remove, delete, or generate coalition from treaty web
   - Mutations: `coalition create`, `coalition add`, `coalition remove`, `coalition delete`, `coalition generate`
   - Handoff / exit: refresh the list and linked analysis pages

## Layout Structure

- Top-level regions: coalition list, selected coalition detail, action rail.
- Tabs / panels / drawers: `Coalitions`, `Generated Candidates`, `Exports`.
- URL state: selected coalition and filter text.
- Empty / loading / error states: expose `ignoreDeleted` or similar filters rather than hiding missing rows silently.

## Information Model

- Primary objects shown: coalition name, member alliances, deletion state, generated candidates.
- Filters / grouping: filter text and deleted-state handling.
- Row or card actions: open members, add alliances, remove alliances, delete coalition, generate candidate set, export sheet.
- Detail / modal surfaces: coalition detail drawer and mutation confirmations.

## Components

- Reuse: table rows, dialogs, command-backed forms.
- Add: `CoalitionList`, `CoalitionDetailDrawer`, `CoalitionActionRail`, `CoalitionGeneratePanel`.
- Extend: conflicts and report flows so coalition links land here when the user wants to manage the server's coalition definitions.
- Merge: keep read and mutation flows together instead of forcing operators to bounce between raw commands and report pages.

## Implementation Delta

- Route changes: add `/members/coalitions`.
- Read model changes: current `LIST_COALITIONS` is enough for the first page.
- Mutation changes: remain command-backed.
- Cache / reload changes: refresh coalition list after any mutation.
- Avoid: inventing a separate coalition CRUD endpoint family before the existing list plus commands are proven insufficient.

## Route And Navigation

- Linked from: `/reports/conflicts`, `/server/setup`, `/commands`.
- Links to: `/reports/conflicts`, `/reports/graphs` where coalition comparisons are relevant.
- Header / nav actions: create, generate, and export actions.
- Preserved context: selected coalition and filter state.

## Permissions And Context

- Auth and scope requirements: selected guild.
- Role gates: FA or admin permissions for mutations.
- Setup dependency / recovery: coalition definitions can be part of server readiness for war or FA workflows.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: `coalition list`, `coalition create`, `coalition add`, `coalition remove`, `coalition delete`, `coalition generate`, `coalition sheet`.
- Preview / confirm: delete and generate flows should confirm scope clearly.
- Permission checks: FA or admin command permissions.
- Side effects / cache refresh: refresh `LIST_COALITIONS` after mutations.

## Open Questions And Backend Gaps

- Current read coverage is enough for MVP; no separate coalition-management endpoint is required yet.

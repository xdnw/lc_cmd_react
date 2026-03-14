# Treaties

- Classification: `route`
- Status: `New`
- Primary route or owner: `/members/treaties`
- Nav group: `Members`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - no dedicated route yet
  - `src/lib/endpoints.ts` exposes `CURRENT_TREATIES` and `TREATY_CHANGES`
  - command metadata for `alliance treaty *`
- Read substrate:
  - Endpoints: `CURRENT_TREATIES`, `TREATY_CHANGES`
  - Response types: `WebCurrentTreaties`, `WebTreatyChanges`
  - Table / graph / placeholder types: `Treaty`
  - Required columns / filters: current treaties, recent treaty changes, alliance scope, treaty type
- Write substrate:
  - Endpoints / command families: `COMMAND`, `alliance treaty list`, `alliance treaty send`, `alliance treaty approve`, `alliance treaty cancel`
  - Existing form / action components: command fallback only for now
  - Reload / invalidation targets: treaty lists and change history

## Why It Exists

- Owns: staff-facing treaty inspection and future treaty workflow handoffs.
- Does not own: public alliance profile detail or full FA reporting.
- Current gap: this brief is intentionally a stub so the file exists and the substrate is documented.

## Workflows

1. Review current treaties
   - Entry: `/members/treaties`
   - Preconditions: alliance scope known
   - Reads: `CURRENT_TREATIES`
   - UI path: inspect current treaty rows and related alliances
   - Mutations: none for MVP
   - Handoff / exit: into alliance detail or FA command fallback
2. Review recent treaty changes
   - Entry: `/members/treaties`
   - Preconditions: date range or default time window
   - Reads: `TREATY_CHANGES`
   - UI path: recent change list grouped by type or alliance
   - Mutations: none for MVP
   - Handoff / exit: into raw treaty commands when action is needed

## Layout Structure

- Top-level regions: current treaties, recent changes, action rail.
- Tabs / panels / drawers: `Current`, `Changes`.
- URL state: selected tab and optional alliance or treaty-type filter.
- Empty / loading / error states: keep the stub honest if broader FA UX is still pending.

## Information Model

- Primary objects shown: current treaty rows and change rows.
- Filters / grouping: treaty type, alliance, time window.
- Row or card actions: open alliance detail or raw treaty command fallback.
- Detail / modal surfaces: optional treaty detail drawer later.

## Components

- Reuse: table primitives and report links.
- Add: minimal `TreatyList`, `TreatyChangeList`, `TreatyActionRail`.
- Extend: alliance detail and FA views can deep-link here later.
- Merge: keep current and change views together.

## Implementation Delta

- Route changes: add `/members/treaties` as a stub route owner.
- Read model changes: current endpoints are enough for a first thin page.
- Mutation changes: remain command-backed.
- Cache / reload changes: refresh treaty reads after any later action.
- Avoid: inventing more before FA workflows are clarified.

## Route And Navigation

- Linked from: alliance detail, spheres, FA workflow shortcuts.
- Links to: alliance detail and raw treaty commands.
- Header / nav actions: minimal for now.
- Preserved context: selected tab and alliance scope.

## Permissions And Context

- Auth and scope requirements: FA or staff visibility when needed.
- Role gates: treaty mutations stay command-gated.
- Setup dependency / recovery: not owned here.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: `alliance treaty list`, `alliance treaty send`, `alliance treaty approve`, `alliance treaty cancel`.
- Preview / confirm: handled by the runner for now.
- Permission checks: command permission.
- Side effects / cache refresh: refresh treaty endpoints after actions.

## Open Questions And Backend Gaps

- Keep this intentionally thin until the broader FA route structure settles.

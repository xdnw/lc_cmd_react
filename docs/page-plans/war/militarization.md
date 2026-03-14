# Militarization

- Classification: `route`
- Status: `New`
- Primary route or owner: `/war/militarization`
- Nav group: `War`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - no dedicated route yet
  - `src/lib/endpoints.ts` exposes `MILITARIZATIONTIME`
  - command metadata for `alliance stats militarization` and `alliance stats militarization_time`
- Read substrate:
  - Endpoints: `MILITARIZATIONTIME`
  - Response types: `WebGraph`
  - Table / graph / placeholder types: graph series for soldier, tank, aircraft, and ship trends; command-backed alliance rankings for broader coverage
  - Required columns / filters: alliance, start time, end time, current drilldown target
- Write substrate:
  - Endpoints / command families: read-only for MVP, command fallback for broader ranking or export flows
  - Existing form / action components: graph panels and command fallback links
  - Reload / invalidation targets: graph query only

## Why It Exists

- Owns: war-facing militarization trend inspection and comparison handoffs.
- Does not own: alliance detail or generic graph discovery.
- Current gap: the repo already has the endpoint and commands, but not a dedicated war-route brief.

## Workflows

1. Review militarization over time
   - Entry: `/war/militarization`
   - Preconditions: alliance scope known
   - Reads: `MILITARIZATIONTIME`
   - UI path: select alliance and date range, inspect unit-category trends
   - Mutations: none
   - Handoff / exit: into blitz planning, alliance detail, or graph studio
2. Compare with broader rankings
   - Entry: current alliance graph or war planning flow
   - Preconditions: need broader alliance comparison
   - Reads: command-backed `alliance stats militarization`
   - UI path: open ranking/export fallback from the same route
   - Mutations: none
   - Handoff / exit: into reports or war-planning flows

## Layout Structure

- Top-level regions: controls, chart, comparison links.
- Tabs / panels / drawers: `Trend`, `Compare`.
- URL state: alliance and date range.
- Empty / loading / error states: standard graph-surface handling.

## Information Model

- Primary objects shown: alliance militarization graph and comparison links.
- Filters / grouping: alliance and date range.
- Row or card actions: open broader rankings, open blitz planning, open alliance detail.
- Detail / modal surfaces: optional alliance detail modal.

## Components

- Reuse: graph panels and report links.
- Add: `MilitarizationControls`, `MilitarizationChart`, `MilitarizationCompareLinks`.
- Extend: war pages so they can deep-link here with alliance context.
- Merge: keep trend and comparison handoffs together.

## Implementation Delta

- Route changes: add `/war/militarization`.
- Read model changes: endpoint-native trend graph already exists.
- Mutation changes: none.
- Cache / reload changes: graph query refresh only.
- Avoid: hiding this behind the generic reports graph picker.

## Route And Navigation

- Linked from: war planning pages, alliance detail, KPI cards.
- Links to: `/war/blitz`, alliance detail modal, `/reports/graphs`.
- Header / nav actions: blitz handoff and broader ranking links.
- Preserved context: selected alliance and date range.

## Permissions And Context

- Auth and scope requirements: war staff route by default.
- Role gates: read-only route.
- Setup dependency / recovery: not owned here.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: `alliance stats militarization`, `alliance stats militarization_time`.
- Preview / confirm: none.
- Permission checks: read-only access and any command fallback visibility.
- Side effects / cache refresh: none.

## Open Questions And Backend Gaps

- Current endpoint coverage is enough for the first route.

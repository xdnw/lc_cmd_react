# Spheres

- Classification: `route`
- Status: `New`
- Primary route or owner: `/members/spheres`
- Nav group: `Members`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - no dedicated route yet
  - `src/lib/endpoints.ts` exposes `GLOBALSTATS` and `GLOBALTIERSTATS`
  - graph and report infrastructure in `src/pages/graphs` and `src/pages/custom_table`
- Read substrate:
  - Endpoints: `GLOBALSTATS`, `GLOBALTIERSTATS`, related alliance graph endpoints when drilled in further
  - Response types: `CoalitionGraphs`, `WebGraph`
  - Table / graph / placeholder types: coalition graph series and linked alliance detail/report surfaces
  - Required columns / filters: metric set, top-X, date range, group-by, total-vs-average mode
- Write substrate:
  - Endpoints / command families: read-only for MVP
  - Existing form / action components: graph and report links
  - Reload / invalidation targets: graph data only

## Why It Exists

- Owns: a staff-facing view of the game's major spheres with charted comparisons and drilldowns.
- Does not own: coalition management or treaty mutation.
- Current gap: the README wanted a spheres surface, but there was no file describing how it maps to existing graph endpoints.

## Workflows

1. Review sphere-level comparisons
   - Entry: `/members/spheres`
   - Preconditions: metric and date inputs available
   - Reads: `GLOBALSTATS`, `GLOBALTIERSTATS`
   - UI path: choose metrics, inspect graph series, then drill into alliance detail or rankings
   - Mutations: none
   - Handoff / exit: into alliance detail, rankings, or broader graph/report flows

## Layout Structure

- Top-level regions: metric controls, sphere chart, drilldown links.
- Tabs / panels / drawers: `Time Series`, `Tier Distribution`.
- URL state: metric, date range, top-X, group-by.
- Empty / loading / error states: same as other graph surfaces.

## Information Model

- Primary objects shown: sphere series, alliance counts or metrics, drilldown targets.
- Filters / grouping: metric, top-X, group-by, total-vs-average.
- Row or card actions: open rankings, open alliance detail, open graph studio.
- Detail / modal surfaces: reuse alliance detail modal where helpful.

## Components

- Reuse: graph surface components and report links.
- Add: `SphereMetricControls`, `SphereGraphPanel`, `SphereDrilldownLinks`.
- Extend: report links into rankings and alliance detail.
- Merge: keep sphere comparison and drilldown on one route.

## Implementation Delta

- Route changes: add `/members/spheres`.
- Read model changes: current graph endpoints are enough for the first pass.
- Mutation changes: none.
- Cache / reload changes: graph query refresh only.
- Avoid: turning this into coalition management.

## Route And Navigation

- Linked from: FA workflow shortcuts, alliance detail, KPI cards.
- Links to: `/reports/rankings`, alliance detail modal, `/reports/graphs`.
- Header / nav actions: rankings and graph-studio links.
- Preserved context: selected metric and date range.

## Permissions And Context

- Auth and scope requirements: staff-facing by default.
- Role gates: mostly read-only.
- Setup dependency / recovery: not owned here.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: none required for MVP.
- Preview / confirm: not applicable.
- Permission checks: read-only route checks only.
- Side effects / cache refresh: none.

## Open Questions And Backend Gaps

- Current graph endpoints are sufficient for the first version.

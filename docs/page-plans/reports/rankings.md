# Rankings

- Classification: `route`
- Status: `New`
- Primary route or owner: `/reports/rankings`
- Nav group: `Reports`
- Primary actor: `everyone`
- Scope: `guild + alliance`
- Current code:
  - no dedicated route yet
  - existing ranking behavior is split across tables, graphs, and command fallback
  - command metadata exposes `alliance stats ranking`, `alliance stats rankingtime`, `alliance stats attribute_ranking`, `trade ranking`, and related report commands
- Read substrate:
  - Endpoints: `TABLE` and graph endpoints where rankings need trend context
  - Response types: `WebTable`, `WebGraph`
  - Table / graph / placeholder types: ranking tables and linked trend graphs
  - Required columns / filters: metric, entity type, alliance scope, time window, ordering, highlight target
- Write substrate:
  - Endpoints / command families: mostly read-only, with command fallback for ranking families not yet mapped into a first-class report read
  - Existing form / action components: table links, graph links, command fallback
  - Reload / invalidation targets: ranking queries only

## Why It Exists

- Owns: reusable ranking views that are more intentional than raw table presets and less free-form than the full table or graph builders.
- Does not own: generic graph editing or saved KPI layouts.
- Current gap: rankings are a recurring report type, but there was no dedicated brief or route plan for them.

## Workflows

1. Review a ranking quickly
   - Entry: `/reports/rankings`
   - Preconditions: ranking type and metric chosen
   - Reads: table or graph-backed ranking data
   - UI path: choose ranking family, inspect rows, then drill into details
   - Mutations: none
   - Handoff / exit: into alliance detail, graphs, or tables
2. Compare over time
   - Entry: selected ranking row or ranking family
   - Preconditions: time-based metric available
   - Reads: trend-capable ranking or graph data
   - UI path: open related ranking-time or trend view
   - Mutations: none
   - Handoff / exit: into graph studio or KPI layout composition

## Layout Structure

- Top-level regions: ranking family picker, ranking table, trend context panel.
- Tabs / panels / drawers: `Alliance`, `Nation`, `Trade`, `Time`.
- URL state: ranking family, metric, ordering, time window, highlight target.
- Empty / loading / error states: fallback cleanly into table or command links when a family is not yet native.

## Information Model

- Primary objects shown: ranking rows, score or metric, highlighted entity, linked trend context.
- Filters / grouping: ranking family, metric, ordering, time window.
- Row or card actions: open trend, open detail modal, open source table or graph.
- Detail / modal surfaces: reuse alliance detail and other placeholder-detail surfaces.

## Components

- Reuse: table surfaces, graph links, detail modals.
- Add: `RankingFamilyPicker`, `RankingTable`, `RankingTrendPanel`, `RankingDrilldownLinks`.
- Extend: KPI and source report links so rankings can be embedded or reopened in context.
- Merge: keep recurring ranking workflows in one report route rather than relying only on the generic table builder.

## Implementation Delta

- Route changes: add `/reports/rankings`.
- Read model changes: start with existing table and graph substrate, then map command-backed ranking families as needed.
- Mutation changes: none.
- Cache / reload changes: ranking query refresh only.
- Avoid: duplicating the entire table builder inside the rankings page.

## Route And Navigation

- Linked from: `/reports/tables`, `/reports/graphs`, `/reports/kpi`, alliance detail.
- Links to: source tables, graph studio, detail modals.
- Header / nav actions: family picker and KPI handoff.
- Preserved context: selected family, metric, and time window.

## Permissions And Context

- Auth and scope requirements: many rankings can remain public-safe.
- Role gates: mostly read-only.
- Setup dependency / recovery: not owned here.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: `alliance stats ranking`, `alliance stats rankingtime`, `alliance stats attribute_ranking`, `trade ranking`, and related ranking families.
- Preview / confirm: not applicable.
- Permission checks: read-only route checks and any command fallback visibility.
- Side effects / cache refresh: none.

## Open Questions And Backend Gaps

- The first route can rely on existing table and graph substrate; only add dedicated ranking endpoints if recurring families stay awkward to compose.

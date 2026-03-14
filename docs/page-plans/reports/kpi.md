# KPI

- Classification: `route`
- Status: `New`
- Primary route or owner: `/reports/kpi`
- Nav group: `Reports`
- Primary actor: `everyone`
- Scope: `guild + alliance`
- Current code:
  - no dedicated route yet
  - existing report building lives in `src/pages/custom_table` and `src/pages/graphs`
  - alliance detail prototype in `src/pages/a2/alliance/alliance.tsx`
- Read substrate:
  - Endpoints: `TABLE`, existing graph endpoints, and reusable detail surfaces such as alliance detail
  - Response types: `WebTable`, `WebGraph`, detail-surface endpoint payloads
  - Table / graph / placeholder types: table presets, graph presets, ranking presets, and reusable detail cards
  - Required columns / filters: saved layout id, cards, shareability metadata, and embedded report params
- Write substrate:
  - Endpoints / command families: local saved layouts first, backend persistence later if needed
  - Existing form / action components: table and graph builders plus detail-surface links
  - Reload / invalidation targets: saved layout state and embedded report queries

## Why It Exists

- Owns: arranging tables, graphs, rankings, and detail cards into saved or shareable KPI layouts.
- Does not own: the underlying report builders themselves.
- Current gap: the repo has strong individual report surfaces but no documented saved-layout surface that composes them together.

## Workflows

1. Build a KPI layout
   - Entry: `/reports/kpi`
   - Preconditions: at least one table, graph, ranking, or detail card source exists
   - Reads: current layout definition and embedded report params
   - UI path: add cards, configure them, arrange them, save layout
   - Mutations: local layout persistence first
   - Handoff / exit: reopen the layout later or share it
2. Reuse existing report cards
   - Entry: a saved layout or a link from tables, graphs, or rankings
   - Preconditions: source report is configurable from params
   - Reads: table, graph, ranking, or detail-card data
   - UI path: embedded cards render in one composed workspace
   - Mutations: none to the underlying data
   - Handoff / exit: drill into the source report or detail surface

## Layout Structure

- Top-level regions: saved-layout picker, canvas, card configuration panel.
- Tabs / panels / drawers: `Layouts`, `Canvas`, `Card Settings`.
- URL state: selected layout and optional shared-view params.
- Empty / loading / error states: empty layouts should guide users toward adding first cards.

## Information Model

- Primary objects shown: saved layouts and embedded report cards.
- Filters / grouping: personal vs. shared layouts and card types.
- Row or card actions: add card, configure card, reorder card, open source report, save layout.
- Detail / modal surfaces: card configuration dialogs and reusable detail modals such as alliance profile.

## Components

- Reuse: report cards from tables, graphs, rankings, and detail surfaces.
- Add: `KpiLayoutPicker`, `KpiCanvas`, `KpiCardPalette`, `KpiCardConfigDialog`.
- Extend: report pages so they can be embedded as cards with stable params.
- Merge: compose existing report primitives instead of inventing a separate KPI-specific data layer.

## Implementation Delta

- Route changes: add `/reports/kpi`.
- Read model changes: reuse existing report reads and detail surfaces.
- Mutation changes: local layout save first; backend persistence later only if needed.
- Cache / reload changes: embedded cards keep using their existing query logic.
- Avoid: a totally separate KPI-only reporting stack.

## Route And Navigation

- Linked from: `/reports/tables`, `/reports/graphs`, `/reports/rankings`, alliance detail, saved report links.
- Links to: source reports and embedded detail surfaces.
- Header / nav actions: new layout, duplicate layout, share layout.
- Preserved context: selected layout and embedded card params.

## Permissions And Context

- Auth and scope requirements: mixed; some layouts can be public-safe while others are guild-aware.
- Role gates: shared layout publishing may need tighter permission later.
- Setup dependency / recovery: not owned here.
- Delegation / inherited context: inherited guild context should flow through the embedded cards, not through KPI-specific rules.

## Commands And Mutations

- Existing commands: none owned here.
- Preview / confirm: not applicable beyond layout save actions.
- Permission checks: depend on the embedded card sources.
- Side effects / cache refresh: layout save plus embedded report query refresh.

## Open Questions And Backend Gaps

- Local saved layouts are enough to start; only add backend persistence if sharing requirements prove it necessary.

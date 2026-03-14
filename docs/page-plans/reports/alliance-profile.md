<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Alliance Profile

- Classification: `modal/detail surface`
- Status: `Evolve`
- Primary route or owner: alliance detail modal, with `/alliance/:alliance` as an advanced-entry route
- Nav group: `Reports`
- Primary actor: `everyone`
- Scope: `guild + alliance`
- Current code:
	- `src/pages/a2/alliance/alliance.tsx`
- Read substrate:
	- Endpoints: `TABLE`, `ALLIANCESTATS`, `ALLIANCEMETRICAB`, `METRIC_COMPARE_BY_TURN`, `COMPARETIERSTATS`, `MILITARIZATIONTIME`, `CURRENT_TREATIES`, `TREATY_CHANGES`, `LIST_COALITIONS`
	- Response types: `WebTable`, `WebGraph`, `WebCurrentTreaties`, `WebTreatyChanges`, `WebCoalitions`
	- Table / graph / placeholder types: alliance tables, time-series graphs, treaty rows, coalition rows
	- Required columns / filters: identity block, growth or revenue stats, militarization, treaty context, related report links
- Write substrate:
	- Endpoints / command families: mostly read-only, with optional read-only `alliance *` command cards
	- Existing form / action components: `ViewCommand`, `StaticViewGraph`, expandable detail rows
	- Reload / invalidation targets: modal data only

## Why It Exists

- Owns: an inspectable detail surface for one alliance that can be opened from tables, graphs, KPI layouts, and conflict views.
- Does not own: a full standalone section of report routing or the saved-layout system that belongs to KPI.
- Current gap: the previous doc framed this as a standalone page, but the desired product shape is a reusable detail modal that can still deep-link to `/alliance/:alliance` when needed.

## Workflows

1. Open alliance detail from a report
	 - Entry: link from conflicts, tables, KPI cards, or war analysis
	 - Preconditions: alliance identifier known
	 - Reads: alliance stats, treaty context, coalition context, and related graphs
	 - UI path: open modal first; advanced users can still open the route directly
	 - Mutations: none by default
	 - Handoff / exit: back to the owning report or onward into related pages
2. Inspect alliance context deeply
	 - Entry: alliance detail surface
	 - Preconditions: alliance detail loaded
	 - Reads: identity, score, member counts, stockpile estimate, revenue, militarization, treaty and coalition context
	 - UI path: modal sections with expandable rows and graph cards
	 - Mutations: optional read-only command cards only
	 - Handoff / exit: into tables, graphs, conflicts, tax, or war views
3. Reuse alliance detail inside KPI layouts
	 - Entry: KPI layout editor or saved report layout
	 - Preconditions: layout supports embedded detail cards
	 - Reads: same alliance detail substrate as the modal
	 - UI path: embed or launch the detail surface from a KPI card
	 - Mutations: none
	 - Handoff / exit: back to the saved layout

## Layout Structure

- Top-level regions: identity header, key stat cards, graphs, treaty or coalition context, related report links.
- Tabs / panels / drawers: modal or drawer first; advanced-entry route can reuse the same sections in a full-page layout.
- URL state: alliance id plus optional section anchor.
- Empty / loading / error states: the modal should fail gracefully without collapsing the owning report page.

## Information Model

- Primary objects shown: alliance identity, scores, growth, revenue, stockpile estimate, militarization, treaty rows, coalition membership, related reports.
- Filters / grouping: not a heavy filter surface; keep grouping by section.
- Row or card actions: open related graphs, tables, conflict context, and war views.
- Detail / modal surfaces: the alliance profile itself is the detail surface.

## Components

- Reuse: `ViewCommand`, `StaticViewGraph`, `EndpointWrapper`, `ExpandableTableRow`, `LazyExpander`, table and renderer helpers.
- Add: `AllianceDetailModal`, `AllianceDetailCard`, `RelatedReportLinks`, shared placeholder-detail surface helpers that KPI can reuse.
- Extend: report pages so alliance links open the modal by default.
- Merge: roll the current standalone prototype into the broader placeholder-detail surface pattern rather than keeping one bespoke alliance page design.

## Implementation Delta

- Route changes: keep `/alliance/:alliance` as an advanced-entry route, but plan the main experience as a reusable modal/detail surface.
- Read model changes: no new endpoint is required immediately.
- Mutation changes: remain read-only by default.
- Cache / reload changes: keep modal fetches local to the owning report flow.
- Avoid: treating this as a one-off page that cannot be reused for other placeholder types.

## Route And Navigation

- Linked from: conflict rows, report tables, graphs, KPI cards, war-analysis flows.
- Links to: `/reports/tables`, `/reports/graphs`, `/reports/conflicts`, `/economy/tax`, `/war/targets`.
- Header / nav actions: related report links only; do not overload it with unrelated guild actions.
- Preserved context: owning report page or layout should stay intact when the modal closes.

## Permissions And Context

- Auth and scope requirements: most views can remain public-safe.
- Role gates: only guild-specific action pills, if any, should depend on current guild context.
- Setup dependency / recovery: not owned here.
- Delegation / inherited context: not owned here.

## Commands And Mutations

- Existing commands: read-only `alliance revenue`, `alliance cost`, `alliance stockpile`, `alliance stats *`, `alliance treaty *` cards where they add value.
- Preview / confirm: mutating actions should stay outside this surface.
- Permission checks: only relevant if a future action card is added.
- Side effects / cache refresh: none for the current read-only surface.

## Open Questions And Backend Gaps

- Reuse the same detail-surface pattern for other placeholder types once KPI embeds and modal-launch behavior are in place.

# Graphs

- Status: `Wrap`
- Primary route: `/reports/graphs`
- Legacy aliases: `/edit_graph`, `/edit_graph/:type`, `/view_graph`, `/view_graph/:type`
- Nav group: Reports
- Primary users: analysts, econ, milcom, and users exploring graphable game data
- Current references: `src/pages/graphs/edit_graph.tsx`, `src/utils/GraphUtil.ts`, graph endpoints in `src/lib/endpoints.ts`

## Why It Exists

- The app already has a strong endpoint-driven graph system.
- What is missing is better discovery, presets, and context-aware entry points.

## Workflows

- Primary: choose a graph type, set arguments, render it, share it, and compare against saved presets.
- Secondary: open into a graph directly from alliance, war, tax, or trade pages with prefilled arguments.
- Why users arrive here: trend analysis, coalition comparison, trade monitoring, war-cost review.

## Layout and Look

- Start with a graph gallery and recent / saved presets rather than a blank endpoint picker.
- Keep the argument form and chart canvas visible together.
- The page should feel like a report studio with strong presets, not like a raw endpoint debugger.

## Information and Interactions

- Show graph families grouped by use case: War, Alliance, Trade, Game-wide, Multi-coalition comparisons.
- Preserve prefilled arguments from deep links.
- Allow recent arguments, saved comparisons, and export / share actions.
- Explain the endpoint in human language while still exposing the technical details when needed.

## Components

- Existing shared: `ApiFormInputs`, `ChartWithButtons`, `StaticViewGraph`, graph endpoint registry from `getGraphEndpoints`.
- New shared or page-specific: `GraphGallery`, `RecentArgumentBar`, `SavedComparisonList`, `GraphEntryCards`.

## Data and Endpoints

- Existing endpoints: the current graph registry already exposes a large set of graph endpoints including trade, war-cost, alliance, tier, spy, multi-coalition, and treaty-related views.
- Existing table / graph / placeholder substrate: the existing graph endpoint layer is already the right core.
- New endpoints likely needed: none for MVP; saved preset sharing may need persistence later.

## Command Bindings

- Existing commands: not a primary command page, though many graphs correspond to existing slash-command concepts.
- Commands likely needing changes: none.
- Command preview / confirmation rules: no mutating actions here; this page is read-only and share-heavy.

## Navigation

- Links to: `/reports/tables`, `/reports/alliances/:alliance`, `/economy/trade`, `/war/sheets`, `/commands`.
- Linked from: alliance profile, trade page, war sheets, Home landing, command launcher.

## Permissions and Context

- Many graph views can remain public.
- Guild-aware presets should appear when a selected guild or alliance scope exists.

## Risks and Open Questions

- Do not flatten the graph system into a tiny preset gallery; the long tail matters.
- The gallery needs user-facing names and descriptions, not raw endpoint names alone.
- Keep the chart canvas responsive and mobile-safe when forms are long.

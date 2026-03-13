# Conflicts

- Status: `Evolve`
- Primary route: `/reports/conflicts`
- Legacy aliases: `/conflicts`, `/temporary-conflicts`
- Nav group: Reports
- Primary users: public viewers, analysts, FA, milcom, and admins editing or syncing conflicts
- Current references: `src/pages/a2/conflict/conflicts.tsx`, related conflict action files under `src/pages/a2/conflict/`

## Why It Exists

- The current conflicts page is already one of the best examples of a dense, command-backed workflow page.
- It should be promoted and polished, not reimagined from scratch.

## Workflows

- Primary: browse conflicts, filter them, inspect details, and take row or bulk actions.
- Secondary: edit conflict metadata, sync data sources, manage temporary conflicts.
- Why users arrive here: public conflict tracking, staff curation, wiki / source syncing, conflict data management.

## Layout and Look

- Keep the table-first layout.
- Add a stronger top summary strip and clearer mode split between public browsing and staff editing.
- Preserve row actions, bulk actions, and selection affordances.

## Information and Interactions

- Show conflict status, participants, category, war counts, live / temporary state, and quick action availability.
- Keep selection behavior, bulk toolbar, and permission-aware actions.
- Make temporary conflict handling more visible rather than burying it in a separate route concept.

## Components

- Existing shared: `BulkActionsToolbar`, conflict row and bulk actions, permission helpers, `StaticTable`-style patterns.
- New shared or page-specific: `ConflictSummaryStrip`, `ConflictModeTabs`, `ConflictFilterBar`.

## Data and Endpoints

- Existing endpoints: `TABLE`, `CONFLICTALLIANCES`, `CONFLICTPOSTS`, `VIRTUALCONFLICTS`, `VIRTUALCONFLICTINFO`, `REMOVEVIRTUALCONFLICT`, `PERMISSION`.
- Existing table / graph / placeholder substrate: already strong.
- New endpoints likely needed: none required for MVP; an aggregate summary endpoint could reduce page fan-out later.

## Command Bindings

- Existing commands: `conflict create`, `conflict create_temp`, `conflict list`, `conflict info`, `conflict alliance *`, `conflict edit *`, `conflict featured *`, `conflict sync *`, `conflict purge *`, `conflict delete`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: staff actions should continue to show command detail and respect permission checks before submit.

## Navigation

- Links to: alliance profile pages, related graphs, temporary conflict details, `/commands`.
- Linked from: Home landing, Reports nav, alliance and war-related pages, command launcher.

## Permissions and Context

- Public browsing should remain available.
- Edit and sync actions must stay permission-gated.

## Risks and Open Questions

- Do not over-summarize the page and lose the density that makes it useful.
- Temporary and permanent conflict states need clearer user-facing explanation.
- Keep the page fast even with row actions and permission prefetching.

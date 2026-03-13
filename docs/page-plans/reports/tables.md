# Tables

- Status: `Wrap`
- Primary route: `/reports/tables`
- Legacy aliases: `/custom_table`, `/view_table`
- Nav group: Reports
- Primary users: analysts, staff, and power users building reusable data views
- Current references: `src/pages/custom_table/TablePage.tsx`, `src/pages/custom_table/PlaceholderTabs.tsx`, `src/lib/layouts/defaultTabs.ts`

## Why It Exists

- The generic table workbench is already one of the app's strongest advantages.
- The right move is to promote and guide it, not replace it with a finite set of dashboards.

## Workflows

- Primary: build custom tables from placeholder types, selections, columns, sorting, and renderers.
- Secondary: start from curated templates, reopen recent queries, save or share views, and perform row or bulk actions.
- Why users arrive here: analysis, IA rosters, war prep, econ investigation, public data exploration.

## Layout and Look

- Keep the current builder-first layout, but add an intentional entry layer.
- Top or left: saved views, curated templates, recent queries, and type picker.
- Main area: selection builder, column builder, renderer controls, table preview.
- This page should feel like an analyst workbench, not like a simplified report chooser.

## Information and Interactions

- Make type, selection, columns, sort, and renderer choices legible as separate concerns.
- Surface curated presets for common IA, war, econ, and conflict workflows.
- Preserve shareable URLs and exports.
- Allow pages like Alliance Profile or Tax to deep-link into prefilled table states.

## Components

- Existing shared: `PlaceholderTabs`, `AbstractTableWithButtons`, `StaticTable`, `TableWithExports`, `BulkActionsToolbar`, `TableWith2DData`.
- New shared or page-specific: `SavedViewBar`, `TemplateGallery`, `RecentQueryStrip`, `PrefilledEntryCard`.

## Data and Endpoints

- Existing endpoints: `TABLE`.
- Existing table / graph / placeholder substrate: this page is already built on the correct substrate; placeholder types like `DBNation`, `DBAlliance`, `Conflict`, `TaxDeposit`, and others are a major strength.
- New endpoints likely needed: none for MVP; shared saved views may need a persistence endpoint later if local storage is not enough.

## Command Bindings

- Existing commands: not a primary command page, but it should link to placeholder-browser help and command fallbacks where useful.
- Commands likely needing changes: none.
- Command preview / confirmation rules: only action-capable table rows should show command previews before mutating actions.

## Navigation

- Links to: `/reports/graphs`, `/reports/conflicts`, `/reports/alliances/:alliance`, `/economy/tax`, `/war/targets`, `/commands`.
- Linked from: Home landing, alliance profile, tax page, interview page, command launcher.

## Permissions and Context

- Core browsing can stay public for public-safe data.
- Guild-scoped presets should appear only when relevant context exists.

## Risks and Open Questions

- Do not hide the full builder behind too much template chrome.
- Saved-view UX needs to distinguish personal, team, and shared links cleanly.
- The page should stay fast even with large tables and many presets.

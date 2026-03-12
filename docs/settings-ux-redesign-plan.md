# Settings UX Redesign Plan

## Goal

Refactor the settings redesign around the existing query-normalize-group-flatten-render pipeline rather than treating the work as primarily visual.

The current architecture already has the right backbone:

- data source: `bulkQueryOptions(TABLE.endpoint, listQueryArgs)` in `src/pages/settings/index.tsx`
- normalization entry point: `normalizeGuildSettingRows` in `src/pages/settings/settingsDomain.ts`
- flattening entry point: `flattenSettingsRows` in `src/pages/settings/settingsDomain.ts`
- command-backed edit path: `CommandDialogForm`, `SettingClearAction`, and `onRefreshSetting`

This plan keeps that backbone intact and improves the settings page in layers: stabilize virtualization first, introduce settings-local browser state and derivations second, then redesign the surrounding UX without replacing the editing path.

## Architecture Stance

Treat the settings page as a settings-specific browser over normalized rows.

Preferred one-way data flow:

1. API table query
2. `normalizeGuildSettingRows(table)`
3. settings-local browser state
4. derived filtered and sorted `SettingRow[]`
5. `flattenSettingsRows(...)` or equivalent flattened render items
6. virtualized list rendering
7. dialog-based edit and clear actions

This browser derivation layer must stay separate from query/cache mutation helpers such as `mergeRowIntoTableCache` and `removeRowFromTableCache`.

## Scope And Invariants

Phase 0 is to lock scope and invariants around the current settings surface.

Primary files:

- `src/pages/settings/index.tsx`
- `src/pages/settings/settingsDomain.ts`
- `src/pages/settings/components/SettingEditDialog.tsx`

Required invariants:

- Preserve the existing data source: `bulkQueryOptions(TABLE.endpoint, listQueryArgs)`
- Preserve the existing normalization entry point: `normalizeGuildSettingRows`
- Preserve the existing flattening entry point: `flattenSettingsRows`
- Preserve the command-backed save and clear behavior built on `CommandDialogForm`, `SettingClearAction`, and `onRefreshSetting`

Out of scope:

- backend or query contract changes
- command execution refactors
- generalized cross-domain list abstractions
- turning settings into a second `CmdList`
- replacing the command-backed edit flow with a custom settings editor without a proven product gap

## Current Gaps To Address

The current implementation in `src/pages/settings/index.tsx` and related components exposes the main problems this redesign needs to solve:

- Browser state is minimal and fragmented: only `showUnavailable` exists today.
- Filtering is page-local and shallow rather than driven by a canonical settings browser state.
- `Virtuoso` uses a single `defaultItemHeight={124}` even though category rows, subgroup rows, and setting rows have different heights.
- `SettingRow` uses `LazyExpander`, which introduces dynamic row height inside the virtualized list.
- `SettingsTopBar` is currently a small status card rather than a proper workbench for search, filters, counts, and warnings.
- `SettingEditDialog` preserves the command path correctly, but it does not yet provide rich context around the setting being edited.

## Phase Plan

### Phase 0: Lock scope and invariants

Use the current settings surface as the contract boundary.

Deliverables:

- Document and preserve the TABLE query contract in `src/pages/settings/index.tsx`
- Preserve `normalizeGuildSettingRows` and `flattenSettingsRows` in `src/pages/settings/settingsDomain.ts`
- Preserve `SettingEditDialog` as a command-hosting edit surface rather than replacing it with a custom mutation flow
- Make explicit that cache writes remain in the settings domain helper layer and are not part of browser derivation

Exit criteria:

- The plan and implementation agree that the data flow begins from the existing TABLE query and ends in the existing command-backed edit path

### Phase 1: Add settings-local browser state and derivations

Before redesigning visuals, introduce a canonical settings browser state model in the settings layer.

Reference pattern only:

- `src/components/cmd/cmdBrowserState.ts`

Do not move settings state into shared command-browser infrastructure.

Recommended state shape:

- `query`
- `showFilters`
- `availability`
- `invalid`
- `unsupported`
- `hasValue`
- `sort`

Recommended ownership:

- keep state in `src/pages/settings/index.tsx` or a new settings-local helper module
- keep serialization and parsing local to settings if URL/search-param persistence is needed later

Expand `src/pages/settings/settingsDomain.ts` with browser/view-model helpers for:

- searchable text extraction
- filter predicate evaluation
- relevance, name, and category sorting
- summary counts
- flattened render items derived from already-normalized rows

Rules:

- Derivation helpers operate on normalized rows only
- No query writes or cache mutation in this browser derivation layer
- Keep one-way data flow explicit and easy to inspect in isolation

Exit criteria:

- The page owns one canonical filter state instead of scattered booleans
- The top bar and rendered rows both derive from the same browser-state-backed view model

### Phase 1: Stabilize virtualization before richer UI

Virtualization stability is foundational work, not optional polish.

Files:

- `src/pages/settings/index.tsx`
- `src/pages/settings/settingsDomain.ts`

Required changes:

- Replace the single `defaultItemHeight={124}` approach with per-item size estimation for `FlattenedSettingsItem`
- Export size constants or a kind-based estimator from `settingsDomain.ts`
- Validate that category, subgroup, and setting items have predictable estimates

Why this comes early:

- mixed item heights already exist
- inline row expansion currently makes height more volatile
- keyboard navigation and orientation recovery depend on a stable list surface

Verification focus:

- filtering should not cause major scroll jumps
- per-row refresh should not throw the list to a different position
- closing and reopening dialogs should not lose orientation in the list

### Phase 1: Remove dynamic row height from the main list

File:

- `src/pages/settings/components/SettingRow.tsx`

Required change:

- Stop using `LazyExpander` for inline help expansion inside virtualized rows

Replace it with:

- a fixed-height summary line or clamped help preview in the row
- full help and richer details moved into the dialog or a non-virtualized detail surface

Reason:

- bounded row height is a prerequisite for stable virtualization and predictable keyboard navigation

Exit criteria:

- setting rows remain intentionally height-bounded in the list view
- full help is still available in the edit surface or another non-virtualized context

### Phase 2: Rework the top bar into a settings workbench

File:

- `src/pages/settings/components/SettingsTopBar.tsx`

Direction:

- make the top bar sticky
- drive it entirely from the canonical settings browser state
- adopt `src/components/cmd/SearchBar.tsx` directly for search input
- reuse the compact filter-card pattern from `src/components/cmd/CmdList.tsx` only as a visual reference, not by importing command-domain filter definitions

The top workspace should surface:

- active result count
- active filter count
- unsupported-input warnings
- parse/schema warnings

Important distinction:

- global data-quality issues must remain visually distinct from per-row state filters
- unsupported input type is not the same thing as row availability or invalid row state

Exit criteria:

- search, filters, counts, and warnings all come from one canonical browser-state-backed view model

### Phase 2: Redesign `SettingRow` for bounded scanning

File:

- `src/pages/settings/components/SettingRow.tsx`

Target hierarchy:

- primary: setting key
- immediate secondary: current value summary
- secondary metadata line: type, category, subgroup, concise help, or other compact metadata as needed
- restrained status badges: `invalid`, `unset`, `unsupported`, `unavailable`, `channel-type`

Rules:

- keep row height intentionally bounded
- anything verbose or highly variable in height moves to the dialog/details surface
- row-level warnings should support scanning, not dominate the row

Exit criteria:

- without opening the dialog, a user can identify the key, value presence, state, and concise metadata in one pass

### Phase 2: Keep category rendering thin

File:

- `src/pages/settings/components/SettingsCategorySection.tsx`

Role:

- remain a presentational mapper for the discriminated union item kinds
- do not absorb filtering, keyboard behavior, or cache logic

If stronger category wayfinding is needed:

- prefer clearer separators
- consider Virtuoso-supported grouping patterns
- defer CSS sticky tricks until the stabilized list is working and profiled

Exit criteria:

- category section stays dumb and easy to reason about

### Phase 2: Enrich the edit dialog without replacing its command path

File:

- `src/pages/settings/components/SettingEditDialog.tsx`

Required invariant:

- keep `CommandDialogForm` and `SettingClearAction`

Add contextual header content from the row model:

- setting key
- type
- category and subgroup
- current value summary
- help text
- state badges

Rules:

- unsupported-input handling stays explicit
- do not add a manual-edit implementation unless the command-plus-arg-input path truly cannot represent the needed input type

Exit criteria:

- the dialog explains the setting fully enough that the list row no longer needs expandable detail content

### Phase 3: Add keyboard support by composing shared primitives

Keyboard work should reuse shared search/list primitives rather than introducing a parallel settings keyboard stack.

Reusable primitives:

- `getSearchListKeyboardAction`
- `useSearchListActiveNavigation`
- `SearchMatchText`
- `useCommandEscapeArming` where useful

Relevant files:

- `src/components/cmd/searchListPrimitives.tsx`
- `src/components/cmd/useCommandShellKeyboard.ts`
- `docs/keyboard-policy.md`

Do not import:

- command-specific arg-jump behavior
- generalized `CmdList` shells or state

Ownership must follow the existing keyboard policy order:

1. popup
2. field
3. row or list shell
4. dialog

Recommended first keyboard slice:

- search focus shortcut only if it is already discoverable and consistent with app conventions
- otherwise support explicit search focus and `/` only when it does not steal typing from editable fields
- arrow keys, `Home`, `End`, and page movement change the active row
- `Enter` opens edit for the active row
- `Escape` clears search before backing out
- popup-backed controls keep ownership through the existing `data-command-popup-open` contract

Accessibility direction:

- keep DOM focus at the list shell where possible
- use active-row or active-descendant semantics instead of tabbing into each row button

Exit criteria:

- the settings list is navigable and actionable by keyboard without violating popup and field ownership rules

### Phase 3: Preserve list continuity across derivation changes

File:

- `src/pages/settings/index.tsx`

Required work:

- track active row key and or first visible row key
- restore orientation after filter changes when possible
- restore orientation after per-setting refreshes when possible

This is more important than simply adding more filters.

The core requirement is continuity: users should not lose their place as the list derivation changes.

Exit criteria:

- filter changes and row refreshes preserve user orientation whenever the target row still exists

### Phase 4: Refine feedback states in the page layer

File:

- `src/pages/settings/index.tsx`

Differentiate these states clearly:

- whole-page load failure
- filtered-empty state
- unauthenticated state
- row-level unsupported state
- single-setting pending refresh state

Rules:

- keep existing cache update helpers unless profiling or bugs justify replacing them
- isolate warning display so global parse/schema issues do not visually compete with row-level edit affordances

Exit criteria:

- each failure or warning class has a clear visual role and does not overload the main row-scanning flow

### Phase 4: Add responsive adjustments after desktop hierarchy is stable

Responsive tuning should be evidence-driven and come after desktop information hierarchy and virtualization stability.

Rules:

- keep virtualization tuning changes minimal until profiling shows a need
- do not pre-commit to reducing overscan on mobile without measurement
- prioritize row reflow, reachable actions, and sticky top-bar height on narrow screens

Exit criteria:

- the same information hierarchy works at desktop, tablet, and narrow mobile widths without the sticky workspace overwhelming the viewport

### Phase 5: Validate through workflows, not component checklists

Measure success by user tasks rather than by whether individual components were rewritten.

Primary workflows:

1. finding a known setting from search
2. scanning category context while browsing
3. editing a supported setting
4. clearing a supported setting
5. interpreting unsupported or invalid rows
6. preserving orientation after filter changes
7. completing the main list workflow with keyboard only

Exit criteria:

- the primary settings tasks feel coherent end to end and preserve the existing command-backed editing contract

## Relevant Files

Settings page and domain:

- `src/pages/settings/index.tsx`
- `src/pages/settings/settingsDomain.ts`

Settings components:

- `src/pages/settings/components/SettingsTopBar.tsx`
- `src/pages/settings/components/SettingRow.tsx`
- `src/pages/settings/components/SettingsCategorySection.tsx`
- `src/pages/settings/components/SettingEditDialog.tsx`

Shared primitives to reuse directly:

- `src/components/cmd/SearchBar.tsx`
- `src/components/cmd/searchListPrimitives.tsx`
- `src/components/cmd/useCommandShellKeyboard.ts`

Reference pattern only:

- `src/components/cmd/cmdBrowserState.ts`

Policy reference:

- `docs/keyboard-policy.md`

## Verification Checklist

1. Verify `#/settings` still loads from the same TABLE query contract while authenticated.
2. Verify that unfiltered results expose the same underlying normalized rows as before the redesign.
3. Scroll deep into the virtualized list, then toggle filters, search, dialog open and close, and per-row refresh. Confirm there is no major jump or lost orientation.
4. Compare total rows, invalid rows, unsupported rows, unavailable rows, and unset rows against the normalized dataset and browser-state-derived counts.
5. Confirm each row remains bounded in height while still surfacing the key, value presence, state, and concise metadata.
6. Confirm the dialog provides enough context that row expansion is no longer needed.
7. Verify supported edit and clear flows still use the existing command-backed path and refresh the affected row or cache entry.
8. Verify unsupported rows remain understandable and clearly differentiated from unavailable settings.
9. Verify keyboard ownership with search focused, list-shell navigation active, and popup-backed controls open. `Escape` should clear search before backing out, and shell shortcuts must not fire while a popup owns the key.
10. Verify desktop, tablet, and narrow mobile layouts, especially sticky workspace height, row reflow, and action crowding.
11. Run the relevant typecheck, lint, and tests for the touched settings surface, plus a manual authenticated smoke test.

## Decisions

- Reuse shared primitives, not shared command-domain containers.
- Keep settings browser state and derivation in the settings layer.
- Treat virtualization stability as foundational work.
- Keep the existing command-backed edit, save, and clear path unless a real unsupported-input product requirement proves it insufficient.
- Do not promise sticky category headers or mobile overscan tuning before stabilization and profiling.

## Further Considerations

1. Responsive tuning, feedback-state refinement, and empty-state distinctions matter, but they should remain subordinate to browser-state and virtualization foundations.
2. Avoid creating a separate `SettingSearchList` or bespoke keyboard stack unless the page becomes a reusable settings picker used elsewhere.
3. If cache mutation bugs appear during implementation, evaluate whether `mergeRowIntoTableCache` and `removeRowFromTableCache` can remain the low-latency path with better guardrails before falling back to broad invalidation.

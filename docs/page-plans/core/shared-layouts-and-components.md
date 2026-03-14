<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Shared Layouts And Components

- Status: `Cross-cutting`
- Primary route: all guided pages, wrapped workflows, and major report surfaces
- Legacy aliases: n/a
- Nav group: cross-cutting
- Primary users: frontend planning and implementation work across `Home`, `Economy`, `War`, `Members`, `Server`, `Reports`, and `Commands`
- Current references: `docs/page-plans/core/app-shell.md`, `docs/page-plans/core/context-and-scoping.md`, `docs/page-plans/core/workflow-map.md`, `src/components/layout/page-view.tsx`, `src/components/layout/navbar.tsx`, `src/components/layout/DialogContext.tsx`, `src/components/layout/SidebarNav.tsx`, `src/pages/settings/index.tsx`, `src/pages/custom_table/StaticTable.tsx`, `src/pages/custom_table/actions/BulkActionsToolbar.tsx`, `src/pages/a2/conflict/conflicts.tsx`

## Why It Exists

- The page briefs already repeat a small number of real layout families and interaction primitives.
- This doc turns those repeated needs into a concrete reuse map so implementation work can start from shared components instead of page-local guesses.
- It should prevent repeated one-off filter bars, drawers, preview rails, and setup notices.
- It should also prevent over-abstracting across pages that only look similar while actually sitting on different read and mutation substrates.

## Decision Rules

- Share a layout only when pages need the same orientation model, not just similar markup.
- Keep the current substrate honest. Do not hide whether a page is `Endpoint-native`, `Settings-backed`, or `Command-wrapped`.
- Reuse `Server Settings` as the durable repair surface when the source of truth is really `GuildSetting`.
- Reuse the command browser and runner as the universal fallback instead of cloning command execution into each page.
- Promote page-local components to shared only after a second real consumer appears. Do not create a giant generic builder because two pages both have a preview pane.

## Common Layout Families

### 1. Shell + Context + Section Header

Use this when the user is inside a selected guild and needs constant orientation while moving between sections.

Used by:
- `docs/page-plans/core/app-shell.md`
- `docs/page-plans/core/context-and-scoping.md`
- `docs/page-plans/home/home.md`
- `docs/page-plans/home/member-overview.md`
- `docs/page-plans/server/setup.md`
- `docs/page-plans/server/settings.md`
- `docs/page-plans/commands/browser.md`
- `docs/page-plans/commands/runner.md`

Why this layout exists:
- These pages all depend on visible guild context, recognizable section labels, and quick recovery into setup or command fallback.
- The shell is doing orientation work, not data work. It should show where the user is, what guild scope is active, and which section-local actions matter next.

Existing pieces to reuse:
- `src/components/layout/page-view.tsx`
- `src/components/layout/navbar.tsx`
- `src/components/cmd/CommandLauncher.tsx`
- `src/components/layout/RecentPageKeepAlive.tsx`
- `src/components/api/SessionContext.tsx`

Specific additions or tweaks:
- Extend the merged navbar or session summary area instead of introducing a separate `GuildContextBar`.
- Extend the grouped sidebar navigation instead of introducing a separate `PrimaryNavRail`.
- Add `SectionHeader` so pages stop inventing their own title, summary, action-chip, and secondary-nav arrangement.
- Add `ContextPreservingLink` so hand-offs to `Deposits`, `Targets`, `Commands`, or `Server Settings` can preserve meaningful guild and local workflow scope without copying every transient filter.
- `PageView` should expose explicit slots for the unified shell, grouped sidebar navigation, page header, and page content.

Sanity check:
- Public report pages can reuse the shell chrome, but they must degrade cleanly when there is no selected guild.
- Do not move guild scope into the navbar search area. The existing navbar is already carrying breadcrumbs and the command entry point.

### 2. Operations Desk

Use this for dense workflows where the user keeps scope, filters, totals, results, and detail context visible while they investigate or act.

Used by:
- `docs/page-plans/economy/manage_balance.md`
- `docs/page-plans/economy/manage_escrow.md`
- `docs/page-plans/economy/ledger.md`
- `docs/page-plans/war/targets.md`
- `docs/page-plans/war/counters.md`
- `docs/page-plans/reports/conflicts.md`
- `docs/page-plans/members/interviews.md`

Why this layout exists:
- These pages are not wizard flows. Users compare many rows, keep multiple filters in play, and need detail context without constant route churn.
- The page needs to answer two questions at once: what is in the current result set, and what should I do about the selected row or rows.

Existing pieces to reuse:
- `src/pages/custom_table/StaticTable.tsx`
- `src/pages/custom_table/actions/BulkActionsToolbar.tsx`
- `src/utils/useIdSelection.ts`
- selection patterns in `src/pages/a2/conflict/conflicts.tsx`
- `src/components/cmd/CommandStringPreview.tsx`
- search and chip-strip patterns in `src/pages/settings/components/SettingsTopBar.tsx`

Specific additions or tweaks:
- Add `SummaryStrip` for sticky totals, health counts, or urgency counts. `Holdings`, `Ledger`, `Conflicts`, `Interviews`, and `Status` all ask for this, but the contents differ per page.
- Add `FacetFilterBar` for reusable search, chips, segmented toggles, and multi-select filters. Build it from the generic search input and filter-chip patterns already in the repo instead of reusing the settings sidebar.
- Add `EntityDrawer` for right-side detail panes such as transaction detail, target detail, grant-request detail, or task history.
- Add `TableActionColumn` so dense tables can render row actions consistently instead of rebuilding ad hoc action columns.
- Extend `src/lib/dialog.ts`, `src/components/layout/DialogContext.tsx`, and `src/components/ui/simple-dialog.tsx` with a placement option such as `center`, `right`, or `sheet`. The current dialog stack is good for confirmation modals, but not for the non-blocking right drawers requested by `Ledger`, `Targets`, `Grant Requests`, and `Status`.

Sanity check:
- Do not use `HierarchySidebarNav` as the general filter rail. It models one active path through a hierarchy. `Ledger`, `Targets`, and `Counters` need combinable filters, not navigation state.
- Do not force this layout onto `Home`, `Server Setup`, `Graphs`, or `Command Browser`. They have different jobs.

### 3. Queue Desk

Use this when the left side is a queue or inbox and the right side is the currently selected item with actions, warnings, and related context.

Used by:
- `docs/page-plans/economy/grant-requests.md`
- `docs/page-plans/members/interviews.md`
- `docs/page-plans/home/announcements.md`
- parts of `docs/page-plans/war/rooms.md`

Why this layout exists:
- These pages are about triage and review, not free exploration. Users need stable queue selection, visible status, and a detail pane that can explain blockers.
- The queue itself is often dense and repeatable, but the selected item panel is domain-specific.

Existing pieces to reuse:
- `src/components/ui/pagination.tsx` for inbox-scale list pagination
- `src/pages/custom_table/StaticTable.tsx` for denser queues
- `EntityDrawer` from the operations-desk work above
- `src/pages/custom_table/actions/CommandActionDialogContent.tsx` for action forms that still need command-backed confirmation

Specific additions or tweaks:
- Do not build a generic `ReviewQueuePage` abstraction yet. The queue rows and detail panes for `Grant Requests`, `Interviews`, and `Announcements` are too different.
- Instead, share the lower-level pieces: queue list/table, status chips, drawer shell, and action preview panel.

Sanity check:
- `Announcements` still needs route-backed detail for shareability. Drawer support should be additive, not a replacement for `announcement/:id`.

### 4. Builder Studio

Use this for command-wrapped or endpoint-backed editors where the user is composing a structured output and needs live preview beside the form.

Used by:
- `docs/page-plans/home/announcements.md` composer mode
- `docs/page-plans/members/recruitment.md`
- `docs/page-plans/server/menus.md`
- `docs/page-plans/server/embeds.md`
- `docs/page-plans/economy/grant-send.md`
- create and batch-create modes in `docs/page-plans/war/rooms.md`

Why this layout exists:
- These pages are stronger in the browser precisely because raw command arguments hide ordering, preview, and target context.
- The user needs the editor and the resulting output in the same frame of reference.

Existing pieces to reuse:
- `src/components/api/apiform.tsx`
- `src/components/cmd/CommandComponent.tsx`
- `src/components/cmd/CommandStringPreview.tsx`
- `src/components/cmd/ArgInput.tsx`
- `src/components/ui/tabs.tsx`
- shared primitives from `src/components/ui/*`

Specific additions or tweaks:
- Add `WorkflowActionPreview` as a richer wrapper around `CommandStringPreview`. It should show the command string plus the assumptions the user cares about on that page, such as funding source, expiry, recipient scope, or delivery path.
- Add `LivePreviewPanel` for side-by-side preview panels. This is the reusable part across announcements, recruitment, menus, embeds, and war-room preview flows.
- Add `CommandContextBadge` so command-wrapped builders can show whether they are editing a temporary menu context, a specific embed target, or a derived grant shape.
- Create `MessageTemplateEditor` only as a narrow shared component for `Announcements` and `Recruitment`. Those two pages both need subject/body plus replacements/preview. `Embeds` and `Menus` do not share the same editing model.
- Create `CommandBackedWizard` only for `Grant Send`. The grant wizard has stable staged steps and a sticky review rail. That is not the same layout as announcements, menus, or embeds.

Sanity check:
- Do not create one master `BuilderStudio` with pluggable schemas. `Grant Send`, `Menus`, and `Embeds` are all builder-like, but they differ in navigation, persistence, and warning semantics.
- `Menus` and `Embeds` should share preview and inspector primitives, not collapse into one combined page model.

### 5. Analyst Studio

Use this for report-heavy pages where discovery, presets, and a large read-only canvas matter more than mutation.

Used by:
- `docs/page-plans/reports/tables.md`
- `docs/page-plans/reports/graphs.md`
- `docs/page-plans/reports/alliance-profile.md`
- `docs/page-plans/economy/trade.md`
- parts of `docs/page-plans/reports/multi-investigation.md`

Why this layout exists:
- These pages are about building or consuming reusable analysis views.
- The right abstraction is discovery plus canvas, not a simplified dashboard.

Existing pieces to reuse:
- `src/pages/custom_table/PlaceholderTabs.tsx`
- `src/pages/custom_table/StaticTable.tsx`
- `src/pages/custom_table/TableWithExports.tsx`
- `src/pages/custom_table/TableWith2DData.tsx`
- `src/pages/graphs/SimpleChart.tsx`
- `src/pages/graphs/view_graph.tsx`
- `src/pages/command/view_command.tsx`
- `src/components/ui/ExpandableTableRow.tsx`
- `src/components/ui/LazyExpander.tsx`

Specific additions or tweaks:
- Add `SavedViewBar` and `RecentQueryStrip` for `Tables` and similar data-driven workbenches.
- Add `GraphGallery` and `RecentArgumentBar` for `Graphs` and graph-backed entry points.
- Add `RelatedReportLinks` so pages like `Alliance Profile`, `Trade`, and `Tables` can deep-link into adjacent read-only tools without inventing local link clusters.
- Keep `ViewCommand` and `StaticViewGraph` as embedded report primitives. They already provide a useful bridge between reports and command or graph substrates.

Sanity check:
- Do not merge `Tables` and `Graphs` into one shared configuration engine. They can share discovery chrome, recent-history UI, and related-link patterns, but one is placeholder-column-driven and the other is endpoint-argument-driven.
- `Alliance Profile` should remain an information-rich profile with expandable sections, not get forced into a table-builder shell.

### 6. Readiness Board

Use this for guild setup and repair flows where the user is working through modules, blockers, and repair links.

Used by:
- `docs/page-plans/core/guild-select.md`
- `docs/page-plans/server/setup.md`
- setup and recovery affordances implied by `docs/page-plans/core/context-and-scoping.md`
- setup warnings referenced by `docs/page-plans/home/home.md`, `docs/page-plans/members/deposits.md`, and `docs/page-plans/war/rooms.md`

Why this layout exists:
- Setup is not a flat setting list. Users think in terms of readiness, blockers, and next actions by module.
- This flow needs deep links into settings and commands without pretending those underlying surfaces no longer matter.

Existing pieces to reuse:
- `src/components/api/apiform.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- settings deep-link patterns from `src/pages/settings/index.tsx`
- command runner and browser links

Specific additions or tweaks:
- Add `SetupReadinessBoard` and `SetupModuleCard` for grouped module status such as `Foundation`, `Banking`, or `War And Alerts`.
- Add `SetupRecoveryNotice` so workflow pages can show a small, actionable setup blocker instead of just failing silently.
- Add `SettingsDeepLinkCard` for jumps into the exact server-setting slice that owns the blocked capability.
- Add `WorkflowCommandFallbackLink` when the fix is command-backed rather than settings-backed.

Sanity check:
- `Server Settings` remains the durable fallback read and edit surface. Readiness boards should summarize, link, and prioritize. They should not duplicate settings editing logic.

### 7. Command Fallback Shell

Use this for raw command discovery and execution, and for advanced-entry links from wrapped pages.

Used by:
- `docs/page-plans/commands/browser.md`
- `docs/page-plans/commands/runner.md`
- every page brief that says "open the raw command" or "advanced fallback"

Why this layout exists:
- The app already has a real command system. Wrapped pages should reduce friction, not replace the fallback that covers the long tail.
- The browser and runner must stay consistent with the guided pages so users are not learning two command-preview models.

Existing pieces to reuse:
- `src/components/cmd/CmdList.tsx`
- `src/components/cmd/SearchBar.tsx`
- `src/components/cmd/CommandLauncher.tsx`
- `src/components/cmd/useCommandExecution.ts`
- `src/pages/command/view_command.tsx`
- `src/components/cmd/CommandComponent.tsx`

Specific additions or tweaks:
- Add `RelatedWorkflowLinks` so the command runner can point back to owning guided pages like `Manage Balance`, `Targets`, or `Roles`.
- Add a saved-command dropdown and shared history-button affordance instead of a `RecentCommandPresetBar`.
- Add `CommandContextBadge` when a command was opened from a specific guided workflow.

Sanity check:
- Do not fork argument naming, preview copy, or submission behavior between the command runner and the guided pages. The runner is the escape hatch and must remain trustworthy.

## Shared Component Inventory

### Tier 1: Build These First

#### `SessionSummaryBlock`

What it is for:
- Show selected guild, registered alliances, current nation, delegated-state hints, and direct recovery actions inside the merged shell.

Needed by:
- `docs/page-plans/core/app-shell.md`
- `docs/page-plans/core/context-and-scoping.md`
- most guild-scoped pages after login

Start from:
- session data from `src/components/api/SessionContext.tsx`
- shell placement from `src/components/layout/page-view.tsx`

Why it should be shared:
- Context visibility is a cross-cutting rule, not a page-local concern.

#### `SectionHeader`

What it is for:
- Standardize dense page headers with title, one-sentence purpose, primary actions, and optional secondary nav or scope chips.

Needed by:
- `Member Overview`, `Manage Balance`, `Targets`, `Settings`, `Tables`, `Graphs`, `Trade`, `Command Runner`

Start from:
- page-local header patterns only; there is no existing reusable header component worth preserving as-is

Why it should be shared:
- The docs repeatedly ask for dense headers and visible primary actions instead of oversized dashboard chrome.

#### `ContextPreservingLink`

What it is for:
- Carry meaningful guild and workflow scope across route changes without blindly serializing every filter.

Needed by:
- `Deposits` -> `Ledger`
- `Targets` -> `Counters` or `War Rooms`
- setup recovery links
- guided page -> command runner hand-offs

Start from:
- existing query-backed route state and command-browser state helpers

Why it should be shared:
- The same preservation rule shows up across economy, war, members, and commands.

#### `SummaryStrip`

What it is for:
- Keep totals, urgency counts, or health summaries visible while the user scrolls a dense result area.

Needed by:
- `Manage Balance`, `Manage Escrow`, `Ledger`, `Conflicts`, `Interviews`, `Trade`

Start from:
- new component; there is no current reusable summary strip

Why it should be shared:
- The visual structure is the same even though the values differ.

#### `FacetFilterBar`

What it is for:
- Reusable search plus filter-chip strip for pages with multiple combinable filters.

Needed by:
- `Ledger`, `Targets`, `Counters`, `Conflicts`, `Grant Requests`, `Announcements`

Start from:
- `src/components/cmd/SearchBar.tsx`
- chip-strip and count patterns in `src/pages/settings/components/SettingsTopBar.tsx`

Why it should be shared:
- The pages need the same interaction model even when filter definitions differ.

Specific caution:
- Keep it schema-driven. Do not hard-wire command-list filters into it.

#### `EntityDrawer`

What it is for:
- Show selected row detail without leaving a dense list or table.

Needed by:
- `Ledger`, `Targets`, `Grant Requests`, `Announcements`, `Status`

Start from:
- `DialogContext` and `SimpleDialog`, after adding drawer placement support

Why it should be shared:
- The container behavior is the same even when the body content differs.

#### `WorkflowActionPreview`

What it is for:
- Show the exact command plus the page-specific assumptions or impact that matter before submit.

Needed by:
- `Holdings`, `Ledger`, `Grant Requests`, `Grant Send`, `Announcements`, `Counters`, `War Rooms`, `Menus`, `Embeds`

Start from:
- `src/components/cmd/CommandStringPreview.tsx`
- dialog flow in `src/pages/custom_table/actions/CommandActionDialogContent.tsx`

Why it should be shared:
- Command preview is cross-cutting, but the small current preview row is not enough for most workflow pages.

#### `ScopeAwareSelectionBar`

What it is for:
- Present account, alliance, guild, nation, or named-scope choices in plain language.

Needed by:
- `Holdings`, `Ledger`, `Targets`, `Grant Requests`, `Tax`, `Interviews`

Start from:
- existing `ArgInput` select behavior and current query-backed scope state in war and table flows

Why it should be shared:
- The scoping rule is documented centrally in `docs/page-plans/core/context-and-scoping.md`.

Specific caution:
- This is not a single global alliance picker. It must allow page-specific scope shapes.

### Tier 2: Build After Tier 1 Lands

#### `HealthBadge`

What it is for:
- Map readiness, urgency, or health states to a consistent chip treatment.

Needed by:
- `Status`, `Targets`, `Deposits`, `Conflicts`, `Server Setup`

Start from:
- the existing `Badge` primitive in `src/components/ui/*`

Why it should be shared:
- The docs consistently ask for status or health chips, but the semantics should be translated into a consistent visual vocabulary.

#### `SetupRecoveryNotice`

What it is for:
- Inline blocker notice with direct links into `Server Setup`, `Server Settings`, or a command fallback.

Needed by:
- `Home`, `Deposits`, `War Rooms`, other guild-scoped pages that can hit missing setup

Start from:
- new component backed by shared navigation helpers

Why it should be shared:
- Setup incompleteness is part of context, not a page-local error state.

#### `RelatedWorkflowLinks`

What it is for:
- Show the most relevant adjacent pages for the current context.

Needed by:
- `Alliance Profile`, `Graphs`, `Command Runner`, `Grant Requests`, `Targets`

Start from:
- new component; keep it lightweight and route-aware

Why it should be shared:
- Cross-workflow hand-offs are called out throughout `docs/page-plans/core/workflow-map.md`.

### Tier 3: Narrow Shared Pairs, Not Global Primitives

#### `MessageTemplateEditor`

What it is for:
- Subject/body editing, replacement controls, and preview for outbound message workflows.

Share only between:
- `docs/page-plans/home/announcements.md`
- `docs/page-plans/members/recruitment.md`

Why this should stay narrow:
- These two pages share real text-template editing needs.
- `Embeds` and `Menus` do not; they need structural button and target editors instead.

#### `Library + Editor + Preview` pieces for `Menus` and `Embeds`

What they are for:
- Left-side library selection, center editor, right-side preview or target inspector.

Share only between:
- `docs/page-plans/server/menus.md`
- `docs/page-plans/server/embeds.md`

Why this should stay narrow:
- These pages both wrap command-backed Discord surface builders.
- They still have different editable fields and different preview semantics, so the shared layer should stop at library panels, preview frames, and target-inspector scaffolding.

## Existing Components That Are Already Good Anchors

Keep these and build around them:
- `src/components/layout/HierarchySidebarNav.tsx` for hierarchical navigation such as `Settings`, not for combinable filter rails
- `src/pages/custom_table/StaticTable.tsx` for dense read-heavy tables
- `src/pages/custom_table/actions/BulkActionsToolbar.tsx` plus `src/utils/useIdSelection.ts` for selection and bulk actions
- `src/components/ui/tabs.tsx` for multi-mode pages; use `preloadStrategy` intentionally instead of rebuilding tab behavior per page
- `src/components/cmd/CommandStringPreview.tsx` as the small shared command-string row inside larger action-preview panels
- `src/pages/command/view_command.tsx` and `src/pages/graphs/view_graph.tsx` as good examples of embedded read-only bridges into command and graph outputs
- `src/components/ui/ExpandableTableRow.tsx` and `src/components/ui/LazyExpander.tsx` for expandable detail blocks on report-style pages

## Components That Should Stay Page-Specific For Now

Do not abstract these yet:
- `GrantWarningsPanel` because grant policy warnings are domain-heavy and tied to funding and eligibility logic
- `EligibilityPanel` because grant-request review logic is not shared by other queues
- `CounterStrengthMiniCharts` because counter-fit visuals are war-specific
- `WarCostSummary` because sheet and war-cost summaries are not the same thing as balance or status totals
- `RoleAliasChecklist` because role-alias coverage is a server-admin concept, not a generic checklist
- `EmbedCanvas` and `MenuCommandInspector` because they are specific to Discord surface editing
- `PriceTickerGrid` and `TradeProfitSummary` because the market desk has its own visual language and cadence

## Initial Build Order

1. Shell and context primitives
- `SessionSummaryBlock`
- grouped sidebar section navigation
- `SectionHeader`
- `ContextPreservingLink`

2. Dense-workflow primitives
- `SummaryStrip`
- `FacetFilterBar`
- `EntityDrawer`
- `TableActionColumn`
- `ScopeAwareSelectionBar`

3. Command-preview and recovery primitives
- `WorkflowActionPreview`
- `HealthBadge`
- `SetupRecoveryNotice`
- `RelatedWorkflowLinks`

4. Narrow shared builders after the first two consumers are active
- `MessageTemplateEditor`
- shared library or preview scaffolding for `Menus` and `Embeds`

## Sanity Checks

- `Settings` stays the durable fallback surface for `GuildSetting` work. Wrapper pages should summarize and deep-link into it, not fork its editing logic.
- `Command Runner` stays the durable fallback for unsupported or advanced workflows. Guided pages should not invent a second command-preview language.
- `Tax`, `Recruitment`, `War Rooms`, `Interviews`, `Grant Requests`, and `Trade` are mixed-substrate pages by design. Shared components should clarify those boundaries, not hide them.
- The repeated drawer request is real, but route-backed detail still matters for shareable resources like `announcement/:id`.
- `SidebarNav` and the settings-specific hierarchical nav patterns are strong existing components. Reuse them where the user is navigating a hierarchy, not where the user is applying multi-facet filters.
- `Tables` and `Graphs` can share discovery and preset affordances without becoming the same page.
- `Home`, `Server Setup`, and `Alliance Profile` should stay visually distinct from the operations-desk pages even if they reuse some summary and link primitives.

<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Ledger

- Classification: `route`
- Status: `Evolve`
- Primary route or owner: `/economy/ledger`
- Nav group: `Economy`
- Primary actor: `everyone`
- Scope: `guild + alliance`
- Current code:
	- `src/pages/records/index.tsx`
	- `src/pages/balance/index.tsx`
- Read substrate:
	- Endpoints: `RECORDS`, `TABLE`
	- Response types: `WebTable`
	- Table / graph / placeholder types: `Transaction2` placeholder support is currently thin; future typed records JSON should replace overreliance on generic tables
	- Required columns / filters: account selector, time window, note/category, entity filters, expired/ignored/escrow flags
- Write substrate:
	- Endpoints / command families: `COMMAND`, `bank records`, `deposits flows`, `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`
	- Existing form / action components: table patterns, dialogs, command preview helpers
	- Reload / invalidation targets: record list, balance views, and any affected escrow or note-flow summaries

## Why It Exists

- Owns: historical transaction investigation, note-flow tracing, and guarded correction actions.
- Does not own: current balance summary or member-self deposit overview.
- Current gap: the current `/records` route is a raw table dump, while the real workflow needs account-aware filters, multiple record scopes, and correction previews.

## Workflows

1. Inspect transaction history
	 - Entry: `/economy/ledger`, `Manage Balance`, or `Grant Requests`
	 - Preconditions: selected guild and an account or entity context
	 - Reads: `RECORDS` now, future typed records JSON later
	 - UI path: filter by account, entity, note, and time window, then inspect dense rows
	 - Mutations: none
	 - Handoff / exit: into escrow management, grant review, or tax views when needed
2. Trace note flows and offshores
	 - Entry: a note filter or offshore-related transaction row
	 - Preconditions: note or entity context available
	 - Reads: records plus `deposits flows` or supporting command output
	 - UI path: switch between transfer history, offshore movement, tax-related rows, and entity-to-entity searches
	 - Mutations: none initially
	 - Handoff / exit: into `Manage Escrow`, `Tax`, or related report pages
3. Run guarded correction actions
	 - Entry: selected record set or a note-flow discrepancy
	 - Preconditions: econ or gov permissions
	 - Reads: selected rows plus correction preview data
	 - UI path: open correction panel, preview impact, then execute
	 - Mutations: `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`
	 - Handoff / exit: refresh ledger rows and linked balance context

## Layout Structure

- Top-level regions: filter rail, dense transaction table, selected-transaction drawer, totals strip.
- Tabs / panels / drawers: use tabs or segmented filters for `Transfers`, `Tax`, `Offshore`, and `Entity Search` so the page reflects the real record families people investigate.
- URL state: selected tab, account, entity filters, note filters, and date range.
- Empty / loading / error states: if only raw `WebTable` data exists, say that advanced drawers and correction previews are limited by current backend output.

## Information Model

- Primary objects shown: transaction rows, sender and receiver identity, note/category, resources, market value, expiry, ignored state, escrow state, related entity context.
- Filters / grouping: account, entity, note/category, transfer family, date range, expired/ignored/escrow flags.
- Row or card actions: inspect details, trace note flow, open correction preview, link to balance or grant-review context.
- Detail / modal surfaces: transaction drawer, correction preview dialog, note-flow summary panel.

## Components

- Reuse: table primitives, dialog helpers, `CommandStringPreview` patterns.
- Add: `LedgerFilterBar`, `LedgerTabSwitcher`, `TransactionDrawer`, `NoteFlowSummary`, `LedgerTotalsStrip`, `LedgerActionPreview`.
- Extend: links into `Manage Balance`, `Manage Escrow`, `Tax`, and `Grant Requests` so ledger work can hand off cleanly.
- Merge: keep all historical record families in one investigation surface rather than fragmenting them into several barely-related table pages.

## Implementation Delta

- Route changes: `/economy/ledger` is the planned owner; current `/records` is a current-code detail.
- Read model changes: add typed records JSON with account-aware filters before overbuilding UI on top of generic `WebTable` rows.
- Mutation changes: keep correction actions command-backed but require preview JSON first.
- Cache / reload changes: refresh ledger rows plus linked balance or escrow context after corrections.
- Avoid: duplicating member-self deposit summaries inside this page.

## Route And Navigation

- Linked from: `/members/deposits`, `/economy/manage-balance`, `/economy/manage-escrow`, `/economy/grant-requests`, `/commands`.
- Links to: `/economy/manage-balance`, `/economy/manage-escrow`, `/economy/tax`, `/economy/grant-send`.
- Header / nav actions: quick links for current account context, note-flow search, and correction preview.
- Preserved context: selected account, filters, current tab, and selected transaction.

## Permissions And Context

- Auth and scope requirements: selected guild for most workflows; member-self views should stay narrower than staff investigation views.
- Role gates: correction actions are staff-only even when read access is broader.
- Setup dependency / recovery: not a setup page, but it should link into the right admin surface when a problem is caused by configuration rather than transactions.
- Delegation / inherited context: not a primary concern here.

## Commands And Mutations

- Existing commands: `bank records`, `deposits check`, `deposits flows`, `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`.
- Preview / confirm: all correction actions must show generated command plus expected balance impact before execution.
- Permission checks: econ or gov capability checks before mutating actions.
- Side effects / cache refresh: refresh ledger rows and linked balance panels after mutations.

## Open Questions And Backend Gaps

- Add typed `RECORDS` JSON with account-aware filters and transaction flags.
- Add correction preview JSON so risky note or escrow fixes are reviewable before execution.
- Keep tax-related records visible here, but decide later whether `Tax` also gets a specialized history view with shared filters.

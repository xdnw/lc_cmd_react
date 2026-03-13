# Ledger

- Status: `Evolve`
- Primary route: `/economy/ledger`
- Legacy aliases: `/records`
- Nav group: Economy
- Primary users: econ staff, grant approvers, members investigating their own history, staff auditing notes and flows
- Current references: `src/pages/records/index.tsx`, `src/pages/balance/index.tsx`

## Why It Exists

- The current records page is a paginated dump, not an investigation workspace.
- Economy users need filters, note-flow context, and mutation tools that are grounded in what they are reviewing.
- The current records page is a real route foundation, but it is still only a plain table dump.

## Workflows

- Primary: inspect account history over time and understand what changed the balance.
- Secondary: trace note-category flows, find expiring deposits, and launch correction actions.
- Why users arrive here: grant approval, reconciliation, offshore checks, troubleshooting balances.
- Upstream entry points: `Holdings`, `Deposits`, grant review, command fallback.
- Downstream hand-offs: `Deposits` for parked-balance or escrow questions, `Grant Send` when review turns into action.

## Layout and Look

- Left or top filter rail, center table, right-side transaction drawer.
- Table should stay dense and sortable, more like an operations console than a report export page.
- Sticky summary row for total movement, filtered totals, and active account context.

## Information and Interactions

- Filters: account, offshores, time window, note/category, include expired, include ignored, hide or show escrow.
- Table: date, source, destination, note, amount, effective category, expiration, and derived balance impact.
- Drawer: full transaction details, related note flow, source command if known, and next actions.
- Mutations: shift note category, shift flow, convert, or reset only through guarded preview panels.
- Make the page's ownership explicit: `Ledger` is the history and correction surface, not the summary of what is currently available.
- If the problem is an escrowed, expiring, ignored, or offshore-held balance, route users into `Deposits` with the relevant filters preserved.

## Components

- Existing shared: `Button`, dialog helpers, table primitives, `CommandStringPreview` patterns.
- New shared or page-specific: `LedgerFilterBar`, `TransactionDrawer`, `NoteFlowSummary`, `LedgerTotalsStrip`, `LedgerActionPreview`.

## Data and Endpoints

- Existing endpoints: `RECORDS`, `COMMAND`, `TABLE`.
- Existing table / graph / placeholder substrate: `Transaction2` exists as a placeholder type, but its current web-facing coverage is too thin to power a serious ledger explorer.
- New endpoints likely needed: `ledger_records`, `ledger_summary`, `ledger_note_flow`, and `ledger_correction_preview` are needed if `/records` is going to evolve into a true ledger workspace.

## Command Bindings

- Existing commands: `bank records`, `deposits check`, `deposits flows`, `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`.
- Commands likely needing changes: none required for raw capability; the problem is web-native read support and action-context UX.
- Command preview / confirmation rules: all correction actions must show the generated command and expected balance impact before execution.

## Navigation

- Links to: `/economy/holdings`, `/economy/deposits`, `/economy/grant-requests`, `/overview`, optional entity drawers for nations / alliances.
- Linked from: holdings page, grant request review, command launcher.

## Permissions and Context

- Requires login and selected guild.
- Some actions should be view-only for normal members and mutating for econ or gov roles.

## Risks and Open Questions

- If transaction metadata is not exposed as JSON, the page will remain a thin wrapper over exports.
- Note-category language must be translated into user-facing explanations.
- Need to decide whether tax records live here, under Tax, or in both with shared filters.
- The page should not become a second `Deposits` screen with duplicate health summaries.
- Until records are structured, filters and drawers will remain a thin wrapper over generic tables.

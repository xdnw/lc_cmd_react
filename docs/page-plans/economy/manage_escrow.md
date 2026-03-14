# Manage Escrow

- Classification: `route`
- Status: `New`
- Primary route or owner: `/economy/manage-escrow`
- Nav group: `Economy`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - no dedicated page yet
  - `src/pages/records/index.tsx`
  - command metadata for `deposits check`, `deposits flows`, `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`
- Read substrate:
  - Endpoints: future account-scoped `BALANCE`, typed `RECORDS`
  - Response types: blocked-balance buckets and typed record rows
  - Table / graph / placeholder types: current `Transaction2` coverage is not enough on its own
  - Required columns / filters: escrow, ignored, expired, note/category, account, entity
- Write substrate:
  - Endpoints / command families: `COMMAND`, `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`
  - Existing form / action components: command previews and dialog-based confirmations
  - Reload / invalidation targets: escrow summaries, linked balance reads, typed records

## Why It Exists

- Owns: staff investigation and correction of blocked, ignored, expired, or escrowed balance state.
- Does not own: member-self balance viewing or generic current-balance summaries.
- Current gap: the current substrate can expose some of this through commands, but not as a browser-native review and correction surface.

## Workflows

1. Review blocked balances
   - Entry: `/economy/manage-escrow` or a handoff from `Manage Balance` or `Ledger`
   - Preconditions: selected guild and bank visibility
   - Reads: future blocked-balance buckets plus typed records
   - UI path: choose account or entity, inspect escrow and ignored state, then trace the underlying records
   - Mutations: none
   - Handoff / exit: into ledger or a correction action
2. Correct escrow or note-flow problems
   - Entry: selected blocked balance or record group
   - Preconditions: econ permissions
   - Reads: correction preview plus linked record set
   - UI path: open correction dialog, review preview, apply action
   - Mutations: `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`
   - Handoff / exit: refresh the current account and return to the blocked-balance summary

## Layout Structure

- Top-level regions: account selector, blocked-balance summary, record list, correction panel.
- Tabs / panels / drawers: `Escrow`, `Ignored`, `Expired`, `Flow Corrections`.
- URL state: selected account, blocked-balance tab, selected note or entity filter.
- Empty / loading / error states: say clearly when a tab is blocked on missing typed record output.

## Information Model

- Primary objects shown: blocked balance buckets, affected records, note categories, expiry state, and correction previews.
- Filters / grouping: account, blocked-balance type, note/category, entity.
- Row or card actions: inspect, trace note flow, preview correction, execute correction.
- Detail / modal surfaces: correction preview dialog and record detail drawer.

## Components

- Reuse: ledger-style tables, dialogs, command preview helpers.
- Add: `EscrowBucketSummary`, `EscrowRecordList`, `EscrowCorrectionPanel`, `EscrowFilterBar`.
- Extend: balance and ledger pages so they can hand off into this route with context preserved.
- Merge: keep blocked-balance repair in one page instead of scattering it across one-off deposit commands.

## Implementation Delta

- Route changes: add `/economy/manage-escrow`.
- Read model changes: add blocked-balance buckets and typed records.
- Mutation changes: keep corrections command-backed, but require preview JSON.
- Cache / reload changes: refresh the current account and related ledger context after corrections.
- Avoid: hiding escrow repair under generic balance pages.

## Route And Navigation

- Linked from: `/economy/manage-balance`, `/economy/ledger`, `/economy/grant-requests`.
- Links to: `/economy/manage-balance`, `/economy/ledger`.
- Header / nav actions: current account, ledger handoff, correction summary.
- Preserved context: selected account and blocked-balance tab.

## Permissions And Context

- Auth and scope requirements: selected guild and banking visibility.
- Role gates: mutation flows are staff-only.
- Setup dependency / recovery: if blocked state is caused by policy or account configuration, link back into `/server/settings`.
- Delegation / inherited context: not primary, but inherited bank policy can still matter.

## Commands And Mutations

- Existing commands: `deposits check`, `deposits flows`, `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`.
- Preview / confirm: every correction action should show before/after note and resource impact.
- Permission checks: econ or gov role plus command permission.
- Side effects / cache refresh: refresh blocked-balance summaries and ledger rows.

## Open Questions And Backend Gaps

- Add blocked-balance buckets to account-scoped `BALANCE`.
- Add typed `RECORDS` rows and correction preview JSON.

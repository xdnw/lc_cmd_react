<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Manage Balance

- Classification: `route`
- Status: `New`
- Primary route or owner: `/economy/manage-balance`
- Nav group: `Economy`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - `src/pages/balance/index.tsx`
  - `src/pages/records/index.tsx`
  - `src/lib/endpoints.ts`
- Read substrate:
  - Endpoints: `BALANCE`, `BANK_ACCESS`, `RECORDS`
  - Response types: `WebBalance`, `WebBankAccess`, `WebTable`
  - Table / graph / placeholder types: future account rows from `BANK_ACCESS`; typed records JSON later
  - Required columns / filters: selectable account list, available vs. escrowed balances, recent record context
- Write substrate:
  - Endpoints / command families: `WITHDRAW`, `COMMAND`, `bank deposit`, `deposits add`, `deposits addsheet`
  - Existing form / action components: existing balance and ledger page actions plus command fallback
  - Reload / invalidation targets: account balance read, ledger rows, related escrow state

## Why It Exists

- Owns: staff-facing display and adjustment of balances across multiple account scopes.
- Does not own: member-self deposit viewing or deep transaction investigation.
- Current gap: the current balance route is nation-shaped and does not expose the account list staff need to manage broader balances.

## Workflows

1. Review balances by account
   - Entry: `/economy/manage-balance`
   - Preconditions: selected guild and banking visibility
   - Reads: `BANK_ACCESS`, `BALANCE`, and recent ledger context
   - UI path: choose an account, inspect totals and breakdowns, jump into ledger
   - Mutations: none
   - Handoff / exit: into `Ledger` or `Manage Escrow`
2. Apply balance adjustments or transfers
   - Entry: selected account context
   - Preconditions: econ permissions
   - Reads: selected balance and related transfer history
   - UI path: open guarded actions for deposit, add-balance, withdraw, or handoff to offshore tools
   - Mutations: `WITHDRAW`, `bank deposit`, `deposits add`, `deposits addsheet`
   - Handoff / exit: refresh the selected account and linked ledger rows

## Layout Structure

- Top-level regions: account selector, balance summary, action rail, linked ledger preview.
- Tabs / panels / drawers: `Summary`, `Actions`, `Recent Records` is enough for MVP.
- URL state: selected account id.
- Empty / loading / error states: if account rows are unavailable, say that the page is blocked on richer `BANK_ACCESS` output.

## Information Model

- Primary objects shown: account rows, balance totals, category breakdowns, recent balance-moving records.
- Filters / grouping: account scope and account type.
- Row or card actions: inspect, withdraw, add balance, deposit, open ledger, open escrow.
- Detail / modal surfaces: action confirmation and linked record preview.

## Components

- Reuse: current balance summary patterns, buttons, dialogs, command fallback links.
- Add: `BalanceAccountSelector`, `BalanceSummaryCard`, `BalanceActionRail`, `RecentRecordPreview`.
- Extend: balance substrate to support account selection instead of only nation-scoped reads.
- Merge: keep staff balance management in one page rather than spreading it across deposits, records, and one-off commands.

## Implementation Delta

- Route changes: add `/economy/manage-balance` as the staff-facing owner.
- Read model changes: expand `BANK_ACCESS` and `BALANCE` to support account selection.
- Mutation changes: keep staff adjustments on existing commands or `WITHDRAW`.
- Cache / reload changes: refresh balance and ledger after any action.
- Avoid: reusing the member-self route for staff balance work.

## Route And Navigation

- Linked from: `/economy/ledger`, `/economy/grant-requests`, `/server/setup`.
- Links to: `/economy/ledger`, `/economy/manage-escrow`, `/members/deposits` when staff need to compare member-self vs. staff views.
- Header / nav actions: account switch, ledger link, escrow link.
- Preserved context: selected account.

## Permissions And Context

- Auth and scope requirements: selected guild and banking visibility.
- Role gates: mutations stay econ or gov only.
- Setup dependency / recovery: missing banking setup should link back into `/server/settings`.
- Delegation / inherited context: banking policy may be inherited even when balances are guild-scoped.

## Commands And Mutations

- Existing commands: `bank deposit`, `deposits add`, `deposits addsheet`, plus linked correction actions in escrow or ledger flows.
- Preview / confirm: transfers and adjustments should confirm account scope and resources.
- Permission checks: bank access and command permission checks.
- Side effects / cache refresh: refresh account balance and linked records.

## Open Questions And Backend Gaps

- Add explicit account rows to `BANK_ACCESS`.
- Add account-scoped `BALANCE` reads with available vs. blocked buckets.

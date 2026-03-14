# Deposits

- Classification: `route`
- Status: `New`
- Primary route or owner: `/members/deposits`
- Nav group: `Members`
- Primary actor: `member-self`
- Scope: `current nation`
- Current code:
  - `src/pages/balance/index.tsx`
  - `src/appRoutes.ts`
- Read substrate:
  - Endpoints: `BALANCE`, `BANK_ACCESS`
  - Response types: `WebBalance`, `WebBankAccess`
  - Table / graph / placeholder types: none required for the first route
  - Required columns / filters: total, breakdown, accessible accounts, no-access message
- Write substrate:
  - Endpoints / command families: optional handoff to `WITHDRAW` and related command fallback
  - Existing form / action components: current balance summary UI and route actions
  - Reload / invalidation targets: current nation balance and linked ledger context

## Why It Exists

- Owns: member-self balance viewing, including both total and breakdown in one place.
- Does not own: staff account management or escrow correction workflows.
- Current gap: the previous docs split holdings and deposits incorrectly instead of treating the member view as one deposits surface.

## Workflows

1. Review personal deposits
   - Entry: `/members/deposits` or `Member Overview`
   - Preconditions: selected guild and current nation context
   - Reads: `BALANCE`, `BANK_ACCESS`
   - UI path: show total and breakdown together, then branch into recent records or withdraw actions
   - Mutations: optional withdrawal handoff only
   - Handoff / exit: into `Escrow`, `Ledger`, or a withdraw flow

## Layout Structure

- Top-level regions: total summary, balance breakdown, linked actions.
- Tabs / panels / drawers: no split between holdings and deposits; the first page shows both total and breakdown together.
- URL state: optional category focus only.
- Empty / loading / error states: use `no_access_msg` when the user lacks access.

## Information Model

- Primary objects shown: total balance, breakdown by note/category, access context.
- Filters / grouping: optional category focus.
- Row or card actions: open escrow view, open ledger, open withdrawal flow.
- Detail / modal surfaces: not required for MVP.

## Components

- Reuse: current balance summary components and route actions.
- Add: `MemberDepositSummary`, `DepositBreakdownList`, `DepositQuickActions`.
- Extend: current balance page to reflect member-self naming and route ownership.
- Merge: keep total and breakdown on one page.

## Implementation Delta

- Route changes: replace the old holdings-vs-deposits split with `/members/deposits`.
- Read model changes: none required for the first member route.
- Mutation changes: keep mutations as linked actions rather than embedding staff tools here.
- Cache / reload changes: refresh the current nation balance after related actions.
- Avoid: building a separate holdings page for the same member balance data.

## Route And Navigation

- Linked from: `/home/member-overview`, `/economy/grant-requests`.
- Links to: `/members/escrow`, `/economy/ledger`.
- Header / nav actions: escrow and ledger handoffs.
- Preserved context: current nation and selected balance category.

## Permissions And Context

- Auth and scope requirements: login, selected guild, current nation context.
- Role gates: member-self surface.
- Setup dependency / recovery: missing bank access should link to support or settings-repair paths, not expose staff tools.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: no primary command surface; link to withdraw or raw command fallback only when needed.
- Preview / confirm: any mutation should happen in the destination flow.
- Permission checks: driven by current bank access.
- Side effects / cache refresh: refresh balance after linked actions.

## Open Questions And Backend Gaps

- A richer member-self account list depends on expanded `BANK_ACCESS` rows.

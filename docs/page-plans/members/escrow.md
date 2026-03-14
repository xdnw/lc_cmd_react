# Escrow

- Classification: `route`
- Status: `New`
- Primary route or owner: `/members/escrow`
- Nav group: `Members`
- Primary actor: `member-self`
- Scope: `current nation`
- Current code:
  - no dedicated route yet
  - member-self context currently falls back to balance and records views
- Read substrate:
  - Endpoints: future account-scoped `BALANCE`, typed `RECORDS`
  - Response types: blocked-balance buckets and typed record rows
  - Table / graph / placeholder types: none required yet
  - Required columns / filters: escrow, expired, ignored, note/category, recent affected rows
- Write substrate:
  - Endpoints / command families: none for member-self MVP
  - Existing form / action components: read-only handoff into support or staff pages
  - Reload / invalidation targets: current nation blocked-balance view

## Why It Exists

- Owns: member-self visibility into blocked or delayed funds.
- Does not own: staff correction flows.
- Current gap: members need to understand why some funds are unavailable without being dropped into staff-only ledger or correction tools.

## Workflows

1. Review blocked funds
   - Entry: `/members/escrow` or a handoff from `Deposits`
   - Preconditions: selected guild and current nation context
   - Reads: future blocked-balance buckets plus recent affected rows
   - UI path: inspect what is escrowed, expired, or ignored and why
   - Mutations: none
   - Handoff / exit: back to `Deposits` or into support links when staff help is required

## Layout Structure

- Top-level regions: blocked-balance summary, recent affected rows, explanation panel.
- Tabs / panels / drawers: `Escrow`, `Expired`, `Ignored`.
- URL state: selected blocked-balance tab.
- Empty / loading / error states: explain when the route is waiting on richer backend output.

## Information Model

- Primary objects shown: blocked buckets, note/category, recent rows, explanatory text.
- Filters / grouping: blocked-balance type.
- Row or card actions: inspect recent row, open ledger if permitted, ask staff for help.
- Detail / modal surfaces: optional read-only record detail.

## Components

- Reuse: member-self balance cards and linked-record previews.
- Add: `MemberEscrowSummary`, `BlockedBalanceTabs`, `EscrowExplanationPanel`.
- Extend: `Deposits` so it can hand off into this route.
- Merge: keep blocked-balance explanation separate from staff correction tools.

## Implementation Delta

- Route changes: add `/members/escrow`.
- Read model changes: depends on richer blocked-balance output.
- Mutation changes: none for MVP.
- Cache / reload changes: refresh current nation blocked-balance state when related balance reads change.
- Avoid: exposing staff-only correction actions to members.

## Route And Navigation

- Linked from: `/members/deposits`, `Member Overview`.
- Links to: `/members/deposits`, `/economy/ledger` where permitted.
- Header / nav actions: back to deposits and support links.
- Preserved context: current nation and blocked-balance tab.

## Permissions And Context

- Auth and scope requirements: login, selected guild, current nation context.
- Role gates: member-self only.
- Setup dependency / recovery: not a setup page.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: none owned here.
- Preview / confirm: not applicable.
- Permission checks: any linked ledger access should still respect route-level permissions.
- Side effects / cache refresh: none beyond reloading the blocked-balance view.

## Open Questions And Backend Gaps

- Member-self blocked-balance visibility depends on account-scoped `BALANCE` and typed `RECORDS` output.

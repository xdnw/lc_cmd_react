# Audits

- Classification: `route`
- Status: `New`
- Primary route or owner: `/members/audits`
- Nav group: `Members`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - `src/lib/endpoints.ts` exposes `MY_AUDITS` for the current nation only
  - command metadata for `audit run`, `audit sheet`, and audit-related interview flows
- Read substrate:
  - Endpoints: `MY_AUDITS`, `TABLE`, future audit queue or summary read if needed later
  - Response types: `WebAudits`, `WebTable`
  - Table / graph / placeholder types: member tables plus audit command output
  - Required columns / filters: nation list, audit severity, audit type, stale vs. active findings
- Write substrate:
  - Endpoints / command families: `COMMAND`, `audit run`, `audit sheet`, linked interview or role-repair commands
  - Existing form / action components: command-backed forms and table links
  - Reload / invalidation targets: audit results and linked member tables

## Why It Exists

- Owns: staff review of audit issues across many members, with fast actions or table handoffs.
- Does not own: only the current viewer's audit summary, which already exists in `Member Overview`.
- Current gap: there is no dedicated page for queue-like audit review even though the audit commands are already real.

## Workflows

1. Review audits across members
   - Entry: `/members/audits`
   - Preconditions: selected guild and IA-style visibility
   - Reads: audit command output plus member tables
   - UI path: review severity-grouped audit findings, then branch into action or deeper member context
   - Mutations: none initially
   - Handoff / exit: into interviews, roles, or raw command fallback
2. Run or refresh audits
   - Entry: selected member set or saved filter
   - Preconditions: audit command permission
   - Reads: current member scope and prior findings
   - UI path: trigger audit run or sheet generation from the page shell
   - Mutations: `audit run`, `audit sheet`
   - Handoff / exit: refresh findings and open related actions

## Layout Structure

- Top-level regions: audit summary, severity groups, member detail or action rail.
- Tabs / panels / drawers: `Open Issues`, `Warnings`, `Recent Runs`.
- URL state: selected severity or member filter.
- Empty / loading / error states: if only command output exists, say so explicitly.

## Information Model

- Primary objects shown: member, audit type, severity, description, related workflow links.
- Filters / grouping: severity, audit type, alliance scope, member search.
- Row or card actions: open member context, rerun audit, open interview or role repair, open table view.
- Detail / modal surfaces: member drawer or audit detail panel.

## Components

- Reuse: table patterns, dialogs, command-backed forms.
- Add: `AuditSummaryStrip`, `AuditSeverityGroup`, `AuditActionRail`, `AuditMemberDrawer`.
- Extend: `Member Overview` so it can deep-link into the broader audit page.
- Merge: keep multi-member audit review in one place instead of scattering it across member overview cards.

## Implementation Delta

- Route changes: add `/members/audits`.
- Read model changes: command-backed at first; add a richer audit read only if review UX demands it.
- Mutation changes: keep audits command-backed.
- Cache / reload changes: refresh current findings after audit runs.
- Avoid: pretending `MY_AUDITS` is already a staff-wide audit queue.

## Route And Navigation

- Linked from: `/home/member-overview`, `/members/interviews`.
- Links to: `/members/interviews`, `/server/roles`, `/reports/tables`.
- Header / nav actions: run audit and open related member-table views.
- Preserved context: selected severity and member filters.

## Permissions And Context

- Auth and scope requirements: selected guild and IA-style visibility.
- Role gates: audit runs and repair actions are staff-only.
- Setup dependency / recovery: not a setup page.
- Delegation / inherited context: not primary here.

## Commands And Mutations

- Existing commands: `audit run`, `audit sheet`.
- Preview / confirm: large audit runs should confirm scope before submit.
- Permission checks: IA or audit permissions.
- Side effects / cache refresh: refresh findings after a run.

## Open Questions And Backend Gaps

- A unified staff audit read may help later, but command-backed review is enough to start.

# Multi Investigation

- Status: `Evolve`
- Primary route: `/reports/multi`
- Legacy aliases: `/multi/:nation`, `/multi_v2/:nation?`
- Nav group: Reports
- Primary users: IA, moderators, and staff investigating shared-network behavior
- Current references: `src/pages/a2/nation/multi_2.tsx`, `src/pages/a2/nation/multi.tsx`

## Why It Exists

- The newer multi page already shows a good pattern: selected subject, explanatory notes, and a dense result table.
- This should stay a specialist investigative page rather than a generic landing card.

## Workflows

- Primary: select a nation, run or refresh the report, inspect overlap signals, and compare linked nations.
- Secondary: share investigation context and jump into related nation or alliance pages.
- Why users arrive here: moderation checks, IA investigation, suspicious overlap review.

## Layout and Look

- Keep the subject selector and explanation block at the top.
- Main result area should stay dense and table-forward.
- Add a small case-summary strip and more obvious update-state messaging, but do not over-design it.

## Information and Interactions

- Show selected nation summary, report freshness, and known caveats.
- Main table: shared IPs, overlap percentages, same-IP hints, login deltas, activity overlap, Discord linkage, IRL verification, customization.
- Support refresh or force-update when data is stale.
- Let users jump from rows into nation or alliance pages quickly.

## Components

- Existing shared: `EndpointWrapper`, `ArgInput`, `TableWith2DData`, explanatory collapsible block.
- New shared or page-specific: `InvestigationSummaryStrip`, `CaseNotesPanel`, `FreshnessBadge`.

## Data and Endpoints

- Existing endpoints: `MULTI_V2`, `MULTI_BUSTER`.
- Existing table / graph / placeholder substrate: current result table already fits the use case.
- New endpoints likely needed: none for MVP; shared case annotations or saved investigations would need persistence later.

## Command Bindings

- Existing commands: none are the core here; this page is already web-native and endpoint-backed.
- Commands likely needing changes: none.
- Command preview / confirmation rules: no mutating actions required for MVP.

## Navigation

- Links to: nation pages, alliance profile pages, related report views.
- Linked from: command launcher, moderation workflows, Home landing public tool cards.

## Permissions and Context

- Depends on whether multi data is intended to be public or staff-only; route visibility should reflect actual policy.
- Refresh actions may require elevated permission if they are expensive.

## Risks and Open Questions

- Need a clear policy on who can see sensitive overlap data.
- The page should explain uncertainty and false positives, not just show raw percentages.
- Saved case notes would be useful, but they are a separate persistence concern.

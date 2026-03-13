# Counters

- Status: `New`
- Primary route: `/war/counters`
- Legacy aliases: none; current flow is command-only
- Nav group: War
- Primary users: milcom and staff assigning counter hits
- Current references: conflict action patterns in `src/pages/a2/conflict/conflicts.tsx`, command metadata for `war counter *`

## Why It Exists

- Countering is a coordination workflow with selection, comparison, and communication steps.
- Users need to see candidate attackers, not just receive a raw command output.

## Workflows

- Primary: plan counters for one enemy nation or war.
- Secondary: auto-generate candidate sets, sheet-based review, and flow directly into war-room creation.
- Why users arrive here: defensive war response, counter training, planned retaliation work.
- Upstream entry points: `Targets`, conflict workflows, command fallback.
- Downstream hand-offs: `War Rooms`, `War Sheets`, and economy follow-up for warchests or reimbursements.

## Layout and Look

- Modes: `Single Target`, `War URL`, `Auto`, `Sheet`.
- Top: enemy selection and policy toggles.
- Center: candidate attacker table with comparison metrics.
- Right: selected plan summary with send actions.
- The look should feel tactical and comparative, not like a wizard-only page.

## Information and Interactions

- Filters: allow max offensives, filter weak attackers, online only, require Discord, allow same alliance, include inactive, include non-members.
- Comparison columns: cities, score, activity, offensive slots, strength proxies, Discord status, fit score.
- Selection: pick attackers manually, accept auto picks, or open batch generation.
- Finalization: hand selected attackers into war-room creation or mail / ping actions.
- Keep member responsiveness and uncertainty visible. A candidate should not look "good" only because the math says so.
- Show nearby warchest or funding shortcuts when counter execution is blocked by missing resources.

## Components

- Existing shared: table patterns from conflicts, dialogs, command preview helpers.
- New shared or page-specific: `CounterCandidateTable`, `CounterPlanPanel`, `CounterFilterBar`, `CounterStrengthMiniCharts`, `CounterActionPreview`.

## Data and Endpoints

- Existing endpoints: none dedicated to counter planning results.
- Existing table / graph / placeholder substrate: `TABLE` and strength graphs can support context, but not the actual counter candidate computation.
- New endpoints likely needed: dedicated read endpoints for `war counter nation`, `war counter url`, `war counter auto`, and maybe sheet preview are likely needed for a first-class page.

## Command Bindings

- Existing commands: `war counter nation`, `war counter url`, `war counter auto`, `war counter sheet`, `war counter stats`, plus hand-off into `war room create`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: when the page is about to ping, mail, or open rooms, show the selected enemy, attackers, and resulting command string first.

## Navigation

- Links to: `/war/targets`, `/war/rooms`, `/war/sheets`, relevant nation or alliance report pages.
- Linked from: target drawer quick actions, milcom flows, command launcher.

## Permissions and Context

- Requires login, selected guild, and war-management permissions.
- Selection defaults should respect guild alliance scope.

## Risks and Open Questions

- Without JSON endpoints this page will be stuck rendering command output rather than a usable planner.
- Need to avoid over-trusting automated recommendations when member responsiveness matters.
- A counter page should make policy and uncertainty visible, not hide them behind a single button.

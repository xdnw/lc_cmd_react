# Blitz

- Classification: `route`
- Status: `New`
- Primary route or owner: `/war/blitz`
- Nav group: `War`
- Primary actor: `staff`
- Scope: `guild + alliance`
- Current code:
  - no dedicated route yet
  - command metadata for `war sheet blitzsheet`, `war sheet validate`, `war room from_sheet`
- Read substrate:
  - Endpoints: future structured `war sheet` JSON outputs for `blitzsheet` and `validate`
  - Response types: row-level blitz assignments, validation results, warnings, and costs
  - Table / graph / placeholder types: blitz rows and validation rows
  - Required columns / filters: attacker, defender, slot fit, warnings, validation state
- Write substrate:
  - Endpoints / command families: `COMMAND`, `war sheet blitzsheet`, `war sheet validate`, `war room from_sheet`
  - Existing form / action components: command-backed sheet generation and room-creation handoffs
  - Reload / invalidation targets: blitz preview, validation rows, related war-room actions

## Why It Exists

- Owns: generating, validating, and operationalizing blitz plans.
- Does not own: the general war-sheet report studio or room inventory.
- Current gap: the workflow is important, but it still relies on export-style command output instead of structured rows.

## Workflows

1. Generate a blitz plan
   - Entry: `/war/blitz`
   - Preconditions: attacker and defender scopes known
   - Reads: future structured output from `war sheet blitzsheet`
   - UI path: configure plan inputs, preview generated rows, inspect warnings
   - Mutations: command-backed generation only
   - Handoff / exit: into validation or war-room creation
2. Validate and operationalize the plan
   - Entry: generated blitz preview
   - Preconditions: preview rows available
   - Reads: future `war sheet validate` structured output
   - UI path: inspect blocked rows or warnings, then create war rooms from the validated sheet
   - Mutations: `war room from_sheet`
   - Handoff / exit: into `War Rooms`

## Layout Structure

- Top-level regions: blitz input form, plan preview table, validation results, war-room handoff rail.
- Tabs / panels / drawers: `Plan`, `Validate`, `Room Creation`.
- URL state: current plan parameters and selected sheet context.
- Empty / loading / error states: be explicit when only raw command output is available.

## Information Model

- Primary objects shown: attacker/defender rows, target fit, warnings, validation errors, war-room handoff context.
- Filters / grouping: attacker, defender, validation status.
- Row or card actions: inspect row, validate, create rooms, export.
- Detail / modal surfaces: row detail and room-creation confirmation.

## Components

- Reuse: war-sheet form patterns, dialogs, command fallback links.
- Add: `BlitzPlanForm`, `BlitzPreviewTable`, `BlitzValidationPanel`, `BlitzRoomCreationRail`.
- Extend: `War Sheets` and `War Rooms` so they can hand off into this route with context.
- Merge: keep generation, validation, and room creation in one war-ops route.

## Implementation Delta

- Route changes: add `/war/blitz`.
- Read model changes: add structured `war sheet` JSON for blitz and validation outputs.
- Mutation changes: keep room creation command-backed.
- Cache / reload changes: refresh preview and validation reads after re-running the plan.
- Avoid: building the page around opaque export text.

## Route And Navigation

- Linked from: `/war/sheets`, `/war/targets`, `/war/militarization`.
- Links to: `/war/rooms`, `/war/sheets`.
- Header / nav actions: validate and create rooms.
- Preserved context: current plan parameters and selected sheet.

## Permissions And Context

- Auth and scope requirements: war staff route.
- Role gates: room-creation actions stay staff-only.
- Setup dependency / recovery: missing room categories or war-role setup should link back into server admin pages.
- Delegation / inherited context: war-room policy can still be inherited from settings.

## Commands And Mutations

- Existing commands: `war sheet blitzsheet`, `war sheet validate`, `war room from_sheet`.
- Preview / confirm: room creation must preview Discord-side effects before submit.
- Permission checks: war and room-management permissions.
- Side effects / cache refresh: refresh validation and room handoff state.

## Open Questions And Backend Gaps

- Add structured `war sheet` outputs for blitz preview and validation rows.
- Add room-create preview rows if `war room from_sheet` needs Discord-side-effect confirmation.

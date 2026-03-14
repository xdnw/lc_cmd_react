<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# War Sheets

- Status: `Wrap`
- Primary route: `/war/sheets`
- Legacy aliases: none; current flow is command and spreadsheet driven
- Nav group: War
- Primary users: milcom and staff building blitzes, validating assignments, and reviewing war costs
- Current references: `src/pages/command/index.tsx`, `src/pages/custom_table/TablePage.tsx`, command metadata for `war sheet *`, and current graph endpoints for war-cost and tier context

## Why It Exists

- Sheets are still valuable, but the browser should be the planning board that generates and validates them.
- Users should not have to memorize half a dozen export-style commands to move from targeting to execution.
- Today this is mostly a command-and-export workflow with strong supporting graphs; the browser page should wrap that honestly until structured previews exist.

## Workflows

- Primary: generate blitz sheets, validate sheets, create raid sheets, review active war sheets, review cost / reimbursement outputs.
- Secondary: launch batch war-room creation from a prepared sheet.
- Why users arrive here: blitz prep, ongoing war review, post-war reimbursements, export workflows.
- Upstream entry points: `Targets`, `Counters`, command fallback.
- Downstream hand-offs: `War Rooms`, `Reports`, and economy reimbursement or ledger follow-up.

## Layout and Look

- Tabs: `Blitz`, `Validate`, `Active Wars`, `Costs`, `Exports`.
- The page should feel like a planning surface with preview tables and warnings, not like a plain file generator.
- Keep room for sheet URL inputs, preview tables, and validation results.

## Information and Interactions

- Blitz: attacker and defender sources, slot constraints, activity assumptions, easy-target limits, sheet output.
- Validate: input sheet, validate structure and assignments, show warnings and failed rows.
- Active Wars: generate and inspect current war-state sheets for selected sides.
- Costs: cost by war type, resource, nation, and reimbursement mode with summary cards.
- The page should make it obvious when a sheet is a planning artifact versus a live operational export.

## Components

- Existing shared: graph components, table components, command-backed forms, dialog helpers.
- New shared or page-specific: `SheetSourcePicker`, `SheetPreviewTable`, `ValidationResultsPanel`, `WarCostSummary`, `ExportActionsBar`.

## Data and Endpoints

- Existing endpoints: supporting graph endpoints like `WARSCOSTRANKINGBYDAY`, `WARCOSTSBYDAY`, `WARATTACKSBYDAY`, `STRENGTHTIERGRAPH`, `CITYTIERGRAPH`, plus `COMMAND`.
- Existing table / graph / placeholder substrate: strong supporting context exists, but sheet preview, validation, and cost outputs are still command-generated rather than exposed as structured rows.
- Current backend gap: `war sheet validate` needs row-level validation JSON with row number, status, and messages.
- Current backend gap: `war sheet blitzsheet` and `war sheet raid` need assignment-preview rows and warnings if those tabs render native tables.
- Current backend gap: `war sheet costsheet`, `war sheet costbyresource`, and `war sheet reimbursebynation` need typed rows only for the cost tabs the page actually renders.
- Not current: a separate `war sheet` endpoint family; the missing work is structured output on the existing commands.

## Command Bindings

- Existing commands: `war sheet blitzsheet`, `war sheet validate`, `war sheet raid`, `war sheet warsheet`, `war sheet costsheet`, `war sheet costbyresource`, `war sheet reimbursebynation`, and related `war room from_sheet` hand-off.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: all export or create actions should show the command, destination sheet info, and a summary of assumptions before run.

## Navigation

- Links to: `/war/targets`, `/war/counters`, `/war/rooms`, relevant graph views.
- Linked from: counter planner, room batch-create flow, command launcher.

## Permissions and Context

- Requires login and selected guild for guild-scoped planning.
- Some cost and war-state views may still be useful publicly with stripped actions.

## Risks and Open Questions

- The page cannot just become a list of "generate sheet" buttons.
- Need clear handling for long-running sheet generation jobs and external spreadsheet links.
- Validation output needs to be understandable by humans, not just echo backend errors.
- Until preview and validation data is structured, this route should be explicit about wrapping exports rather than pretending to own the sheet engine.

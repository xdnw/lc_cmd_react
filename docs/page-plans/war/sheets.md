# War Sheets

- Status: `New`
- Primary route: `/war/sheets`
- Legacy aliases: none; current flow is command and spreadsheet driven
- Nav group: War
- Primary users: milcom and staff building blitzes, validating assignments, and reviewing war costs
- Current references: command metadata for `war sheet *`, current graph endpoints for war-cost and tier context

## Why It Exists

- Sheets are still valuable, but the browser should be the planning board that generates and validates them.
- Users should not have to memorize half a dozen export-style commands to move from targeting to execution.

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

- Existing endpoints: supporting graph endpoints like `WARSCOSTRANKINGBYDAY`, `WARCOSTSBYDAY`, `WARATTACKSBYDAY`, `STRENGTHTIERGRAPH`, `CITYTIERGRAPH`.
- Existing table / graph / placeholder substrate: strong supporting context exists, but web-native JSON for sheet generation and validation does not.
- New endpoints likely needed: read endpoints for blitz preview, validation results, warsheet preview, and cost outputs would make this page genuinely useful.

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

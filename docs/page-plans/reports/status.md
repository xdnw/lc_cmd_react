# Status

- Status: `Evolve`
- Primary route: `/reports/status`
- Legacy aliases: `/status`
- Nav group: Reports
- Primary users: admins, staff, and power users checking app and bot health
- Current references: `src/pages/a2/admin/status.tsx`

## Why It Exists

- The current status page is already a strong task-health dashboard.
- It should stay visible and useful without being buried as an obscure admin route.

## Workflows

- Primary: check overall health, inspect stale or stuck tasks, and open task details.
- Secondary: correlate status with user-facing issues and route into follow-up actions.
- Why users arrive here: troubleshooting, health checks, incident review.

## Layout and Look

- Keep the dashboard feel with health chips, countdown bars, and task list.
- Add slightly clearer summary blocks for stale, error, interrupted, and stuck states.
- Avoid turning it into a marketing uptime page; this is an operator surface.

## Information and Interactions

- Show overall health summary, task counts by health, refresh timing, and sortable task list.
- Let users open task detail history, error samples, and last-run timing.
- Support filtering by health state and quick-jump to the worst tasks first.

## Components

- Existing shared: `EndpointWrapper`, cards, countdown bar, virtualized task list, health badges.
- New shared or page-specific: `TaskHealthFilters`, `IncidentSummaryStrip`, `TaskHistoryDrawer`.

## Data and Endpoints

- Existing endpoints: `LOCUTUS_TASKS`, `LOCUTUS_TASK`.
- Existing table / graph / placeholder substrate: current endpoint-backed implementation is already appropriate.
- New endpoints likely needed: none for MVP.

## Command Bindings

- Existing commands: this page is primarily read-only; it can link to relevant admin sync commands when appropriate.
- Commands likely needing changes: none required.
- Command preview / confirmation rules: if later admin actions are added, they should be clearly separated from the read-only dashboard.

## Navigation

- Links to: command runner for admin commands, relevant report pages, and incident documentation if added later.
- Linked from: Home landing, Reports nav, troubleshooting links.

## Permissions and Context

- Some health detail can remain public or semi-public, but sensitive error detail should respect current admin visibility rules.

## Risks and Open Questions

- Keep the distinction between public-safe health info and admin-only diagnostics clear.
- Do not overcomplicate a page that is already pretty good.
- If incident history is ever added, keep it separate from the live task board.

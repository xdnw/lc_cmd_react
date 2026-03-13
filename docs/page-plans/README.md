# Page Plan Index

This folder turns the frontend direction into page-by-page implementation briefs.

`docs/page-plans/*` is the source of truth for frontend planning. `docs/frontend_plan.md` is obsolete and should only be kept as a tombstone for old links.

## User-Facing Navigation

Use labels that match what users already recognize in alliance life:

- `Home`
- `Economy`
- `War`
- `Members`
- `Server`
- `Reports`
- `Commands`

Why these labels:

- They map to jobs users already talk about in Discord and guides.
- They avoid abstract buckets like "Operations" or "Automation" that force users to guess.
- They separate personal/member workflows, staff workflows, and analyst workflows without hiding the command system.

Canonical rule:

- Use these labels in visible navigation, page titles, and route discussions.
- Internal implementation groupings can exist in code, but they should not leak into the user-facing information architecture.

## Workflow Map

These briefs should optimize for the actual jobs people are doing, not just backend command families:

- `Enter Workspace`: login, choose guild, confirm readiness, then land in `Home` or `Server` setup.
- `Member Daily Loop`: open `Home`, check announcements, audits, holdings, raids, wars, and personal alert or tax issues.
- `Economy Operations`: move between `Holdings`, `Deposits`, `Ledger`, `Grant Requests`, `Grant Send`, `Grant Templates`, and `Tax` as one connected workflow.
- `War Operations`: move from `Targets` to `Counters`, `Sheets`, and `Rooms`, then back into economy or reporting surfaces for costs and reimbursements.
- `Member Lifecycle`: move from `Recruitment` to `Interviews`, then into roles, channels, training, audits, and archive or graduation actions.
- `Server Setup`: move from guild selection into a readiness checklist, then into `Settings` and command-wrapped `Roles`, `Channels`, `Menus`, and `Embeds` flows as needed.
- `Reports And Commands`: use `Reports` for recurring analysis and saved workbenches; use `Commands` for long-tail, advanced, or fallback flows.

## Context Model

- `Guild` is the global workspace boundary.
- `Alliance` scope is often task-specific and can be one, many, or all alliances registered to the guild.
- `Current nation` is the default personal scope for member tasks and a shortcut elsewhere.

See `docs/page-plans/core/context-and-scoping.md` for the full rule set.

## Implementation Modes

These briefs should state which substrate a page is really built on today:

- `Endpoint-native`: use dedicated endpoints when the app already has a stable page-level read model.
- `Settings-backed`: use `TABLE` plus `GuildSetting` placeholders when the workflow is mostly browsing or editing guild settings. `Server Settings` is the anchor example.
- `Command-wrapped`: use the command browser or runner plus the `COMMAND` endpoint when the workflow mostly mutates Discord or bot state and does not yet have dedicated read endpoints.

Planning rule:

- Do not invent a fake local CRUD model when `GuildSetting` rows or guided command execution already cover the workflow.
- Do propose new endpoints when a page truly needs a stable list, detail, diff, or preview model that command output cannot support cleanly.

## Status Legend

- `Evolve`: keep the current route/page, but reshape it significantly.
- `New`: add a new primary route and page.
- `Wrap`: keep the existing power-user surface and add shell, presets, previews, or saved-state affordances around it. This is the default for command-heavy pages that do not yet have dedicated read endpoints.
- `Cross-cutting`: affects multiple pages rather than one route.

## Brief Structure

Each page brief uses the same headings:

- `Why It Exists`
- `Workflows`
- `Layout and Look`
- `Information and Interactions`
- `Components`
- `Data and Endpoints`
- `Command Bindings`
- `Navigation`
- `Permissions and Context`
- `Risks and Open Questions`

See `docs/page-plans/_template.md` for the blank template.

## Legacy Route Rule

Do not hard-break the existing route surface while this work lands. New primary pages can sit beside legacy routes, but these existing paths should keep working as aliases, redirects, or advanced-entry routes:

- `/guild_member`
- `/announcements`
- `/announcement/:id`
- `/balance`
- `/records`
- `/settings`
- `/custom_table`
- `/edit_graph`
- `/raid`
- `/conflicts`
- `/alliance/:alliance`
- `/multi_v2/:nation?`

## File Index

### Core

- `docs/page-plans/core/app-shell.md`
- `docs/page-plans/core/backend-endpoint-gaps.md`
- `docs/page-plans/core/context-and-scoping.md`
- `docs/page-plans/core/guild-select.md`
- `docs/page-plans/core/shared-layouts-and-components.md`
- `docs/page-plans/core/workflow-map.md`

### Home

- `docs/page-plans/home/home.md`
- `docs/page-plans/home/member-overview.md`
- `docs/page-plans/home/announcements.md`

### Economy

- `docs/page-plans/economy/deposits.md`
- `docs/page-plans/economy/holdings.md`
- `docs/page-plans/economy/ledger.md`
- `docs/page-plans/economy/grant-requests.md`
- `docs/page-plans/economy/grant-send.md`
- `docs/page-plans/economy/grant-templates.md`
- `docs/page-plans/economy/tax.md`
- `docs/page-plans/economy/trade.md`

### War

- `docs/page-plans/war/targets.md`
- `docs/page-plans/war/counters.md`
- `docs/page-plans/war/rooms.md`
- `docs/page-plans/war/sheets.md`

### Members

- `docs/page-plans/members/interviews.md`
- `docs/page-plans/members/recruitment.md`

### Server

- `docs/page-plans/server/setup.md`
- `docs/page-plans/server/settings.md`
- `docs/page-plans/server/roles.md`
- `docs/page-plans/server/channels.md`
- `docs/page-plans/server/menus.md`
- `docs/page-plans/server/embeds.md`

### Reports

- `docs/page-plans/reports/tables.md`
- `docs/page-plans/reports/graphs.md`
- `docs/page-plans/reports/conflicts.md`
- `docs/page-plans/reports/alliance-profile.md`
- `docs/page-plans/reports/multi-investigation.md`
- `docs/page-plans/reports/status.md`

### Commands

- `docs/page-plans/commands/browser.md`
- `docs/page-plans/commands/runner.md`

## Suggested Delivery Order

1. `core/app-shell.md`
2. `core/context-and-scoping.md`
3. `core/workflow-map.md`
4. `core/guild-select.md`
5. `server/setup.md`
6. `server/settings.md`
7. `home/member-overview.md`
8. `economy/holdings.md`
9. `economy/deposits.md`
10. `economy/grant-requests.md`
11. `economy/grant-send.md`
12. `war/targets.md`
13. `war/counters.md`
14. `members/interviews.md`
15. `server/menus.md`
16. `reports/tables.md`

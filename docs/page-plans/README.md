# Page Plan Index

This folder turns the frontend direction into page-by-page implementation briefs.

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

## Status Legend

- `Evolve`: keep the current route/page, but reshape it significantly.
- `New`: add a new primary route and page.
- `Wrap`: keep the existing power-user surface and add shell, presets, or saved-state affordances around it.
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
- `docs/page-plans/core/guild-select.md`

### Home

- `docs/page-plans/home/home.md`
- `docs/page-plans/home/member-overview.md`
- `docs/page-plans/home/announcements.md`

### Economy

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
2. `core/guild-select.md`
3. `home/member-overview.md`
4. `economy/grant-requests.md`
5. `economy/grant-send.md`
6. `war/targets.md`
7. `war/counters.md`
8. `economy/ledger.md`
9. `members/interviews.md`
10. `server/menus.md`
11. `reports/tables.md`

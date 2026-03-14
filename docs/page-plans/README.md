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

- `Classification`
- `Status`
- `Primary route or owner`
- `Nav group`
- `Primary actor`
- `Scope`
- `Current code`
- `Read substrate`
- `Write substrate`
- `Why It Exists`
- `Workflows`
- `Layout Structure`
- `Information Model`
- `Components`
- `Implementation Delta`
- `Route And Navigation`
- `Permissions And Context`
- `Commands And Mutations`
- `Open Questions And Backend Gaps`

See `docs/page-plans/_template.md` for the blank template.

Authoring rules:

- Keep each bullet implementation-specific. Prefer exact file paths, route paths, endpoint names, response types, placeholder types, command families, and setting keys.
- `Why It Exists` must stay factual: what the surface owns, what it does not own, and the concrete gap in the current implementation.
- `Workflows` should be numbered flows. Each flow should name entry point, reads, UI path, mutation path, and handoff.
- `Read substrate` should name the contract, not hook boilerplate. Include endpoint names, response types, table or graph types, placeholder types, and required columns or filters. Do not restate `useQuery(bulkQueryOptions(...))` in each brief.
- `Layout Structure` is for regions, tabs, drawers, URL state, and empty or error behavior. Do not fill it with visual direction or marketing language.
- `Components` should use `Reuse`, `Add`, `Extend`, and `Merge` so the brief says what happens to actual code instead of describing abstract UI.
- If a section cannot name current code or a concrete proposed contract, leave it short or mark it as an open question instead of inventing behavior.

## Legacy Route Rule

Do not hard-break the existing route surface while this work lands. New primary pages can sit beside legacy routes, but these existing paths should keep working as aliases, redirects, or advanced-entry routes:
(note: These files should be moved into the correct folder so it's all organized cleanly. I dont want to keep backwards compatibility in routes, so remove that requirement above. THey should still HAVE a route, but it doesn't need to maintain two routes)

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
(note: The below needs fixing, the main thing is mixing member stuff with gov stuff. Members need info/management of themselves. Gov need tools to view broader and manage broader. This just lumps it all together without much sense.)
(note: On the .md files themselves, lots of them have vague language that is rather meaningless or nonsensical, im not sure what the fix is, since telling you this, you just strip out useful info too, you have no ability to actually tell what of what you wrote is garbage, so i'm not sure how to salvage any of this, if at all.)

### Core
(note: I made some changes to merge navar and sidebar and session stuff, so these docs might be outdated.)
- `docs/page-plans/core/app-shell.md`
- `docs/page-plans/core/backend-endpoint-gaps.md`
- `docs/page-plans/core/context-and-scoping.md`
- `docs/page-plans/core/guild-select.md`
- `docs/page-plans/core/shared-layouts-and-components.md`
- `docs/page-plans/core/workflow-map.md`

### Home
- `docs/page-plans/home/home.md`

### Econ
- `docs/page-plans/economy/deposits.md` (need to fix this and holdings)
- `docs/page-plans/economy/holdings.md` (need to fix this and holdings)
(note for the above, holdings and deposits should not be two pages. You hallucinated things there. A nation will have their deposits. Nations viewing their balance should see both the breakdown and the total. No idea why you made two separate things for this. Remove them. There should be `deposits` and `escrow` if you want there to be two pages. Secondly, this should go under members, not econ, since its not a gov management thing)
- `docs/page-plans/economy/manage_balance.md` - Need to add: Display and manage balances. 
- `docs/page-plans/economy/manage_escrow.md` - Need to add: Display and manage escrow
- `docs/page-plans/economy/ledger.md` (note: There's like several different records people will be viewing, so im not sure this makes much sense, but tl;dr there are taxes, deposits/withdrawals, offshore balance (the alliance has) and then search tools to list records between entiries)
- `docs/page-plans/economy/grant-templates.md`
- `docs/page-plans/economy/grant-requests.md`
- `docs/page-plans/economy/grant-send.md`
- `docs/page-plans/economy/tax.md`
- `docs/page-plans/economy/trade.md`

### Milcom
- `docs/page-plans/war/targets.md`
- `docs/page-plans/war/counters.md`
- `docs/page-plans/war/rooms.md`
- `docs/page-plans/war/sheets.md`
- `docs/page-plans/members/militarization.md` (does not exist, but offers global militarization graph)
- `docs/page-plans/members/blitz.md` (does not exist, but is for generating and managing a blitz)

### IA (short for internal Affairs)
- `docs/page-plans/members/interviews.md`
- `docs/page-plans/members/recruitment.md`
- `docs/page-plans/members/audits.md` - show audits of all members - then with convenience buttons to take actions or view tables of them. 

### FA (short for foreign Affairs)
- `docs/page-plans/members/coalitions.md` (note: Manage coalitions for the server - will need a coalitions endpoint, but the actions can use a command (See for reference how alliances are amanged in the conflicts page (though coalitions are a bit different - just to give you a baseline))

### Members
- `docs/page-plans/home/member-overview.md`
- `docs/page-plans/home/announcements.md`

### Setup (note: changed the name here)
- `docs/page-plans/server/setup.md`
- `docs/page-plans/server/settings.md`
- `docs/page-plans/server/roles.md`
- `docs/page-plans/server/channels.md`
- `docs/page-plans/server/menus.md`
- `docs/page-plans/server/embeds.md`

### Stats (note: changed the name here)
- `docs/page-plans/reports/kpi.md` (note: does not exist, add this, but lets you arrange tables, graphs, rankings etc. into a KPI (or several layouts you save and can share))
- `docs/page-plans/reports/tables.md`
- `docs/page-plans/reports/graphs.md`
- `docs/page-plans/reports/rankings.md` (note: does not exist, add this)
- `docs/page-plans/reports/conflicts.md`
- `docs/page-plans/reports/alliance-profile.md` (note: this is more a component I was testing than a dedicated page. But essentially I want links to alliances to open a modal like this, and add similar pages for other placeholder types, not just alliances, and I want users to be able to customize it and have this rolled into the kpi stuff)
- `docs/page-plans/reports/multi-investigation.md`
- `docs/page-plans/reports/status.md` (note: no, doesn't make sense here. Put a link to the status in the navbar)
- `docs/page-plans/members/treaties.md` (note: Stub, just have it empty for now.)
- `docs/page-plans/members/spheres.md` (note: Will list the spheres in the game, and with a chart of them, and probably links to stats of them)

### Commands

- `docs/page-plans/commands/browser.md`
- `docs/page-plans/commands/runner.md`
- `docs/page-plans/commands/history.md` (note: does not exist, add this)
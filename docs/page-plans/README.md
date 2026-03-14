<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Page Plan Index

This folder is the source of truth for frontend planning. Each brief should describe the intended route or surface, the current substrate that already exists, and the exact backend gaps that still block a browser-native workflow.

`docs/page-plans/*` replaces the old `docs/frontend_plan.md` planning flow.

## User-Facing Navigation

Use the labels users already recognize:

- `Home`
- `Economy`
- `War`
- `Members`
- `Server`
- `Reports`
- `Commands`

Rules:

- Use these labels in visible navigation, page titles, and route discussions.
- Internal code organization can differ, but the user-facing information architecture should not drift into implementation jargon.
- Keep member-self workflows separate from staff and admin workflows inside the briefs, even when they share substrate.

## Workflow Map

- `Enter Workspace`: login, choose guild, confirm readiness, land in `Home` or `Server Setup`.
- `Member Daily Loop`: open `Home`, check announcements, audits, deposits, wars, raids, and personal issues.
- `Economy Staff Loop`: move between `Manage Balance`, `Manage Escrow`, `Ledger`, `Grant Requests`, `Grant Send`, `Grant Templates`, and `Tax`.
- `War Operations`: move between `Targets`, `Counters`, `Sheets`, `Rooms`, `Militarization`, and `Blitz`.
- `Member Lifecycle`: move between `Recruitment`, `Interviews`, `Audits`, roles, and channel repair.
- `Foreign Affairs`: manage coalitions, inspect treaties, and review spheres or alliance comparisons.
- `Reports And Commands`: use `Reports` for reusable read models and saved layouts; use `Commands` for advanced, long-tail, or fallback flows.

## Context Model

- `Guild` is the workspace boundary.
- `Alliance` scope is often task-specific and can be one, many, or all alliances registered to the guild.
- `Current nation` is the default personal scope for member-self workflows.

See `docs/page-plans/core/context-and-scoping.md` for the detailed scoping rules.

## Implementation Modes

- `Endpoint-native`: dedicated page-level read model already exists.
- `Settings-backed`: `TABLE` plus `GuildSetting` placeholders is the main read substrate.
- `Command-wrapped`: the page mostly wraps command execution and only adds browser UX, state, or preview affordances.

Planning rules:

- Do not invent fake local CRUD when `GuildSetting`, `TABLE`, or a command wrapper already covers the workflow.
- Do add new endpoints when the page needs a stable list, detail, diff, preview, or history model that command output cannot support cleanly.
- Name the real contract: endpoint names, response types, placeholder types, required columns, and exact command families.

## Status Legend

- `Evolve`: keep the current route or surface, but reshape it significantly.
- `New`: add a new primary route or surface.
- `Wrap`: keep the power-user substrate and add a more intentional shell around it.
- `Cross-cutting`: affects multiple pages or shared infrastructure.

## Brief Structure

Every brief should use `docs/page-plans/_template.md` and keep these headings:

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

Authoring rules:
- Keep bullets implementation-specific.
- Prefer exact file paths, routes, endpoints, response types, placeholder types, setting keys, and command families.
- If a contract is not known yet, keep the section short and put the uncertainty in `Open Questions And Backend Gaps`.
- Use `Reuse`, `Add`, `Extend`, and `Merge` in `Components`.

## Route Planning Rule

- Each brief should name its intended primary route or owner.
- Do not preserve duplicate legacy route requirements in the planning docs just for compatibility.
- If current code still lives on an old route, mention that in `Current code` or `Implementation Delta`, not as a permanent planning constraint.

## Index Organization

- The file index below is grouped by who owns the workflow and what kind of work it is, not by the current visible navbar labels.
- `Members` need self-service pages about themselves and their own state.
- `Gov / Staff` need broader operational pages for reviewing, managing, and acting on other entities.
- `Admin / Setup` needs its own grouping because configuration and repair are different from day-to-day operational work.
- Some briefs are not full pages at all. They can be modal/detail surfaces, command wrappers, or cross-cutting planning docs.
- The on-disk folders are not fully realigned yet. Until files move, use the grouping below as the planning organization instead of assuming folder names already reflect the final information architecture.

## File Index

### Core And Shared

- `docs/page-plans/core/app-shell.md`
- `docs/page-plans/core/backend-endpoint-gaps.md`
- `docs/page-plans/core/backend-endpoint-shapes.md`
- `docs/page-plans/core/context-and-scoping.md`
- `docs/page-plans/core/guild-select.md`
- `docs/page-plans/core/shared-layouts-and-components.md`
- `docs/page-plans/core/workflow-map.md`

### Entry And Landing

- `docs/page-plans/home/home.md`

### Member Self

- `docs/page-plans/home/member-overview.md`
- `docs/page-plans/home/announcements.md`
- `docs/page-plans/members/deposits.md`
- `docs/page-plans/members/escrow.md`

### Gov / Staff: Member Lifecycle

- `docs/page-plans/members/interviews.md`
- `docs/page-plans/members/recruitment.md`
- `docs/page-plans/members/audits.md`

### Gov / Staff: Economy

- `docs/page-plans/economy/manage_balance.md`
- `docs/page-plans/economy/manage_escrow.md`
- `docs/page-plans/economy/ledger.md`
- `docs/page-plans/economy/grant-templates.md`
- `docs/page-plans/economy/grant-requests.md`
- `docs/page-plans/economy/grant-send.md`
- `docs/page-plans/economy/tax.md`
- `docs/page-plans/economy/trade.md`

### Gov / Staff: War / Milcom

- `docs/page-plans/war/targets.md`
- `docs/page-plans/war/counters.md`
- `docs/page-plans/war/rooms.md`
- `docs/page-plans/war/sheets.md`
- `docs/page-plans/war/militarization.md`
- `docs/page-plans/war/blitz.md`

### Gov / Staff: Foreign Affairs

- `docs/page-plans/members/coalitions.md`
- `docs/page-plans/members/treaties.md`
- `docs/page-plans/members/spheres.md`

### Admin / Setup

- `docs/page-plans/server/setup.md`
- `docs/page-plans/server/settings.md`
- `docs/page-plans/server/roles.md`
- `docs/page-plans/server/channels.md`
- `docs/page-plans/server/menus.md`
- `docs/page-plans/server/embeds.md`

### Analysis / Reports

- `docs/page-plans/reports/kpi.md`
- `docs/page-plans/reports/tables.md`
- `docs/page-plans/reports/graphs.md`
- `docs/page-plans/reports/rankings.md`
- `docs/page-plans/reports/conflicts.md`
- `docs/page-plans/reports/alliance-profile.md` - modal/detail surface reused by report links and KPI cards
- `docs/page-plans/reports/multi-investigation.md`

### Command Fallback And Power Surfaces

- `docs/page-plans/commands/browser.md`
- `docs/page-plans/commands/runner.md`
- `docs/page-plans/commands/history.md`

## Utility Routes

- `/status` stays a utility health route linked from the shared navbar. It is not a primary `Reports` page brief.
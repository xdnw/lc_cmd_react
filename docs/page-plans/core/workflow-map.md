# Workflow Map

- Status: `Cross-cutting`
- Primary route: all major page groups
- Legacy aliases: n/a
- Nav group: cross-cutting
- Primary users: product and implementation work touching `Home`, `Economy`, `War`, `Members`, `Server`, `Reports`, or `Commands`
- Current references: `docs/page-plans/README.md`, `src/pages/guild_member/index.tsx`, `src/pages/settings/index.tsx`, `src/pages/raid/index.tsx`, `src/pages/custom_table/TablePage.tsx`, `src/pages/a2/conflict/conflicts.tsx`

## Why It Exists

- The page briefs should describe end-to-end jobs, not isolated forms.
- This doc keeps the major hand-offs visible so implementation work does not drift into disconnected screens.

## Workflows

- Primary: map the real user journeys and the page-to-page hand-offs they depend on.
- Secondary: resolve ambiguity when a feature could live in more than one section.
- Why users arrive here: planning, implementation, and review all need the same mental model.
- Upstream entry points: `Home`, login flow, command launcher, shared report links.
- Downstream hand-offs: every page brief should point back to one or more of these major loops.

## Layout and Look

- Treat this as a planning map, not a route dump.
- Keep the loops short, concrete, and phrased in the language alliance users already use.

## Information and Interactions

- `Enter Workspace`: login -> `Guild Select` -> `Server Setup` if readiness is missing -> `Member Overview`.
- `Member Daily Loop`: `Member Overview` -> `Announcements`, `Holdings`, `Targets`, alert or self-service commands -> back to `Member Overview`.
- `Economy Operations`: `Holdings` -> `Deposits` -> `Ledger` -> `Grant Requests` -> `Grant Send` -> `Grant Templates` -> `Tax`.
- `War Operations`: `Targets` -> `Counters` -> `War Sheets` -> `War Rooms` -> back to economy pages for reimbursements, warchests, or ledger review.
- `Member Lifecycle`: `Recruitment` -> `Interviews` -> `Roles` and `Channels` support -> audits, graduation, or archive actions.
- `Server Setup`: `Guild Select` -> `Server Setup` -> `Settings`, `Roles`, `Channels`, `Menus`, and `Embeds`.
- `Reports And Research`: `Reports` pages remain standing workbenches for alliance analysis, conflict review, graphs, tables, and investigations.
- `Commands`: the browser and runner remain the universal fallback and advanced-entry surface for work that is not yet wrapped.

## Components

- Existing shared: command launcher, existing route shell, conflict table patterns, table and graph workbenches.
- New shared or page-specific: no page UI is owned here; this doc informs how other pages connect.

## Data and Endpoints

- Existing endpoints: n/a as a cross-cutting planning map.
- Existing table / graph / placeholder substrate: the existence of strong table, graph, conflict, and command surfaces is part of why this map works.
- New endpoints likely needed: n/a here.

## Command Bindings

- Existing commands: every page can fall back to `Commands`, but the user journey should not start there for common work.
- Commands likely needing changes: none required at the map level.
- Command preview / confirmation rules: page hand-offs into commands should preserve context and explain why the fallback is being used.

## Navigation

- Links to: every page group via the page-plan index.
- Linked from: `docs/page-plans/README.md` and any future planning notes about section ownership.

## Permissions and Context

- Required scope: varies by loop, but each one should state clearly whether it is public, login-only, guild-scoped, or role-gated.
- Relevant settings or role gates: pages should name the settings and aliases that commonly block the workflow.
- Recovery path when setup is incomplete: route users into `Server Setup` or the relevant `Server Settings` category rather than leaving them at a dead end.

## Risks and Open Questions

- Pages that look correct in isolation can still fail if the hand-offs are unclear.
- Repeatedly re-explaining the same workflow in different briefs is a maintenance hazard; this doc should carry the shared story.
- The command runner should stay powerful, but it should not be the assumed starting point for recurring operational work.
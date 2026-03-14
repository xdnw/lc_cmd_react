# Roles

- Classification: `route`
- Status: `Wrap`
- Primary route or owner: `/server/roles`
- Nav group: `Server`
- Primary actor: `admin`
- Scope: `guild`
- Current code:
	- `src/pages/settings/index.tsx`
	- `src/pages/commands/index.tsx`
	- `src/pages/command/index.tsx`
	- command metadata for `role *`, `self *`, `settings_auto_role *`, and `settings_self_role *`
- Read substrate:
	- Endpoints: `INPUT_OPTIONS`, `TABLE`, `PERMISSION`
	- Response types: `WebOptions`, `WebTable`, `WebPermission`
	- Table / graph / placeholder types: `GuildSetting` rows for auto-role and self-role policy; future `role_bindings` rows for alias inventory
	- Required columns / filters: auto-role and self-role categories from `GuildSetting`, plus future alias rows keyed by Locutus role
- Write substrate:
	- Endpoints / command families: `COMMAND`, `role *`, `self *`
	- Existing form / action components: command runner fallback plus settings deep links
	- Reload / invalidation targets: role alias inventory, self-role policy settings, related setup shortcuts

## Why It Exists

- Owns: role alias coverage, auto-role policy, self-role policy, and mass role actions that operators actually use.
- Does not own: Discord's full role inventory or a general-purpose member directory.
- Current gap: the workflow exists in commands and settings already, but the docs need a real wrapped page model and a concrete alias read gap.

## Workflows

1. Repair setup-critical aliases
	 - Entry: `/server/setup` or `/server/settings`
	 - Preconditions: selected guild
	 - Reads: current alias coverage, related `GuildSetting` policy, and future `role_bindings`
	 - UI path: inspect missing aliases for `REGISTERED`, `MEMBER`, `ADMIN`, department roles, and opt-out roles
	 - Mutations: `role setalias`, `role unregister`
	 - Handoff / exit: back into setup or the workflow page that depends on the alias
2. Manage auto roles and self roles
	 - Entry: `/server/roles`
	 - Preconditions: selected guild and role-management permission
	 - Reads: `GuildSetting` auto-role and self-role policy plus current self-role relationships from commands
	 - UI path: alias section, auto-role section, self-role section
	 - Mutations: `role autoassign`, `role autorole`, `self create`, `self add`, `self remove`, `role removeassignablerole`
	 - Handoff / exit: into interviews, recruitment, or member support pages
3. Run operator actions safely
	 - Entry: `/server/roles`
	 - Preconditions: action targets known
	 - Reads: current command args and any available previews
	 - UI path: mass action panels with strong confirmation language
	 - Mutations: `role mask`, `role mask_sheet`, `role clearallianceroles`, `role clearnicks`, `role optout`
	 - Handoff / exit: stay in the page with updated alias or policy state

## Layout Structure

- Top-level regions: `Aliases`, `Auto Roles`, `Self Roles`, `Mass Actions`, `Opt-outs`.
- Tabs / panels / drawers: no need for many tabs; sections should stay visible and workflow-oriented.
- URL state: optional deep links into a specific section or missing alias.
- Empty / loading / error states: if the alias inventory endpoint does not exist yet, say that the page is wrapping commands and settings rather than pretending to own a live Discord role model.

## Information Model

- Primary objects shown: Locutus role aliases, auto-role policy, self-role relationships, mass role actions, and missing-role blockers.
- Filters / grouping: group aliases by setup-critical, department, alert, and member-self roles.
- Row or card actions: set alias, clear alias, run auto-assign, edit self-role mapping, open command fallback.
- Detail / modal surfaces: alias edit dialog, mass-action confirmation, and future missing-role diagnostic panel.

## Components

- Reuse: settings deep-link patterns, `ArgInput`, command preview helpers, command runner links.
- Add: `RoleBindingsTable`, `RoleAliasChecklist`, `AutoRolePanel`, `SelfRoleManager`, `MassRoleActionPanel`.
- Extend: `Server Setup` and `Server Settings` shortcut cards so they can deep-link into missing aliases.
- Merge: keep alias coverage and related role policy in one page instead of splitting alias repair into a command-only path.

## Implementation Delta

- Route changes: treat `/server/roles` as the owner even while current code still lives in commands and settings.
- Read model changes: add `role_bindings` so the page can show actual alias state without screen-scraping command output.
- Mutation changes: keep actual writes command-backed.
- Cache / reload changes: refresh alias and policy reads after any command-backed mutation.
- Avoid: pretending the page owns full Discord role inventory before there is a web-native read model.

## Route And Navigation

- Linked from: `/server/setup`, `/server/settings`, `/members/interviews`, `/members/recruitment`.
- Links to: `/server/settings`, `/members/interviews`, `/commands`.
- Header / nav actions: focus on missing aliases, auto-role repair, and self-role repair.
- Preserved context: selected guild, owning workflow, and current section.

## Permissions And Context

- Auth and scope requirements: login, selected guild, and role-management permission.
- Role gates: mass actions and alias changes should stay admin-gated.
- Setup dependency / recovery: this is a setup repair surface as much as a steady-state admin page.
- Delegation / inherited context: inherited guild settings matter for auto-role policy, but aliases themselves still need a guild-scoped read model.

## Commands And Mutations

- Existing commands: `role setalias`, `role unregister`, `role autoassign`, `role autorole`, `role clearallianceroles`, `role clearnicks`, `role mask`, `role mask_sheet`, `role optout`, `role removeassignablerole`, `self create`, `self list`, `self add`, `self remove`.
- Preview / confirm: mass actions must show affected role and target context before submit.
- Permission checks: command permission plus guild role-management context.
- Side effects / cache refresh: refresh alias coverage, role policy reads, and setup shortcut status.

## Open Questions And Backend Gaps

- Add `role_bindings` so the page can load current aliases without routing every operator through raw commands.
- Keep any future role inventory endpoint separate from the alias inventory so the page does not over-assume ownership.

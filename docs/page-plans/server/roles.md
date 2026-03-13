# Roles

- Status: `Wrap`
- Primary route: `/server/roles`
- Legacy aliases: none; current related work is command and settings driven
- Nav group: Server
- Primary users: guild admins, IA, milcom, and staff managing role automation or self roles
- Current references: command metadata for `role *`, `self *`, `settings_auto_role *`, `settings_self_role *`, `src/pages/settings/index.tsx`, `src/pages/commands/index.tsx`, `src/pages/command/index.tsx`

## Why It Exists

- Role work is a mix of policy and Discord state, which is awkward when split across raw commands.
- Users think in terms like aliases, auto roles, self roles, and mass updates, not in terms of command trees.
- This should be a guided command wrapper plus settings deep links, not a pretend standalone role database.

## Workflows

- Primary: manage role aliases, run auto-assign flows, manage self roles, and perform mass role actions.
- Secondary: inspect role readiness for key workflows, repair missing aliases, and jump into the exact settings or command flow needed for automation changes.
- Why users arrive here: setup, staff onboarding, war / IA role maintenance, permission troubleshooting.
- Upstream entry points: `Server Setup`, `Interviews`, `Recruitment`, command fallback.
- Downstream hand-offs: `Server Settings`, `Channels`, and any workflow that depends on the alias map being correct.

## Layout and Look

- Sections: `Aliases`, `Auto Roles`, `Self Roles`, `Mass Actions`, `Opt-outs`.
- Reuse the settings page's clarity, but add workflow-oriented checklists and command previews.
- Keep the page practical and operator-friendly, not overly decorative.
- Treat the page as a control room for role actions, not as a replacement for Discord's own role list UI.

## Information and Interactions

- Alias mapping: core access roles first, then department roles, then alert and opt-out roles.
- Auto roles: show the related `AUTO_ROLE` and `SELF_ROLE` settings alongside actions such as `autoassign`, `autorole`, `clearallianceroles`, and `clearnicks`.
- Self roles: create required-role to assignable-role relationships and show the exact command path used for changes.
- Mass actions: support `mask` and `mask_sheet` with clear affected-role previews and strong confirmation language.
- Opt-outs: expose `role optout` clearly as a member-level or operator repair action, not as general setup.
- Setup readiness: show missing aliases that block banking, recruitment, war alerts, interviews, or self-service flows.

## Components

- Existing shared: settings-style sectioning, `ArgInput`, dialog helpers, command preview helpers, command runner links.
- New shared or page-specific: `RoleAliasChecklist`, `AutoRolePanel`, `SelfRoleManager`, `MassRoleActionPanel`, `RoleWorkflowCoverageCard`.

## Data and Endpoints

- Existing endpoints: `INPUT_OPTIONS`, `TABLE`, `PERMISSION`, `COMMAND`.
- Existing table / graph / placeholder substrate: `GuildSetting` rows cover automation policy, but there is no dedicated guild role inventory or role-member summary endpoint.
- Existing command substrate: role actions already exist and are appropriate for a wrapped operator page.
- Current backend gaps: none for the first wrapped page.
- Existing role and self-role commands plus settings reads cover the current workflow.
- Later only if this page becomes a native admin desk: role inventory, alias summary, self-role summary, and role-member counts.

## Command Bindings

- Existing commands: `role setalias`, `role autoassign`, `role autorole`, `role clearallianceroles`, `role clearnicks`, `role mask`, `role mask_sheet`, `role optout`, `role removeassignablerole`, `self create`, `self list`, `self add`, `self remove`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: any mass action must show affected roles and intended mutation clearly before submit.

## Navigation

- Links to: `/server/settings`, `/members/interviews`, `/war/rooms`, `/commands` where aliases or automation matter.
- Linked from: settings shortcut cards, command launcher, setup flow.

## Permissions and Context

- Requires login, selected guild, and role-management permissions.
- Actions that touch many members must be clearly permission-gated.

## Risks and Open Questions

- This page will feel thin if it pretends to own Discord role inventory that the web API does not currently expose.
- Role alias editing must stay aligned with the same source of truth used in command permissions.
- Self-role UX should not accidentally expose gov-only roles as normal member options.

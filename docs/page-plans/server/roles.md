# Roles

- Status: `New`
- Primary route: `/server/roles`
- Legacy aliases: none; current related work is command and settings driven
- Nav group: Server
- Primary users: guild admins, IA, milcom, and staff managing role automation or self roles
- Current references: command metadata for `role *` and `self *`, settings page as an admin-pattern reference

## Why It Exists

- Role work is a mix of policy and Discord state, which is awkward when split across raw commands.
- Users think in terms like aliases, auto roles, self roles, and mass updates, not in terms of command trees.

## Workflows

- Primary: manage role aliases, run auto-assign flows, manage self roles, and perform mass role actions.
- Secondary: inspect opt-out state and guild role coverage.
- Why users arrive here: setup, staff onboarding, war / IA role maintenance, permission troubleshooting.

## Layout and Look

- Sections: `Aliases`, `Auto Roles`, `Self Roles`, `Mass Actions`, `Opt-outs`.
- Reuse the settings page's clarity, but add richer Discord-aware previews and member counts.
- Keep the page practical and operator-friendly, not overly decorative.

## Information and Interactions

- Alias mapping: Locutus role to Discord role, with current bindings and remove actions.
- Auto roles: run autoassign / autorole, clear alliance roles, clear nicknames.
- Self roles: create self-role groups, view assignable roles, add or remove role options.
- Mass actions: mask roles, sheet-based mask actions, add role to all members.
- Opt-outs: inspect or change war-room / IA logging opt-out state.

## Components

- Existing shared: settings-style sectioning, `ArgInput`, dialog helpers, command preview helpers.
- New shared or page-specific: `RoleAliasTable`, `AutoRolePanel`, `SelfRoleManager`, `MassRoleActionPanel`, `GuildRoleUsageSummary`.

## Data and Endpoints

- Existing endpoints: `INPUT_OPTIONS` can likely supply role choices; `TABLE` on `GuildSetting` can expose some config state.
- Existing table / graph / placeholder substrate: partial only; current web API does not appear to expose guild role inventory or role-member summaries.
- New endpoints likely needed: guild role list, alias summary, self-role config, and role-member count endpoints are likely needed for a strong page.

## Command Bindings

- Existing commands: `role setalias`, `role unregister`, `role autoassign`, `role autorole`, `role clearallianceroles`, `role clearnicks`, `role mask`, `role mask_sheet`, `role addroletoallmembers`, `role optout`, `self create`, `self list`, `self add`, `self remove`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: any mass action must show affected members or role counts before submit.

## Navigation

- Links to: `/server/settings`, `/members/interviews`, `/war/rooms` where role aliases matter.
- Linked from: settings shortcut cards, command launcher, setup flow.

## Permissions and Context

- Requires login, selected guild, and role-management permissions.
- Actions that touch many members must be clearly permission-gated.

## Risks and Open Questions

- This page will feel thin without read endpoints for current guild roles and counts.
- Role alias editing must stay aligned with the same source of truth used in command permissions.
- Self-role UX should not accidentally expose gov-only roles as normal member options.

<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Server Setup

- Status: `New`
- Primary route: `/server/setup`
- Legacy aliases: none; related entry points include `/guild_select` and `/settings`
- Nav group: Server
- Primary users: guild owners, admins, and department leads setting up or repairing a Locutus server
- Current references: `src/pages/guild_picker/index.tsx`, `src/pages/settings/index.tsx`, `src/pages/commands/index.tsx`, `src/pages/command/index.tsx`, `src/pages/settings/settingsDomain.ts`, command metadata for `settings_default *`, `settings_foreign_affairs *`, `settings_war_alerts *`, `settings_beige_alerts *`, `settings_orbis_alerts *`, `settings_war_room *`, `settings_bank_access *`, `settings_bank_conversion *`, `settings_bank_offshore *`, `settings_bank_grants *`, `settings_bank_info *`, `settings_recruit *`, `settings_interview *`, `role *`, `self *`, `channel *`, `menu *`, `embed *`, `coalition *`, `offshore *`, and `settings info`

## Why It Exists

- Setup is a workflow, not a category tree.
- Server owners think in terms of readiness, broken prerequisites, and next steps, not in terms of hunting across five separate admin pages.
- The app already has a strong settings browser and a strong command runner. This page should orchestrate them into a usable admin onboarding flow instead of pretending every setup concern already has its own native CRUD page.

## Workflows

- Primary: connect a guild to one or more alliances, register bot prerequisites, map access roles, enable the operational modules the guild actually uses, and verify readiness.
- Secondary: recover from broken setup, hand the server off to a new admin, enable a new department, or audit whether the guild is ready for banking, war, interviews, recruitment, or self-service member actions.
- Why users arrive here: first-time setup, handoff to new admins, troubleshooting missing alerts or commands, guild recovery after drift.
- Upstream entry points: `Guild Select`, setup warnings on guild-scoped pages, help docs, command fallback.
- Downstream hand-offs: `Server Settings`, `Roles`, `Channels`, `Menus`, `Embeds`, `Commands`, `Member Overview`.

## Layout and Look

- Use a readiness board with blocker cards, recommended next actions, and explicit status for each module.
- Keep the structure feature-driven: `Foundation`, `Alliance And Auth`, `Member Access`, `Recruitment And Interviews`, `Banking`, `War And Alerts`, `Discord Surfaces`, `Review`.
- Show the setup status in plain language such as `Required`, `Recommended`, `Optional`, `Blocked`, or `Inherited`.
- On mobile, collapse each lane into an accordion so setup still reads like a sequence.

## Information and Interactions

- Step 0: confirm guild selection, bot presence, and whether the guild is a primary alliance server, a coalition server, or a delegated server.
- Step 1: set `registeralliance` and, when needed, `registerapikey`; surface `delegate_server` and offshore decisions early because they change which later checks matter.
- Step 2: verify core access roles first: `REGISTERED`, `MEMBER`, and `ADMIN`. Everything else should build on top of that baseline.
- Step 3: enable member lifecycle only if needed: recruitment mail, applicant flow, interview alerts, interview categories, mentor and interviewer roles, archive category.
- Step 4: enable banking only if the guild actually uses it: offshore, withdrawal permissions, request channels, grant request channel, deposit or withdrawal alerts, and required econ roles.
- Step 5: enable war only if the guild actually uses it: `MILCOM` and `FOREIGN_AFFAIRS` aliases, war alert channels, beige and blockade alerts, enemies or allies or DNR coalitions, war room settings, and optional war server delegation.
- Step 6: enable Discord surfaces only after the underlying workflow exists. Menus and embeds are rollout tools, not prerequisites by themselves.
- Step 7: show a readiness summary grouped by operational module, with blockers, warnings, inherited config, and direct links into either `Server Settings` or a prefilled command page.
- Required baseline for a usable guild should be explicit: selected guild, alliance or delegation model decided, admin path working, and core access roles configured.
- Optional modules should never be treated as blockers for all guilds. Banking, war rooms, recruitment mail, timed messages, menus, and embeds should be marked as optional unless the guild says it uses them.

## Components

- Existing shared: `ApiFormInputs`, settings editing patterns, command browser or runner pages, command preview helpers, dialog helpers.
- New shared or page-specific: `SetupReadinessBoard`, `SetupBlockerCard`, `GuildReadinessSummary`, `SetupModuleCard`, `SetupActionRail`, `SettingsDeepLinkCard`, `CommandFallbackCard`.

## Data and Endpoints

- Existing endpoints: `SESSION`, `SET_GUILD`, `UNSET_GUILD`, `TABLE`, `INPUT_OPTIONS`, `PERMISSION`, `COMMAND`.
- Existing table / graph / placeholder substrate: `GuildSetting` rows and `GuildSetting` placeholder helpers already provide much of the raw readiness state for setup and repair work.
- Existing command substrate: guided execution through the command browser or runner is already a valid mutation layer for missing setup steps.
- New endpoints likely needed: an optional `guild_setup_summary` or readiness endpoint could reduce page assembly cost later, but MVP should be planned around existing settings reads plus command-backed fixes.

## Command Bindings

- Existing commands: `settings_default registeralliance`, `settings_default unregisteralliance`, `settings_default registerapikey`, `settings_default delegate_server`, `settings info`, `role setalias`, `role autoassign`, `offshore add`, `coalition *`, `settings_interview *`, `settings_recruit *`, `settings_bank_access *`, `settings_bank_conversion *`, `settings_bank_offshore *`, `settings_bank_grants *`, `settings_bank_info *`, `settings_war_alerts *`, `settings_beige_alerts *`, `settings_war_room *`, `settings_foreign_affairs *`, `settings_orbis_alerts *`, `menu *`, and `embed template *`.
- Commands likely needing changes: none required for the planning model. The gap is orchestration and readback, not raw command coverage.
- Command preview / confirmation rules: setup actions should show the exact command or setting family they affect, whether the result is local or inherited, and which module status will change after success.

## Navigation

- Links to: `/guild_select`, `/server/settings`, `/server/roles`, `/server/channels`, `/server/menus`, `/server/embeds`, `/commands`, `/overview`.
- Linked from: guild-select completion flow, setup warnings, app-shell Server nav, command launcher.

## Permissions and Context

- Required scope: login and selected guild.
- Relevant settings or role gates: admin-level permissions are expected for most actions; some modules may be visible as read-only for staff who can diagnose but not fix.
- Recovery path when setup is incomplete: stay on this page and deep-link into the exact settings view or command flow needed to clear the blocker.
- The page should show when a missing capability is caused by guild state, by delegated config, by missing Discord permissions, or by the current viewer lacking bot permissions.

## Risks and Open Questions

- Do not let this page become a second settings screen.
- Multi-alliance guilds need to be treated as normal, not as an edge case.
- The checklist should be opinionated about readiness, but not assume every guild uses every feature.
- Menus and embeds should not be presented as prerequisites when they are really rollout tools layered on top of already-working workflows.
- A page that promises native management of roles, channels, menus, or embeds without acknowledging command-backed execution would oversell the current architecture.
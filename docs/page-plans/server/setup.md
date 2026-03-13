# Server Setup

- Status: `New`
- Primary route: `/server/setup`
- Legacy aliases: none; related entry points include `/guild_select` and `/settings`
- Nav group: Server
- Primary users: guild owners, admins, and department leads setting up or repairing a Locutus server
- Current references: `src/pages/guild_picker/index.tsx`, `src/pages/settings/index.tsx`, command metadata for `settings_default *`, `role setalias`, `channel *`, `menu *`, and `embed *`

## Why It Exists

- Setup is a workflow, not a category tree.
- Server owners think in terms of readiness, missing prerequisites, and next steps, not in terms of hunting across five separate admin pages.

## Workflows

- Primary: connect a guild to one or more alliances, register the bot prerequisites, map base roles, configure key channels, and launch guided Discord surfaces.
- Secondary: recover from broken setup, onboard a new department, or audit whether a guild is ready for banking, war, interviews, or recruitment.
- Why users arrive here: first-time setup, handoff to new admins, troubleshooting missing alerts or commands, guild recovery after drift.
- Upstream entry points: `Guild Select`, setup warnings on guild-scoped pages, help docs, command fallback.
- Downstream hand-offs: `Server Settings`, `Roles`, `Channels`, `Menus`, `Embeds`, `Member Overview`.

## Layout and Look

- Use a setup board with checklist lanes, blocker cards, and next actions.
- Keep the structure practical: `Alliance And Auth`, `Roles`, `Channels And Alerts`, `Member Ops`, `Discord Surfaces`, `Review`.
- On mobile, collapse each lane into an accordion so setup still reads like a sequence.

## Information and Interactions

- Step 1: confirm guild selection and bot presence.
- Step 2: register one or more alliances and the required API key.
- Step 3: map core roles such as `REGISTERED`, `MEMBER`, `ADMIN`, then add department aliases as needed.
- Step 4: configure key channels and alerts for war, grants, interviews, recruitment, deposits, withdrawals, and announcements.
- Step 5: set up category-driven workflows such as war rooms, interview categories, and embassy or menu surfaces if those features are used.
- Step 6: create menus and embeds for common member or staff actions.
- Step 7: show a readiness summary with blockers, warnings, and quick links into the right detailed page.

## Components

- Existing shared: `ApiFormInputs`, `HierarchySidebarNav`, settings editing patterns, dialog helpers.
- New shared or page-specific: `SetupChecklistBoard`, `SetupBlockerCard`, `GuildReadinessSummary`, `SetupActionRail`, `SettingsDeepLinkCard`.

## Data and Endpoints

- Existing endpoints: `SESSION`, `TABLE`, `INPUT_OPTIONS`, `PERMISSION`.
- Existing table / graph / placeholder substrate: `GuildSetting` rows already provide much of the raw configuration state.
- New endpoints likely needed: optional `guild_setup_summary` or readiness endpoint would improve this page, but MVP can assemble its view from existing data plus command-backed checks.

## Command Bindings

- Existing commands: `settings_default registeralliance`, `settings_default unregisteralliance`, `settings_default registerapikey`, `role setalias`, `settings info`, `offshore add`, plus relevant `settings_*`, `channel *`, `menu *`, and `embed *` families.
- Commands likely needing changes: none required for the planning model.
- Command preview / confirmation rules: setup actions should show the exact command or setting family they affect so power users can verify the side effect.

## Navigation

- Links to: `/guild_select`, `/server/settings`, `/server/roles`, `/server/channels`, `/server/menus`, `/server/embeds`, `/overview`.
- Linked from: guild-select completion flow, setup warnings, app-shell Server nav, command launcher.

## Permissions and Context

- Required scope: login and selected guild.
- Relevant settings or role gates: admin-level permissions are expected for most actions; some lanes may be visible as read-only for staff.
- Recovery path when setup is incomplete: stay on this page and deep-link into the exact detailed admin page needed to clear the blocker.

## Risks and Open Questions

- Do not let this page become a second settings screen.
- Multi-alliance guilds need to be treated as normal, not as an edge case.
- The checklist should be opinionated about readiness, but not assume every guild uses every feature.
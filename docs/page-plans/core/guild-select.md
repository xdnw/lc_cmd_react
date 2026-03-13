# Guild Select

- Status: `Evolve`
- Primary route: `/guild_select`
- Legacy aliases: none
- Nav group: Home
- Primary users: newly logged-in users, staff switching between alliance servers, guild owners during setup
- Current references: `src/pages/guild_picker/index.tsx`, `src/components/api/SessionContext.tsx`

## Why It Exists

- The guild is the true workspace boundary for protected workflows.
- Setup cannot stop at selecting a server; users also need to understand whether that guild is ready for alliance work.

## Workflows

- Primary: select active Discord guild, confirm the current selection, move into that guild's work.
- Secondary: invite the bot, register alliance ids, register API keys, jump to server settings.
- Why users arrive here: login flow, switching servers, first-time setup, "why is this page missing data?" troubleshooting.

## Layout and Look

- Top area: current guild card with icon, name, id, and remove/switch action.
- Main body: left side guild picker, right side setup checklist and next steps.
- Use a deliberate setup-board look, not a plain form page: status chips, checkmarks, and explicit next actions.
- Mobile: stack picker first, checklist second.

## Information and Interactions

- Show current selected guild if one is set.
- Let users pick a guild from `SET_GUILD` inputs and confirm immediately.
- Show "invite bot" and "initial setup" help when the desired server is missing.
- Surface whether the selected guild already has registered alliances, API keys, and key settings wired.
- Offer a direct jump into overview, server settings, or setup actions after selection.

## Components

- Existing shared: `ApiFormInputs`, `Button`, dialog helpers from `DialogContext`, session helpers from `useSession`.
- New shared or page-specific: `GuildSetupChecklist`, `GuildReadinessCard`, `NextStepCards`, `GuildSwitcherList`.

## Data and Endpoints

- Existing endpoints: `SESSION`, `SET_GUILD`, `UNSET_GUILD`.
- Existing table / graph / placeholder substrate: `TABLE` can expose `GuildSetting` rows if a setup checklist needs current server settings without inventing a new backend read.
- New endpoints likely needed: optional `guild_setup_summary` endpoint would make readiness checks easier; MVP can assemble readiness from `SESSION`, `TABLE` on `GuildSetting`, and command permission checks.

## Command Bindings

- Existing commands: `settings_default registeralliance`, `settings_default unregisteralliance`, `settings_default registerapikey`, `settings info`.
- Commands likely needing changes: none required for MVP; command-backed quick actions are acceptable.
- Command preview / confirmation rules: setup actions should show the concrete command or setting path they will invoke so advanced users understand the backend side effect.

## Navigation

- Links to: `/overview`, `/server/settings`, `/commands`, bot invite URL, setup wiki.
- Linked from: login flow, app shell guild switcher, setup notices on guild-scoped pages.

## Permissions and Context

- Requires login.
- Should not require a guild to already be selected.
- Needs to behave cleanly when a user is in many guilds or in none where the bot is installed.

## Risks and Open Questions

- Setup should feel like progress, not like a dead-end dropdown.
- Multi-alliance guild setup needs to be first-class, not buried behind one "alliance id" field.
- Need to decide whether alliance registration lives directly here or just links into `Server > Settings`.

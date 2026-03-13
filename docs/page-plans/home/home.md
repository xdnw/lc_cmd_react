# Home Landing

- Status: `Evolve`
- Primary route: `/home`
- Legacy aliases: `/`
- Nav group: Home
- Primary users: public visitors, logged-in users returning to the app, users exploring what the web UI can do
- Current references: `src/pages/home/index.tsx`, `src/pages/splash/index.tsx`

## Why It Exists

- Give public and logged-in users a clear first impression of the app's strongest workflows.
- Turn the current featured-card page into a task-oriented launch surface instead of a mostly static gallery.

## Workflows

- Primary: discover tools, re-enter frequent workflows, jump into reports or commands.
- Secondary: route logged-in users toward overview, guild select, or the most recent task.
- Why users arrive here: splash redirect, logout return, shared links, public exploration.

## Layout and Look

- Keep the card-grid concept, but make the first row more intentional and role-aware.
- Logged-out state: highlight public reports, raid finder, command browser, and status.
- Logged-in state: promote `Overview`, `Economy`, `War`, and the active guild.
- Visual language should feel like a command center front door rather than a generic marketing page.

## Information and Interactions

- Show featured destinations for both public and logged-in users.
- Add "continue where you left off" when recent-page cache has a meaningful target.
- Surface unread announcement count and active guild shortcut when logged in.
- When the selected guild is not fully configured, promote `Server Setup` instead of pretending the workspace is ready.
- Keep public links like conflicts, tables, graphs, status, commands, and multi visible.

## Components

- Existing shared: `Card`, `Button`, existing featured-card pattern, command launcher via navbar.
- New shared or page-specific: `RecentWorkCard`, `GuildHomeCard`, `FeaturedTaskGrid`, `PublicVsMemberSection`.

## Data and Endpoints

- Existing endpoints: `SESSION`, optional `UNREAD_COUNT`, optional `LOCUTUS_TASKS` snippet for status.
- Existing table / graph / placeholder substrate: none required for MVP.
- New endpoints likely needed: none for MVP; an optional `home_summary` endpoint could reduce fan-out if the landing page becomes heavily personalized.

## Command Bindings

- Existing commands: none as primary actions.
- Commands likely needing changes: none.
- Command preview / confirmation rules: no inline command execution here; this page should route users into the right specialized page or `/commands`.

## Navigation

- Links to: `/overview`, `/server/setup`, `/economy/holdings`, `/war/targets`, `/reports/conflicts`, `/reports/tables`, `/reports/graphs`, `/commands`, `/guild_select`, `/status`, `/multi_v2/:nation?`.
- Linked from: splash, logout, navbar home breadcrumb.

## Permissions and Context

- Must work for both anonymous and authenticated users.
- Logged-in state should react to whether a guild is selected.

## Risks and Open Questions

- Avoid turning the landing page into a noisy dashboard with every count and chart on it.
- Logged-in users need obvious next steps, not the same grid a public visitor sees.
- Shared public links should remain first-class; do not hide reports behind login-only chrome.

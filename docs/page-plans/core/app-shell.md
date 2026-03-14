# App Shell

- Status: `Cross-cutting`
- Primary route: all authenticated pages and major report pages
- Legacy aliases: n/a
- Nav group: cross-cutting
- Primary users: all users after landing, especially logged-in guild members
- Current references: `src/components/layout/page-view.tsx`, `src/components/layout/navbar.tsx`, `src/components/cmd/CommandLauncher.tsx`, `src/components/layout/RecentPageKeepAlive.tsx`

## Why It Exists

- Make guild context visible everywhere it matters.
- Replace abstract discovery with section labels users already recognize.
- Keep command search global without forcing users into the command browser first.

## Workflows

- Primary: enter the app after login, switch sections, keep context while moving between economy, war, member, and report work.
- Secondary: jump into commands from any page, return to a recent page with state preserved.
- Why users arrive here: every serious workflow passes through the shell, so it has to reduce orientation cost.

## Layout and Look

- Keep the existing thin navbar and global search affordance. (note: don't. I merged them all into a single navbar. that's how it should be)
- Add a compact guild context bar directly under the navbar. (note: no, don't)
- Add a left rail with clear labels: `Home`, `Economy`, `War`, `Members`, `Server`, `Reports`, `Commands`. (note: No, these groupings dont make much sense. Refer to readme. Also the left rail I changed already to be unified with the sidebar)
- Use dense page headers with visible primary actions instead of oversized dashboard chrome. (note: You made oversized chrome with nonsense descriptions. This is wrong. Dense doesn't mean dense with useless info, which is what you did.) (note: Also, the sidebar should probably be categories which are expandable to list all its sub pages)
- Mobile: collapse the left rail into a sheet, keep the context bar sticky, and avoid wasting vertical space. (note: Collapse into a button in the navbar that opens a modal, is probably the best approach. Avoid keeping legacy code)

## Information and Interactions
- Show active guild, registered alliances, current nation, and permission summary where relevant.
- Expose section-local secondary navigation on dense sections like Economy, War, and Server.
- Treat `Home`, `Economy`, `War`, `Members`, `Server`, `Reports`, and `Commands` as the only visible top-level labels.
- Give dense sections intentional landing points such as `Member Overview` for Home and `Server Setup` for Server.
- Preserve recent-page caching and scroll position for command browser, settings, and report-heavy pages.
- Keep the command launcher reachable from `/`, keyboard shortcut, navbar search, and page-level action bars.

## Components

- Existing shared: `Navbar`, `PageView`, `CommandLauncher`, `CommandLauncherProvider`, `SessionProvider`, `DialogProvider`, `RecentPageKeepAlive`.
- New shared or page-specific: `GuildContextBar`, `PrimaryNavRail`, `SectionHeader`, `MobileSectionSheet`, `PermissionSummaryChip`, `ContextPreservingLink`.
(note: The above is outdated. GuildContextBar was merged with sessioninfo. The above needs to be updated as it's outdated.)
## Data and Endpoints

- Existing endpoints: `SESSION`, `SET_GUILD`, `UNSET_GUILD`, `INPUT_OPTIONS`.
- Existing table / graph / placeholder substrate: current session context already exposes guild, nation, and registration state.
- New endpoints likely needed: none for shell MVP; an optional `guild_context_summary` endpoint could reduce fan-out if the context bar later needs counts or role summaries.
(note: There should not be a guild_context_summary, it should be added to the WebSession if needed. But I already updated webSession. Tell me if it's missing anything)
## Command Bindings

- Existing commands: none as the shell's primary action surface; it should deep-link into pages and the command launcher.
- Commands likely needing changes: none.
- Command preview / confirmation rules: do not run commands from the shell itself; the shell should route users into the correct page or command form.

## Navigation

- Links to: all section entry pages, `/commands`, `/guild_select`, `/overview`, `/server/setup`.
- Linked from: `/home`, login flow, guild select, every deep route.

## Permissions and Context

- Guild-scoped pages require a selected guild and should surface that fact clearly.
- Public report pages can reuse the shell, but the guild context bar should degrade cleanly when no guild is selected.

## Risks and Open Questions

- Do not replace familiar route names with architecture jargon in the visible nav.
- Keep the shell lightweight; avoid loading every summary count globally.
- Mobile nav needs a clear pattern that does not hide the command launcher or the guild switcher.

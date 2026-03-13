# Command Browser

- Status: `Evolve`
- Primary route: `/commands`
- Legacy aliases: `/command` (browser alias)
- Nav group: Commands
- Primary users: power users, admins, curious members, and anyone falling back from a guided page
- Current references: `src/pages/commands/index.tsx`, `src/components/cmd/CmdList.tsx`, `src/components/cmd/cmdBrowserState.ts`

## Why It Exists

- The command browser is already real and useful; it should remain the universal fallback surface.
- Guided pages should reduce friction, but not at the cost of hiding the long-tail command system.

## Workflows

- Primary: search, filter, and open commands.
- Secondary: copy command paths, inspect descriptions, browse by role or argument complexity, and jump from launcher to page.
- Why users arrive here: power-user work, unsupported workflows, exploration, troubleshooting.

## Layout and Look

- Keep the dense searchable list and keyboard-friendly behavior.
- Expand the page version with recent commands, favorites, and a few curated clusters, but do not bury the search field.
- The page should feel like a fast catalog, not a marketing directory.

## Information and Interactions

- Search by path and description.
- Filter by argument support, role annotation, and viewability flags.
- Preserve URL-backed browser state and recent-page cache behavior.
- Keep strong keyboard behavior and a seamless relationship with the global launcher.

## Components

- Existing shared: `CmdList`, `SearchBar`, `CommandLauncher`, `cmdBrowserState` helpers.
- New shared or page-specific: `RecentCommandStrip`, `FavoriteCommandsPanel`, `CuratedCommandClusters`.

## Data and Endpoints

- Existing endpoints: none required; this page is powered by local command metadata.
- Existing table / graph / placeholder substrate: command metadata from `CM.getCommands()` is the source of truth.
- New endpoints likely needed: none for MVP.

## Command Bindings

- Existing commands: the page is itself the command index.
- Commands likely needing changes: none.
- Command preview / confirmation rules: opening a command should route into `/command/:command`; the browser itself should not run commands directly.

## Navigation

- Links to: `/command/:command`, guided workflow pages, placeholder browser or related reports where helpful.
- Linked from: navbar search, global launcher, every page that says "open the raw command".

## Permissions and Context

- Public-safe, but descriptions or visibility should still reflect actual command metadata.
- When a guild is selected, the page can surface context-aware curated groups.

## Risks and Open Questions

- Keep the page fast; avoid adding so much chrome that it becomes slower than the launcher.
- Favorites and recents need a clear storage model.
- Do not fork the page browser and the modal launcher into two different command-discovery experiences.

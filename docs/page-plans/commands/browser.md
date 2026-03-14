# Command Browser

- Classification: `route`
- Status: `Evolve`
- Primary route or owner: `/commands`
- Nav group: `Commands`
- Primary actor: `everyone`
- Scope: `none`
- Current code:
	- `src/pages/commands/index.tsx`
	- `src/components/cmd/CmdList.tsx`
	- `src/components/cmd/cmdBrowserState.ts`
	- `src/utils/Command.ts`
- Read substrate:
	- Endpoints: none required for the current list, future `command_history`
	- Response types: local command metadata now, future history rows
	- Table / graph / placeholder types: command metadata from `CM.getCommands()`
	- Required columns / filters: command path, description, argument support, viewability, role annotation, future history filters by command/guild/channel
- Write substrate:
	- Endpoints / command families: none for the list itself; row action routes into `/command/:command`
	- Existing form / action components: `CmdList` and URL-backed browser state helpers
	- Reload / invalidation targets: local favorites state and future command-history modal reads

## Why It Exists

- Owns: search, filter, and discovery of the raw command catalog.
- Does not own: running commands directly from the list or inventing a second, inconsistent command UX separate from the launcher and runner.
- Current gap: the page needs concrete favorites and history behavior, not vague curated strips or cluster chrome.

## Workflows

1. Find and open a command
	 - Entry: `/commands` or the global launcher
	 - Preconditions: none
	 - Reads: local command metadata and URL-backed browser state
	 - UI path: search, filter, arrow through the list, open `/command/:command`
	 - Mutations: none
	 - Handoff / exit: command runner for the selected command
2. Keep frequently used commands near the top
	 - Entry: a row in the command list
	 - Preconditions: command visible in the list
	 - Reads: local favorites state from a dedicated utility module
	 - UI path: star toggle on the row, favorites float to the top of the same list
	 - Mutations: update `favoriteCmdUtil.ts` state
	 - Handoff / exit: remain in the same list state
3. Inspect command history
	 - Entry: history button from the browser page or a row-level action
	 - Preconditions: history endpoint exists
	 - Reads: future `command_history` filtered by command path, guild, or channel
	 - UI path: open a modal, filter server-backed history, jump into a past command or rerun it through the runner
	 - Mutations: none
	 - Handoff / exit: back to the list or into `/command/:command`

## Layout Structure

- Top-level regions: search/filter controls, dense list, lightweight page actions.
- Tabs / panels / drawers: keep a single list; use a modal for history instead of a persistent strip.
- URL state: browser filters belong in the URL through `cmdBrowserState.ts`.
- Empty / loading / error states: empty search should still show the raw catalog; history errors should stay isolated to the modal.

## Information Model

- Primary objects shown: command path, description, argument summary, metadata-driven visibility, favorite state.
- Filters / grouping: search by path or description, filter by argument support or metadata flags, sort favorites first.
- Row or card actions: open command, toggle favorite, open history modal.
- Detail / modal surfaces: command-history modal with filters for command, guild, channel, actor, and status.

## Components

- Reuse: `CmdList`, `CommandLauncher`, `cmdBrowserState` helpers.
- Add: `CommandFavoriteToggle`, `CommandHistoryButton`, `CommandHistoryDialog`, `favoriteCmdUtil.ts`.
- Extend: `CmdList` row actions so favorites and history live on the same row model.
- Merge: share the same discovery vocabulary with the launcher instead of inventing a curated-browser branch.

## Implementation Delta

- Route changes: `/commands` remains the owner; `/command` is current implementation detail, not a planning requirement.
- Read model changes: keep discovery local, but add server-backed `command_history` for history inspection.
- Mutation changes: favorites can start local through `favoriteCmdUtil.ts`, with a persistence-friendly API boundary for later backend sync.
- Cache / reload changes: preserve current URL-backed browser state and recent-page cache behavior.
- Avoid: curated clusters, a recent-command strip, and any history model that lives only in local browser storage.

## Route And Navigation

- Linked from: merged navbar search, launcher, any page that offers raw command fallback.
- Links to: `/command/:command`, `/placeholders/:placeholder`, and pages that deep-link into command fallback explicitly.
- Header / nav actions: keep them lightweight so search remains dominant.
- Preserved context: URL-backed filters and favorites ordering.

## Permissions And Context

- Auth and scope requirements: the browser can remain public-safe.
- Role gates: rows should still reflect command metadata visibility and viewability.
- Setup dependency / recovery: this is the universal fallback surface when a workflow page does not yet have a native shell.
- Delegation / inherited context: not owned here.

## Commands And Mutations

- Existing commands: the page indexes all commands; it does not execute them.
- Preview / confirm: opening a command routes into `/command/:command` where preview and execution belong.
- Permission checks: handled by metadata and the destination runner.
- Side effects / cache refresh: favorite toggles update local browser state; history modal refreshes its own endpoint data.

## Open Questions And Backend Gaps

- Add `command_history` so history is modal-driven and filterable by command, guild, or channel.
- Keep favorites behind `favoriteCmdUtil.ts` so backend persistence can be added later without reworking the UI contract.
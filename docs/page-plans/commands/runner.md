# Command Runner

- Classification: `route`
- Status: `Evolve`
- Primary route or owner: `/command/:command`
- Nav group: `Commands`
- Primary actor: `everyone`
- Scope: `none`
- Current code:
	- `src/pages/command/index.tsx`
	- `src/pages/command/view_command.tsx`
	- `src/components/cmd/useCommandExecution.ts`
	- `src/components/cmd/CommandComponent.tsx`
- Read substrate:
	- Endpoints: command metadata locally, viewable route support where available, future `command_history`
	- Response types: metadata-defined argument shapes, `WebViewCommand`, and view-specific endpoint types
	- Table / graph / placeholder types: command metadata remains the authoritative input contract
	- Required columns / filters: current command path, URL-backed initial values, future command-history filter by current command
- Write substrate:
	- Endpoints / command families: generic command execution through the existing runner infrastructure
	- Existing form / action components: `CommandComponent`, `CommandStringPreview`, `useCommandExecution`
	- Reload / invalidation targets: current output panel plus any route-specific follow-up pages the command links into

## Why It Exists

- Owns: argument entry, command preview, execution, and output inspection for any command path.
- Does not own: page-specific read models that deserve a dedicated workflow surface.
- Current gap: the doc needed to replace vague preset-strip language with a concrete saved-command and history model.

## Workflows

1. Run a command from raw metadata
	 - Entry: `/command/:command`
	 - Preconditions: command exists in metadata
	 - Reads: command definition, URL-backed initial values
	 - UI path: fill args, inspect generated string, run, inspect result
	 - Mutations: command execution through the existing runner
	 - Handoff / exit: stay on the page or follow a related workflow link
2. Reopen or share a prefilled command
	 - Entry: command URL with query params
	 - Preconditions: command path resolves
	 - Reads: query params into initial form state
	 - UI path: page loads with values prefilled and preview updated
	 - Mutations: rerun or adjust and rerun
	 - Handoff / exit: share the URL or branch into `/view_command/:command` when result-first rendering makes sense
3. Reuse saved commands or inspect history
	 - Entry: saved-command dropdown or command-scoped history button
	 - Preconditions: local saved commands exist or the history endpoint exists
	 - Reads: local saved-command entries plus future `command_history` filtered to the current command path
	 - UI path: choose a saved variant from one dropdown, or open history modal scoped to this command
	 - Mutations: save or remove a local command variant
	 - Handoff / exit: form repopulates and runs from the same runner page

## Layout Structure

- Top-level regions: mode toggle, command form, command string preview, output panel, lightweight related-links area.
- Tabs / panels / drawers: keep card and focus-pane modes; use a modal for history instead of a persistent strip.
- URL state: command args remain shareable through query params.
- Empty / loading / error states: missing command path should fail plainly; permission and execution failures should render in the output area.

## Information Model

- Primary objects shown: argument form, generated command string, keyboard hints, execution result, saved-command options, command-scoped history.
- Filters / grouping: saved commands grouped by current command path; history filtered to the current command path first.
- Row or card actions: run, clear, switch display mode, save current values, remove saved entry, open command history.
- Detail / modal surfaces: command-history modal and result-first `view_command` route when appropriate.

## Components

- Reuse: `CommandComponent`, `CommandStringPreview`, `useCommandExecution`, keyboard helpers, `ViewCommand`.
- Add: `SavedCommandSelect`, `CommandHistoryButton`, `CommandHistoryDialog`, shared saved-command helpers built on `favoriteCmdUtil.ts` or a sibling util.
- Extend: the command page shell so saved commands and history stay lightweight and command-scoped.
- Merge: use the same history button contract as the browser page instead of inventing a second history UI.

## Implementation Delta

- Route changes: `/command/:command` remains the owner; `/view_command/:command` stays a related result-first route rather than replacing the runner.
- Read model changes: add command-scoped history and lightweight saved-command state without changing how metadata drives the form.
- Mutation changes: command execution stays generic; saved-command add/remove can stay local-first.
- Cache / reload changes: no new global cache layer; keep output and saved-command state local to the route.
- Avoid: a recent-preset bar, heavy chrome that competes with the form, or a second execution surface that drifts from this page.

## Route And Navigation

- Linked from: `/commands`, launcher, menus, embeds, and wrapped workflow pages that provide an advanced fallback.
- Links to: `/commands`, `/view_command/:command`, related workflow routes when they exist.
- Header / nav actions: keep them secondary to the form itself.
- Preserved context: command path, query-param-backed initial values, display mode, and saved-command selection.

## Permissions And Context

- Auth and scope requirements: depend on the selected command.
- Role gates: the page should surface permission failures rather than silently hiding commands or outputs.
- Setup dependency / recovery: this is the universal fallback when a specialized page is missing or incomplete.
- Delegation / inherited context: not owned by this page.

## Commands And Mutations

- Existing commands: effectively all commands in metadata.
- Preview / confirm: always show the generated command string before execution.
- Permission checks: enforced by the command substrate and surfaced in the output area.
- Side effects / cache refresh: owned by the executed command and any destination pages it links into.

## Open Questions And Backend Gaps

- Add `command_history` so the history button can filter server-backed runs by the current command path.
- Keep saved commands lightweight and local-first unless a shared backend persistence requirement emerges later.

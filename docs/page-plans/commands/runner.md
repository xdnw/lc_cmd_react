# Command Runner

- Status: `Evolve`
- Primary route: `/command/:command`
- Legacy aliases: `/view_command/:command` for result-first rendering, related support route `/placeholders/:placeholder`
- Nav group: Commands
- Primary users: power users, admins, and anyone using the universal fallback instead of a guided page
- Current references: `src/pages/command/index.tsx`, `src/pages/command/view_command.tsx`, `src/components/cmd/useCommandExecution.ts`

## Why It Exists

- This route is the universal fallback for any capability not yet wrapped in a specialized page.
- It already has strong keyboard support, command preview, and execution behavior; that should be preserved.

## Workflows

- Primary: fill arguments, preview the command string, run the command, inspect output.
- Secondary: switch between compact and focus-pane modes, jump between args, share or reopen command URLs with prefilled args.
- Why users arrive here: long-tail workflows, admin actions, deep links from menus / embeds / guided pages, troubleshooting.

## Layout and Look

- Keep the current command shell and make it feel like an expert tool.
- Preserve card and focus-pane modes.
- Add context links back to the owning guided page when one exists, but do not hide the raw form.

## Information and Interactions

- Show the argument form, generated command string, keyboard hints, and result area together.
- Preserve URL-backed initial values so command links are shareable.
- Support viewable result routes and inline rendered output where available.
- Surface related pages, saved presets, and recent runs without getting in the way of the form.

## Components

- Existing shared: `CommandComponent`, `CommandStringPreview`, `useCommandExecution`, argument-jump and keyboard helpers, `ViewCommand`.
- New shared or page-specific: `RelatedWorkflowLinks`, `RecentCommandPresetBar`, `CommandContextBadge`.
(note: RecentCommandPresetBar drop it. its nonsense. There should be saved commands, done through a single dropdown, with add/remove (routed via favoriteCmdUtil.ts), and a history button (reuse history button from the cmd list page (see browser.md), but have it scoped to the command))

## Data and Endpoints

- Existing endpoints: generic command execution support plus whatever underlying web endpoints are already exposed for viewable routes.
- Existing table / graph / placeholder substrate: command metadata remains the authoritative input definition.
- New endpoints likely needed: none required for MVP; saved presets or command-run history would need persistence later.

## Command Bindings

- Existing commands: effectively all commands exposed in metadata.
- Commands likely needing changes: none required; the point of this page is to stay generic.
- Command preview / confirmation rules: always keep the generated command string visible before run, especially for destructive or multi-entity commands.

## Navigation

- Links to: `/commands`, owning guided pages like Economy or War views when available, `/view_command/:command` when a result-first route is appropriate.
- Linked from: command browser, global launcher, menus, embeds, guided workflow "advanced" actions.

## Permissions and Context

- Public or guild-scoped depending on the specific command.
- The page should clearly surface permission failures instead of silently hiding them.

## Risks and Open Questions

- Do not let guided pages and the command runner drift into inconsistent argument naming or preview behavior.
- Recent presets need to stay lightweight and not clutter the expert workflow.
- `view_command` and `placeholders` should stay obviously related without being collapsed into the same route.

# Embeds

- Status: `Wrap`
- Primary route: `/server/embeds`
- Legacy aliases: none; current flow is command-only
- Nav group: Server
- Primary users: admins and staff building Discord embed-based workflows
- Current references: command metadata for `embed *`, `src/pages/commands/index.tsx`, `src/pages/command/index.tsx`

## Why It Exists

- Embed composition, button wiring, and preview are all much easier in the browser.
- This page is one of the clearest examples of a browser-native builder replacing command memorization.
- The first version should still be honest about its substrate: command-backed inspection and mutation with a better editor shell around it.

## Workflows

- Primary: create embeds, inspect an existing embed, edit title or description, add command or modal or raw buttons, rename or remove buttons, preview and update embeds.
- Secondary: inspect template-driven embed outputs, copy an existing embed definition, or jump into the underlying command target.
- Why users arrive here: server onboarding, war / intel panels, recruitment prompts, self-service Discord tooling.
- Upstream entry points: `Server Setup`, `Menus`, `Announcements`, command fallback.
- Downstream hand-offs: `Command Runner`, rollout inside Discord, or related server builder pages.

## Layout and Look

- Left: embed library or selected message target.
- Center: embed canvas and field editor.
- Right: button editor plus live preview and command target summary.
- The page should feel like a composer, not like a low-level message inspector.
- If the page is inspecting embeds through message URLs or command-backed reads, make that input model explicit.

## Information and Interactions

- Title, description, color, required role, and target channel.
- Button list with type, label, behavior, command target, defaults, and removal or rename controls.
- Preview of the final Discord embed plus button behavior summary.
- Quick path into command pages for complex button targets.
- Treat template-driven flows as first-class starters. Many real guild workflows will begin from `embed template *`, not from a blank compose screen.

## Components

- Existing shared: command preview helpers, buttons, cards, dialogs, command runner links.
- New shared or page-specific: `EmbedLibrary`, `EmbedCanvas`, `EmbedButtonEditor`, `EmbedPreview`, `EmbedTargetInspector`, `TemplateStarterGrid`.

## Data and Endpoints

- Existing endpoints: `COMMAND`, `PERMISSION`.
- Existing table / graph / placeholder substrate: none obvious for current embed inventory.
- Existing command substrate: `embed info`, `embed template *`, and the command runner already cover the essential inspect and mutate flows for a wrapped builder.
- Current backend gaps: none for the first wrapped builder.
- Existing `embed info`, `embed template *`, and mutate commands are enough to ship the page.
- Later only if browse/edit loops become a real blocker: embed library, detail, and preview-state reads.

## Command Bindings

- Existing commands: `embed create`, `embed title`, `embed description`, `embed update`, `embed info`, `embed add command`, `embed add modal`, `embed add raw`, `embed remove button`, `embed rename button`, `embed commands`, `embed template *`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: every update should show the current embed info, outgoing embed definition, button targets, and affected message or channel before submit.

## Navigation

- Links to: `/server/menus`, `/commands`, `/command/:command`, `/home/announcements` for related message workflows.
- Linked from: setup flow, command launcher, menu builder deep links.

## Permissions and Context

- Requires login, selected guild, and embed-management permissions.
- Channel or role targets depend on current guild state.

## Risks and Open Questions

- This page should not pretend it already has a first-class embed inventory endpoint.
- Shared builder primitives with Menus should be intentional, not forced into one confusing page.
- Need to decide how template-driven embeds fit beside hand-built embeds in the UI.

# Embeds

- Status: `New`
- Primary route: `/server/embeds`
- Legacy aliases: none; current flow is command-only
- Nav group: Server
- Primary users: admins and staff building Discord embed-based workflows
- Current references: command metadata for `embed *`

## Why It Exists

- Embed composition, button wiring, and preview are all much easier in the browser.
- This page is one of the clearest examples of a browser-native builder replacing command memorization.

## Workflows

- Primary: create embeds, edit title or description, add command / modal / raw buttons, rename or remove buttons, preview and update embeds.
- Secondary: inspect template-driven embed outputs or command-card patterns.
- Why users arrive here: server onboarding, war / intel panels, recruitment prompts, self-service Discord tooling.

## Layout and Look

- Left: embed library or selected message target.
- Center: embed canvas and field editor.
- Right: button editor plus live preview and command target summary.
- The page should feel like a composer, not like a low-level message inspector.

## Information and Interactions

- Title, description, color, required role, and target channel.
- Button list with type, label, behavior, command target, defaults, and removal or rename controls.
- Preview of the final Discord embed plus button behavior summary.
- Quick path into command pages for complex button targets.

## Components

- Existing shared: command preview helpers, buttons, cards, dialogs.
- New shared or page-specific: `EmbedLibrary`, `EmbedCanvas`, `EmbedButtonEditor`, `EmbedPreview`, `EmbedTargetInspector`.

## Data and Endpoints

- Existing endpoints: none found for embed list or detail reads.
- Existing table / graph / placeholder substrate: none obvious.
- New endpoints likely needed: embed library, embed detail, and preview-state endpoints are likely required for a fully usable builder.

## Command Bindings

- Existing commands: `embed create`, `embed title`, `embed description`, `embed update`, `embed info`, `embed remove`, `embed rename`, `embed add command`, `embed add modal`, `embed add raw`, `embed commands`, `embed template`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: every update should show the outgoing embed definition, button targets, and affected message or channel before submit.

## Navigation

- Links to: `/server/menus`, `/commands`, `/command/:command`, `/home/announcements` for related message workflows.
- Linked from: setup flow, command launcher, menu builder deep links.

## Permissions and Context

- Requires login, selected guild, and embed-management permissions.
- Channel or role targets depend on current guild state.

## Risks and Open Questions

- This page is heavily dependent on read endpoints for current embed state.
- Shared builder primitives with Menus should be intentional, not forced into one confusing page.
- Need to decide how template-driven embeds fit beside hand-built embeds in the UI.

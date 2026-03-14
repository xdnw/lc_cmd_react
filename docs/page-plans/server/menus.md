<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Menus

- Status: `Wrap`
- Primary route: `/server/menus`
- Legacy aliases: none; current flow is command-only
- Nav group: Server
- Primary users: admins and staff building Discord menus for guided actions
- Current references: command metadata for `menu *`, `src/pages/commands/index.tsx`, `src/pages/command/index.tsx`

## Why It Exists

- Menus are inherently visual and ordered; they are poor candidates for staying slash-command-only.
- A browser-native builder can make menu state, button order, and command targets much easier to reason about.
- The first version should wrap the existing menu commands and current command browser, not depend on a new menu library endpoint that does not exist yet.

## Workflows

- Primary: create menus, inspect an existing menu, edit title and description, add or remove buttons, rename buttons, reorder buttons, and preview the result.
- Secondary: open or edit menus in a command-backed flow and hand off to embed or command pages for complex targets.
- Why users arrive here: server setup, onboarding, self-service command builders, war or econ action panels.
- Upstream entry points: `Server Setup`, `Embeds`, command fallback.
- Downstream hand-offs: `Command Runner`, `Embeds`, and server rollout work.

## Layout and Look

- Left: menu library.
- Center: selected menu editor with title, description, and ordered button list.
- Right: live menu preview and target-command inspector.
- The page should feel like a builder studio, not a list of admin forms.
- If the library is command-backed rather than endpoint-native, say so in the UI and keep the inspect or refresh flow explicit.

## Information and Interactions

- Menu library with search and quick inspect actions backed by `menu list` and `menu info` style reads.
- Button list with move controls, label edits, command target preview, and validation.
- Preview of how the menu will look in Discord and what each button does.
- Ability to deep-link from a button into the underlying command page.
- Make the temporary menu editing context visible instead of hiding it; `menu context`, `menu edit`, and `menu cancel` are part of the real workflow.

## Components

- Existing shared: command preview helpers, dialog helpers, button and card primitives, command runner links.
- New shared or page-specific: `MenuLibrary`, `MenuEditorPanel`, `MenuButtonList`, `MenuPreview`, `MenuCommandInspector`, `MenuContextNotice`.

## Data and Endpoints

- Existing endpoints: `COMMAND`, `PERMISSION`.
- Existing table / graph / placeholder substrate: none obvious for menu library data.
- Existing command substrate: `menu list`, `menu info`, `menu open`, and `menu edit` already provide enough inspection and mutation coverage for a wrapped builder.
- Current backend gaps: none for the first wrapped builder.
- Existing `menu list`, `menu info`, `menu open`, and `menu edit` already cover the real workflow.
- Later only if the page is promoted beyond the command wrapper: menu library and detail reads.

## Command Bindings

- Existing commands: `menu list`, `menu create`, `menu title`, `menu description`, `menu edit`, `menu info`, `menu open`, `menu delete`, `menu button add`, `menu button remove`, `menu button rename`, `menu button swap`, `menu context`, `menu cancel`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: destructive changes and button target changes should show the current menu info and the resulting menu definition before submit.

## Navigation

- Links to: `/server/embeds`, `/commands`, `/command/:command` for button targets, `/server/settings`.
- Linked from: setup flow, command launcher, embed builder deep links.

## Permissions and Context

- Requires login, selected guild, and menu-management permissions.
- Some users may be allowed to edit labels but not underlying command targets.

## Risks and Open Questions

- Do not fake an endpoint-native menu library if the page is really using command-backed reads.
- Need to decide whether menu preview is static HTML only or can show richer behavioral hints.
- Button ordering needs a mobile-safe interaction model if drag-and-drop is avoided.

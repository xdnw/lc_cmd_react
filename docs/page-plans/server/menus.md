# Menus

- Status: `New`
- Primary route: `/server/menus`
- Legacy aliases: none; current flow is command-only
- Nav group: Server
- Primary users: admins and staff building Discord menus for guided actions
- Current references: command metadata for `menu *`

## Why It Exists

- Menus are inherently visual and ordered; they are poor candidates for staying slash-command-only.
- A browser-native builder can make menu state, button order, and command targets much easier to reason about.

## Workflows

- Primary: create menus, edit title and description, add or remove buttons, rename buttons, reorder buttons, preview the result.
- Secondary: inspect existing menus and open them in Discord.
- Why users arrive here: server setup, onboarding, self-service command builders, war or econ action panels.

## Layout and Look

- Left: menu library.
- Center: selected menu editor with title, description, and ordered button list.
- Right: live menu preview and target-command inspector.
- The page should feel like a builder studio, not a list of admin forms.

## Information and Interactions

- Menu library with search, status, and quick duplicate / delete actions if supported later.
- Button list with drag or move controls, label edits, command target preview, and validation.
- Preview of how the menu will look in Discord and what each button does.
- Ability to deep-link from a button into the underlying command page.

## Components

- Existing shared: command preview helpers, dialog helpers, button and card primitives.
- New shared or page-specific: `MenuLibrary`, `MenuEditorPanel`, `MenuButtonList`, `MenuPreview`, `MenuCommandInspector`.

## Data and Endpoints

- Existing endpoints: none found for menu list or detail reads.
- Existing table / graph / placeholder substrate: none obvious.
- New endpoints likely needed: menu library and menu detail endpoints are very likely required if this page is to be more than a command launcher wrapper.

## Command Bindings

- Existing commands: `menu list`, `menu create`, `menu title`, `menu description`, `menu edit`, `menu info`, `menu open`, `menu delete`, `menu button add`, `menu button remove`, `menu button rename`, `menu button swap`, `menu context`, `menu cancel`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: destructive changes and button target changes should show the resulting menu definition before submit.

## Navigation

- Links to: `/server/embeds`, `/commands`, `/command/:command` for button targets, `/server/settings`.
- Linked from: setup flow, command launcher, embed builder deep links.

## Permissions and Context

- Requires login, selected guild, and menu-management permissions.
- Some users may be allowed to edit labels but not underlying command targets.

## Risks and Open Questions

- Without menu read endpoints the builder will feel fake.
- Need to decide whether menu preview is static HTML only or can show richer behavioral hints.
- Button ordering needs a mobile-safe interaction model if drag-and-drop is avoided.

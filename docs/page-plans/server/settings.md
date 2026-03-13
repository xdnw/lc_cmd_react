# Settings

- Status: `Evolve`
- Primary route: `/server/settings`
- Legacy aliases: `/settings`
- Nav group: Server
- Primary users: guild owners, admins, department leads, and staff who need to inspect or edit server config
- Current references: `src/pages/settings/index.tsx`, `src/pages/settings/settingsDomain.ts`, `src/pages/settings/components/SettingEditDialog.tsx`

## Why It Exists

- The current settings page is already one of the strongest surfaces in the app.
- It should become the anchor for server configuration, not be replaced by a flatter and weaker builder.

## Workflows

- Primary: browse, search, filter, and edit guild settings.
- Secondary: deep-link into a category from a workflow page, check permission support, inspect invalid values.
- Why users arrive here: setup work, policy changes, troubleshooting, command permission debugging.

## Layout and Look

- Keep the hierarchical sidebar, virtualized list, and per-setting status language.
- Add a stronger landing strip at the top with shortcut chips like `Alliance Setup`, `War Alerts`, `Interviews`, `Tax`, `Roles`, `Banking`.
- Preserve the dense editor feel; this page should look like a serious admin console.

## Information and Interactions

- Search settings by key, help text, or category.
- Filter by set / unset / invalid / unsupported / editable.
- Edit with typed inputs and inline help dialogs.
- Refresh individual settings and show why a setting is unavailable or invalid.
- Accept deep links from other pages into the relevant filtered or highlighted setting.

## Components

- Existing shared: `HierarchySidebarNav`, `SettingsTopBar`, `SettingsCategorySection`, `SettingEditDialog`, `TABLE`, query cache helpers.
- New shared or page-specific: `SettingsLandingShortcuts`, `SettingsBreadcrumbPills`, `WorkflowOriginBadge`.

## Data and Endpoints

- Existing endpoints: `TABLE`, `PERMISSION`.
- Existing table / graph / placeholder substrate: current page already uses `TABLE` with `GuildSetting` rows and is a good reference implementation.
- New endpoints likely needed: none for MVP; optional setting-history or bulk-audit endpoints may help later.

## Command Bindings

- Existing commands: `settings info` plus the full set of `settings_default *`, `settings_tax *`, `settings_interview *`, `settings_recruit *`, `settings_war_alerts *`, `settings_beige_alerts *`, and similar families.
- Commands likely needing changes: none required.
- Command preview / confirmation rules: the edit dialog should continue to make the underlying setting / command path visible for power users.

## Navigation

- Links to: `/server/roles`, `/server/channels`, `/server/menus`, `/server/embeds`, `/economy/tax`, `/members/interviews`, `/members/recruitment`.
- Linked from: workflow-specific settings pills, app shell Server nav, command launcher.

## Permissions and Context

- Requires login, selected guild, and edit permissions per setting.
- The page must clearly show when a user can view a setting but cannot modify it.

## Risks and Open Questions

- Do not hollow this page out in favor of thin wrappers elsewhere; it is the durable fallback surface.
- Shortcut categories should use user language, but the actual setting list still needs precise key names.
- Bulk edits or audit views may eventually deserve a dedicated sibling page, not more density here.

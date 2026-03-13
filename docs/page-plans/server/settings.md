# Settings

- Status: `Evolve`
- Primary route: `/server/settings`
- Legacy aliases: `/settings`
- Nav group: Server
- Primary users: guild owners, admins, department leads, and staff who need to inspect or edit server config
- Current references: `src/pages/settings/index.tsx`, `src/pages/settings/settingsDomain.ts`, `src/pages/settings/components/SettingEditDialog.tsx`, `src/pages/settings/components/SettingClearAction.tsx`, `src/pages/command/index.tsx`

## Why It Exists

- The current settings page is already one of the strongest surfaces in the app.
- It should become the anchor for server configuration, not be replaced by a flatter and weaker builder.
- It is the main settings-backed admin page in the product. Other server pages should wrap or deep-link into it when the underlying source of truth is really a guild setting.

## Workflows

- Primary: browse, search, filter, and edit guild settings.
- Secondary: deep-link into a category from a workflow page, check permission support, inspect invalid or inherited values, clear settings, and use the page as the fallback read model for setup repair.
- Why users arrive here: setup work, policy changes, troubleshooting, command permission debugging.

## Layout and Look

- Keep the hierarchical sidebar, virtualized list, and per-setting status language.
- Add a stronger landing strip at the top with shortcut chips like `Alliance Setup`, `War Alerts`, `Interviews`, `Tax`, `Roles`, `Banking`, and `Delegation`.
- Preserve the dense editor feel; this page should look like a serious admin console.
- User-facing shortcuts can group multiple backend categories, but the page should still expose the real category, subgroup, and setting key names.

## Information and Interactions

- Search settings by key, help text, or category.
- Filter by set / unset / invalid / unsupported / editable.
- Edit with typed inputs and inline help dialogs.
- Refresh individual settings and show why a setting is unavailable, invalid, or unsupported in the web editor.
- Clear existing values from the same surface.
- Make delegated or inherited behavior visible when a guild is using `settings_default delegate_server`.
- Accept deep links from other pages into the relevant filtered or highlighted setting.
- Act as the readback and repair surface for setup modules that do not need a dedicated page-level read model.

## Components

- Existing shared: `HierarchySidebarNav`, `SettingsTopBar`, `SettingsCategorySection`, `SettingEditDialog`, `SettingClearAction`, `TABLE`, query cache helpers.
- New shared or page-specific: `SettingsLandingShortcuts`, `SettingsBreadcrumbPills`, `WorkflowOriginBadge`, `DelegatedSettingBadge`.

## Data and Endpoints

- Existing endpoints: `TABLE`, `PERMISSION`, `COMMAND`.
- Existing table / graph / placeholder substrate: the current page already uses `TABLE` with `GuildSetting` rows plus `GuildSetting` placeholder helpers and is a good reference implementation.
- Existing command substrate: edit and clear flows already map cleanly onto `settings info` and `settings delete` style command execution.
- New endpoints likely needed: none for MVP; optional setting-history, inheritance-trace, or bulk-audit endpoints may help later.

## Command Bindings

- Existing commands: `settings info`, `settings delete`, and the full set of `settings_default *`, `settings_foreign_affairs *`, `settings_war_alerts *`, `settings_beige_alerts *`, `settings_orbis_alerts *`, `settings_war_room *`, `settings_bank_access *`, `settings_bank_conversion *`, `settings_bank_offshore *`, `settings_bank_grants *`, `settings_bank_info *`, `settings_tax *`, `settings_audit *`, `settings_auto_role *`, `settings_self_role *`, `settings_reward *`, `settings_recruit *`, `settings_interview *`, `settings_bounty *`, and `settings_trade *` families.
- Commands likely needing changes: none required.
- Command preview / confirmation rules: the edit dialog should continue to make the underlying setting or command path visible for power users, especially when a wrapper page deep-links into this surface.

## Navigation

- Links to: `/server/roles`, `/server/channels`, `/server/menus`, `/server/embeds`, `/economy/tax`, `/members/interviews`, `/members/recruitment`, `/commands`.
- Linked from: `/server/setup`, workflow-specific settings pills, app shell Server nav, command launcher, and wrapped server builder pages.

## Permissions and Context

- Requires login, selected guild, and edit permissions per setting.
- The page must clearly show when a user can view a setting but cannot modify it.

## Risks and Open Questions

- Do not hollow this page out in favor of thin wrappers elsewhere; it is the durable fallback surface.
- Shortcut categories should use user language, but the actual setting list still needs precise key names.
- Bulk edits or audit views may eventually deserve a dedicated sibling page, not more density here.
- If the wrapped server pages hide their dependency on `GuildSetting`, users will lose the clearest repair path the app already has.

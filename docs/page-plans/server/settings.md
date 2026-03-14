<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Settings

- Classification: `route`
- Status: `Evolve`
- Primary route or owner: `/server/settings`
- Nav group: `Server`
- Primary actor: `admin`
- Scope: `guild`
- Current code:
	- `src/pages/settings/index.tsx`
	- `src/pages/settings/settingsDomain.ts`
	- `src/pages/settings/components/SettingEditDialog.tsx`
	- `src/pages/settings/components/SettingClearAction.tsx`
- Read substrate:
	- Endpoints: `TABLE`, `PERMISSION`
	- Response types: `WebTable`, `WebPermission`
	- Table / graph / placeholder types: `GuildSetting` with placeholder columns from `src/pages/settings/settingsDomain.ts`
	- Required columns / filters: `name`, `getwebtype`, `getcategory`, `getsubgroup`, `help`, local `getvaluestring`, local `getvalueraw`, `hasinvalidvalue`, `ischanneltype`, `allowed`
- Write substrate:
	- Endpoints / command families: `COMMAND`, `settings info`, `settings delete`
	- Existing form / action components: `SettingEditDialog`, `SettingClearAction`
	- Reload / invalidation targets: the `GuildSetting` `TABLE` query plus per-setting refresh in `src/pages/settings/index.tsx`

## Why It Exists

- Owns: browsing, filtering, editing, clearing, and diagnosing guild settings.
- Does not own: bespoke workflow UIs for roles, banking, interviews, menus, or embeds when those pages need their own operator shell.
- Current gap: the page is already strong, but the planning doc needed to describe the real substrate, explicit shortcut groups, and the delegated-state/audit work that is still missing.

## Workflows

1. Browse and edit settings
	 - Entry: `/server/settings`
	 - Preconditions: selected guild
	 - Reads: `TABLE` over `GuildSetting` rows and row-level permission state
	 - UI path: search, filter, select a row, edit or clear it from the same page
	 - Mutations: `settings info`, `settings delete`
	 - Handoff / exit: stay on the page with the same filters and refreshed data
2. Jump in from setup or a wrapped admin page
	 - Entry: `/server/setup`, `/server/roles`, `/members/interviews`, `/economy/tax`
	 - Preconditions: user followed a deep link for a specific setting family
	 - Reads: same `GuildSetting` table query plus highlighted key/category context
	 - UI path: page opens with the relevant category, subgroup, or setting key in focus
	 - Mutations: same edit and clear actions
	 - Handoff / exit: back to the owning workflow page once the blocker is fixed
3. Diagnose delegated or invalid configuration
	 - Entry: a setting row marked unset, invalid, unsupported, or inherited
	 - Preconditions: selected guild and row visible in the browser
	 - Reads: local-value columns now, plus future `setting_inheritance_trace` and `audit_setting`
	 - UI path: inspect why the value is unavailable, inherited, or broken before changing it
	 - Mutations: edit, clear, or audit a single setting
	 - Handoff / exit: into setup repair, roles repair, or another wrapped admin page

## Layout Structure

- Top-level regions: merged page sidebar, `SettingsTopBar`, workflow shortcut strip, virtualized settings list, edit and help dialogs.
- Tabs / panels / drawers: no tab split; use a single dense browser with dialog surfaces for help, editing, inheritance trace, and per-setting audit.
- URL state: search, filters, and highlighted setting should be deep-linkable when another page routes here.
- Empty / loading / error states: keep the dense admin-console feel, but surface schema problems, unsupported editor inputs, and permission failures explicitly.

## Information Model

- Primary objects shown: `GuildSetting` rows with key, category, subgroup, help, local value, editor support, allowed state, and invalid state.
- Filters / grouping: search by key/help/category, filter by set/unset/invalid/unsupported/editable, group by category and subgroup.
- Row or card actions: edit value, clear value, show help, refresh one setting, open inheritance trace, run one-setting audit.
- Detail / modal surfaces: edit dialog, help dialog, future inheritance trace dialog, future one-setting audit dialog.

## Components

- Reuse: `SettingsTopBar`, `SettingsCategorySection`, `SettingEditDialog`, `SettingClearAction`, `SidebarNav`, query cache helpers.
- Add: `SettingsWorkflowShortcuts`, `SettingInheritanceDialog`, `SettingAuditDialog`, `RoleBindingsSummaryCard`.
- Extend: `settingsDomain.ts` so the browser can show both local and effective value state once the backend supports it cleanly.
- Merge: keep settings browsing, repair, and deep-link handling in this page instead of scattering the same logic across every admin page.

## Implementation Delta

- Route changes: plan around `/server/settings` as the primary route; current `/settings` is implementation detail, not a long-term planning requirement.
- Read model changes: add delegated-source and one-setting audit support instead of treating inheritance as an invisible side effect.
- Mutation changes: keep web editing on `settings info` and `settings delete`; do not mirror every Discord-only `settings_*` subcommand in the brief.
- Cache / reload changes: preserve current per-setting refresh behavior and invalidate the main `GuildSetting` table after edits or clears.
- Avoid: vague shortcut chips, a second admin builder, or a docs plan that pretends the page owns every server workflow directly.

## Route And Navigation

- Linked from: `/server/setup`, `/server/roles`, `/server/channels`, `/server/menus`, `/server/embeds`, `/economy/tax`, `/members/interviews`, `/members/recruitment`.
- Links to: the wrapped admin pages above, plus `/commands` for raw fallback.
- Header / nav actions: shortcut groups should be explicit: `Alliance/Auth`, `Roles`, `Banking`, `War Alerts`, `Tax`, `Interviews`, and `Delegation`.
- Preserved context: selected guild, current filters, highlighted setting, and owning workflow context.

## Permissions And Context

- Auth and scope requirements: login plus selected guild.
- Role gates: viewing and editing remain row-specific; users may be able to inspect a setting without being allowed to change it.
- Setup dependency / recovery: this is the default repair surface when setup pages or wrapped admin pages hit a `GuildSetting` blocker.
- Delegation / inherited context: use `WebSession.delegates_to` plus future `setting_inheritance_trace` so inherited values are explicit instead of implied.

## Commands And Mutations

- Existing commands: `settings info`, `settings delete`.
- Preview / confirm: edit and clear flows should confirm the setting key and resulting value, but do not need a raw command-preview section for every row.
- Permission checks: row-level `allowed` state plus `PERMISSION` checks where needed.
- Side effects / cache refresh: refresh the edited row and invalidate the main `GuildSetting` table cache.

## Open Questions And Backend Gaps

- Add `setting_inheritance_trace` so the page can explain local vs. delegated values cleanly.
- Add `audit_setting` so the page can audit one setting at a time instead of pretending a giant bulk validator belongs in the main list.
- Add `role_bindings` so the `Roles` and `Server Setup` shortcuts can show real alias coverage instead of only linking to commands.

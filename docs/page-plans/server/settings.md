<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->
To add:
coalitions - uses the coalitions endpoint to manage coalitions
Role setalias
banking (mainly offshore setup)
server delegation

settings validation - backend needs a isValidationCheap

Settings groups: (These are filters which show the settings they specify (even if unavialable) and walk the user through setting each)
initial setup
war alerts
recruitment

interviews, context menus, embeds, tax
- Add `setting_inheritance_trace` so the page can explain local vs. delegated values cleanly.
- Add `audit_setting` so the page can audit one setting at a time instead of pretending a giant bulk validator belongs in the main list.
- Add `role_bindings` so the `Roles` and `Server Setup` shortcuts can show real alias coverage instead of only linking to commands.


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

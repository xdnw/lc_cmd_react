<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Context And Scoping

- Status: `Cross-cutting`
- Primary route: all guild-scoped pages
- Legacy aliases: n/a
- Nav group: cross-cutting
- Primary users: logged-in members, staff, and admins working inside a selected Discord guild
- Current references: `src/components/api/SessionContext.tsx`, `src/pages/guild_picker/index.tsx`, `src/pages/settings/index.tsx`, `src/pages/commands/index.tsx`, `src/pages/command/index.tsx`, `src/lib/layouts/tabs/dbNation.ts`, `src/lib/layouts/tabs/dbAlliance.ts`

## Why It Exists

- The hardest way to make this app feel inconsistent is to let every page invent its own scope model.
- Guild, alliance, and nation context already exist in the product and command metadata, so the docs need one shared rule set.

## Workflows

- Primary: select a guild, inherit sensible defaults, then narrow or widen scope inside the current section without losing orientation.
- Secondary: recover from missing setup, switch guilds cleanly, inspect delegated settings, or jump into the command runner with the same scope preserved.
- Why users arrive here: every protected workflow depends on the same context model.
- Upstream entry points: login flow, `Guild Select`, deep links into guild-scoped pages, command launcher.
- Downstream hand-offs: `Home`, `Economy`, `War`, `Members`, `Server`, and any command page that should preserve current context.

## Layout and Look

- Show a compact context bar on guild-scoped pages.
- Keep guild context global and obvious.
- Treat alliance and nation scope as task tools, not as global chrome unless the page genuinely needs them.

## Information and Interactions

- `Guild` is the global workspace boundary and is session-backed through `SESSION`, `SET_GUILD`, and `UNSET_GUILD`.
- Switching guild should invalidate guild-specific filters, `TABLE` read models, setting highlights, command previews, and workflow-local saved state.
- `Alliance` scope is sticky per section by default and overridable per page when a workflow needs one, many, or all guild alliances.
- `Current nation` is the default personal scope for member-facing pages and a fast filter for staff pages.
- A selected guild should never be implied only by query params or by command defaults; the active guild must remain visible in page chrome.
- Some guilds will rely on delegated configuration via `settings_default delegate_server`; pages should surface inherited state instead of assuming every relevant setting is local.
- Pages that act on members or alliances should offer plain-language scope choices such as `My nation`, `All registered alliances`, `Specific alliance`, or `Specific set` when the command family supports them.
- Do not force a single global alliance picker across the entire app. Grant work, tax work, member work, and reporting do not all need the same scope shape.
- Missing readiness is part of context, not a separate concern. If alliances, API, required roles, or required channels are missing, surface that with a direct path into `Server Setup` or the relevant `Server Settings` section.
- Pages that fall back to the command browser or runner should preserve the current guild and any meaningful local alliance or nation scope when building deep links.
- Query params may store local filters and saved views, but they should not silently change the active guild.

## Components

- Existing shared: `SessionProvider`, `useSession`, current guild-picker flow, command browser route state, existing query-backed route state.
- New shared or page-specific: merged shell session summary support, `ScopeAwareSelectionBar`, `AllianceScopeChips`, `CurrentNationBadge`, `SetupRecoveryNotice`, `DelegatedScopeNotice`, `WorkflowCommandFallbackLink`.

## Data and Endpoints

- Existing endpoints: `SESSION`, `SET_GUILD`, `UNSET_GUILD`, `INPUT_OPTIONS`, `TABLE`, `COMMAND`.
- Existing table / graph / placeholder substrate: `GuildSetting` rows, `%guild_alliances%`, `DBNation`, and `DBAlliance` already cover most current context and readiness reads.
- New endpoints likely needed: none for the current shell model; if more shared context is required later, extend `WebSession` rather than adding a separate `guild_context_summary` endpoint.

## Command Bindings

- Existing commands: none are owned here, but setup recovery often links into `settings_default registeralliance`, `settings_default registerapikey`, `settings_default delegate_server`, `settings info`, and relevant role or channel commands.
- Commands likely needing changes: none required for the doc model itself.
- Command preview / confirmation rules: when a workflow opens the raw command fallback, preserve the current guild and any meaningful local scope.

## Navigation

- Links to: `docs/page-plans/core/guild-select.md`, `docs/page-plans/core/workflow-map.md`, `docs/page-plans/server/setup.md`, `docs/page-plans/server/settings.md`.
- Linked from: page-plan index, shell guidance, and any page brief that depends on guild or alliance scoping.

## Permissions and Context

- Required scope: login for all protected workflows; selected guild for guild-scoped pages.
- Relevant settings or role gates: permissions vary per page, but the scope model must stay consistent even when actions are hidden.
- Recovery path when setup is incomplete: route users to `/guild_select`, `/server/setup`, or `/server/settings` with the relevant category preselected.

## Risks and Open Questions

- The product should not assume one guild equals one alliance.
- Scope persistence has to feel helpful, not spooky; users should always know what they are acting on.
- Pages that only need personal context should not be burdened with multi-alliance controls up front.
- Deep links into command pages must not accidentally change or hide the active guild context.
<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# App Shell

- Classification: `cross-cutting`
- Status: `Cross-cutting`
- Primary route or owner: `src/components/layout/page-view.tsx`
- Nav group: `cross-cutting`
- Primary actor: `everyone`
- Scope: `none`
- Current code:
	- `src/components/layout/page-view.tsx`
	- `src/components/layout/navbar.tsx`
	- `src/components/layout/SidebarNav.tsx`
	- `src/components/layout/RecentPageKeepAlive.tsx`
	- `src/appRoutes.ts`
- Read substrate:
	- Endpoints: `SESSION`, `SET_GUILD`, `UNSET_GUILD`, `INPUT_OPTIONS`
	- Response types: `WebSession`, `WebSuccess`, `SetGuild`, `WebOptions`
	- Table / graph / placeholder types: none
	- Required columns / filters: n/a
- Write substrate:
	- Endpoints / command families: `SET_GUILD`, `UNSET_GUILD`
	- Existing form / action components: `Navbar`, command launcher entry points, guild switch affordances in the shared shell
	- Reload / invalidation targets: session context and route-level shell state

## Why It Exists

- Owns: global navigation, current session and guild context, command-launch access, and recent-page continuity.
- Does not own: page-specific filters, setup checklists, or per-route workflow logic.
- Current gap: the shell docs were still describing a separate context bar and rail model after the navbar, sidebar, and session display were merged.

## Workflows

1. Enter and orient
	 - Entry: login return, `/home`, or `/guild_select`
	 - Preconditions: none
	 - Reads: `SESSION`
	 - UI path: merged navbar shows user, guild, alliance, nation, and section navigation in one shared shell
	 - Mutations: `SET_GUILD`, `UNSET_GUILD`
	 - Handoff / exit: into a section landing page such as `Home`, `Server Setup`, or `Commands`
2. Switch sections without losing context
	 - Entry: any routed page using `PageView`
	 - Preconditions: route has shell chrome enabled
	 - Reads: route metadata from `src/appRoutes.ts`, recent-page cache state, `WebSession`
	 - UI path: expandable sidebar groups and page header actions keep the current guild and section visible
	 - Mutations: none beyond route changes
	 - Handoff / exit: next page keeps current search params or recent-page state where configured
3. Reach utility routes quickly
	 - Entry: navbar or shell actions
	 - Preconditions: none
	 - Reads: route metadata for `/commands`, `/guild_select`, and `/status`
	 - UI path: utility links stay in global chrome instead of being buried inside a report section
	 - Mutations: none
	 - Handoff / exit: into command fallback, guild switching, or task health inspection

## Layout Structure

- Top-level regions: merged navbar, shared sidebar navigation, route header, page content, recent-page keep-alive layer, command launcher.
- Tabs / panels / drawers: section groups in the sidebar should expand to show their subpages; mobile should open navigation from a navbar button into a modal or sheet rather than keeping a separate legacy rail.
- URL state: route path and page-local search params; shell itself should not invent a second context URL layer.
- Empty / loading / error states: when no guild is selected, guild-scoped pages should surface that clearly inside the existing shell instead of swapping to a different chrome model.

## Information Model

- Primary objects shown: current user, current guild, registered alliances, current nation, top-level sections, current route header actions, and the `/status` utility entry.
- Filters / grouping: top-level sections grouped by visible app navigation; sidebar children grouped by subpages within a section.
- Row or card actions: navigate, open command launcher, switch guild, open `/status`, and follow page header actions.
- Detail / modal surfaces: command launcher modal and mobile navigation modal.

## Components

- Reuse: `Navbar`, `PageView`, `SidebarNav`, `RecentPageKeepAlive`, `CommandLauncher`, `SessionProvider`, `DialogProvider`.
- Add: `StatusNavLink`, grouped sidebar section metadata, and a mobile nav modal triggered from the navbar.
- Extend: the merged navbar/session summary should remain the only shared context surface; if more context is needed later, extend `WebSession` rather than reintroducing a separate context bar endpoint.
- Merge: keep navigation, session summary, and utility links in the existing shared shell instead of splitting them into new parallel chrome components.

## Implementation Delta

- Route changes: keep visible navigation aligned with `Home`, `Economy`, `War`, `Members`, `Server`, `Reports`, and `Commands`; treat `/status` as a global utility link instead of a report landing page.
- Read model changes: none required if `WebSession` already contains guild, alliance, nation, and delegated-server context.
- Mutation changes: none beyond guild switching.
- Cache / reload changes: preserve recent-page caching on the routes that already declare it in `src/appRoutes.ts`.
- Avoid: reintroducing a separate `GuildContextBar`, `PrimaryNavRail`, or `guild_context_summary` endpoint.

## Route And Navigation

- Linked from: login flow, `/home`, `/guild_select`, every routed page using `PageView`.
- Links to: section entry routes from `src/appRoutes.ts`, `/commands`, `/guild_select`, `/status`.
- Header / nav actions: route headers should stay dense and action-oriented; shell chrome should not duplicate page-local filters.
- Preserved context: selected guild, recent-page state, route-specific search params where the route config says to preserve them.

## Permissions And Context

- Auth and scope requirements: public-safe routes can still use the shell, but guild-scoped routes should make missing guild state obvious.
- Role gates: route-level permissions remain owned by the route, not by the shell.
- Setup dependency / recovery: setup warnings can link into `/server/setup` or `/server/settings`, but the shell should not become a second setup page.
- Delegation / inherited context: delegated-server information should come from `WebSession.delegates_to` and related session fields.

## Commands And Mutations

- Existing commands: none directly owned by the shell.
- Preview / confirm: the shell should route into command pages instead of executing commands itself.
- Permission checks: handled by the destination page or command surface.
- Side effects / cache refresh: session refresh after guild switching.

## Open Questions And Backend Gaps

- If the shell later needs more guild summary detail, extend `WebSession` instead of adding a shell-only summary endpoint.

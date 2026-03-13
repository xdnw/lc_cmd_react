# Locutus Web-First Frontend Plan
Reviewed sources:

- `src/App.tsx`
- `src/pages/guild_member/index.tsx`
- `src/pages/settings/index.tsx`
- `src/pages/custom_table/TablePage.tsx`
- `src/pages/graphs/edit_graph.tsx`
- `src/pages/a2/conflict/conflicts.tsx`
- `src/pages/a2/alliance/alliance.tsx`
- `src/components/cmd/CmdList.tsx`
- `src/components/cmd/CommandComponent.tsx`
- `src/lib/commands.ts`
- `src/lib/layouts/defaultTabs.ts`
- `src/lib/layouts/tabs/dbNation.ts`
- `src/lib/layouts/tabs/dbAlliance.ts`
- CLI metadata from `npm run list-commands`, `npm run command-args`, `npm run list-placeholder-types`, and `npm run list-placeholders`

## 1. Ground Truth

The current app is not a blank slate, and it is not just a thin Discord command runner.

What already exists and matters:

- The app already has a real route surface in `src/App.tsx`, with public tools, authenticated guild pages, and niche analyst pages.
- The navbar already treats command/page search as a first-class interaction via the command launcher in `src/components/layout/navbar.tsx`.
- `/commands` is already a serious browser, not a stub. `src/components/cmd/CmdList.tsx` supports keyboard-first search, role filters, arg-type filters, and viewability flags.
- `/command/:command` is already a rich command shell. `src/pages/command/index.tsx` supports card vs focus-pane layouts, argument jumping, previewing the generated command string, and executing it.
- `/settings` is already substantially more advanced than the previous analysis assumed. `src/pages/settings/index.tsx` has a hierarchical sidebar, search, filters, typed editing, help dialogs, and per-setting status.
- `/custom_table` and `/edit_graph` are already a generic analyst workbench built on placeholders and reusable layouts, not random one-off pages.
- `/conflicts` already shows the pattern for a specialized workflow page layered on top of the generic table system: row actions, bulk actions, permissions, and selection state.
- `/guild_member` already acts like a real member workspace, combining announcements, audits, banking links, active wars, raiding, and grants.
- Guild context is first-class. The session and existing routes already distinguish between being logged in and having a guild selected.
- One guild is not the same thing as one alliance. The codebase and command metadata explicitly support multiple alliances registered to a guild.

Corrections to the earlier draft:

- Do not assume the app still needs a settings page. It already has one, and it is one of the stronger current workflow surfaces.
- Do not assume form generation is missing. `CmdList`, `CommandComponent`, `ArgInput`, `ApiFormInputs`, and `ViewCommand` are already substantial infrastructure.
- Do not assume one guild maps to one alliance. The app and command metadata repeatedly reference guild-scoped sets of alliances.
- Do not collapse the app into five giant routes. The existing product surface is broader and more specialized than that.

## 2. What The App Actually Is

Locutus currently behaves like four products living in one shell:

1. Public intelligence tools
2. Guild-scoped member and staff workspace
3. Generic command and placeholder lab
4. Discord automation and bot administration surface

That split is good. The web-first job is not to flatten those into one dashboard. It is to make each surface easier to enter and better organized around the real jobs users are doing.

## 3. Current Route Inventory

### Public and shared routes

| Route | Current role | Notes |
| --- | --- | --- |
| `/` | splash | Animated splash that sends users to `/home` |
| `/home` | featured landing | Cards for conflicts, tables, charts, raid, status, commands, multi checker |
| `/commands` | command browser | Search/filter all commands |
| `/command/:command` | command editor/runner | Full command form shell |
| `/view_command/:command` | command result renderer | For commands with web-viewable output |
| `/placeholders/:placeholder` | placeholder browser | Lists placeholder commands by type |
| `/custom_table` | generic table builder | Placeholder-driven data workbench |
| `/view_table` | table result page | Static/shareable table output |
| `/edit_graph` and `/edit_graph/:type` | generic graph builder | Endpoint-driven graph form + renderer |
| `/view_graph` and `/view_graph/:type` | graph viewer | Graph rendering route |
| `/raid` and `/raid/:nation` | public raid tool | Preset raid searches for a chosen nation |
| `/conflicts` | public conflict browser | Rich table with bulk actions and row actions |
| `/temporary-conflicts` | temporary conflict viewer | Variant conflict surface |
| `/alliance/:alliance` | alliance detail prototype | Mixes static info, command views, graphs |
| `/multi/:nation`, `/multi_v2/:nation?` | multi checker | Network / multi-boxing analysis |
| `/status` | system status | Task and health dashboard |

### Auth and guild-scoped routes

| Route | Current role | Notes |
| --- | --- | --- |
| `/guild_select` | guild context switcher | Selects the active Discord guild |
| `/guild_member` | current member hub | Announcements, audits, bank links, wars, raid, grant stub |
| `/announcements` | announcement list | Read/unread management |
| `/announcement/:id` | announcement detail | Renders announcement content |
| `/balance` | holdings view | Balance + withdraw form + breakdown |
| `/records` | ledger view | Paginated transaction records |
| `/settings` | guild settings browser | Hierarchical settings UI |

### Identity and session routes

| Route | Current role |
| --- | --- |
| `/login`, `/login/:token`, `/oauth2`, `/logout` | auth |
| `/nation_picker` | nation selection |
| `/unregister`, `/register` | account unlink/register entry |

## 4. The Real Context Model

This is the main product model the frontend should respect.

### Guild is the workspace boundary

The active Discord guild is the primary context switch. That is already clear from:

- `src/components/api/SessionContext.tsx`
- `src/pages/guild_picker/index.tsx`
- `src/components/api/session.tsx`

The selected guild unlocks protected pages, settings, announcements, and member tools.

### A guild can own multiple alliances

This is not hypothetical. It is already visible in the current code and command metadata.

Evidence:

- `settings_default registeralliance` takes `alliances: Set<DBAlliance>`
- `settings_default unregisteralliance` takes `alliances: Set<DBAlliance>`
- `grant city` includes `offshore_account`, which defaults to all alliances of the guild
- `%guild_alliances%` is already used as a default selection in `src/lib/layouts/tabs/dbNation.ts` and `src/lib/layouts/tabs/dbAlliance.ts`
- tax sync and other commands explicitly refer to the alliances registered to the guild

Implication:

- The web app should not hardwire every guild workflow to a single alliance selector.
- Every serious workspace screen should understand three scopes:
- current guild
- one or more registered alliances in that guild
- current user nation

### The command system is the substrate, not the final UX

You already have the substrate:

- command discovery: `CmdList`
- form rendering: `CommandComponent`, `ArgInput`, `ApiFormInputs`
- execution and preview: `CommandPage`, `ViewCommand`

The web-first move is to build purpose-built pages for the highest-frequency, highest-complexity workflows, while keeping the command browser as the universal fallback and long-tail surface.

## 5. What Users Are Actually Trying To Do

Below is the workflow map that emerges from the existing routes plus the command metadata.

### 5.1 Guild and alliance setup

Representative commands and routes:

- `/guild_select`
- `settings_default registeralliance`
- `settings_default unregisteralliance`
- `settings_default registerapikey`
- `settings info`

What the user is doing:

- selecting the current Discord server
- registering one or more alliances to that guild
- wiring the guild to API keys, roles, channels, and defaults

This is the first true web workspace step, not a side concern.

### 5.2 Member self-service and daily checks

Representative routes and commands:

- `/guild_member`
- `/announcements`
- `/balance`
- `/records`
- `/raid`
- `alerts bank *`
- `alerts beige *`
- `alerts trade *`
- `self *`
- `role optout`
- `tax info`

What the user is doing:

- checking unread announcements
- seeing failed audits
- checking personal or alliance-linked holdings
- reviewing current wars and raid candidates
- managing their own alerts, tax visibility, and self-service roles

This should become a proper member desk, not a hidden page.

### 5.3 Banking, deposits, and offshoring

Representative commands:

- `bank deposit`
- `bank records`
- `bank limits settransferlimit`
- `bank unlocktransfers`
- `deposits check`
- `deposits sheet`
- `deposits add`
- `deposits convert`
- `deposits shift`
- `deposits shiftflow`
- `deposits reset`

What the user is doing:

- checking balances across nation, alliance, guild, and tax accounts
- reviewing the note/category history behind balances
- moving or reclassifying funds
- handling offshore accounts and expired or ignored entries
- generating operational views of deposits and flows

Why this needs dedicated UI:

- `deposits check` alone already has multiple dimensions: account, offshores, time window, expired/ignored flags, categories, escrow visibility, and expiring records.
- This is not one form submit. It is an account investigation workflow.

### 5.4 Grants and grant templates

Representative commands:

- `grant city`
- `grant infra`
- `grant land`
- `grant project`
- `grant unit`
- `grant research`
- `grant warchest`
- `grant request create`
- `grant request approve`
- `grant_template create city`
- `grant_template send`
- `grant_template list`
- `grant_template info`

What the user is doing:

- requesting grants
- reviewing and approving requests
- sending direct grants from multiple funding sources
- creating reusable template-driven policies with limits and eligibility rules

Why this needs dedicated UI:

- `grant city` includes recipients, amount logic, funding source, tax account usage, expiry, decay, note behavior, escrow mode, policy modifiers, pings, and bypass flags.
- `grant_template create city` already behaves like a small policy engine: allowed recipients filter, min/max city bounds, econ/self roles, bracket options, per-day and per-granter limits, expiry and decay defaults, and ignore behavior.

This is one of the strongest cases for a web-native workflow.

### 5.5 War operations, spying, counters, and war rooms

Representative commands:

- `war find raid`
- `war find enemy`
- `war find unprotected`
- `war find damage`
- `war find treasure`
- `war find unblockade`
- `war counter auto`
- `war counter nation`
- `war counter sheet`
- `war room create`
- `war room from_sheet`
- `war room list`
- `war room sort`
- `war sheet blitzsheet`
- `war sheet validate`
- `war sheet warsheet`
- `war sheet costsheet`
- `war sheet costbyresource`
- `spy find`
- `spy counter`

What the user is doing:

- finding viable raid targets
- finding real war targets for specific attackers
- generating counter lists and blitz sheets
- creating and managing Discord war rooms
- checking ongoing war costs and reimbursements
- finding spy targets and counter-op opportunities

Why this needs dedicated UI:

- `war room create` is not just a form. It is target selection plus attacker selection plus policy flags plus messaging and Discord room creation.
- `war room from_sheet` and `war sheet blitzsheet` show that the workflow is often batch-planning, not one target at a time.

### 5.6 Interviews, recruitment, IA, and member hygiene

Representative commands:

- `audit run`
- `audit sheet`
- `interview create`
- `interview mentor`
- `interview mentee`
- `interview unassignmentee`
- `interview listmentors`
- `interview mymentees`
- `interview iachannels`
- `interview sheet`
- `interview interviewmessage`
- `settings_recruit *`
- `settings_interview *`
- `role autoassign`
- `role setalias`
- `self create`

What the user is doing:

- onboarding new members
- tracking interview progress
- pairing mentors and mentees
- sending timed or triggered recruit messages
- checking whether members are verified, present in guilds, buying spies, or staying active

The existing placeholder defaults in `src/lib/layouts/tabs/dbNation.ts` are especially revealing here. They already define selections like:

- alliance nations
- active applicants
- inactive members
- lacking spies
- member not verified
- member not in guild
- member not in milcom guild
- low tier, not raiding

That is already the shape of an IA operations dashboard.

### 5.7 Taxes and trade

Representative commands:

- `tax info`
- `tax records`
- `tax deposits`
- `tax bracketsheet`
- `tax setnationbracketauto`
- `settings_tax *`
- `trade price`
- `trade margin`
- `trade volume`
- `trade profit`
- `trade ranking`
- `trade findproducer`
- `trade findtrader`

What the user is doing:

- auditing tax setup and compliance
- mass-assigning or reviewing tax brackets
- checking tax records over time
- tracking resource prices, margins, production, and trader behavior

These are less urgent than grants and war operations, but they are clearly large enough to deserve structured surfaces.

### 5.8 Announcements and Discord content systems

Representative commands:

- `announcement create`
- `announcement invite`
- `announcement view`
- `announcement read`
- `embed create`
- `embed add command`
- `embed add modal`
- `embed update`
- `menu create`
- `menu button add`
- `menu button rename`
- `menu button swap`
- `channel create`
- `channel permissions`
- `channel rename`
- `channel sort`

What the user is doing:

- sending variable messages to many recipients
- building reusable Discord UI surfaces
- creating buttons that execute commands or open modals
- maintaining channel layouts and permission rules

Why this needs dedicated UI:

- `announcement create` already includes recipient selection, subject, body, replacement sets, randomness controls, output channel, mail/DM options, and force flags.
- menu and embed commands are effectively UI-builder commands embedded in Discord syntax.

This is the clearest case for a browser-native builder.

### 5.9 Public intelligence and analyst workbench

Representative routes and commands:

- `/custom_table`
- `/edit_graph`
- `/conflicts`
- `/alliance/:alliance`
- `/multi_v2/:nation?`
- `alliance stats *`
- placeholder types like `DBNation`, `DBAlliance`, `Conflict`, `DBWar`, `TaxDeposit`, `Transaction2`

What the user is doing:

- exploring game data
- comparing alliances and coalitions
- building custom reports
- using saved filters and columns
- sharing analysis outputs

This is not a mistake in the app. This is one of the strongest existing advantages. It should stay.

## 6. Design Direction: What “Web-First” Should Mean Here

For this app, web-first should mean:

- the browser becomes the primary place to review, filter, compare, approve, and configure
- Discord becomes the place where actions are announced, nudged, or delivered
- complex commands become guided workflows
- generic command entry remains available for long-tail and admin use
- placeholder tables and graphs remain the analyst workbench rather than being replaced by a finite set of dashboards

It should not mean:

- removing `/commands`
- hiding the placeholder/table/graph system
- pretending one page per department solves the UX
- forcing every task into one generic dashboard
- assuming single-alliance guilds

## 7. Recommended Information Architecture

Use one app shell, but make the top-level sections explicit.

### 7.1 Shell structure

Keep:

- the top navbar search / command launcher from `src/components/layout/navbar.tsx`
- the current page shell from `src/components/layout/page-view.tsx`

Add beneath the navbar:

- a persistent guild context bar
- a left navigation rail for primary sections
- route-local secondary navigation inside dense modules

### 7.2 Context bar

Every guild-scoped page should show a compact context bar with:

- active guild
- switch guild action
- registered alliance chips for the current guild
- current nation badge
- role/permission summary where relevant
- quick link to `/commands` with current context preserved

This should be visible on every workspace and automation page.

### 7.3 Primary navigation

Recommended primary sections:

- `Workspace`
- `Operations`
- `Automation`
- `Analysis`
- `Command Lab`

Suggested route tree:

```text
/home

/workspace/overview
/workspace/member
/workspace/announcements

/operations/banking/holdings
/operations/banking/ledger
/operations/banking/deposits
/operations/grants/requests
/operations/grants/send
/operations/grants/templates
/operations/war/targets
/operations/war/counters
/operations/war/rooms
/operations/war/sheets
/operations/spy
/operations/interviews
/operations/recruitment
/operations/tax
/operations/trade

/automation/settings
/automation/settings/:category
/automation/roles
/automation/channels
/automation/menus
/automation/embeds

/analysis/tables
/analysis/graphs
/analysis/conflicts
/analysis/alliances/:alliance
/analysis/raid
/analysis/multi
/analysis/status

/commands
/command/:command
/view_command/:command
/placeholders/:placeholder
```

Important: keep current URLs working.

Do not hard-break:

- `/guild_member`
- `/balance`
- `/records`
- `/settings`
- `/custom_table`
- `/edit_graph`
- `/raid`
- `/conflicts`

Treat them as aliases, redirects, or advanced-entry routes.

## 8. Keep, Promote, Or Wrap Existing Pages

### Keep as core power-user surfaces

- `/commands`
- `/command/:command`
- `/view_command/:command`
- `/custom_table`
- `/edit_graph`
- `/placeholders/:placeholder`

These are the long-tail engine room of the app.

### Promote to first-class primary flows

- `/guild_member`
- `/announcements`
- `/balance`
- `/records`
- `/settings`
- `/conflicts`
- `/alliance/:alliance`

These already contain meaningful workflow logic and should become obvious nav destinations.

### Wrap or evolve, not delete

- `/raid`: keep as the lightweight public raiding tool, but also fold its logic into a richer war target screen
- `/status`: keep as an ops/status page under analysis or admin
- `/multi_v2`: keep as a specialist IA / investigation screen under analysis

## 9. Detailed Page Recommendations

### 9.1 `/workspace/overview`

Purpose:

- replacement for the current hidden member hub behavior in `/guild_member`
- first page after guild selection for most logged-in users

Build from:

- `src/pages/guild_member/index.tsx`
- `src/pages/announcements/index.tsx`
- `src/pages/balance/index.tsx`
- `src/pages/raid/index.tsx`

Show:

- unread announcements
- active audit failures grouped by severity
- balance summary and quick path to ledger
- current wars summary
- raid quick actions
- grant request status or shortcut
- contextual action cards based on permissions

Interactions:

- announcement badge opens `/workspace/announcements`
- audit row opens member roster or member drawer if available
- balance card opens `/operations/banking/holdings`
- war card opens `/operations/war/targets` or `/operations/war/rooms`
- raid quick buttons preserve current nation context

Page note:

- This is not a generic department dashboard. It is the current member page made intentional and expandable.

### 9.2 `/workspace/announcements`

Purpose:

- unify announcement list, read state, and outbound announcement tooling

Two modes:

- `Inbox`: current `/announcements` behavior, but with better filtering and search
- `Composer`: staff-only outbound message builder for `announcement create`, `announcement invite`, and document-based variants

Required features:

- unread/read/archive filters
- recipient preview
- variation preview for `announcement create`
- send path toggles for DM vs in-game mail vs channel post
- generated command preview for advanced users

Reuse:

- `MarkupRenderer`
- `ApiFormInputs`
- `ViewCommand`
- command builder components for replacements and filters

### 9.3 `/operations/banking/holdings`

Purpose:

- replace the current single-account feel of `/balance` with a real holdings screen

Account switcher:

- current nation
- alliance accounts registered to this guild
- guild account
- tax bracket accounts where relevant

Tabs:

- `Summary`
- `Breakdown`
- `Withdraw`
- `Notes and categories`

Must support:

- same data currently shown in `/balance`
- better breakdown by note/category
- withdraw preview with generated command string
- links into ledger and deposit investigation pages

### 9.4 `/operations/banking/ledger`

Purpose:

- replacement for `/records` as an investigation tool, not just a paginated dump

Build around:

- `bank records`
- `deposits check`
- `deposits flows`
- `deposits shift`
- `deposits shiftflow`

Required UI:

- account selector
- time window presets
- note/category filters
- include expired / ignored / escrow toggles
- table with sortable columns
- row drawer showing source, destination, note, effective category, and related actions

This should feel like a ledger explorer, not a one-shot report output.

### 9.5 `/operations/grants/requests`

Purpose:

- queue for `grant request create`, `grant request approve`, and `grant request cancel`

Core layout:

- left: request queue with filters by alliance, type, age, requester, status
- right: selected request drawer

Drawer should show:

- requester and receiver nation
- requested action or source command
- estimate amount
- current holdings summary
- recent grants
- linked template eligibility if one exists
- buttons for approve, reject, or open full send wizard

Important behavior:

- approval should not be a blind single-button operation
- always show the generated grant command preview before final submit

### 9.6 `/operations/grants/send`

Purpose:

- guided replacement for raw `grant *` commands

Flow:

1. Choose grant type: city, infra, land, project, unit, research, warchest, build, mmr
2. Choose receivers
3. Configure grant payload
4. Choose funding source and accounting behavior
5. Review warnings and preview
6. Submit

Shared sections should cover:

- receiver selection
- source accounts: nation account, in-game bank, offshore account, tax account, receiver tax account
- timing: expire, decay
- accounting: bank note, cash conversion, escrow mode
- comms: ping role, ping when sent
- safeguards: bypass checks, force

Do not hand-build every field from scratch. Use command metadata to generate the low-level sections, then add task-specific wrappers above it.

### 9.7 `/operations/grants/templates`

Purpose:

- browser-native surface for `grant_template *`

Subviews:

- `Library`: list, filter, enable/disable, delete, inspect
- `Builder`: create or edit template
- `Send`: run a template against one or more receivers

Template builder sections:

- identity: template name, grant type
- eligibility: allowed recipient filter, city bounds, alliance filters
- permissions: econ role, self role
- funding: bracket or receiver bracket behavior
- limits: global, daily, per-granter, per-receiver if applicable
- lifecycle: expiry, decay, repeatability, ignore behavior
- grant-specific values: city amount/up-to, infra level, project, research set, etc.

This page should also explain why a receiver is or is not eligible when viewing `grant_template info`.

### 9.8 `/operations/war/targets`

Purpose:

- merge the public raid presets with real war target workflows

Tabs:

- `Raid`: current `/raid` presets plus richer filters
- `War Targets`: `war find enemy`, `war find damage`, `war find treasure`, `war find unprotected`, `war find unblockade`
- `Spy Targets`: `spy find`, `spy counter`

Layout:

- top: attacker selector and alliance scope
- left: preset / filter panel
- center: results table
- right: target drawer with quick actions

Target drawer should show:

- nation summary
- war range and spy range fit
- activity / beige / VM state
- defensive slots and likely counter profile
- spy status and last report age
- quick actions: add to counter plan, open war room create, add to blitz sheet, open public raid view

### 9.9 `/operations/war/counters`

Purpose:

- structured front-end for `war counter *`

Modes:

- `Single target`: `war counter nation` or `war counter url`
- `Auto`: `war counter auto`
- `Sheet`: `war counter sheet`

Required UI:

- enemy selector
- candidate attacker list with filters: weak attacker exclusion, online only, require Discord, allow same alliance, include inactive, include non-members
- score and strength visualizations
- selection and send actions

This screen should flow directly into war room creation.

### 9.10 `/operations/war/rooms`

Purpose:

- browser-native manager for `war room *`

Views:

- `Create`: wraps `war room create`
- `Batch Create`: wraps `war room from_sheet`
- `Active Rooms`: wraps `war room list`, `pin`, `sort`, `setcategory`
- `Cleanup`: `delete_for_enemies`, `delete_planning`, `purge`

Core needs:

- attacker selection matrix
- category preview
- message preview
- room membership preview
- post-create status list

This is one of the best places to reuse the table selection and bulk action patterns already present in `/conflicts`.

### 9.11 `/operations/war/sheets`

Purpose:

- keep batch planning in the web UI instead of forcing sheets as the first-class interface

Build around:

- `war sheet blitzsheet`
- `war sheet validate`
- `war sheet raid`
- `war sheet warsheet`
- `war sheet costsheet`
- `war sheet costbyresource`
- `war sheet reimbursebynation`

Treat this as a planning board and export hub, not merely a form page.

### 9.12 `/operations/interviews`

Purpose:

- unify IA onboarding and interview operations

Page should combine:

- interview channel state
- pending interviews
- mentor assignments
- audit summary
- referrer and incentive context

Key actions:

- create interview channel
- assign / unassign mentor
- send interview message
- move to archive / reopen channel
- open member drawer

This should use the same guild-alliance selection model as the member roster workbench.

### 9.13 `/operations/recruitment`

Purpose:

- browser-native home for `settings_recruit *`, recruit message content, timed messages, and referral rewards

Subsections:

- mail new applicants
- recruit message subject/body/output/delay
- timed messages by trigger and delay
- referral and mentor rewards

This is an automation builder, not just a settings category.

### 9.14 `/operations/tax`

Purpose:

- manage member tax configuration without dropping straight into command forms

Views:

- `Overview`: bracket and internal tax rules currently in effect
- `Members`: roster of taxable members, bracket assignment, self-set eligibility
- `Records`: wraps `tax records` and `tax deposits`
- `Automation`: wrappers around `settings_tax *` and bulk assignment commands

### 9.15 `/operations/trade`

Purpose:

- centralize market intelligence and personal trade workflows

Views:

- live prices and margins
- volume and trend charts
- producer / trader rankings
- trade profit view
- personal alert subscriptions

This can lean on the existing graph endpoints rather than inventing a separate chart stack.

### 9.16 `/automation/settings`

Purpose:

- keep the current settings engine, but give it a better place in the app structure

Recommendation:

- keep the existing page logic largely intact
- mount it under a clearer automation section
- add filtered deep links like:
- bank settings
- war alerts
- interview settings
- tax settings
- self-role settings

Do not replace this with simplistic tabs. Instead, wrap it with better entry points.

### 9.17 `/automation/roles`

Purpose:

- wrap `role *` and `self *` into a proper Discord role operations screen

Views:

- alias mapping
- auto-role and auto-nick behavior
- alliance role registration
- self-assignable roles
- mass masking operations

This should reuse the hierarchical-sidebar pattern from settings.

### 9.18 `/automation/channels`

Purpose:

- browser-native surface for channel/category automation

Build around:

- `channel create`
- `channel permissions`
- `channel rename`
- `channel sort`
- `channel open`
- `channel close`

The important web-first addition is a visual category/rule editor and preview, not just a command wrapper.

### 9.19 `/automation/menus`

Purpose:

- dedicated menu builder for `menu *`

Features:

- list existing menus
- create and rename menu
- edit description
- add, rename, remove, and reorder buttons
- preview the final Discord menu
- deep link from a button to the underlying command form

This is much better as a visual builder than as individual commands.

### 9.20 `/automation/embeds`

Purpose:

- dedicated embed builder for `embed *`

Features:

- create simple embeds
- edit title and description
- add raw, command, or modal buttons
- preview behavior and target channel
- copy JSON/command representation for power users

This should share builder primitives with menus.

### 9.21 `/analysis/tables`

Purpose:

- keep the existing generic workbench but make it a first-class analysis destination

Do not replace `src/pages/custom_table/TablePage.tsx`.

Instead add:

- saved views
- curated templates
- recent queries
- team-shared presets
- clearer distinction between selection filters, columns, sorting, and renderer presets

### 9.22 `/analysis/graphs`

Purpose:

- same idea as tables, but for endpoint-driven graphs

Do not replace `src/pages/graphs/edit_graph.tsx`.

Instead add:

- graph preset gallery
- recent arguments
- saved comparisons
- links from alliance and trade pages into prefilled graphs

### 9.23 `/analysis/conflicts`

Purpose:

- keep conflict browsing as a public-facing and staff-facing analysis tool

Current implementation in `src/pages/a2/conflict/conflicts.tsx` already shows the right direction:

- specialized row actions
- bulk actions
- permission-aware editing
- table-backed workflow

Use this as a pattern for other dense operational tables.

### 9.24 `/analysis/alliances/:alliance`

Purpose:

- expand the current alliance detail page rather than deleting it

Why it matters:

- it already combines placeholder-backed static data, `ViewCommand`, and graphs
- it is a good bridge between public intelligence and guild workspace actions

It should eventually link outward to:

- member tables
- taxability lists
- gray / raidability lists
- alliance revenue and value views
- treaty and conflict context

### 9.25 `/analysis/multi`

Purpose:

- specialist investigative screen for IA and moderation flows

`/multi_v2` already contains a good pattern: input selection, explanation block, and a dense result table. Keep it as a specialist tool, not a landing page.

## 10. Component Strategy

### Reuse these existing primitives aggressively

- `CmdList`
- `CommandComponent`
- `ArgInput`
- `ApiFormInputs`
- `ViewCommand`
- `StaticTable`
- `TableWith2DData`
- `PlaceholderTabs`
- `HierarchySidebarNav`
- `BulkActionsToolbar`
- `MarkupRenderer`
- `DialogProvider`

### Add these shared workflow primitives

- `GuildContextHeader`
- guild switcher
- alliance scope chips
- current nation badge

- `EntityDrawer`
- opens nation, alliance, request, or transaction details without leaving the page

- `WorkflowActionPreview`
- always shows the generated command string and relevant warnings before submit

- `SavedViewBar`
- used by tables, graphs, and operational queues

- `CommandBackedWizard`
- wraps command metadata in a guided multi-step flow for grants, announcements, and builders

- `DiscordTargetPicker`
- consistent role/channel/category/menu/embed target selection

- `SettingsLinkPill`
- deep links from workflow pages back into filtered settings screens

- `ScopeAwareSelectionBar`
- consistent guild/alliance/nation filtering controls for operations pages

### Build custom pages only when they cross the threshold

Build a custom workflow page when a command family is:

- used frequently
- multi-step or review-heavy
- batch-oriented
- dependent on several entities at once
- hard to understand from raw argument names

Keep the generic command form as the main surface when a command is:

- rare
- highly technical or root-admin only
- effectively a one-shot action
- mostly export/debug/sync oriented

## 11. Code Structure Recommendation

Keep `src/pages` for route entry files, but organize by product surface and feature.

Recommended layout direction:

```text
src/
features/
workspace/
banking/
grants/
war/
interviews/
tax/
trade/
automation/
analysis/
pages/
workspace/
operations/
automation/
analysis/
commands/
```

Per feature, keep:

- `components/`
- `hooks/`
- `adapters/` for command-to-UI mapping
- `types/`
- `views/` or `panels/` for route-local compositions

Do not duplicate business rules inside pages.

Instead:

- keep command metadata as the source of truth for argument names and types
- create feature adapters that translate between task-oriented UI state and command args
- keep preview/submit code shared so every workflow can fall back to the same execution path

## 12. Recommended Build Order

This is the order that gives the biggest UX gain while preserving the current strengths of the app.

1. Context and navigation shell
- Add guild context bar and left rail
- Re-home current routes into `Workspace`, `Operations`, `Automation`, `Analysis`, and `Command Lab`
- Keep command launcher global

2. Promote `/guild_member` into `/workspace/overview`
- This gives logged-in users an obvious starting point immediately

3. Build grant operations
- Highest complexity and highest web-native payoff
- Start with requests, then send wizard, then templates

4. Build war operations
- Targets, counters, war rooms, and sheets are the next major friction cluster

5. Expand banking/deposits into real investigation pages
- Move beyond single-account balance and raw records pagination

6. Build interviews/recruitment workspace
- Strong operational value and already well-supported by current placeholders and commands

7. Build Discord automation builders
- Menus, embeds, channels, roles
- These are ideal browser-native builders

8. Add tax/trade operations
- Important, but less foundational than grants and war flow

9. Improve analyst surfaces with saved views and presets
- Tables, graphs, alliance detail, conflicts, multi

## 13. Final Position

The correct web-first direction for this project is not:

- “replace Discord with five dashboard pages”
- “hide the command system”
- “move everything into one settings screen”

The correct direction is:

- keep the generic command and analysis engines
- make guild context explicit
- treat multi-alliance guilds as normal
- turn the highest-friction workflows into browser-native operational pages
- keep public intelligence tools and analyst tools as first-class surfaces

If this plan is followed, the frontend becomes web-first without throwing away the parts of the app that are already powerful.

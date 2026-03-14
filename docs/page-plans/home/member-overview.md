<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Member Overview

- Status: `Evolve`
- Primary route: `/overview`
- Legacy aliases: `/guild_member`
- Nav group: Home
- Primary users: alliance members, IA, econ, and milcom staff doing daily checks in the selected guild
- Current references: `src/pages/guild_member/index.tsx`, `src/pages/balance/index.tsx`, `src/pages/announcements/index.tsx`, `src/pages/raid/index.tsx`

## Why It Exists

- The current member hub already has the right ingredients, but it does not feel like an intentional starting point.
- This page should become the default post-guild-selection workspace for most logged-in users.

## Workflows

- Primary: check announcements, audits, holdings, current wars, and raid opportunities in one stop.
- Secondary: jump into grant requests, member issues, or war rooms based on permissions.
- Why users arrive here: daily routine, post-login landing, "what needs attention right now?" checks.
- Upstream entry points: guild selection, login return flow, Home landing, recent-work link.
- Downstream hand-offs: `Announcements`, `Holdings`, `Deposits`, `Targets`, `Grant Requests`, `Interviews`, and command fallback.

## Layout and Look

- Use a stacked board with compact cards, not a generic analytics dashboard.
- First row: unread announcements, audit health, current holdings summary, active wars summary.
- Second row: raid quick actions, grant/request shortcuts, role-aware action cards.
- On wide screens, support a right-side drawer for selected entities instead of constant full-page navigation.

## Information and Interactions

- Show unread announcement count and a fast path to the inbox.
- Group audit failures by severity and keep descriptions collapsible.
- Show bank access and key balances with fast links to holdings and ledger.
- Show current wars and their urgency, with links into target and room views.
- Keep member self-service visible: withdrawals, alert management, opt-outs, and tax visibility should feel like part of the daily loop.
- Use role-aware cards so econ sees grant queue and deposit blockers, IA sees interview or recruitment issues, and milcom sees war or target urgency.
- Keep raid quick-start controls visible for members whose daily work starts there.

## Components

- Existing shared: `EndpointWrapper`, `ApiFormInputs`, `MarkupRenderer`, current audit and war sections, `Button`.
- New shared or page-specific: `OverviewSummaryCard`, `AuditSeverityStack`, `WarSummaryStrip`, `RoleAwareActionGrid`, `EntityDrawer`.

## Data and Endpoints

- Existing endpoints: `UNREAD_COUNT`, `MARK_ALL_READ`, `MY_AUDITS`, `BANK_ACCESS`, `MY_WARS`, `RAID`, `BALANCE`.
- Existing table / graph / placeholder substrate: `TABLE` can later support deeper member/audit drill-downs.
- New endpoints likely needed: optional `overview_summary` endpoint if the page grows into many separate requests; not required for MVP.

## Command Bindings

- Existing commands: current quick actions can deep-link to `announcement read`, `tax info`, `self *`, `role optout`, `alerts *`, and raid-related commands.
- Commands likely needing changes: none required for MVP.
- Command preview / confirmation rules: direct actions should be lightweight; anything destructive or multi-entity should route into the specialized page with preview.

## Navigation

- Links to: `/announcements`, `/members/deposits`, `/members/escrow`, `/economy/ledger`, `/war/targets`, `/war/rooms`, `/economy/grant-requests`, `/members/interviews`, `/commands`.
- Linked from: `/guild_select`, app shell Home item, login return flow.

## Permissions and Context

- Requires login and selected guild.
- Should personalize content based on current nation and guild permissions.

## Risks and Open Questions

- Do not try to show every department's full dashboard here.
- The page needs role-aware ordering so it feels relevant to both normal members and staff.
- If grant requests or alert subscriptions are shown here, they may need new lightweight read APIs later.

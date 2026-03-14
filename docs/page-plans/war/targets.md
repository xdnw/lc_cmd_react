<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Targets

- Status: `Evolve`
- Primary route: `/war/targets`
- Legacy aliases: `/raid`, `/raid/:nation`
- Nav group: War
- Primary users: raiders, milcom, active members, and staff looking for enemy, raid, or unblockade targets
- Current references: `src/pages/raid/index.tsx`, `src/pages/guild_member/index.tsx`, default DBNation presets in `src/lib/layouts/tabs/dbNation.ts`

## Why It Exists

- Raid finding already exists, but members and milcom do not think in separate "raid page" and "war commands" mental models.
- This page should unify raid, war-target, and spy-target discovery without erasing the public raid tool.
- Raid is already endpoint-native, but the broader target desk is a mixed substrate: some tabs can evolve current endpoints and others still need structured JSON reads.

## Workflows

- Primary: find raid targets, war targets, unblockade targets, treasure or bounty hits, and spy opportunities.
- Secondary: jump from a target into counters, war rooms, blitz planning, or the raw command form.
- Why users arrive here: daily raiding, active conflict work, helping allies, checking beige or blockade opportunities.
- Upstream entry points: `Member Overview`, Home landing, public raid links, alliance profile, command fallback.
- Downstream hand-offs: `Counters`, `War Sheets`, `War Rooms`, or back into economy pages for warchest and reimbursement follow-up.

## Layout and Look

- Tabs: `Raid`, `War Targets`, `Spy Targets`.
- Header: attacker selector, alliance scope chips, and saved presets.
- Body: left filter rail, center results table, right target drawer.
- The visual feel should be a dense operations board with urgency cues, not a generic list page.

## Information and Interactions

- `Raid`: expose score, activity, beige, VM, DNR, weak-ground, and bank-loot filters.
- `War Targets`: expose enemy, damage, treasure, unprotected, and unblockade modes with attacker-aware filtering.
- `Spy Targets`: show intel freshness, spy-cap context, and likely counter-op fits.
- Saved presets should include practical modes like `Daily raids`, `Beige snipes`, `Unblockade help`, `Treasure watch`, and `Conflict targets`.
- DNR, beige, blockade, and opt-out constraints should appear as first-class status or reason chips, not hidden footnotes.
- This page can explain DNR and beige policy outcomes, but policy editing itself still belongs in server configuration and coalition workflows.
- Drawer: nation summary, range fit, activity, war slots, beige / VM state, spy info, quick actions.
- Quick actions: open counter planner, create war room, add to blitz planning, open command fallback.

## Components

- Existing shared: `ArgInput`, `CommandComponent`, table components, graph support, existing raid page pieces.
- New shared or page-specific: `ScopeAwareSelectionBar`, `PresetFilterPanel`, `TargetResultsTable`, `TargetDrawer`, `TargetActionRail`.

## Data and Endpoints

- Existing endpoints: `RAID`, `UNPROTECTED`, `TABLE`, `COMMAND`, and supporting graphs like `STRENGTHTIERGRAPH` and `SPYTIERGRAPH`.
- Existing table / graph / placeholder substrate: the current public raid search is already native; DBNation or DBWar workbenches and saved presets cover supporting context, while most `war find *` and `spy *` reads can start from existing commands.
- Current backend gaps: none for the first target desk.
- Existing native reads are `RAID` and `UNPROTECTED`; war and spy modes can begin command-backed.
- Later only if war and spy tabs need parity with `Raid`: attacker-aware target rows from `war find *` and `spy *`.

## Command Bindings

- Existing commands: `war find raid`, `war find enemy`, `war find damage`, `war find treasure`, `war find bounty`, `war find unprotected`, `war find unblockade`, `war dnr`, `spy find intel`, `spy find target`, `spy counter`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: targeting itself is read-only; quick actions that escalate into a war room or counter plan should show the command and selected attackers before submit.

## Navigation

- Links to: `/war/counters`, `/war/rooms`, `/war/sheets`, `/commands`, public raid detail links, relevant alliance or nation report pages.
- Linked from: overview war card, command launcher, alliance profile, conflicts, Home landing.

## Permissions and Context

- Public raid mode should work without login.
- Guild-aware war and spy modes should personalize to the selected guild and alliances.

## Risks and Open Questions

- Mode boundaries must stay obvious; raid heuristics and counter heuristics are not the same.
- War and spy tabs may stay command-backed until they prove they need raid-like rows.
- The page should explain DNR, beige, and blockade constraints in plain language.
- Do not let `Spy Targets` become a disconnected side tool; it belongs in the same target-acquisition workflow.
- The page is mixed by design: `Raid` can mature first without pretending `War Targets` and `Spy Targets` already have equal backend support.


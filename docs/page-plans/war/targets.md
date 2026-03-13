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

## Workflows

- Primary: find raid targets, war targets, unblockade targets, treasure or bounty hits, and spy opportunities.
- Secondary: jump from a target into counters, war rooms, blitz planning, or the raw command form.
- Why users arrive here: daily raiding, active conflict work, helping allies, checking beige or blockade opportunities.

## Layout and Look

- Tabs: `Raid`, `War Targets`, `Spy Targets`.
- Header: attacker selector, alliance scope chips, and saved presets.
- Body: left filter rail, center results table, right target drawer.
- The visual feel should be a dense operations board with urgency cues, not a generic list page.

## Information and Interactions

- `Raid`: expose score, activity, beige, VM, DNR, weak-ground, and bank-loot filters.
- `War Targets`: expose enemy, damage, treasure, unprotected, and unblockade modes with attacker-aware filtering.
- `Spy Targets`: show intel freshness, spy-cap context, and likely counter-op fits.
- Drawer: nation summary, range fit, activity, war slots, beige / VM state, spy info, quick actions.
- Quick actions: open counter planner, create war room, add to blitz planning, open command fallback.

## Components

- Existing shared: `ArgInput`, `CommandComponent`, table components, graph support, existing raid page pieces.
- New shared or page-specific: `ScopeAwareSelectionBar`, `PresetFilterPanel`, `TargetResultsTable`, `TargetDrawer`, `TargetActionRail`.

## Data and Endpoints

- Existing endpoints: `RAID`, `UNPROTECTED`, `TABLE`, optional support graphs like `STRENGTHTIERGRAPH` and `SPYTIERGRAPH`.
- Existing table / graph / placeholder substrate: DBNation placeholders and saved presets already cover a lot of targeting context.
- New endpoints likely needed: JSON read endpoints for `war find enemy`, `war find damage`, `war find treasure`, `war find unblockade`, `spy find`, and `spy counter` would make this page much stronger.

## Command Bindings

- Existing commands: `war find raid`, `war find enemy`, `war find damage`, `war find treasure`, `war find unprotected`, `war find unblockade`, `war dnr`, `spy find`, `spy counter`.
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
- Some target-finding modes may begin as command-backed results until JSON endpoints exist.
- The page should explain DNR, beige, and blockade constraints in plain language.

# Channels

- Status: `New`
- Primary route: `/server/channels`
- Legacy aliases: none; current related work is command-only
- Nav group: Server
- Primary users: guild admins, IA, milcom, and staff maintaining Discord channel layout and access
- Current references: command metadata for `channel *` and related interview / war room commands

## Why It Exists

- Channel automation is visual by nature; a browser can show structure and consequences that raw commands cannot.
- Users need to reason about categories, permissions, and sorting rules together.

## Workflows

- Primary: create channels, change permissions, move or sort channels, open or close workflow channels.
- Secondary: bulk rename or clean up channel structures.
- Why users arrive here: server setup, war-room maintenance, interview cleanup, Discord reorganization.

## Layout and Look

- Left: channel tree grouped by category.
- Center: selected channel or rule editor.
- Right: preview of resulting membership, category placement, or rename output.
- The look should feel like a Discord admin board, not a plain form catalog.

## Information and Interactions

- Visualize current categories and channel counts.
- Preview permission changes before applying them.
- Support sort-rule editing with a visible before / after model.
- Make open / close flows for interview or war-room channels obvious and safe.
- Keep bulk rename and sort operations in guarded, preview-heavy sections.

## Components

- Existing shared: dialog helpers, command preview helpers, settings deep-link patterns.
- New shared or page-specific: `ChannelTree`, `ChannelRuleEditor`, `PermissionPreviewTable`, `SortPreviewPanel`, `BulkRenamePanel`.

## Data and Endpoints

- Existing endpoints: `INPUT_OPTIONS` may help with channel and category selectors.
- Existing table / graph / placeholder substrate: no current web-native channel tree or permission-state endpoint surface.
- New endpoints likely needed: current guild channel tree, channel detail, permission preview, and sort-rule preview endpoints are likely required for a full page.

## Command Bindings

- Existing commands: `channel create`, `channel permissions`, `channel rename bulk`, `channel sort category_filter`, `channel sort category_rule_sheet`, `channel sort sheet`, `channel open`, `channel close current`, `channel delete current`, `channel setcategory`, `channel move up`, `channel move down`, `channel members`, `channel memberchannels`, `channel channelmembers`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: sorting, deletion, and permission changes must show impacted channels and members before submit.

## Navigation

- Links to: `/server/settings`, `/server/roles`, `/war/rooms`, `/members/interviews`.
- Linked from: setup flow, room management, interview management, command launcher.

## Permissions and Context

- Requires login, selected guild, and Discord channel-management permissions.
- Some sections may need to surface bot-access failures distinctly from user-permission failures.

## Risks and Open Questions

- This page depends heavily on read endpoints that do not appear to exist yet.
- A bad preview model could make destructive actions feel unsafe; err on the side of extra confirmation.
- Need to decide whether channel open / close belongs here, in Interviews, in War Rooms, or in both via deep links.

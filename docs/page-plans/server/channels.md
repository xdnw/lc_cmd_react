# Channels

- Status: `Wrap`
- Primary route: `/server/channels`
- Legacy aliases: none; current related work is command-only
- Nav group: Server
- Primary users: guild admins, IA, milcom, and staff maintaining Discord channel layout and access
- Current references: command metadata for `channel *`, `settings_interview *`, `settings_war_alerts *`, `settings_war_room *`, `settings_recruit *`, `settings_bank_access *`, `settings_bank_grants *`, `settings_bank_info *`, `src/pages/settings/index.tsx`, `src/pages/command/index.tsx`

## Why It Exists

- Channel automation is visual by nature; a browser can show structure and consequences that raw commands cannot.
- Users need to reason about categories, permissions, and sorting rules together.
- In the near term, this should be a guided command surface plus settings deep links, not a full native Discord channel manager.

## Workflows

- Primary: create channels, change permissions, move or sort channels, open or close workflow channels, and repair channel-linked settings.
- Secondary: bulk rename or clean up channel structures and inaccessible-channel settings drift.
- Why users arrive here: server setup, war-room maintenance, interview cleanup, Discord reorganization.
- Upstream entry points: `Server Setup`, `War Rooms`, `Interviews`, command fallback.
- Downstream hand-offs: `War Rooms`, `Interviews`, `Server Settings` when channel-linked settings need repair.

## Layout and Look

- Left: workflow panels such as `Interview Channels`, `War Rooms`, `Alerts`, and `Bulk Sort`.
- Center: command-backed editor with current arguments, current settings links, and before or after previews where possible.
- Right: result or warning rail that explains what the command will affect and what settings or permissions it depends on.
- The look should feel like an operator board, not a fake clone of the Discord channel list.

## Information and Interactions

- Surface the channel-linked settings that matter most: interview categories, archive category, war alert channels, war room log, withdraw or grant request channels, recruit output channels.
- Preview permission changes before applying them when the command output supports it; otherwise show the exact outbound command and target objects.
- Support sort-rule editing with visible before or after models when a sheet or category-rule flow is used.
- Make open or close flows for interview, war-room, and embassy channels obvious and safe.
- Keep bulk rename, delete, and sort operations in guarded, preview-heavy sections.
- This page owns guided channel structure work; it should not try to replace the dedicated workflow pages that happen to act on channels.

## Components

- Existing shared: dialog helpers, command preview helpers, settings deep-link patterns, command runner links.
- New shared or page-specific: `ChannelWorkflowPanel`, `PermissionPreviewTable`, `SortPreviewPanel`, `BulkRenamePanel`, `ChannelSettingsDependencyCard`.

## Data and Endpoints

- Existing endpoints: `INPUT_OPTIONS`, `TABLE`, `COMMAND`, `PERMISSION`.
- Existing table / graph / placeholder substrate: settings reads already cover many channel-linked policies, but there is no current web-native channel tree or permission-state endpoint surface.
- Existing command substrate: channel actions already cover the operational tasks this page needs to wrap.
- New endpoints likely needed: a current guild channel tree, channel detail, permission preview, and sort-rule preview endpoints would be needed for a truly native page.

## Command Bindings

- Existing commands: `channel create`, `channel permissions`, `channel rename bulk`, `channel sort category_filter`, `channel sort category_rule_sheet`, `channel sort sheet`, `channel open`, `channel close current`, `channel close inactive`, `channel delete current`, `channel delete inaccessible`, `channel setcategory`, `channel move up`, `channel move down`, `channel members`, `channel channelmembers`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: sorting, deletion, and permission changes must show the impacted channels and intended effect before submit.

## Navigation

- Links to: `/server/settings`, `/server/roles`, `/war/rooms`, `/members/interviews`, `/commands`.
- Linked from: setup flow, room management, interview management, command launcher.

## Permissions and Context

- Requires login, selected guild, and Discord channel-management permissions.
- Some sections may need to surface bot-access failures distinctly from user-permission failures.

## Risks and Open Questions

- This page should not imply that the app already has a full native channel read model.
- A bad preview model could make destructive actions feel unsafe; err on the side of extra confirmation.
- Need to decide whether channel open or close belongs here, in Interviews, in War Rooms, or in both via deep links.

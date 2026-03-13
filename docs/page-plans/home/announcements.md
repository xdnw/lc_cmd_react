# Announcements

- Status: `Evolve`
- Primary route: `/announcements`
- Legacy aliases: `/announcement`, `/announcement/:id`
- Nav group: Home
- Primary users: all members for inbox use, staff for outbound alliance messaging
- Current references: `src/pages/announcements/index.tsx`, `src/pages/announcement/index.tsx`, `src/pages/guild_member/index.tsx`

## Why It Exists

- Announcements are both an inbox workflow and a staff communication workflow.
- The current list view handles read state, but not the broader message-building and preview needs that staff work requires.

## Workflows

- Primary: read, search, filter, and manage incoming announcements.
- Secondary: compose outbound announcements, invitation messages, and document-backed messages.
- Why users arrive here: unread notice from overview, staff broadcast work, reviewing old alliance notices.
- Upstream entry points: unread badge from `Member Overview`, direct route links, command fallback.
- Downstream hand-offs: return to `Member Overview`, open member or nation context, or branch into related command or staff workflows.

## Layout and Look

- Two main modes inside one page: `Inbox` and `Composer`.
- Inbox should feel like a compact message center with status chips, not a bare paginated table.
- Composer should feel like a message workshop: message body on the left, audience/replacements/preview on the right.
- Detail view can stay route-backed for shareability, but should also support drawer presentation from the list.

## Information and Interactions

- Inbox: unread/read/archive filters, search, pagination or virtualized list, mark read/unread, mark all read.
- Detail: title, body, delivery context, related audience, and navigation to next/previous items.
- Composer: recipient selection, subject, body, replacement set editing, DM/mail/channel toggles, variation preview, and send confirmation.
- Staff users should see the generated command string before final send.
- Staff flows should surface OPSEC-sensitive delivery choices clearly so users understand whether they are broadcasting publicly, mailing in game, or sending direct messages.

## Components

- Existing shared: `EndpointWrapper`, `ApiFormInputs`, `MarkupRenderer`, `PaginatedList`, `ViewCommand`, `DialogProvider`.
- New shared or page-specific: `AnnouncementFilterBar`, `AnnouncementComposer`, `ReplacementSetEditor`, `AnnouncementPreviewPanel`, `AnnouncementDrawer`.

## Data and Endpoints

- Existing endpoints: `ANNOUNCEMENT_TITLES`, `VIEW_ANNOUNCEMENT`, `READ_ANNOUNCEMENT`, `UNREAD_ANNOUNCEMENT`, `MARK_ALL_READ`, `UNREAD_COUNT`.
- Existing table / graph / placeholder substrate: not required for inbox MVP.
- New endpoints likely needed: none for inbox MVP; optional `announcement_search` or `announcement_preview` endpoints could help later, but outbound send can start command-backed.

## Command Bindings

- Existing commands: `announcement create`, `announcement invite`, `announcement document`, `announcement archive`, `announcement read`, `announcement view`.
- Commands likely needing changes: none required immediately; outbound preview quality may benefit from a dedicated preview command or endpoint later.
- Command preview / confirmation rules: every outbound action should show recipients, delivery paths, and generated command text before submit.

## Navigation

- Links to: `/overview`, `/announcement/:id`, `/commands`, related member or nation drawers when recipients are visible.
- Linked from: overview unread card, navbar search, command launcher, possible notification deep links.

## Permissions and Context

- Inbox requires login and selected guild or current nation context.
- Composer should be permission-gated and hidden or downgraded for normal members.

## Risks and Open Questions

- The page cannot just become a command wrapper; message variation preview is the real browser-native value.
- Need to decide whether `announcement/:id` stays a full page, a drawer-capable route, or both.
- Composer should not overwhelm users with raw replacement syntax without guardrails.

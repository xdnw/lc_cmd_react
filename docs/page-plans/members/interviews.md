# Interviews

- Status: `New`
- Primary route: `/members/interviews`
- Legacy aliases: none; related work is currently command and settings driven
- Nav group: Members
- Primary users: IA staff, mentors, recruiters, and gov reviewing member onboarding
- Current references: command metadata for `interview *`, settings page pattern, DBNation IA presets in `src/lib/layouts/tabs/dbNation.ts`

## Why It Exists

- Interview work spans channel state, mentoring, audit quality, and guild presence.
- The current command surface is rich, but there is no unified place to see the onboarding queue and intervene quickly.

## Workflows

- Primary: create interview channels, assign mentors, review pending interviews, send interview messages, archive or reopen channels.
- Secondary: inspect referrer and incentive context, monitor inactivity, and jump into member detail.
- Why users arrive here: applicant onboarding, academy handoff, stalled interviews, mentor load balancing.
- Upstream entry points: `Recruitment`, `Member Overview`, setup shortcuts, command fallback.
- Downstream hand-offs: `Roles`, `Channels`, training or academy flows, archive actions, and member detail or audit follow-up.

## Layout and Look

- Left: interview queue grouped by state or category.
- Center / right: selected interview detail with member context, audit flags, and actions.
- Top summary row for pending interviews, stale interviews, mentor load, and missing-guild verification flags.
- The page should feel like an IA operations desk, not like a plain settings category.

## Information and Interactions

- Show interview channel state, applicant status, alliance / guild presence, audit issues, mentor assignment, and referrer info.
- Actions: create interview, assign or unassign mentor, send interview message, archive or reopen channel, open member drawer.
- Support saved filters for active applicants, inactive members, not verified, not in guild, not in milcom guild, and low-tier non-raiders.
- Keep the lifecycle visible: applicant -> interview -> mentor/training -> graduation or archive.
- Surface category and role prerequisites such as interview categories, interviewer roles, applicant roles, and archive targets in context.

## Components

- Existing shared: table patterns, dialog helpers, `ArgInput`, command-backed forms, settings deep-link patterns.
- New shared or page-specific: `InterviewQueue`, `InterviewDetailPanel`, `MentorLoadBoard`, `InterviewActionsPanel`, `MemberDrawer`.

## Data and Endpoints

- Existing endpoints: none dedicated to interview queue reads.
- Existing table / graph / placeholder substrate: `TABLE` plus DBNation presets can support some roster-style analysis, but not the live interview-channel workflow.
- New endpoints likely needed: interview queue, interview detail, mentor assignment summary, and interview-channel state endpoints are likely required for a strong page.

## Command Bindings

- Existing commands: `interview create`, `interview channel`, `interview iachannels`, `interview interviewmessage`, `interview mentor`, `interview mentee`, `interview unassignmentee`, `interview listmentors`, `interview mymentees`, `interview sheet`, `interview sortinterviews`, `channel open`, `channel close current`, `settings_interview *`, `audit *`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: channel-moving and mentor-assignment actions should show the affected user, channel, and resulting command before submit.

## Navigation

- Links to: `/members/recruitment`, `/server/settings`, `/server/roles`, `/server/channels`, `/reports/tables`, member report pages.
- Linked from: member overview action cards, command launcher, IA workflow shortcuts.

## Permissions and Context

- Requires login, selected guild, and IA-style permissions.
- Alliance scope should honor the current guild's registered alliances.

## Risks and Open Questions

- This page needs live-ish queue data; command-only reads will feel too brittle.
- Mentor and referrer workflows must not get buried under interview-channel mechanics.
- Need to decide how academy progression lives here versus in a later dedicated page.

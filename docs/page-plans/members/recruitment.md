# Recruitment

- Classification: `route`
- Status: `Wrap`
- Primary route or owner: `/members/recruitment`
- Nav group: `Members`
- Primary actor: `staff`
- Scope: `guild`
- Current code:
	- `src/pages/settings/index.tsx`
	- `src/pages/command/index.tsx`
	- command metadata for `settings_recruit *` and referral-related `interview *` commands
- Read substrate:
	- Endpoints: `TABLE`, `INPUT_OPTIONS`, `PERMISSION`
	- Response types: `WebTable`, `WebOptions`, `WebPermission`
	- Table / graph / placeholder types: `GuildSetting` for applicant mail and recruit-message settings
	- Required columns / filters: recruit mail subject/body/enabled, recruit message subject/body/delay/output, future `recruitment_timed_messages`
- Write substrate:
	- Endpoints / command families: `COMMAND`, `settings_recruit *`, referral-related `interview *`
	- Existing form / action components: settings deep-link patterns, command-backed editors, dialog helpers
	- Reload / invalidation targets: relevant `GuildSetting` reads and future timed-message rows

## Why It Exists

- Owns: applicant mail settings, recruit-message settings, timed recruitment follow-ups, and referral-context entry points.
- Does not own: the live onboarding queue, channel state, or mentor assignment workflow that belongs to `Interviews`.
- Current gap: the page needs a concrete wrapper around exact recruit settings and a timed-message read model, not generic "campaign builder" language.

## Workflows

1. Configure applicant mail
	 - Entry: `/members/recruitment` or `/server/setup`
	 - Preconditions: selected guild
	 - Reads: `GuildSetting` rows for `mail_new_applicants`, `mail_new_applicants_subject`, and `mail_new_applicants_text`
	 - UI path: edit applicant-mail enabled state, subject, and body with preview
	 - Mutations: `settings_recruit mail_new_applicants`, `settings_recruit mail_new_applicants_subject`, `settings_recruit mail_new_applicants_text`
	 - Handoff / exit: back to setup or into `Interviews`
2. Configure recruit messages and timed follow-ups
	 - Entry: `/members/recruitment`
	 - Preconditions: selected guild and channel choices available
	 - Reads: recruit-message `GuildSetting` rows plus future `recruitment_timed_messages`
	 - UI path: edit recruit message subject/body/delay/output and review the timed-message list
	 - Mutations: `settings_recruit recruit_message_subject`, `settings_recruit recruit_message_content`, `settings_recruit recruit_message_delay`, `settings_recruit recruit_message_output`, `settings_recruit add_timed_message`, `settings_recruit remove_timed_message`
	 - Handoff / exit: into `Interviews` or `Server Settings` if a prerequisite setting is missing
3. Review referral and incentive context
	 - Entry: `/members/recruitment`
	 - Preconditions: selected guild
	 - Reads: command-backed rankings and referrer actions
	 - UI path: show recruitment rankings, current referral actions, and links into interview work
	 - Mutations: `interview setreferrer`, `interview setreferrerid`
	 - Handoff / exit: into `Interviews` or member detail flows

## Layout Structure

- Top-level regions: `Applicant Mail`, `Recruit Messages`, `Timed Messages`, `Referral And Incentives`.
- Tabs / panels / drawers: keep all four sections on one page; timed-message edits can open dialogs or inline editors.
- URL state: optional anchor or section-state only; the core page does not need a complex URL model.
- Empty / loading / error states: timed-message section should say explicitly when the page is waiting on a missing backend read rather than pretending the list is empty.

## Information Model

- Primary objects shown: recruit settings, applicant mail settings, timed message rows, referral commands, recruitment rankings.
- Filters / grouping: group settings by message stage and group timed messages by trigger.
- Row or card actions: edit a setting, add or remove a timed message, open interview workflow, run referrer actions.
- Detail / modal surfaces: message editor, preview panel, timed-message create or remove dialogs.

## Components

- Reuse: settings patterns, `ApiFormInputs`, command-backed editors, dialog helpers.
- Add: `RecruitmentMessageEditor`, `RecruitmentPreviewPanel`, `TimedMessageTable`, `TimedMessageEditor`, `ReferralRankingPanel`.
- Extend: setup shortcuts so they can deep-link into the exact recruit setting or timed-message blocker.
- Merge: keep recruitment messaging in one page instead of scattering it between unrelated settings categories.

## Implementation Delta

- Route changes: `/members/recruitment` becomes the owner even though current code is still split across settings and command routes.
- Read model changes: add `recruitment_timed_messages`; keep the rest settings-backed.
- Mutation changes: keep writes on existing `settings_recruit *` and referral commands.
- Cache / reload changes: refresh just the affected setting rows and timed-message list after edits.
- Avoid: inventing a fake native recruitment database when the actual source of truth is still `GuildSetting` plus commands.

## Route And Navigation

- Linked from: `/server/setup`, `/members/interviews`, `/server/settings`, `/commands`.
- Links to: `/members/interviews`, `/server/settings`, `/home/announcements`.
- Header / nav actions: focus on setup repair and interview handoff, not generic message-builder chrome.
- Preserved context: selected guild and the owning lifecycle workflow.

## Permissions And Context

- Auth and scope requirements: login, selected guild, recruitment or IA permission.
- Role gates: output-channel and message-setting actions should stay staff-only.
- Setup dependency / recovery: missing roles or channels should deep-link into `Server Settings`, `Roles`, or `Channels`.
- Delegation / inherited context: inherited recruit settings should still surface clearly if a guild delegates to another server.

## Commands And Mutations

- Existing commands: `settings_recruit mail_new_applicants`, `settings_recruit mail_new_applicants_subject`, `settings_recruit mail_new_applicants_text`, `settings_recruit recruit_message_subject`, `settings_recruit recruit_message_content`, `settings_recruit recruit_message_delay`, `settings_recruit recruit_message_output`, `settings_recruit add_timed_message`, `settings_recruit remove_timed_message`, `interview recruitmentrankings`, `interview setreferrer`, `interview setreferrerid`.
- Preview / confirm: message changes should show final body and output target before submit.
- Permission checks: recruit and IA permissions, channel-selection validity, and any row-specific settings permission.
- Side effects / cache refresh: refresh affected recruit settings and timed-message rows.

## Open Questions And Backend Gaps

- Add `recruitment_timed_messages` so the page can render and edit existing timed follow-ups.
- Keep referral rankings and referrer actions command-backed until a dedicated read model proves necessary.


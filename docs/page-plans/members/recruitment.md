# Recruitment

- Status: `Wrap`
- Primary route: `/members/recruitment`
- Legacy aliases: none; related work is currently split across settings and commands
- Nav group: Members
- Primary users: IA, recruiters, and staff managing applicant or new-member messaging
- Current references: `src/pages/settings/index.tsx`, `src/pages/command/index.tsx`, command metadata for `settings_recruit *` and recruitment-related `interview *` commands

## Why It Exists

- Recruitment is a message and pipeline workflow, not just a bag of settings.
- Staff need to manage mail templates, timed messages, and referral context in one place.
- Most of the current source of truth lives in guild settings and command flows, so the first page should wrap that substrate instead of inventing a separate recruitment model.

## Workflows

- Primary: configure applicant and recruit messages, timed follow-ups, and output channels.
- Secondary: review referral or incentive context and recruitment rankings.
- Why users arrive here: tuning onboarding messaging, debugging applicant flow, maintaining recruit automation.
- Upstream entry points: `Server Setup`, `Interviews`, command fallback.
- Downstream hand-offs: `Interviews`, `Announcements`, and server pages for role, channel, or settings prerequisites.

## Layout and Look

- Sections: `Applicant Mail`, `Recruit Messages`, `Timed Messages`, `Referral and Incentives`.
- The page should feel like a campaign builder with operational context, not like a flat key-value settings form.
- Message editors and preview panels should stay visible beside trigger or output settings.

## Information and Interactions

- Applicant mail: enabled state, subject, body, and delivery conditions.
- Recruit messages: subject, content, delay, output channel, and send preview.
- Timed messages: trigger, delay, message content, reorder / remove actions, test preview.
- Referral and incentive section: current referrer commands, rankings, reward context, and links into interview work.
- Keep the member-lifecycle framing obvious: this page handles recruitment and initial messaging, while `Interviews` owns the live onboarding queue.

## Components

- Existing shared: settings patterns, `ApiFormInputs`, command-backed editors, dialog helpers.
- New shared or page-specific: `MessageTemplateEditor`, `TimedMessageBuilder`, `TriggerDelayList`, `RecruitmentPreviewPanel`, `ReferralRewardTable`.

## Data and Endpoints

- Existing endpoints: `TABLE`, `COMMAND`, `INPUT_OPTIONS`, `PERMISSION`.
- Existing table / graph / placeholder substrate: `GuildSetting` already covers applicant mail and recruit-message settings.
- Current backend gap: `recruitment_timed_messages` must return existing timed-message rows with stable id, trigger, delay, subject or body preview, output target, and validity.
- Not current: a settings-summary endpoint is unnecessary because `GuildSetting` already exposes the relevant settings.
- Not current: referral context and rankings can stay command-backed until the page proves they need dedicated reads.

## Command Bindings

- Existing commands: `settings_recruit mail_new_applicants`, `settings_recruit mail_new_applicants_subject`, `settings_recruit mail_new_applicants_text`, `settings_recruit recruit_message_subject`, `settings_recruit recruit_message_content`, `settings_recruit recruit_message_delay`, `settings_recruit recruit_message_output`, `settings_recruit add_timed_message`, `settings_recruit remove_timed_message`, `interview recruitmentrankings`, `interview setreferrer`, `interview setreferrerid`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: every message-setting change should preview the final message body and output target before submit.

## Navigation

- Links to: `/members/interviews`, `/server/settings`, `/home/announcements` for related outbound message work.
- Linked from: IA workflow shortcuts, server setup, settings deep links, command launcher.

## Permissions and Context

- Requires login, selected guild, and recruitment or IA permissions.
- Message output choices depend on current guild channels and roles.

## Risks and Open Questions

- If timed-message state is only visible through settings commands, the page will feel incomplete.
- Need to avoid duplicating the announcements composer; shared message-building primitives should be reused.
- Recruitment and interview work overlap heavily, so cross-links need to be intentional.
- Do not fake a campaign-style builder without a real timed-message read; referral and ranking views can stay command-backed longer.


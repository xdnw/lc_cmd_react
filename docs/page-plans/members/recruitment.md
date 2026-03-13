# Recruitment

- Status: `New`
- Primary route: `/members/recruitment`
- Legacy aliases: none; related work is currently split across settings and commands
- Nav group: Members
- Primary users: IA, recruiters, and staff managing applicant or new-member messaging
- Current references: command metadata for `settings_recruit *` and recruitment-related `interview *` commands

## Why It Exists

- Recruitment is a message and pipeline workflow, not just a bag of settings.
- Staff need to manage mail templates, timed messages, and referral context in one place.

## Workflows

- Primary: configure applicant and recruit messages, timed follow-ups, and output channels.
- Secondary: review referral or incentive context and recruitment rankings.
- Why users arrive here: tuning onboarding messaging, debugging applicant flow, maintaining recruit automation.

## Layout and Look

- Sections: `Applicant Mail`, `Recruit Messages`, `Timed Messages`, `Referral and Incentives`.
- The page should feel like a campaign builder with operational context, not like a flat key-value settings form.
- Message editors and preview panels should stay visible beside trigger or output settings.

## Information and Interactions

- Applicant mail: enabled state, subject, body, and delivery conditions.
- Recruit messages: subject, content, delay, output channel, and send preview.
- Timed messages: trigger, delay, message content, reorder / remove actions, test preview.
- Referral and incentive section: current referrer commands, rankings, reward context, and links into interview work.

## Components

- Existing shared: settings patterns, `ApiFormInputs`, command-backed editors, dialog helpers.
- New shared or page-specific: `MessageTemplateEditor`, `TimedMessageBuilder`, `TriggerDelayList`, `RecruitmentPreviewPanel`, `ReferralRewardTable`.

## Data and Endpoints

- Existing endpoints: none dedicated to recruitment pipeline or timed-message reads.
- Existing table / graph / placeholder substrate: `TABLE` on `GuildSetting` can expose some configuration, but not the full builder experience.
- New endpoints likely needed: recruitment settings summary and timed-message list endpoints are likely needed for a good browser-native page.

## Command Bindings

- Existing commands: `settings_recruit mail_new_applicants`, `settings_recruit mail_new_applicants_subject`, `settings_recruit mail_new_applicants_text`, `settings_recruit recruit_message_subject`, `settings_recruit recruit_message_content`, `settings_recruit recruit_message_delay`, `settings_recruit recruit_message_output`, `settings_recruit add_timed_message`, `settings_recruit remove_timed_message`, `interview recruitmentrankings`, `interview setreferrer`, `interview setreferrerid`.
- Commands likely needing changes: none required immediately.
- Command preview / confirmation rules: every message-setting change should preview the final message body and output target before submit.

## Navigation

- Links to: `/members/interviews`, `/server/settings`, `/home/announcements` for related outbound message work.
- Linked from: IA workflow shortcuts, settings deep links, command launcher.

## Permissions and Context

- Requires login, selected guild, and recruitment or IA permissions.
- Message output choices depend on current guild channels and roles.

## Risks and Open Questions

- If timed-message state is only visible through settings commands, the page will feel incomplete.
- Need to avoid duplicating the announcements composer; shared message-building primitives should be reused.
- Recruitment and interview work overlap heavily, so cross-links need to be intentional.

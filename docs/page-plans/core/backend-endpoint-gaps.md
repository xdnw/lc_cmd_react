# Backend Endpoint Gaps

- Status: `Cross-cutting`
- Scope: `Members`, `War`, and `Economy` page plans
- Related briefs: `docs/page-plans/core/backend-endpoint-shapes.md`, `docs/page-plans/members/*.md`, `docs/page-plans/war/*.md`, `docs/page-plans/economy/*.md`
- Current references: `src/lib/endpoints.ts`, `src/lib/apitypes.d.ts`, `src/lib/commands.ts`, `src/pages/raid/index.tsx`, `src/pages/balance/index.tsx`, `src/pages/records/index.tsx`, `src/pages/settings/index.tsx`, `scripts/list-placeholders.cjs`

## Existing Web-Native Surfaces

- `BALANCE` currently accepts only `nation` and returns `WebBalance { id, is_aa, total, include_grants, access, breakdown, no_access_msg? }`.
- `BANK_ACCESS` currently returns only `WebBankAccess { access }`.
- `RECORDS` already exists, but it is a `WebTable` route rather than typed transaction JSON.
- `RAID` and `UNPROTECTED` are the only current native target-finding reads.
- `TAX_EXPENSE` exists for expense reporting, but Tax member and record views otherwise lean on `TABLE` and commands.

## Current Backend Gaps

| Area | Exact gap | Needed now | Existing substrate | Why it is current |
| --- | --- | --- | --- | --- |
| `Recruitment` | `recruitment_timed_messages` | Read existing timed-message rows with stable id, trigger, delay, subject or body preview, output target, and validity. | `GuildSetting`, `settings_recruit add_timed_message`, `settings_recruit remove_timed_message` | `GuildSetting` covers settings values, but not the timed-message list the page needs to render and edit. |
| `Member Deposits`, `Manage Balance` | explicit bank account list | Add explicit selectable account rows for nation, alliance, guild, tax, and offshore scopes. | `BANK_ACCESS.access` | The current access map does not tell the UI which accounts exist or how to label them. |
| `Member Deposits`, `Member Escrow`, `Manage Balance`, `Manage Escrow` | account-scoped balance read | Query by selected account, not only nation, and return selected account identity plus available, escrow, expired, and ignored buckets. | `BALANCE` | The current route is nation-shaped and does not separate blocked balances. |
| `Ledger` | typed records JSON | Add account-aware filters and typed transaction rows with transaction id, sender and receiver identity, note/category, market value, and expiry or escrow flags. | `RECORDS`, `Transaction2` | The current `WebTable` output and placeholder coverage are too thin for ledger filters and drawers. |
| `Member Escrow`, `Manage Escrow`, `Ledger` | correction preview | Add JSON or dry-run output for `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`, and similar correction actions. | command output only | These actions are risky enough that the page needs authoritative before or after preview data. |
| `Grant Requests` | request queue read | One queue read with request id, requester, receiver, status, reason preview, estimated amounts, and blocking flags. | `grant request *`, `settings_bank_grants *`, query support for `GrantRequest` only | The browser can act on known request ids, but it cannot load a queue to review. |
| `Server Settings` | `setting_inheritance_trace` | Return the local value, effective delegated value, source guild, and invalidity details for a single setting. | `GuildSetting` placeholder `getvalue(checkDelegate)`, `WebSession.delegates_to` | The current page can infer some delegated state, but not explain it cleanly in a detail surface. |
| `Server Settings` | `audit_setting` | Validate one setting at a time and return structured success, warning, or error output for the current guild context. | `settings info`, `GuildSetting`, command output only | The page needs a browser-native repair flow without batching every setting into one slow audit. |
| `Server Settings`, `Roles`, `Server Setup` | `role_bindings` read | Return current role aliases and related metadata for the selected guild, including alliance-scoped aliases where relevant. | `role setalias`, `role unregister`, `settings_auto_role *`, `settings_self_role *` | Role setup is central to admin readiness, but the web UI cannot currently load the alias map as a first-class read model. |
| `Command Browser`, `Command Runner`, `Commands History` | `command_history` read | Return recent command runs with filters for command path, guild, channel, actor, and status. | local command metadata only | History is explicitly planned as a modal with server-backed filtering, not as local browser storage. |
| `Counters` | `war counter sheet` JSON output | Structured rows for enemy targets, suggested attackers, fit or warnings, and blocked rows. | `war counter sheet` command output | Sheet mode needs a real table, not a command blob. |
| `War Rooms` | room-create preview | Structured preview for `war room create` and `war room from_sheet` showing room name, enemy, attackers, category, and warnings. | `war room create`, `war room from_sheet` | Safe room creation depends on previewing the Discord side effects first. |
| `War Sheets` | structured sheet outputs | JSON output on the existing `war sheet` commands used by the page, especially `validate`, `blitzsheet`, `raid`, and any rendered cost or reimbursement tabs. | `war sheet *` command output | The page needs row-level validation, preview, and cost tables rather than export text. |
| `Tax` | automation preview | Preview output for `tax setnationbracketauto` and `tax set_from_sheet` showing affected nations, current bracket, target bracket, and warnings. | `tax setnationbracketauto`, `tax set_from_sheet` | Bulk bracket changes need a review step before submit. |

## Not Current

| Area | Deferred gap | Why it is not current |
| --- | --- | --- |
| `Interviews` | unified interview queue or channel-state read | The first page can wrap `interview iachannels`, `interview listmentors`, `interview sheet`, `audit *`, and `DBNation` tables. |
| `Targets` | native `war find *` and `spy *` read family | `RAID` and `UNPROTECTED` already cover the native target experience; war and spy tabs can start command-backed. |
| `Counters` | native reads for `war counter nation`, `war counter url`, or `war counter auto` | Single-target counter planning can stay command-backed until it proves it needs parity with sheet mode. |
| `War Rooms` | room inventory, room detail, category inventory, or `job_status` | The first page can focus on safe creation and cleanup instead of a live room board. |
| `Manage Balance` | dedicated investigation read family beyond account rows and typed records | The first page can start from `BALANCE`, `BANK_ACCESS`, `RECORDS`, `WITHDRAW`, and command-backed actions once account rows exist. |
| `Grant Templates` | template library or evaluation read family | The first page can wrap `grant_template list`, `grant_template info`, and `grant_template send`. |
| `Tax` | dedicated member-status or record endpoints | Member and record tabs can start from `TABLE`, `TAX_EXPENSE`, and `settings_tax`. |
| `Trade` | market snapshot, ranking, profit, or alert endpoints | Graphs and existing trade or alert commands are enough for the first page. |

## Not Backend Gaps

- `Recruitment` does not need a `recruitment_settings_summary` endpoint. `GuildSetting` already covers applicant and recruit message settings.
- `Tax` does not need a tax policy summary endpoint. `settings_tax` remains the source of truth.
- `Grant Requests` does not need separate detail or context endpoints until a single queue response proves insufficient.
- `Grant Send` does not need a new submit endpoint for the first version.
- `GrantRequest` and `AGrantTemplate` are not current `TABLE` placeholder types, so pages should not assume `TABLE` can read them today.

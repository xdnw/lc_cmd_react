# Backend Endpoint Gaps

- Status: `Cross-cutting`
- Scope: `Members`, `War`, and `Economy` page plans
- Related briefs: `docs/page-plans/members/*.md`, `docs/page-plans/war/*.md`, `docs/page-plans/economy/*.md`
- Current references: `src/lib/endpoints.ts`, `src/pages/raid/index.tsx`, `src/pages/balance/index.tsx`, `src/pages/records/index.tsx`, `src/pages/guild_member/index.tsx`, `src/pages/command/index.tsx`, `src/pages/settings/index.tsx`

## Why It Exists

- The remaining page plans use a mixed substrate: some flows already have real read endpoints, some are settings-backed, and many are still command-wrapped.
- This document lists every missing backend endpoint required if those pages are to become first-class browser pages instead of wrappers around commands, generic tables, or export-style outputs.

## Existing Foundations

- `Members`: no dedicated onboarding or recruitment endpoints exist today; current substrate is `TABLE`, `COMMAND`, `settings_interview *`, `settings_recruit *`, and `interview *`.
- `War`: `RAID` and `UNPROTECTED` already power the raid tool; the rest of the war workflow is command-backed plus graph support.
- `Economy`: `BALANCE`, `RECORDS`, `WITHDRAW`, `BANK_ACCESS`, `TAX_EXPENSE`, and trade graph endpoints exist, but most multi-account, queue, and investigation workflows still depend on commands.

## Full Missing Endpoint List

### Members

| Endpoint | Used by | Purpose | Current fallback |
| --- | --- | --- | --- |
| `interview_queue` | `docs/page-plans/members/interviews.md` | Structured queue of interview channels and onboarding state | `interview iachannels` |
| `interview_detail` | `docs/page-plans/members/interviews.md` | Detail view for one interview target with guild, audit, mentor, and referrer context | ad hoc command output and member lookups |
| `mentor_load_summary` | `docs/page-plans/members/interviews.md` | Mentor-to-mentee load and idle or stale assignment summary | `interview listmentors`, `interview mymentees` |
| `interview_channel_state` | `docs/page-plans/members/interviews.md` | Structured status for interview channel lifecycle, category, staleness, and reopen or archive eligibility | channel commands and `interview iachannels` |
| `recruitment_settings_summary` | `docs/page-plans/members/recruitment.md` | Browser-ready summary of applicant mail and recruit-message settings | `TABLE` over `GuildSetting` |
| `recruitment_timed_messages` | `docs/page-plans/members/recruitment.md` | Read model for timed follow-up messages with trigger, delay, and content | `settings_recruit add_timed_message`, `settings_recruit remove_timed_message` |
| `recruitment_referral_summary` | `docs/page-plans/members/recruitment.md` | Referral and incentive summary for recruitment tuning and IA review | `interview recruitmentrankings`, `interview setreferrer*` |

### War

| Endpoint | Used by | Purpose | Current fallback |
| --- | --- | --- | --- |
| `war_find_enemy` | `docs/page-plans/war/targets.md` | Structured enemy-target search results | `war find enemy` |
| `war_find_damage` | `docs/page-plans/war/targets.md` | Structured high-damage target search results | `war find damage` |
| `war_find_treasure` | `docs/page-plans/war/targets.md` | Structured treasure-target search results | `war find treasure` |
| `war_find_bounty` | `docs/page-plans/war/targets.md` | Structured bounty-target search results | `war find bounty` |
| `war_find_unblockade` | `docs/page-plans/war/targets.md` | Structured unblockade-target search results | `war find unblockade` |
| `spy_find_target` | `docs/page-plans/war/targets.md` | Structured spy-target search results | `spy find target` |
| `spy_find_intel` | `docs/page-plans/war/targets.md` | Structured stale-intel or intel-opportunity results | `spy find intel` |
| `spy_counter` | `docs/page-plans/war/targets.md` | Structured spy-counter candidate results | `spy counter` |
| `war_counter_nation` | `docs/page-plans/war/counters.md` | Candidate attackers and fit scores for one enemy nation | `war counter nation` |
| `war_counter_url` | `docs/page-plans/war/counters.md` | Candidate attackers for a specific war URL | `war counter url` |
| `war_counter_auto` | `docs/page-plans/war/counters.md` | Auto-generated counter recommendations with member-selection detail | `war counter auto` |
| `war_counter_sheet_preview` | `docs/page-plans/war/counters.md` | Preview data for counter sheet or batch-planning flows | `war counter sheet` |
| `war_room_list` | `docs/page-plans/war/rooms.md` | Structured inventory of existing war rooms | `war room list` |
| `war_room_detail` | `docs/page-plans/war/rooms.md` | Detail for one room including enemy, members, category, and status | ad hoc command output and Discord links |
| `war_room_create_preview` | `docs/page-plans/war/rooms.md` | Preview of room creation effects before submit | `war room create` |
| `war_room_batch_preview` | `docs/page-plans/war/rooms.md` | Preview of room creation from a blitz sheet | `war room from_sheet` |
| `war_sheet_blitz_preview` | `docs/page-plans/war/sheets.md` | Preview rows and assumptions for blitz sheet generation | `war sheet blitzsheet` |
| `war_sheet_validation` | `docs/page-plans/war/sheets.md` | Structured validation results for a blitz sheet | `war sheet validate` |
| `war_sheet_raid_preview` | `docs/page-plans/war/sheets.md` | Structured preview for raid-sheet generation | `war sheet raid` |
| `war_sheet_active_wars` | `docs/page-plans/war/sheets.md` | Structured active-war sheet preview or results | `war sheet warsheet` |
| `war_sheet_costsheet` | `docs/page-plans/war/sheets.md` | Structured per-nation or per-war cost output | `war sheet costsheet` |
| `war_sheet_cost_by_resource` | `docs/page-plans/war/sheets.md` | Structured war-cost output broken down by resource | `war sheet costbyresource` |
| `war_sheet_reimburse_by_nation` | `docs/page-plans/war/sheets.md` | Structured reimbursement output by nation | `war sheet reimbursebynation` |

### Economy

| Endpoint | Used by | Purpose | Current fallback |
| --- | --- | --- | --- |
| `accessible_bank_accounts` | `docs/page-plans/economy/holdings.md`, `docs/page-plans/economy/deposits.md` | List nation, alliance, guild, tax, and offshore account scopes visible to the user | inferred from session and `BANK_ACCESS` |
| `account_holdings` | `docs/page-plans/economy/holdings.md` | Holdings summary for a selected bank account scope | `BALANCE` |
| `deposit_investigation` | `docs/page-plans/economy/deposits.md` | Unified view of parked balances, notes, ignored amounts, and availability | `deposits check` and `BALANCE` |
| `deposit_note_flows` | `docs/page-plans/economy/deposits.md`, `docs/page-plans/economy/ledger.md` | Structured note-flow and bookkeeping movement summary | `deposits flows`, `deposits shiftflow` |
| `escrow_summary` | `docs/page-plans/economy/deposits.md` | Escrow balances and escrow-related constraints by nation or account | `escrow view_sheet` |
| `expiring_balance_summary` | `docs/page-plans/economy/deposits.md` | Summary of expiring and decaying balances | `deposits check`, `deposits sheet` |
| `offshore_account_summary` | `docs/page-plans/economy/deposits.md` | Structured offshore-account balances and routing context | `offshore accountsheet`, `offshore add` |
| `deposit_correction_preview` | `docs/page-plans/economy/deposits.md` | Preview the effect of shift, reset, convert, or escrow corrections before submit | `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`, `escrow *` |
| `ledger_records` | `docs/page-plans/economy/ledger.md` | Filterable transaction record stream with typed fields | `RECORDS` and `bank records` |
| `ledger_summary` | `docs/page-plans/economy/ledger.md` | Summary totals for the current ledger filter set | client-side summary over `RECORDS` or sheets |
| `ledger_note_flow` | `docs/page-plans/economy/ledger.md` | Note-flow and category lineage for a selected record or note | `deposits flows` |
| `ledger_correction_preview` | `docs/page-plans/economy/ledger.md` | Preview of balance impact before correction commands run | correction commands only |
| `grant_requests` | `docs/page-plans/economy/grant-requests.md` | Queue of grant requests with scope and status filters | `grant request *` |
| `grant_request_detail` | `docs/page-plans/economy/grant-requests.md` | Full detail for one grant request | command output only |
| `grant_request_context` | `docs/page-plans/economy/grant-requests.md` | Eligibility, balance, recent-grant, and template context for review | ad hoc command combinations |
| `grant_templates` | `docs/page-plans/economy/grant-templates.md` | Template library list with status and filters | `grant_template list` |
| `grant_template_detail` | `docs/page-plans/economy/grant-templates.md` | Full structured template detail | `grant_template info` |
| `grant_template_evaluation` | `docs/page-plans/economy/grant-templates.md` | Eligibility and send preview for a receiver and template | `grant_template info`, `grant_template send` |
| `tax_member_status` | `docs/page-plans/economy/tax.md` | Member-level tax status, bracket assignment, and exception flags | `TABLE` over `DBNation` and tax commands |
| `tax_records_json` | `docs/page-plans/economy/tax.md` | Structured tax deposit and tax record history | `tax records`, `tax deposits`, `TaxDeposit` workbench |
| `tax_bracket_assignments` | `docs/page-plans/economy/tax.md` | Current assigned brackets, internal rates, and self-service eligibility | `tax bracketsheet`, `tax listbracketauto` |
| `tax_automation_preview` | `docs/page-plans/economy/tax.md` | Preview of bracket automation or sheet-driven changes before submit | `tax setnationbracketauto`, `tax set_from_sheet` |
| `trade_market_snapshot` | `docs/page-plans/economy/trade.md` | Fast current-price, spread, and volume snapshot for the market desk | multiple graph and command calls |
| `trade_rankings` | `docs/page-plans/economy/trade.md` | Rankings for traders, producers, and resource movers | `trade ranking`, `trade findproducer`, `trade findtrader` |
| `trade_profit_summary` | `docs/page-plans/economy/trade.md` | Profit summary by nation or alliance with drill-in support | `trade profit` |
| `trade_alert_subscriptions` | `docs/page-plans/economy/trade.md` | Structured list of the current user's trade alerts | `alerts trade list` |

### Shared and Reusable

| Endpoint | Used by | Purpose | Current fallback |
| --- | --- | --- | --- |
| `job_status` | `docs/page-plans/war/rooms.md`, `docs/page-plans/war/sheets.md` | Track long-running batch jobs, partial failures, and completion state | command output only |
| `discord_category_inventory` | `docs/page-plans/war/rooms.md` | Structured Discord category inventory for room placement and readiness validation | `INPUT_OPTIONS` and channel commands |

## Pages That Can Ship Without New Endpoints

- `docs/page-plans/economy/grant-send.md`: can ship as a command-metadata-driven wizard over `BANK_ACCESS`, `BALANCE`, `INPUT_OPTIONS`, `COMMAND`, and `PERMISSION`.
- `docs/page-plans/war/targets.md`: `Raid` and `Unprotected` modes already have endpoint-native foundations via `RAID` and `UNPROTECTED`; only the non-raid tabs need new reads.
- `docs/page-plans/economy/holdings.md`: can evolve now around `BALANCE` and `WITHDRAW`, but full multi-account scope still needs `accessible_bank_accounts` and `account_holdings`.

## Naming Rule

- Endpoint names above are planning names, not locked API contracts.
- When implementation starts, prefer endpoint names that describe the stable read model rather than the exact command they were born from.

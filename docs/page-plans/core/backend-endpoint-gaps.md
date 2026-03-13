# Backend Endpoint Gaps

- Status: `Cross-cutting`
- Scope: `Members`, `War`, and `Economy` page plans
- Related briefs: `docs/page-plans/core/backend-endpoint-shapes.md`, `docs/page-plans/members/*.md`, `docs/page-plans/war/*.md`, `docs/page-plans/economy/*.md`
- Current references: `src/lib/endpoints.ts`, `src/lib/commands.ts`, `src/pages/a2/conflict/conflicts.tsx`, `src/pages/raid/index.tsx`, `src/pages/balance/index.tsx`, `src/pages/records/index.tsx`, `src/pages/guild_member/index.tsx`, `src/pages/command/index.tsx`, `src/pages/settings/index.tsx`

## Why It Exists

- The remaining page plans use a mixed substrate: some flows already have real read endpoints, some are settings-backed, and many are still command-wrapped.
- This document only lists backend work that still remains after accounting for current command-backed browser flows, settings-backed pages, and existing route foundations.
- If a workflow can already ship cleanly through the command UI, settings UI, `TABLE`, or current page endpoints, it is not listed here as a backend gap.

## Existing Foundations

- `Members`: no dedicated onboarding or recruitment endpoints exist today; current substrate is `TABLE`, `COMMAND`, `settings_interview *`, `settings_recruit *`, and `interview *`.
- `War`: `RAID` and `UNPROTECTED` already power the raid tool; the rest of the war workflow is command-backed plus graph support.
- `Economy`: `BALANCE`, `RECORDS`, `WITHDRAW`, `BANK_ACCESS`, `TAX_EXPENSE`, and trade graph endpoints exist, but most multi-account, queue, and investigation workflows still depend on commands.

## Gap Legend

- `Current`: worth adding for the planned page shape now.
- `Later`: not required for the wrapper-first version, but needed if the page is later promoted into a dense native desk.
- `Extend`: prefer expanding an existing endpoint or read surface instead of creating a brand-new endpoint.
- `Preview`: prefer dry-run or structured JSON output on an existing command instead of a separate resource endpoint.

## Gaps

### Members

| Gap | Timing | Best shape | Used by | Current fallback | Why |
| --- | --- | --- | --- | --- | --- |
| `interview desk read model` | `Later` | new read model | `docs/page-plans/members/interviews.md` | `interview iachannels`, `interview listmentors`, `interview mymentees`, `DBNation` tables, `audit *` | If `Interviews` is promoted from command shell to native IA desk, it will need one response family that covers queue rows, selected-detail context, mentor load, and channel state together. |
| `recruitment_timed_messages` | `Current` | new read or recruitment-summary extension | `docs/page-plans/members/recruitment.md` | `settings_recruit add_timed_message`, `settings_recruit remove_timed_message` | The recruitment page wants an actual timed-message builder, and current commands only mutate existing state. |

### War

| Gap | Timing | Best shape | Used by | Current fallback | Why |
| --- | --- | --- | --- | --- | --- |
| `war target read models` | `Later` | new read models | `docs/page-plans/war/targets.md` | `war find *`, `spy find *`, `RAID`, `UNPROTECTED` | `Raid` and `Unprotected` already have native foundations. Additional war and spy tabs only need structured rows if they later need parity with the existing endpoint-native target experience. |
| `war counter planner read model` | `Later` | new read model | `docs/page-plans/war/counters.md` | `war counter nation`, `war counter url`, `war counter auto` | A true counter planner needs structured candidate rows, fit scores, and selection context. The wrapper-first version can stay command-backed. |
| `war counter sheet preview` | `Current` | `Preview` | `docs/page-plans/war/counters.md` | `war counter sheet` | This is preflight data for batch planning, so a dry-run or structured JSON mode is a better fit than a separate endpoint. |
| `war room board read model` | `Later` | new read model | `docs/page-plans/war/rooms.md` | `war room list`, `settings_war_room *`, Discord links | The rooms page can start as a guided command console, but a real active-room board later needs structured room inventory and detail state. |
| `war_room_create_preview` | `Current` | `Preview` | `docs/page-plans/war/rooms.md` | `war room create` | The page wants to preview affected enemies, members, and categories before channel creation. |
| `war_room_batch_preview` | `Current` | `Preview` | `docs/page-plans/war/rooms.md` | `war room from_sheet` | Batch room creation needs structured preview rows before the command runs. |
| `war sheet preview and validation JSON` | `Current` | `Preview` | `docs/page-plans/war/sheets.md` | `war sheet *`, graph endpoints | The browser page mainly needs preview rows, validation output, and export assumptions from existing sheet commands rather than a separate endpoint family. |

### Economy

| Gap | Timing | Best shape | Used by | Current fallback | Why |
| --- | --- | --- | --- | --- | --- |
| `accessible_bank_accounts` | `Current` | `Extend` | `docs/page-plans/economy/holdings.md`, `docs/page-plans/economy/deposits.md` | inferred from session and `BANK_ACCESS` | Multi-account holdings and deposits flows need an actual list of visible nation, alliance, guild, tax, and offshore scopes. |
| `account_holdings` | `Current` | `Extend` | `docs/page-plans/economy/holdings.md` | `BALANCE` | The holdings page needs a scoped balance read for the selected account, which is best modeled as a broader `BALANCE` response. |
| `deposit investigation read model` | `Later` | new read model | `docs/page-plans/economy/deposits.md` | `deposits check`, `BALANCE`, `RECORDS`, `escrow view_sheet`, `offshore accountSheet` | If `Deposits` later becomes a native investigation workspace, it needs one read model that covers parked balances, escrow, expiry, offshore context, and note-state summaries together. |
| `deposit_correction_preview` | `Current` | `Preview` | `docs/page-plans/economy/deposits.md` | `deposits shift`, `deposits shiftFlow`, `deposits convert`, `deposits reset`, `escrow *` | Correction actions need safe balance-impact previews before submit. |
| `ledger expansion` | `Current` | `Extend` | `docs/page-plans/economy/ledger.md` | `RECORDS`, `bank records`, `Transaction2` placeholder coverage | `/records` already exists; the gap is richer filters, typed fields, and filtered totals on the existing ledger foundation. |
| `ledger_correction_preview` | `Current` | `Preview` | `docs/page-plans/economy/ledger.md` | correction commands | Ledger correction actions need the same dry-run balance-impact support as deposit corrections. |
| `grant request queue read model` | `Current` | new read model | `docs/page-plans/economy/grant-requests.md` | `grant request create`, `grant request approve`, `grant request cancel`, `GrantRequest` query support | This is the clearest true queue gap: the browser can act on known request ids, but it cannot yet load a page-ready request queue with review context. |
| `grant template library read model` | `Later` | new read model | `docs/page-plans/economy/grant-templates.md` | `grant_template list`, `grant_template info`, `AGrantTemplate` query support | The wrapper-first page can stay command-backed, but a dense library with filters, status chips, and fast side panes later needs structured list data. |
| `tax derived read surfaces` | `Later` | `Extend` | `docs/page-plans/economy/tax.md` | `TABLE` over `DBNation`, `tax records`, `tax deposits`, `tax bracketsheet`, `tax listBracketAuto`, `TaxDeposit` coverage | Tax can start as settings plus tables, but member-status, record, and bracket-assignment views may later need richer derived data than current table coverage exposes. |
| `tax_automation_preview` | `Current` | `Preview` | `docs/page-plans/economy/tax.md` | `tax setNationBracketAuto`, `tax set_from_sheet` | Bulk tax automation needs sample affected nations and resulting bracket changes before submit. |
| `trade market and ranking read surfaces` | `Later` | `Extend` | `docs/page-plans/economy/trade.md` | trade graph endpoints, `trade ranking`, `trade findProducer`, `trade findTrader`, `DBTrade` coverage | The trade page can launch from graphs and commands now. Native snapshot and ranking surfaces only become necessary if the page later needs denser market-desk behavior. |

### Shared and Reusable

| Gap | Timing | Best shape | Used by | Current fallback | Why |
| --- | --- | --- | --- | --- | --- |
| `job_status` | `Later` | new read model | `docs/page-plans/war/rooms.md`, `docs/page-plans/war/sheets.md` | command output only | Only needed if long-running room or sheet workflows become reconnectable background jobs instead of request-response command runs. |

## Naming Rule

- The planning names above are not locked API contracts.
- When implementation starts, prefer the smallest backend shape that matches the real page need:
  - extend an existing endpoint when the page is growing out of an existing route foundation
  - add preview or JSON output to a command when the need is preflight data rather than a durable resource
  - add a new endpoint only when the page truly needs a stable list, detail, or summary model that command execution cannot represent cleanly

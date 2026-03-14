# Tax

- Status: `Wrap`
- Primary route: `/economy/tax`
- Legacy aliases: none; current related work is split across commands and settings
- Nav group: Economy
- Primary users: econ staff, gov, and occasionally members checking their own tax setup
- Current references: `src/pages/settings/index.tsx`, `src/pages/custom_table/TablePage.tsx`, `src/pages/command/index.tsx`, command metadata for `tax *` and `settings_tax *`

## Why It Exists

- Tax work spans policy, member assignment, records, and automation; it is too broad to live only in settings or slash commands.
- Users need one place to see both what the policy is and who it affects.
- This is a mixed page: settings-backed policy, table and endpoint-backed analysis, and command-wrapped automation. The first version should reflect that boundary.

## Workflows

- Primary: review tax rules, inspect member tax status, audit records, and run bracket automation.
- Secondary: explain member-facing self-set behavior and bracket restrictions.
- Why users arrive here: tax bracket maintenance, compliance checks, growth-circle or tax-base debugging.
- Upstream entry points: `Member Overview`, `Holdings`, `Deposits`, `Server Settings`, command fallback.
- Downstream hand-offs: `Ledger` for account history, `Holdings` or `Deposits` when tax accounts affect balances, `Reports` for deeper roster views.

## Layout and Look

- Four tabs: `Overview`, `Members`, `Records`, `Automation`.
- Keep the page analytical and table-forward, not form-heavy.
- Use settings-style side sections where policy text matters, and table/report surfaces where membership matters.

## Information and Interactions

- Overview: current bracket policy, internal tax rules, allowed self-service brackets, tax base.
- Members: taxable member roster, bracket assignment, internal rate, self-service eligibility, exception flags.
- Records: tax deposits / records with filters and summary totals.
- Automation: run bracket automation, inspect filter-to-bracket rules, deep-link into relevant server settings.
- Keep the connection to banking explicit: tax accounts are part of the same economy model, not a separate world.

## Components

- Existing shared: `SidebarNav`, `TABLE`-backed table patterns, graph components, settings deep-link patterns.
- New shared or page-specific: `TaxPolicySummary`, `TaxMemberTable`, `TaxRecordsPanel`, `TaxAutomationPanel`, `SettingsLinkPill`.

## Data and Endpoints

- Existing endpoints: `TAX_EXPENSE`, `TABLE`, `COMMAND`, `INPUT_OPTIONS`, `PERMISSION`.
- Existing table / graph / placeholder substrate: `TaxDeposit`, `TaxBracket`, and `DBNation` placeholder tables can cover some records and member views, and `settings_tax` remains the policy source of truth.
- Current backend gap: bulk automation preview for `tax setnationbracketauto` and `tax set_from_sheet`, showing affected nations, current bracket, target bracket, and warnings.
- Not current: dedicated member-status, record, or bracket-assignment endpoints; first version can use `TABLE`, `TAX_EXPENSE`, and `settings_tax`.

## Command Bindings

- Existing commands: `tax info`, `tax records`, `tax deposits`, `tax bracketsheet`, `tax setnationbracketauto`, `tax set_from_sheet`, `tax listbracketauto`, `settings_tax *`.
- Commands likely needing changes: none required for basic capability; richer read-side support matters more.
- Command preview / confirmation rules: bulk automation actions must show the scope, target bracket / rate, and sample affected nations before submit.

## Navigation

- Links to: `/server/settings`, `/economy/ledger`, `/reports/tables`, member detail drawers.
- Linked from: server settings deep links, overview action cards, command launcher.

## Permissions and Context

- Requires login and selected guild.
- Member-facing pieces can be read-only while econ/gov can run automation.

## Risks and Open Questions

- Need to decide how much tax record history lives here versus a shared ledger surface.
- Settings and operations must stay connected; this page should not fork the meaning of `settings_tax`.
- If `TaxDeposit` placeholder coverage is not rich enough, dedicated endpoints will become mandatory quickly.
- The page should not fork tax policy away from `settings_tax` just because the automation and records views need richer read models.

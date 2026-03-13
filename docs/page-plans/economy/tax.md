# Tax

- Status: `New`
- Primary route: `/economy/tax`
- Legacy aliases: none; current related work is split across commands and settings
- Nav group: Economy
- Primary users: econ staff, gov, and occasionally members checking their own tax setup
- Current references: command metadata for `tax *` and `settings_tax *`, settings page pattern in `src/pages/settings/index.tsx`

## Why It Exists

- Tax work spans policy, member assignment, records, and automation; it is too broad to live only in settings or slash commands.
- Users need one place to see both what the policy is and who it affects.

## Workflows

- Primary: review tax rules, inspect member tax status, audit records, and run bracket automation.
- Secondary: explain member-facing self-set behavior and bracket restrictions.
- Why users arrive here: tax bracket maintenance, compliance checks, growth-circle or tax-base debugging.

## Layout and Look

- Four tabs: `Overview`, `Members`, `Records`, `Automation`.
- Keep the page analytical and table-forward, not form-heavy.
- Use settings-style side sections where policy text matters, and table/report surfaces where membership matters.

## Information and Interactions

- Overview: current bracket policy, internal tax rules, allowed self-service brackets, tax base.
- Members: taxable member roster, bracket assignment, internal rate, self-service eligibility, exception flags.
- Records: tax deposits / records with filters and summary totals.
- Automation: run bracket automation, inspect filter-to-bracket rules, deep-link into relevant server settings.

## Components

- Existing shared: `HierarchySidebarNav`, `TABLE`-backed table patterns, graph components, settings deep-link patterns.
- New shared or page-specific: `TaxPolicySummary`, `TaxMemberTable`, `TaxRecordsPanel`, `TaxAutomationPanel`, `SettingsLinkPill`.

## Data and Endpoints

- Existing endpoints: `TAX_EXPENSE`, `TABLE`, `INPUT_OPTIONS`.
- Existing table / graph / placeholder substrate: `DBNation` and `TaxDeposit` placeholder types may cover part of the member and records view, but command outputs like `tax records` and `tax deposits` are still sheet-oriented.
- New endpoints likely needed: likely a dedicated `tax_member_status` read endpoint and possibly richer tax-record JSON if `TABLE` + `TaxDeposit` does not expose enough filtering or joins.

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

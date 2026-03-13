# Holdings

- Status: `Evolve`
- Primary route: `/economy/holdings`
- Legacy aliases: `/balance`, `/balance/:category`
- Nav group: Economy
- Primary users: members checking their own funds, econ staff checking alliance or guild accounts, staff preparing withdrawals or grants
- Current references: `src/pages/balance/index.tsx`, `src/pages/records/index.tsx`, `src/pages/guild_member/index.tsx`

## Why It Exists

- The current balance page proves the core flow works, but it feels like a single-account utility rather than a real holdings screen.
- Economy work regularly crosses nation, alliance, guild, and tax accounts, especially in multi-alliance guilds.
- The current balance page is a real endpoint-native foundation, but it is still mostly a single-account utility.

## Workflows

- Primary: inspect holdings, understand breakdowns, and prepare a withdrawal.
- Secondary: compare accounts, jump into ledger investigation, and route into grant work.
- Why users arrive here: personal safekeeping checks, grant prep, offshore review, routine econ tasks.
- Upstream entry points: `Member Overview`, `Grant Requests`, `Grant Send`, command fallback.
- Downstream hand-offs: `Deposits` for parked-balance issues, `Ledger` for transaction history, and grant flows for outbound spending.

## Layout and Look

- Use a ledger-inspired surface with a sticky summary strip, not a centered utility form.
- Top: account scope switcher and quick totals.
- Main body: tabs for `Summary`, `Breakdown`, `Withdraw`, and `Notes`.
- Keep resource values dense and readable; avoid overly decorative cards.

## Information and Interactions

- Let users switch between current nation, registered alliance accounts, guild account, and tax-account contexts.
- Show resource totals and breakdown by note/category.
- Allow withdrawal amount entry with live command preview and validation.
- Link directly into ledger view for the current account and note filters.
- Surface whether escrow, ignored notes, expiry rules, or offshore accounting are affecting the visible balance.
- Make the page's ownership clear: `Holdings` answers what is available now, not every reason why it became that way.
- When special bookkeeping rules matter, point users into `Deposits` rather than stuffing all investigation detail onto this page.

## Components

- Existing shared: `EndpointWrapper`, `ApiFormInputs`, `Button`, `BlockCopyButton`, existing resource and breakdown table patterns.
- New shared or page-specific: `AccountScopeSwitcher`, `HoldingsSummaryStrip`, `HoldingsBreakdownTable`, `WithdrawalComposer`, `HoldingsContextBadge`.

## Data and Endpoints

- Existing endpoints: `BALANCE`, `BANK_ACCESS`, `WITHDRAW`, `COMMAND`.
- Existing table / graph / placeholder substrate: the current balance read and withdraw submit flow are already web-native, but the read model is too narrow for multi-account alliance, guild, tax, and offshore work.
- New endpoints likely needed: `accessible_bank_accounts` and `account_holdings` or an expanded `BALANCE` are needed if the page is expected to switch cleanly between nation, alliance, guild, tax, and offshore contexts.

## Command Bindings

- Existing commands: withdrawal maps to the current `/transfer resources` flow behind `WITHDRAW`; deposit and investigation deep links can point toward `bank deposit` and `deposits check`.
- Commands likely needing changes: none for submission; the page mainly needs better read-side support.
- Command preview / confirmation rules: always show the exact transfer command string and the effective note / deposit type before submit.

## Navigation

- Links to: `/economy/deposits`, `/economy/ledger`, `/economy/grant-requests`, `/economy/grant-send`, `/overview`.
- Linked from: overview bank card, grant workflows, command launcher.

## Permissions and Context

- Requires login and selected guild.
- Visible account options depend on guild registration, bank access, and user permissions.

## Risks and Open Questions

- Balance context must not assume one guild equals one alliance.
- Tax-account and offshore handling need clearer language than raw note codes.
- Do not overload this page with correction tools that belong in `Deposits` or `Ledger`.
- If the backend keeps nation-only reads, this page will stay more limited than the workflow requires.
- If the backend stays nation-centric, the page should be honest about that limitation instead of pretending to cover every account type equally.

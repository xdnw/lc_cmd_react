# Holdings

- Status: `Evolve`
- Primary route: `/economy/holdings`
- Legacy aliases: `/balance`, `/balance/:category`
- Nav group: Economy
- Primary users: members checking their own funds, econ staff checking alliance or guild accounts, staff preparing withdrawals or grants
- Current references: `src/pages/balance/index.tsx`, `src/pages/guild_member/index.tsx`

## Why It Exists

- The current balance page proves the core flow works, but it feels like a single-account utility rather than a real holdings screen.
- Economy work regularly crosses nation, alliance, guild, and tax accounts, especially in multi-alliance guilds.

## Workflows

- Primary: inspect holdings, understand breakdowns, and prepare a withdrawal.
- Secondary: compare accounts, jump into ledger investigation, and route into grant work.
- Why users arrive here: personal safekeeping checks, grant prep, offshore review, routine econ tasks.

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
- Surface whether escrow, ignored notes, or expiry rules are affecting the visible balance.

## Components

- Existing shared: `EndpointWrapper`, `ApiFormInputs`, `Button`, `BlockCopyButton`, existing resource and breakdown table patterns.
- New shared or page-specific: `AccountScopeSwitcher`, `HoldingsSummaryStrip`, `HoldingsBreakdownTable`, `WithdrawalComposer`, `HoldingsContextBadge`.

## Data and Endpoints

- Existing endpoints: `BALANCE`, `BANK_ACCESS`, `WITHDRAW`.
- Existing table / graph / placeholder substrate: none required for MVP.
- New endpoints likely needed: extend `BALANCE` or add a dedicated `holdings_summary` endpoint so the page can query alliance, guild, and tax-account contexts without abusing nation-only balance reads.

## Command Bindings

- Existing commands: withdrawal maps to the current `/transfer resources` flow behind `WITHDRAW`; deposit and investigation deep links can point toward `bank deposit` and `deposits check`.
- Commands likely needing changes: none for submission; the page mainly needs better read-side support.
- Command preview / confirmation rules: always show the exact transfer command string and the effective note / deposit type before submit.

## Navigation

- Links to: `/economy/ledger`, `/economy/grant-requests`, `/economy/grant-send`, `/overview`.
- Linked from: overview bank card, grant workflows, command launcher.

## Permissions and Context

- Requires login and selected guild.
- Visible account options depend on guild registration, bank access, and user permissions.

## Risks and Open Questions

- Balance context must not assume one guild equals one alliance.
- Tax-account and offshore handling need clearer language than raw note codes.
- If the backend keeps nation-only reads, this page will stay more limited than the workflow requires.

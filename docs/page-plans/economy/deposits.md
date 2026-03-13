# Deposits

- Status: `New`
- Primary route: `/economy/deposits`
- Legacy aliases: none; current related work is split across command output, `/balance`, and `/records`
- Nav group: Economy
- Primary users: econ staff, members checking escrow or expiry issues, and admins managing offshore or guild accounts
- Current references: `src/pages/balance/index.tsx`, `src/pages/records/index.tsx`, command metadata for `deposits *`, `escrow *`, `offshore *`, and resource-conversion settings

## Why It Exists

- Deposits, offshore balances, escrow, expiry, and note-category behavior are one connected investigation workflow.
- `Holdings` and `Ledger` are necessary, but neither page should have to carry the full burden of parked-balance logic.

## Workflows

- Primary: inspect where balances are parked, see what special rules affect them, and understand whether offshore, escrow, expiry, or conversion is changing what a user can actually use.
- Secondary: review expiring grants, reset or shift note categories, convert resources, inspect offshore accounts, and hand off into grant or withdrawal work.
- Why users arrive here: offshore investigations, escrow questions, expired-grant cleanup, resource conversion troubleshooting, and multi-account econ review.
- Upstream entry points: `Holdings`, `Ledger`, grant approval flow, admin troubleshooting, command fallback.
- Downstream hand-offs: `Holdings`, `Ledger`, `Grant Send`, `Grant Requests`, `Tax`.

## Layout and Look

- Use an investigation surface with a sticky health strip and dense account tables.
- Top: account scope selector and state chips for `Escrow`, `Expiring`, `Ignored`, `Converted`, and `Offshore`.
- Main body: tabs for `Accounts`, `Escrow And Expiry`, `Corrections`, and `Offshore`.

## Information and Interactions

- Make the ownership model explicit:
- `Holdings` answers what is available now.
- `Deposits` answers where balances are sitting and what rules affect them.
- `Ledger` answers what happened over time and which record needs correction.
- Show nation, alliance, guild, offshore, and tax-account balances side by side when permissions allow.
- Surface escrow balances, expiring or decaying grants, ignored amounts, and conversion rules in plain language.
- Show note or category totals with links into filtered ledger views.
- Guarded actions can include shift note category, shift flow, convert, reset, escrow adjust, and offshore investigation actions.

## Components

- Existing shared: balance tables, record filters, dialog helpers, command preview patterns.
- New shared or page-specific: `DepositAccountMatrix`, `DepositHealthStrip`, `EscrowQueue`, `ExpiringBalancePanel`, `DepositCorrectionPreview`, `OffshoreAccountPanel`.

## Data and Endpoints

- Existing endpoints: `BALANCE`, `RECORDS`, and generic command execution support may cover part of the workflow.
- Existing table / graph / placeholder substrate: current placeholders are not sufficient to make this page comfortable without extra read support.
- New endpoints likely needed: likely deposit-investigation, escrow-summary, offshore-account, and note-health JSON endpoints if this page is meant to be first-class.

## Command Bindings

- Existing commands: `deposits check`, `deposits sheet`, `deposits flows`, `deposits shift`, `deposits shiftflow`, `deposits convert`, `deposits reset`, `escrow view_sheet`, `escrow withdraw`, `escrow add`, `escrow set`, `offshore accountsheet`, `offshore add`.
- Commands likely needing changes: none required for raw capability.
- Command preview / confirmation rules: any corrective action must show the affected account, note behavior, and expected balance impact before submit.

## Navigation

- Links to: `/economy/holdings`, `/economy/ledger`, `/economy/grant-send`, `/economy/grant-requests`, `/economy/tax`, `/overview`.
- Linked from: holdings blockers, ledger issue states, grant review flow, command launcher.

## Permissions and Context

- Required scope: login and selected guild.
- Relevant settings or role gates: some panels are member-safe read views; offshore and correction actions are econ or admin-only.
- Recovery path when setup is incomplete: deep-link to `/server/setup` or the relevant banking settings inside `/server/settings`.

## Risks and Open Questions

- This page must not turn into a duplicate of `Holdings` or `Ledger`.
- Raw note codes and bookkeeping terms need translation into operator language.
- Multi-alliance offshore views need careful labeling so users always know which account they are touching.
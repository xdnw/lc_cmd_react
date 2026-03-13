# Grant Send Wizard

- Status: `New`
- Primary route: `/economy/grant-send`
- Legacy aliases: none; command fallback remains `/command/:command`
- Nav group: Economy
- Primary users: econ staff, gov, and any role trusted to send grants
- Current references: command metadata for the `grant` family, `src/pages/command/index.tsx`, `src/components/cmd/CommandComponent.tsx`

## Why It Exists

- The grant family already exposes the right power, but raw argument names are too dense for common grant work.
- This is one of the strongest browser-native opportunities because grant sending is multi-step, review-heavy, and policy-sensitive.

## Workflows

- Primary: send cities, infra, land, project, unit, research, warchest, build, or mmr grants.
- Secondary: start from a pending request, re-run a previous grant shape, or send from a template.
- Why users arrive here: daily econ operations, wartime rebuilds, growth programs, special-case approvals.
- Upstream entry points: `Grant Requests`, `Grant Templates`, `Holdings`, `Deposits`, command fallback.
- Downstream hand-offs: `Ledger` after submit, `Deposits` when funding state needs inspection, and template flow for recurring policy.

## Layout and Look

- Wizard layout with clear progress steps and a sticky preview rail.
- Use a dense, policy-aware operations look rather than a friendly consumer checkout flow.
- Keep funding source, expiry, note, and escrow decisions visible near the preview at all times.

## Information and Interactions

- Step 1: choose grant type.
- Step 2: choose receivers and optionally scope by alliance or filter.
- Step 3: fill grant-specific values.
- Step 4: choose funding, accounting, escrow, expiry, and comms settings.
- Step 5: review warnings, generated command, and expected cost.
- Step 6: submit and show result / follow-up actions.
- Keep funding, note, expiry, tax-account, and escrow choices visible in the same visual area as the preview so users do not lose track of the accounting impact.

## Components

- Existing shared: `CommandComponent`, `ArgInput`, `ApiFormInputs`, `CommandStringPreview`, dialog helpers.
- New shared or page-specific: `CommandBackedWizard`, `GrantTypePicker`, `FundingSourcePicker`, `GrantReceiverPicker`, `WorkflowActionPreview`, `GrantWarningsPanel`.

## Data and Endpoints

- Existing endpoints: `BANK_ACCESS`, `BALANCE`, `INPUT_OPTIONS`, generic command execution support.
- Existing table / graph / placeholder substrate: command metadata is the authoritative argument source and should drive the low-level form sections.
- New endpoints likely needed: none required for an MVP submit flow; optional `grant_preview` or `grant_eligibility` read endpoints would improve warnings and cost summaries later.

## Command Bindings

- Existing commands: `grant city`, `grant infra`, `grant land`, `grant project`, `grant unit`, `grant research`, `grant warchest`, `grant build`, `grant mmr`, `grant cost`.
- Commands likely needing changes: none required; the wizard should adapt to current metadata instead of hard-coding every field.
- Command preview / confirmation rules: the generated command string, funding source, note behavior, and expiry / escrow settings must stay visible before the final submit.

## Navigation

- Links to: `/economy/grant-requests`, `/economy/grant-templates`, `/economy/holdings`, `/economy/ledger`.
- Linked from: grant request review, grant templates, command launcher, overview role-based shortcuts.

## Permissions and Context

- Requires login, selected guild, and grant-related permissions.
- Alliance scope and funding choices must reflect the selected guild's registered alliances.

## Risks and Open Questions

- The wizard must not drift from command metadata or it will rot quickly.
- Grant send is a place where users need strong warning copy, not just validation errors.
- Need to decide how much of `grant cost` estimation belongs inline versus as an optional side panel.

# Grant Requests

- Status: `New`
- Primary route: `/economy/grants/requests`
- Legacy aliases: none; currently command-only
- Nav group: Economy
- Primary users: members requesting grants, econ staff reviewing and approving them
- Current references: command metadata for `grant request *`, existing command and dialog infrastructure in `src/pages/command/index.tsx`

## Why It Exists

- Grant requests are a queue and review workflow, not a one-off command.
- Approval quality depends on surrounding context: balances, eligibility, recent grants, and the requested action itself.

## Workflows

- Primary: create a request, review open requests, approve or cancel with context.
- Secondary: escalate a request into the full send wizard when approval needs edits.
- Why users arrive here: members needing funds, econ staff processing the daily queue, grant reviewers triaging issues.

## Layout and Look

- Split view: request queue on the left, selected request drawer or detail pane on the right.
- Keep the surface transactional and triage-friendly, more like a support queue than a dashboard.
- Status chips and amount estimates should stand out immediately.

## Information and Interactions

- Queue filters: alliance scope, request status, grant type, requester, age, estimated amount.
- Detail view: requester, receiver, reason, source command, estimate, current balances, recent grants, template matches, warnings.
- Actions: approve, cancel, open in send wizard, copy command, mark for follow-up.
- Request creation should be available in-page for members with a simplified form.

## Components

- Existing shared: `CommandComponent`, `ApiFormInputs`, `DialogProvider`, table and drawer patterns from conflicts/settings.
- New shared or page-specific: `GrantRequestQueue`, `GrantRequestDrawer`, `EligibilityPanel`, `GrantRequestFilters`, `GrantActionPreview`.

## Data and Endpoints

- Existing endpoints: none found for grant-request queue reads.
- Existing table / graph / placeholder substrate: no obvious current placeholder or endpoint surface covers request queues.
- New endpoints likely needed: `grant_requests`, `grant_request_detail`, and a small context endpoint for balances / recent grants / template eligibility are likely required for a credible page.

## Command Bindings

- Existing commands: `grant request create`, `grant request approve`, `grant request cancel`, plus hand-off into `grant *` and `grant_template info`.
- Commands likely needing changes: none required immediately, though a richer approval preview command could help later.
- Command preview / confirmation rules: approvals must always show the underlying command and the funding/accounting assumptions before final submit.

## Navigation

- Links to: `/economy/grant-send`, `/economy/holdings`, `/economy/ledger`, `/overview`.
- Linked from: overview action cards, grant templates, holdings, command launcher.

## Permissions and Context

- Members may create and view their own requests.
- Econ or gov users should get queue-wide visibility and approval actions.

## Risks and Open Questions

- Without new read endpoints this page becomes a command wrapper, which is not enough.
- Need to decide whether request creation is a separate simple view on mobile.
- The page should explain why a request is risky, not just whether it can be approved.

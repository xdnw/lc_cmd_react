# Grant Requests

- Classification: `route`
- Status: `Wrap`
- Primary route or owner: `/economy/grant-requests`
- Nav group: `Economy`
- Primary actor: `everyone`
- Scope: `guild + alliance`
- Current code:
	- `src/pages/command/index.tsx`
	- `src/pages/settings/index.tsx`
	- command metadata for `grant request *`, `grant *`, and `grant_template info`
- Read substrate:
	- Endpoints: `INPUT_OPTIONS`, `PERMISSION`, future `grant_requests`
	- Response types: `WebOptions`, `WebPermission`, future queue rows
	- Table / graph / placeholder types: grant settings through `settings_bank_grants *`; no current queue placeholder type
	- Required columns / filters: request id, requester, receiver, status, reason preview, estimated amounts, blocking flags
- Write substrate:
	- Endpoints / command families: `COMMAND`, `grant request *`, `grant *`, `grant_template info`
	- Existing form / action components: command-backed request form, dialogs, drawer patterns
	- Reload / invalidation targets: request queue read, related grant-send and balance views

## Why It Exists

- Owns: request creation, request review, request approval or cancellation, and handoff into send workflows when a reviewer needs to edit the underlying grant.
- Does not own: the grant-template library or the full grant-send wizard.
- Current gap: the workflow is real, but it still lacks the queue read that would let the page behave like a proper review surface.

## Workflows

1. Create a grant request
	 - Entry: `/economy/grant-requests` or a shortcut from member-self balance pages
	 - Preconditions: user can request grants in the current guild
	 - Reads: command metadata, request-channel policy from settings, optional template info lookup
	 - UI path: simplified request form in the page shell
	 - Mutations: `grant request create`
	 - Handoff / exit: request lands in the queue and the member can monitor its status
2. Review the queue
	 - Entry: `/economy/grant-requests`
	 - Preconditions: reviewer has econ or gov visibility
	 - Reads: future `grant_requests` queue, `grant_template info`, and related balance context when linked
	 - UI path: queue list on one side, selected request drawer or detail pane on the other
	 - Mutations: `grant request approve`, `grant request cancel`
	 - Handoff / exit: into `Grant Send`, `Manage Balance`, or `Ledger` if the reviewer needs deeper context
3. Escalate to a full send workflow
	 - Entry: selected request row
	 - Preconditions: request needs edits or manual approval context
	 - Reads: selected request details plus any matched template context
	 - UI path: open the send wizard or raw command fallback with the request context prefilled
	 - Mutations: approval or a separate `grant *` send flow
	 - Handoff / exit: into `/economy/grant-send`

## Layout Structure

- Top-level regions: request queue, selected request detail, inline request-create form for members, and action preview area.
- Tabs / panels / drawers: queue plus detail pane on desktop; request list plus modal or stacked detail on mobile.
- URL state: selected request id, queue filters, and optionally whether the user is on create vs. review mode.
- Empty / loading / error states: if the queue endpoint is missing, the page should say it is still command-wrapped instead of pretending there are no requests.

## Information Model

- Primary objects shown: request rows, requester, receiver, status, reason preview, estimated amounts, template context, balance context, blocking flags.
- Filters / grouping: status, requester, receiver, grant type, age, and alliance scope.
- Row or card actions: approve, cancel, open in `Grant Send`, copy or inspect the generated command, reopen member balance context.
- Detail / modal surfaces: request detail drawer and action-confirmation dialog.

## Components

- Reuse: `CommandComponent`, `ApiFormInputs`, `DialogProvider`, drawer and list patterns already used in settings or conflicts.
- Add: `GrantRequestQueue`, `GrantRequestDrawer`, `GrantRequestFilters`, `GrantRequestContextPanel`, `GrantActionPreview`.
- Extend: links into `Grant Send`, `Manage Balance`, and `Ledger` so request review can branch into broader econ work.
- Merge: keep member request creation and staff queue review in one route with role-aware sections rather than splitting them into unrelated pages too early.

## Implementation Delta

- Route changes: `/economy/grant-requests` becomes the owner even though the current capability is command-only.
- Read model changes: add one `grant_requests` queue read before inventing any richer detail API family.
- Mutation changes: keep create, approve, and cancel command-backed.
- Cache / reload changes: refresh queue rows and any visible balance context after request actions.
- Avoid: an `EligibilityPanel` abstraction that implies requests have a formal eligibility model separate from the reviewer context and grant-template rules.

## Route And Navigation

- Linked from: `/home/member-overview`, `/members/deposits`, `/economy/manage-balance`, `/economy/grant-templates`, `/commands`.
- Links to: `/economy/grant-send`, `/economy/manage-balance`, `/economy/ledger`.
- Header / nav actions: emphasize `Create Request` for members and `Queue Filters` for reviewers.
- Preserved context: requester scope, queue filters, and selected request id.

## Permissions And Context

- Auth and scope requirements: selected guild, with role-aware visibility for member vs. reviewer flows.
- Role gates: members can create and inspect their own requests; econ or gov staff get queue-wide actions.
- Setup dependency / recovery: grant-request settings and request-channel config still live in server settings.
- Delegation / inherited context: if request policy is inherited, the page should still surface that through settings links.

## Commands And Mutations

- Existing commands: `grant request create`, `grant request approve`, `grant request cancel`, plus handoff into `grant *` and `grant_template info`.
- Preview / confirm: approvals should show the resulting command and current balance assumptions before submit.
- Permission checks: command permission plus queue visibility rules.
- Side effects / cache refresh: refresh queue rows and any linked balance panels after request actions.

## Open Questions And Backend Gaps

- Add one `grant_requests` queue endpoint before adding any broader request-detail family.
- Keep grant-template context lightweight; the reviewer needs context, not a fake separate eligibility model.

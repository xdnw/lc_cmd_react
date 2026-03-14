<!--
WARNING: HALLUCINATORY GARBAGE.
This file is AI-generated speculation and is not trustworthy.
Do not use it as source of truth, implementation guidance, planning input,
architectural guidance, or evidence that any described feature or substrate exists.
Keep it only as an idea scrap in case a small part is someday worth salvaging.
-->

# Grant Templates

- Status: `Wrap`
- Primary route: `/economy/grant-templates`
- Legacy aliases: none; command fallback remains `/commands` or `/command/:command`
- Nav group: Economy
- Primary users: econ staff and gov maintaining recurring grant policy
- Current references: `src/pages/command/index.tsx`, command metadata for `grant_template *`, and generic command/page infrastructure

## Why It Exists

- Grant templates act like a small policy engine, not just saved forms.
- Users need to understand eligibility, limits, and defaults without reading a raw command path every time.
- The first version should wrap `grant_template list`, `grant_template info`, and `grant_template send` rather than assume a native policy library already exists.

## Workflows

- Primary: browse template library, inspect template rules, create or edit templates, send via template.
- Secondary: explain to reviewers or members why a receiver is or is not eligible.
- Why users arrive here: grant-program maintenance, onboarding / growth policy, wartime template use.
- Upstream entry points: `Grant Send`, `Grant Requests`, overview shortcuts, command fallback.
- Downstream hand-offs: `Grant Send`, `Holdings`, and request review when template policy answers the question.

## Layout and Look

- Three-mode page: `Library`, `Builder`, and `Send`.
- Library should read like a policy catalog with quick status chips.
- Builder should use structured sections, not one long form.
- Send mode should show eligibility explanation before the final action.

## Information and Interactions

- Library: filter by type, enabled state, scope, and role.
- Detail: show grant type, recipient filter, city bounds, roles, brackets, limits, expiry / decay, repeatability, ignore behavior.
- Builder: adapt fields to template subtype such as city, infra, project, research, raws, or warchest.
- Send: choose receiver(s), explain eligibility, adjust override values, preview result.

## Components

- Existing shared: `ArgInput`, `CommandComponent`, `ApiFormInputs`, dialog helpers.
- New shared or page-specific: `TemplateLibraryList`, `TemplateDetailPanel`, `TemplateBuilderTabs`, `TemplateEligibilityExplainer`, `TemplateSendPanel`.

## Data and Endpoints

- Existing endpoints: `COMMAND`, `INPUT_OPTIONS`, `PERMISSION`.
- Existing table / graph / placeholder substrate: `AGrantTemplate` query support exists for inputs, but there is no template list or detail JSON surface.
- Current backend gaps: none for the first wrapped page.
- Existing `grant_template list`, `grant_template info`, and `grant_template send` are enough to ship a command-backed library.
- Later only if browsing becomes a workflow blocker: template list, detail, and evaluation reads.

## Command Bindings

- Existing commands: `grant_template list`, `grant_template info`, `grant_template send`, `grant_template enable`, `grant_template disable`, `grant_template delete`, and `grant_template create build|city|infra|land|project|raws|research|warchest`.
- Commands likely needing changes: none required; the page mostly needs read-side APIs and adapters for subtype-specific create flows.
- Command preview / confirmation rules: every create, update-equivalent, delete, enable, disable, and send action should show the generated command and the template scope it affects.

## Navigation

- Links to: `/economy/grant-send`, `/economy/grant-requests`, `/economy/manage-balance`.
- Linked from: grant send wizard, overview shortcuts, command launcher.

## Permissions and Context

- Requires login, selected guild, and template-management permissions.
- Some users may only be allowed to send specific templates and not edit them.

## Risks and Open Questions

- Without read endpoints the library becomes slow and awkward.
- Template subtype differences are real; do not force them into a lowest-common-denominator UI.
- Need a clear story for editing existing templates if the backend only exposes create / enable / disable / delete commands today.
- The page should not pretend existing command outputs are already a comfortable template library.

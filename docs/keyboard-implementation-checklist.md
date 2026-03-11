# Keyboard Implementation Checklist

## Purpose

This checklist turns `docs/keyboard-policy.md` into an implementation plan that is explicit about:
- what gets implemented at each layer
- which files own which behavior
- which shared capabilities must exist before component work begins
- which state transitions must be implemented in shell-level code

This document is intentionally implementation-oriented. It is allowed to be more concrete than the policy.

Keep this document in sync with `docs/keyboard-policy.md` whenever implementation reveals a necessary clarification.

## Rollout Strategy

Implement in vertical slices, but build the slices on shared primitives rather than one-off handlers.

Recommended order:
1. Shared keyboard primitives and shared popup ownership contract
2. Launcher and command-shell core behavior
3. Segmented controls and low-tab-stop compound inputs
4. Picker dialogs and popup-backed inputs
5. Opportunistic non-textual slot controls
6. Deferred shared-dialog harmonization, broader polish, and exception documentation

## Non-Regression Guardrails

The rollout must preserve these existing contracts unless a later policy change explicitly replaces them:

- plain `Enter` field advance remains command-form behavior
- `Ctrl+Enter` / `Cmd+Enter` submit remains command-shell behavior
- popup ownership continues to use the shared `data-command-popup-open="true"` contract
- timed double-`Escape` remains the shell back or close mechanism rather than URL-state-driven logic
- popup-backed children must continue to block parent shell handlers while open

## Shared Capability Contract

No component may opt into advanced keyboard behavior without declaring which shared capabilities it uses.

At implementation time, each relevant component should explicitly use or decline these capabilities:

- `popupOwnership`: component can expose popup-open state through the shared popup contract
- `mnemonicSelection`: component supports direct mnemonic value selection
- `unclaimedTypingNavigation`: component supports printable-key navigation when the current control does not meaningfully own the key
- `edgeArrowEscape`: component allows edge-arrow movement to neighboring arguments or subfields
- `primaryDataEntryPath`: component has a known preferred focus target after commit, add, remove, or popup close
- `multiTabStopException`: component intentionally uses more than one tab stop and documents why

Absence of a capability means the behavior is disabled.

## Shared Popup Ownership Contract

Popup-open state must be programmatically queryable in one shared way.

Implementation requirements:
- Use the shared `COMMAND_POPUP_OPEN_ATTR` contract as the DOM-visible ownership signal.
- Use shared helper APIs to query popup-open state instead of component-local ad hoc checks.
- A popup-backed component must set the contract on an ancestor that encloses the focused control while the popup is visible.
- Parent shells must defer `Escape`, `Enter`, arrows, and printable-key navigation whenever the shared popup-open contract reports ownership.
- Popup open and popup close must clear shell arming state and prefix buffers.

Primary file:
- `h:\Github\lc_cmd_react\src\components\cmd\commandKeyboard.ts`

Dependent files:
- `h:\Github\lc_cmd_react\src\components\cmd\ListComponent.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\QueryComponent.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\PlaceholderExpressionInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\MapInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\SetInput.tsx`

## Shell State Machine

This state machine belongs in implementation, not the policy. All shell-level work should align to it.

### States

1. `idle`
- No popup owns input
- No armed close or back state
- No prefix buffer active
- Local field or list behavior owns keys first

2. `popup-owned`
- A popup-backed child is open
- Popup owns `Escape`, `Enter`, arrows, and printable keys it can use
- Shell arming state and prefix buffers are cleared

3. `shell-active`
- No popup is open
- Shell can observe eligible keys after local-field deferral
- Active argument or active result is known

4. `armed-close`
- First neutral `Escape` has armed close
- Timeout running for `1600ms`
- Visual hint shown
- Assistive-tech announcement emitted once per actual state entry

5. `armed-back`
- First neutral `Escape` has armed back
- Timeout running for `1600ms`
- Visual hint shown
- Assistive-tech announcement emitted once per actual state entry

6. `prefix-buffer-active`
- A shell-owned prefix buffer exists
- Buffer timeout running for `1000ms` from last modifying key
- Buffer is lowercase and case-insensitive for matching

### Transitions

#### Popup transitions
- `idle` or `shell-active` -> `popup-owned` when a popup-backed child opens
- `popup-owned` -> `shell-active` when popup closes and focus remains in the shell
- Any transition into or out of `popup-owned` clears armed state and prefix buffer

#### Escape transitions
- `shell-active` -> `armed-close` on first neutral `Escape` when close is the next shell action
- `shell-active` -> `armed-back` on first neutral `Escape` when back is the next shell action
- `armed-close` -> close action on second neutral `Escape` before timeout
- `armed-back` -> back action on second neutral `Escape` before timeout
- `armed-close` or `armed-back` -> `shell-active` when timeout expires
- `armed-close` or `armed-back` -> `shell-active` when focus leaves the shell
- `armed-close` or `armed-back` -> `shell-active` when popup opens or closes
- `armed-close` or `armed-back` -> `shell-active` when shell navigation changes active result or active argument

Announcement rule:
- Repeated `Escape` presses must not emit duplicate assistive-tech announcements unless the shell transitions into a newly armed state again.

#### Prefix buffer transitions
- `shell-active` -> `prefix-buffer-active` when a component with `unclaimedTypingNavigation` or shell-owned neutral typing accepts a printable key
- `prefix-buffer-active` stays active while printable keys or `Backspace` continue within `1000ms`
- `prefix-buffer-active` -> `shell-active` on timeout expiry
- `prefix-buffer-active` -> `shell-active` on focus change
- `prefix-buffer-active` -> `shell-active` on popup open or close
- `prefix-buffer-active` -> `shell-active` on committed action such as activate, submit, back, or close
- `prefix-buffer-active` -> `shell-active` on shell navigation that changes target, unless the component explicitly preserves the buffer

## Phase Plan

### Phase 1: Shared primitives

Primary file:
- `h:\Github\lc_cmd_react\src\components\cmd\commandKeyboard.ts`

Implement:
- popup-open query helpers
- printable-key ownership helpers
- caret-at-edge helpers
- text-selection helpers
- IME/composition guards
- mnemonic matching helpers
- edge-arrow eligibility helpers
- active-result helper semantics for launcher-like lists
- explicit single-line command-field metadata so shell `Enter` behavior does not depend on raw native `input` types alone

Definition checks:
- neutral `Escape`
- settled single-line field
- next eligible visible enabled argument in form order
- explicit focus-target fallbacks

Blocker rule:
- Do not begin component-level advanced keyboard work until the shared popup ownership and key-ownership helpers exist.

Non-regression checks:
- [ ] existing `Enter` advance behavior still works before edge-arrow navigation is broadened
- [ ] existing submit shortcut still works after shell changes
- [ ] popup-open deferral still works in existing popup-backed inputs before new inputs adopt the contract

### Phase 2: Launcher and command-shell core

Primary files:
- `h:\Github\lc_cmd_react\src\components\cmd\CmdList.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\CommandLauncher.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\SearchBar.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\CommandComponent.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\useCommandShellKeyboard.ts`
- `h:\Github\lc_cmd_react\src\components\cmd\CommandDialogForm.tsx`

Implement:
- launcher search retains DOM focus
- launcher uses `aria-activedescendant` for active result
- `Enter` from launcher search activates active result
- active result stays deterministic after filtering
- `ArrowUp` and `ArrowDown` update the active result while DOM focus remains on launcher search
- launcher `Escape` clear -> arm -> close sequencing remains deterministic
- shell `Escape` arming follows the state machine
- armed-state hint is visible and announced
- plain `Enter` advances to the next eligible visible enabled argument in form order
- edge arrows move between arguments only when shared boundary checks pass
- explicit focus targets replace generic blur behavior
- `SearchBar.tsx` participates in parent clear or back sequencing rather than hardcoding a standalone `Escape` meaning
- `CommandDialogForm.tsx` remains the reference shell for focus landing, restoration, and shell hint behavior

Acceptance checklist:
- [ ] Search never loses DOM focus during launcher result navigation
- [ ] `aria-activedescendant` points to the active result when results exist
- [ ] `Enter` from search activates the active result
- [ ] `ArrowUp` and `ArrowDown` only update active result and do not move DOM focus out of search
- [ ] launcher `Escape` clear -> arm -> close sequence is tested explicitly
- [ ] first neutral `Escape` arms; second neutral `Escape` closes or backs within `1600ms`
- [ ] repeated `Escape` presses do not create duplicate assistive-tech announcements when shell state is unchanged
- [ ] popup open clears armed state and prefix buffer
- [ ] focus falls back to opener, nearest logical parent, or primary search surface if opener no longer exists

### Phase 3: Segmented controls

Primary files:
- `h:\Github\lc_cmd_react\src\components\cmd\BooleanInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\TriStateInput.tsx`

Capabilities to opt into:
- `mnemonicSelection`
- `edgeArrowEscape` only if arrows can leave the control at outer edges
- `primaryDataEntryPath`

Implement:
- one tabbable active option at a time
- arrow-key option changes
- `Home` and `End` support
- `t` / `f` for Boolean
- `t` / `a` / `f` for TriState
- optional `y` / `n` only if unambiguous
- `Space` toggle for Boolean
- `Space` cycle for TriState using visible option order

Acceptance checklist:
- [ ] One tab stop only
- [ ] Mnemonic keys work only while the control owns focus
- [ ] `Space` behavior matches visible order and tests

### Phase 4: Compound inputs

Primary files:
- `h:\Github\lc_cmd_react\src\components\cmd\SetInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\MapInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\KeyValueEntryList.tsx`

Capabilities to opt into by component:
- `popupOwnership`
- `edgeArrowEscape`
- `unclaimedTypingNavigation`
- `primaryDataEntryPath`
- `multiTabStopException` only if documented

Implement for `SetInput.tsx`:
- keep one primary tab stop on the pending field
- empty-field `Backspace` or `Delete` removes the previous item
- focus returns to the pending field after add or remove
- popup-backed child input still blocks parent ownership while open

Implement for `MapInput.tsx`:
- key `Enter` moves to value
- value `Enter` commits pair
- left or right arrows move within the row first, then across arguments at outer edges
- static enumerated maps can jump to the matching value input when current field does not meaningfully own letters
- numeric value fields are the main first-wave candidates for typed key jumps

Implement for `KeyValueEntryList.tsx`:
- remove remains keyboard-reachable without forcing tab-stop explosion

Acceptance checklist:
- [ ] Primary data-entry path is explicit and tested
- [ ] Static-map jumps are disabled for text-owning value fields
- [ ] Static-map jumps are disabled while popup-backed child input is open
- [ ] Any component requiring more than one tab stop documents its exception

### Phase 5: Popup-backed list and expression inputs

Primary files:
- `h:\Github\lc_cmd_react\src\components\cmd\ListComponent.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\QueryComponent.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\PlaceholderExpressionInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\PlaceholderCommandPickerDialog.tsx`

Implement:
- shared popup ownership contract everywhere
- popup-first `Escape`, `Enter`, arrows, and printable-key handling
- `ListComponent.tsx` keeps deterministic highlight behavior and gains explicit `Home`, `End`, and, where appropriate, `PageUp` / `PageDown` handling
- picker-dialog search keeps focus and owns active result semantics where appropriate
- picker-dialog back or clear behavior before close

Acceptance checklist:
- [x] Popup state is queryable through shared helpers
- [x] Parent shells never consume keys while popup owns them
- [x] Picker dialogs mirror launcher search behavior where applicable
- [x] `ListComponent.tsx` keyboard coverage includes deterministic highlight movement and extended navigation keys where adopted

### Phase 6: Opportunistic non-textual slot controls

Primary files:
- `h:\Github\lc_cmd_react\src\components\cmd\MmrInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\MmrDoubleInput.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\NumberInput.tsx`

Implement only if useful after earlier phases prove the model:
- unclaimed printable-key navigation in controls that truly do not own letters
- nearby labeled-subfield jumps where that behavior is clearly faster than dropping keys

Guardrail:
- Do not retrofit this behavior into ordinary text-entry controls.

### Phase 7: Deferred shared-dialog harmonization

Primary files if needed:
- `h:\Github\lc_cmd_react\src\components\ui\dialog.tsx`
- `h:\Github\lc_cmd_react\src\components\ui\simple-dialog.tsx`

Only do this phase if command-surface work reveals a minimal safe shared fix.

Implement:
- generic dialog `Escape` deferral only where a more-local owner clearly exists
- explicit focus restoration targets for dialog close when command-surface work proves the pattern stable

Guardrail:
- Do not broaden generic dialog behavior prematurely while launcher and command-shell behavior is still settling.

## Current Status

Current rollout snapshot:
- Phases 1 through 5 are largely implemented in code and covered by focused tests.
- `src/components/cmd/searchListPrimitives.tsx` now owns the shared launcher-like active-row model: keyboard action decoding, stable option IDs, active-index state, and scroll-into-view behavior are shared across `CmdList.tsx`, `PlaceholderCommandPickerDialog.tsx`, and `ListComponent.tsx` instead of being reimplemented locally.
- `ListComponent.tsx` and query-backed wrappers now use the same single-focus combobox or listbox semantics as the launcher model, including deterministic active descendants plus `Home`, `End`, `PageUp`, and `PageDown` navigation while focus stays on the input.
- Popup-backed command suggestion surfaces now keep active-row ownership in the parent input or dialog layer rather than the rendered panel view: `PlaceholderExpressionInput.tsx`, `PlaceholderSuggestionPanel.tsx`, `PlaceholderCommandPickerDialog.tsx`, and `ListComponent.tsx` all follow the same parent-owned `aria-activedescendant` model.
- Plain scalar command fields now opt into shell single-line behavior through a shared command-field wrapper, so native controls like `datetime-local` participate intentionally instead of falling through DOM-type heuristics.
- Phase 6 is partially implemented. `MmrInput.tsx` now uses the shared `InputOTP` primitive as its explicit local slot-routing owner, `MmrDoubleInput.tsx` supports explicit intra-slot edge navigation, and broader unclaimed-typing behavior for `NumberInput.tsx` remains intentionally limited.
- Phase 7 now has a minimal shared fix in `src/components/ui/dialog.tsx`: dialog-level `Escape` defers to popup-owned or shell-owned descendants and uses a first-escape focus fallback for generic editable controls.
- Manual IME, selection-sensitive edge-arrow, and nested-popup verification still need an explicit manual pass.

## Component Coverage Map

Use this map as a “nothing got dropped” checklist when coding starts.

- `h:\Github\lc_cmd_react\src\components\cmd\commandKeyboard.ts`: shared ownership, boundary, selection, composition, and mnemonic helpers
- `h:\Github\lc_cmd_react\src\components\cmd\searchListPrimitives.tsx`: shared active-result keyboard actions, stable option IDs, active-index state, and list scroll helpers for launcher-like surfaces
- `h:\Github\lc_cmd_react\src\components\cmd\CommandComponent.tsx`: inter-argument navigation and field-order movement
- `h:\Github\lc_cmd_react\src\components\cmd\useCommandShellKeyboard.ts`: shell arming, submit shortcut, neutral typing, and shell deferral
- `h:\Github\lc_cmd_react\src\components\cmd\CommandDialogForm.tsx`: focus landing, restoration, and shell hint behavior
- `h:\Github\lc_cmd_react\src\components\cmd\CmdList.tsx`: active-result semantics, launcher search flow, `Escape` sequencing
- `h:\Github\lc_cmd_react\src\components\cmd\SearchBar.tsx`: clear-first coordination without breaking parent shell semantics
- `h:\Github\lc_cmd_react\src\components\cmd\CommandLauncher.tsx`: launcher invocation guard, search focus, close restoration, browser-dialog transitions
- `h:\Github\lc_cmd_react\src\components\cmd\PlaceholderCommandPickerDialog.tsx`: launcher-like picker search and result flow
- `h:\Github\lc_cmd_react\src\components\cmd\BooleanInput.tsx`: one-tab-stop boolean keyboard behavior
- `h:\Github\lc_cmd_react\src\components\cmd\TriStateInput.tsx`: one-tab-stop tri-state keyboard behavior
- `h:\Github\lc_cmd_react\src\components\cmd\SetInput.tsx`: pending-entry focus retention and removal shortcuts
- `h:\Github\lc_cmd_react\src\components\cmd\MapInput.tsx`: key/value row flow and static-map typed jumps
- `h:\Github\lc_cmd_react\src\components\cmd\KeyValueEntryList.tsx`: remove affordance with a documented multi-tab-stop exception for read-only existing entries
- `h:\Github\lc_cmd_react\src\components\cmd\ListComponent.tsx`: popup-backed list ownership, shared combobox semantics, and extended list navigation
- `h:\Github\lc_cmd_react\src\components\cmd\QueryComponent.tsx`: query popup ownership behavior plus wrapper-level keyboard regression coverage for launcher-style list navigation
- `h:\Github\lc_cmd_react\src\components\cmd\PlaceholderExpressionInput.tsx`: suggestion-popup key ownership behavior
- `h:\Github\lc_cmd_react\src\components\cmd\MmrInput.tsx`: shared `InputOTP`-backed slot control; local slot routing is intentionally owned by the shared primitive
- `h:\Github\lc_cmd_react\src\components\cmd\MmrDoubleInput.tsx`: partial phase-6 adoption with explicit intra-slot edge navigation
- `h:\Github\lc_cmd_react\src\components\cmd\NumberInput.tsx`: still an ordinary numeric text field; input-mode intent is explicit, but broader unclaimed printable-key behavior remains deferred

## Focus Target Checklist

Every surface touched in this rollout must explicitly define:
- opener focus target
- active focus target while open
- popup-close return target
- close-time restoration target
- fallback target when the opener no longer exists

Fallback priority:
1. originating opener if still connected
2. nearest logical parent container
3. app primary input or search surface

## Accessibility Checklist

- [x] Armed close or back state is visible
- [x] Armed close or back state is announced to assistive tech
- [ ] Repeated `Escape` does not re-announce unchanged armed state
- [x] Launcher search uses `aria-activedescendant`
- [x] Active result IDs are stable while results are present
- [x] Segmented controls expose correct active item semantics
- [x] Exceptions with more than one tab stop are documented

## Test Checklist

Primary test files to update or create:
- `h:\Github\lc_cmd_react\src\components\cmd\commandKeyboard.test.ts`
- `h:\Github\lc_cmd_react\src\components\cmd\CmdList.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\CommandDialogForm.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\KeyValueEntryList.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\ListComponent.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\MapInput.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\MmrInput.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\MmrDoubleInput.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\SetInput.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\QueryComponent.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\QueryComponent.keyboard.test.tsx`
- `h:\Github\lc_cmd_react\src\components\cmd\NumberInput.test.tsx`
- `h:\Github\lc_cmd_react\src\components\ui\input-otp.test.tsx`
- `h:\Github\lc_cmd_react\src\components\ui\dialog.test.ts`
- new focused tests for `BooleanInput`, `TriStateInput`, and placeholder picker dialog keyboard behavior

Required coverage:
- [x] shared helper decisions for ownership, edge detection, selection safety, and IME safety
- [x] launcher flow without mouse
- [x] command-form flow without mouse
- [x] popup-backed input deferral
- [x] segmented control mnemonic and `Space` behavior
- [x] set and map rapid-entry flow
- [x] static-map key-to-value jump behavior
- [x] launcher `ArrowUp` / `ArrowDown` keeps DOM focus on search while only changing active result
- [x] query or list-backed wrapper coverage exercises active-descendant paging and extended navigation
- [ ] repeated `Escape` does not emit duplicate announcements when shell state is unchanged

Manual verification:
- [ ] at least one manual IME or composition-sensitive pass for fields affected by printable-key navigation
- [ ] at least one manual pass for selection-sensitive edge-arrow behavior
- [ ] at least one manual pass for popup nesting or popup-open/close state clearing armed state and prefix buffers

## Decisions To Lock Before Coding

- [x] Keep `1600ms` as the shell double-`Escape` timeout
- [x] Keep `1000ms` as the default prefix-buffer timeout
- [x] Use lowercase case-insensitive prefix matching
- [ ] Use repeated-key cycling only where explicitly supported by the component
- [x] Keep launcher search focused and do not move DOM focus into results
- [x] Treat RTL-aware logical-edge behavior as out of scope for this rollout

## First Coding Slice

Start here:
1. `h:\Github\lc_cmd_react\src\components\cmd\commandKeyboard.ts`
2. `h:\Github\lc_cmd_react\src\components\cmd\CmdList.tsx`
3. `h:\Github\lc_cmd_react\src\components\cmd\CommandLauncher.tsx`
4. `h:\Github\lc_cmd_react\src\components\cmd\SearchBar.tsx`
5. `h:\Github\lc_cmd_react\src\components\cmd\CommandComponent.tsx`
6. `h:\Github\lc_cmd_react\src\components\cmd\useCommandShellKeyboard.ts`
7. `h:\Github\lc_cmd_react\src\components\cmd\CommandDialogForm.tsx`

Reason:
- This slice validates the shared ownership model
- It resolves the highest-value launcher and command-shell behavior first
- It establishes the helpers that later inputs will reuse
# Keyboard Interaction Policy

## Purpose

This document defines the intended keyboard model for the app, with the command launcher and command argument surfaces treated as the highest-priority keyboard flows.

The goal is expert speed first, without giving up predictable behavior where both can coexist.

## Scope

Primary focus:
- Command launcher
- Command browser list
- Command argument forms
- Popup-backed argument inputs
- Dialogs that host command UIs

Secondary alignment target:
- Other dialogs and picker UIs
- Other list/search surfaces
- Other compound inputs where the same rules improve speed and consistency

This policy does not require every part of the app to behave identically. It does require related surfaces to follow the same ownership model and key semantics where practical.

## Normative Language

The following words are used intentionally:

- `Required`: mandatory for the target surface unless a documented exception exists.
- `Preferred`: recommended default implementation when there is no stronger local reason to diverge.
- `Should`: expected in normal implementations, but may be omitted only with a documented reason.
- `May`: allowed but optional.
- `Good candidates`: surfaces where the behavior is likely beneficial, but still optional until explicitly adopted.

If a component intentionally diverges from a `Required` or `Should` statement, that divergence must be documented in the implementation checklist or in component-local documentation.

## Design Priorities

1. Expert speed over default browser behavior when the shortcut is intentional, teachable, and consistently applied.
2. Keep behavior predictable by preserving native text editing unless the user is clearly at a navigation boundary.
3. Minimize tab-stop noise. The default target is one primary `Tab` stop per `ArgInput`.
4. Popups, suggestion panels, and local widgets own their keys before parent shells do.
5. `Esc` should back out one layer at a time, not collapse multiple layers at once.
6. Search and picker surfaces should be fully operable without leaving the keyboard.

## Ownership Model

Keyboard handling should follow this ownership order:

1. Popup or suggestion panel
2. Focused field's local behavior
3. Compound `ArgInput` internal navigation
4. Command argument shell
5. Launcher or picker list shell
6. Dialog shell
7. Page-level shortcuts

Parents should only act when the more local owner does not consume the key.

## Terminology

- `neutral Esc`: a plain `Escape` press with no `Alt`, `Ctrl`, `Meta`, or `Shift` modifiers, no IME composition in progress, and no more-local owner having already consumed the event.
- `settled single-line field`: a visible, enabled single-line field that is not multiline, is not in IME composition, has no open popup or inline suggestion surface that owns `Enter`, and has no other documented local `Enter` action that takes precedence. Dirty or not-yet-submitted values do not by themselves make a field unsettled.
- `meaningfully own the key`: a control or popup meaningfully owns a key when, in its current state, that key either produces valid local input or triggers a documented local action.
- `logical start edge` / `logical end edge`: for this app, these are defined in LTR terms only. `logical start edge` means the left text boundary and `logical end edge` means the right text boundary. RTL-aware behavior is out of scope for this policy.
- `active result`: the currently highlighted result that would activate on `Enter`. If no explicit highlight has been moved by the user, the first result is the active result when the result set is non-empty.
- `arm close` / `arm back`: enter a temporary shell state after the first neutral `Escape` where the next neutral `Escape` within the timeout performs close or back.
- `popup-backed child`: a descendant control that can open an auxiliary interactive surface such as a menu, suggestion panel, combobox list, or picker, and that must expose its open state through the shared popup ownership contract.
- `primary data-entry path`: the focus target that best supports rapid repeated entry within a widget, usually the pending-entry field, the current value field, or the main search field.
- `shell`: the keyboard-owning container around a field or surface once popup-local behavior is excluded, such as the launcher shell, command-form shell, picker shell, or dialog-host shell.
- `next eligible visible enabled argument in form order`: the next argument that is currently rendered, not disabled, not hidden by filtering or collapsed state, and appears later in the command form's navigation order.

## Global Principles

### Focus management

Opening, closing, and committing actions should leave focus somewhere intentional.

Rules:
- Opening the launcher should focus launcher search unless a more specific focus target is required.
- Opening a picker dialog should focus its search field or first meaningful field.
- Opening a command form should focus the first meaningful argument field.
- Closing a popup should usually return focus to the owning field.
- Closing a dialog or launcher should restore focus to the control or shell that opened it, when practical.
- If the originating element no longer exists in the DOM, focus should fall back to the nearest logical parent container, or the app's primary input or search surface.
- Committing an add-row action in a compound input should keep focus in the primary data-entry path unless there is a strong reason to move it.
- Focus should never fall to `body` unless there is no better target.

### Text editing safety

Do not steal navigation keys when any of the following are true:
- The field has a text selection.
- The caret is not at the relevant edge.
- IME composition is active.
- A modifier key is held, unless that modifier is part of the shortcut.
- The focused control is multiline and the key still has meaningful local editing behavior.
- A popup-backed child is open and marked as owning the key.

### Single primary tab stop per argument

Each `ArgInput` should expose one primary `Tab` stop by default.

Implications:
- Internal helper buttons should usually not become separate tab stops if their action is already reachable by local keyboard commands.
- If internal controls are removed from the tab order, the input must still expose equivalent keyboard actions.
- If an internal control has unique functionality with no keyboard equivalent, it must become reachable somehow, either by `Tab`, roving focus, or a documented shortcut.
- Informational markup rendered inside argument labels, descriptions, or type-help chrome should not introduce extra tab stops by default; links there may stay pointer-accessible while using `tabIndex=-1` when the surrounding field already owns the argument's keyboard flow.

### Roving focus over tab-stop spam

For lists, segmented controls, and grouped sub-controls, prefer roving focus or edge navigation over adding many tab stops.

### Direct mnemonic shortcuts

Single-key value shortcuts are worthwhile for very small closed-vocabulary controls when they are mnemonic, low-risk, and faster than moving focus within the control.

Good candidates:
- Boolean controls
- Tri-state controls
- Small radio-like segmented controls with stable labels
- Tiny mode switches where the option letters are obvious and unambiguous

Poor candidates:
- Freeform text inputs
- Numeric inputs
- Datetime inputs
- Color inputs
- Search fields
- Inputs where typed characters are already meaningful content

Rules:
- The shortcut must only apply when the control itself is focused, or when focus is on the control's owning shell and the control is the active roving item.
- The shortcut must not steal text entry from an editable text field.
- The shortcut should be mnemonic rather than arbitrary.
- Arrow-key support remains the primary discoverable behavior; mnemonic keys are an acceleration path.
- If multiple options share a starting letter, do not invent ambiguous one-key behavior unless there is a clearly documented mapping.

### Unclaimed typing as navigation

Printable key presses may be used for focus navigation when the currently focused control does not meaningfully own that character.

This is an expert-speed convenience layer, not a replacement for `Tab`, arrows, or explicit search.

Good candidates:
- Radio-like controls
- Segmented controls
- Numeric-only controls
- Static enumerated map layouts
- Other closed or semi-closed argument layouts where letters cannot become valid local input

Rules:
- Only apply this when the current control does not meaningfully accept the typed character as content.
- If the character could be valid local input, local input wins.
- This behavior must be opt-in by component capability. It must not be inferred ad hoc from local implementation details.
- Matching should prefer visible labels, stable option names, or stable map keys.
- Matching should move focus to the most likely target rather than mutate a value, unless the control already has explicit direct-selection shortcut behavior.
- Repeated typing may refine or cycle matches only if that behavior is deterministic.
- This behavior must be disabled while IME composition is active.
- This behavior must be disabled while a popup or suggestion panel owns typing.

Preferred uses:
- Typing a mnemonic letter in a small segmented control selects an option.
- Typing in a numeric-only or non-textual argument may jump focus to the argument whose label best matches the typed prefix.
- Typing a key-name prefix inside a static enumerated map may jump to the value input for the matching map key.

Implementation note:
- For ordinary single-line `ArgInput` fields, command-shell `Enter` advance should be declared by the shared command-field wrapper or metadata, not inferred ad hoc from a native `input` type.

Non-goal:
- Turning ordinary text entry into a hidden command layer.

## Timing And Buffer Rules

### Double-Escape timeout

- The shell double-`Escape` timeout is `1600ms`.
- The timer starts on the first neutral `Escape` that arms close or back.
- The timer is cleared, not merely paused, on focus leaving the current shell.
- The timer is cleared when a popup opens or closes.
- The timer is cleared on committed actions such as activate, submit, back, or close.
- The timer is cleared on shell navigation actions that change the active argument or active result.
- The timer is reset only by shell-owned prefix typing or shell-owned `Backspace` while the shell is in an armed typing state.

### Armed-state indication

- Armed close or back state should be visually indicated.
- Armed close or back state should also be announced to assistive technology using a status or polite live-region mechanism.
- Repeated `Escape` presses must not emit duplicate announcements unless the shell state changed again, such as re-arming after timeout, switching from back to close, or entering a newly armed state after having been cleared.

### Prefix typing buffers

- Prefix typing buffers are case-insensitive and normalized to lowercase.
- Default prefix buffer timeout is `1000ms` from the last buffer-modifying keypress.
- Printable keys that extend the buffer reset the buffer timeout.
- `Backspace` that edits the buffer resets the buffer timeout.
- Focus change clears the buffer.
- Popup open or close clears the buffer.
- Shell navigation that changes the active target clears the buffer unless the component explicitly documents that navigation preserves the buffer.
- If repeated-key cycling is supported, identical repeated printable keys within the buffer timeout cycle deterministically among matching targets that share that starting prefix.
- If repeated-key cycling is not supported by the component, repeated keys extend the prefix normally.

## Escape Policy

`Esc` should dismiss the most local active layer first.

Order of effect:
1. Close an open popup, suggestion panel, menu, or combobox panel.
2. If focus is inside an input and no popup is open, move focus to the shell's explicit return target, typically launcher search, picker search, command-shell container, or the widget's primary data-entry path.
3. If inside a command shell, arm back/close on first neutral `Esc` and perform the back action on the second neutral `Esc` within the timeout.
4. Only close the dialog when no more local owner remains.

Rules:
- `Esc` from a focused input in a modal should not immediately close the modal.
- Clearing text and closing a parent shell must not happen on the same `Esc` press.
- Search fields may use `Esc` to clear their current query first, then participate in shell back/close behavior.

## Enter Policy

`Enter` has different meanings by layer.

### Search and list surfaces

- In launcher search and picker search, plain `Enter` should activate the active result.
- If the user has not manually moved selection, the active result should default to the top result.
- If there are zero results, `Enter` should do nothing unless the specific surface supports freeform submission.

### Command argument forms

- Plain `Enter` in a settled single-line field should advance to the next eligible visible enabled argument in form order when that field does not own `Enter` for another reason.
- Plain `Enter` must not hijack multiline editing.
- `Ctrl+Enter` or `Cmd+Enter` submits the command form unless the focused field explicitly owns that shortcut.

### Compound inputs

- `Enter` may commit the current row or selection for compound inputs such as set, map, or picker-backed fields.
- If a popup is open, the popup owns `Enter` first.

## Arrow Key Policy

Arrow behavior is intentionally more aggressive inside command arguments than in a normal form, but only at boundaries.

### Across command arguments

When focus is inside a command argument field and the local control does not consume the key:
- `ArrowLeft` at the logical start edge moves to the previous argument.
- `ArrowRight` at the logical end edge moves to the next argument.
- `ArrowUp` may move to the previous argument when the current control has no stronger vertical meaning.
- `ArrowDown` may move to the next argument when the current control has no stronger vertical meaning.

Boundary checks are required.

Do not move across arguments when:
- The caret is not already at the relevant edge.
- There is an active selection.
- The current control is multiline and the arrow still has local navigation meaning.
- A popup, menu, or suggestion panel is open.
- The field is in a mode where arrows already navigate local options.

### Within grouped or segmented arguments

Grouped fields should also support local edge navigation.

Examples:
- Multi-slot numeric inputs
- Map key/value add rows
- Token builders or expression segments
- Segmented pickers or radio-like controls

Preferred behavior:
- `ArrowLeft` and `ArrowRight` move within the group first.
- Reaching the outer edge of the group can continue to the previous or next argument.

### Lists and result panes

For picker result lists and other row-focused list surfaces:
- `ArrowDown` enters the list or moves to the next result.
- `ArrowUp` moves to the previous result and may return to the search field when moving above the first row.
- `Home` jumps to the first result.
- `End` jumps to the last result.
- `PageUp` and `PageDown` move by a larger step when virtualization or long lists are involved.

## Tab Policy

`Tab` remains the cross-argument traversal key.

Rules:
- `Tab` moves between arguments and major shell controls.
- `Shift+Tab` moves backward between arguments and shell controls.
- Internal per-argument buttons should usually not be tabbable unless they expose unique functionality that cannot be reached from the primary field.
- Picker popups may use roving focus internally without adding extra `Tab` stops.
- Exceptions with more than one tab stop are allowed only when required for accessibility, native parity, or materially clearer interaction. Those exceptions must be documented.

This means the preferred flow is:
- `Tab` between arguments
- Arrow keys and local shortcuts within or between arguments when already focused in the command form

## Command Launcher Policy

The launcher is the strongest keyboard surface in the app.

Required behavior:
- A launcher-open shortcut may exist, but it must only fire when typing is not already active in another editable control.
- Opening the launcher focuses and selects launcher search.
- Typing updates search immediately.
- `ArrowDown` from search changes the active result while DOM focus remains on search.
- `Enter` from search opens the active result.
- Launcher search retains DOM focus and represents the active result using `aria-activedescendant`.
- `ArrowUp` updates the active result while DOM focus remains on search.
- `Esc` from search clears search first, then arms close, then closes on the next neutral `Esc`.
- Search should preserve an active result index that is deterministic after filtering.

Optional but desirable:
- `ArrowUp` from search with results jumps to the last result.
- A visible hint when the shell is armed for close.

## Command Argument Form Policy

Required behavior:
- The shell supports a timed double-`Esc` back action.
- Plain `Enter` advances between eligible single-line fields.
- `Ctrl+Enter` or `Cmd+Enter` submits.
- When the shell is armed after `Esc`, neutral typing may be used for argument jump/search if that mode is enabled.
- Popup-backed fields must be able to block shell-level key ownership while open.

Argument jump behavior:
- Neutral shell typing after the first `Esc` may search arguments by name.
- `Enter` while that jump query is active commits focus to the matched argument.
- This must never take precedence over a popup that is already open.

## Picker and Search Dialog Policy

Picker dialogs should behave like smaller versions of the launcher.

Required behavior:
- Autofocus the search field when appropriate.
- `ArrowDown` moves from search into results.
- `Enter` activates the active result.
- `Esc` clears search or backs out of the current picker substate before closing the dialog.
- If the picker has a two-step flow, `Esc` should return from step two to step one before closing the dialog.
- Results should support roving focus rather than many tab stops.

## Compound ArgInput Policy

### Set-like inputs

Required behavior:
- One primary tab stop for the pending-entry field.
- `Enter` commits the pending item when valid.
- If the child input opens a popup, the popup owns `Enter` and arrows first.
- Existing values should be removable without requiring many `Tab` stops.
- If remove buttons are not tabbable, there must be another keyboard removal path.
- After add or remove actions, focus should stay on the pending-entry field unless the user deliberately moved elsewhere.

Preferred removal path:
- `Backspace` or `Delete` on an empty pending field removes the previous item, mirroring token-input behavior.

Typing convenience:
- If the pending child input is non-textual and does not own letters, unclaimed typing may jump to another nearby matching argument rather than being discarded.

### Popup-backed multiselect lists

Required behavior:
- The combobox input remains the primary `Tab` stop.
- Helper actions such as `All` or `Clear` should usually stay out of the normal tab order when equivalent local shortcuts exist.
- If helper actions are removed from the tab order, the combobox must expose the shortcut through visible or assistive hint text.

Preferred behavior:
- When the search box is empty, `Ctrl+A` or `Cmd+A` may toggle select-all and clear-all for the multiselect value set.
- If the search box currently contains text, native text-selection behavior should win over multiselect shortcuts.
- Select-all and clear-all ownership belongs in the list input component itself rather than in the outer command shell.

### Map-like inputs

Required behavior:
- One primary tab stop for the map add row as a whole, or one predictable stop per meaningful subfield if needed.
- `Enter` on key moves into value.
- `Enter` on value commits the pair.
- Edge arrows should be able to move between key and value, then between neighboring arguments when at the outer edges.
- Existing entries should have a keyboard removal path that does not require excessive `Tab` stops.
- After committing a pair, focus should return to the preferred entry field for rapid repeated entry.

Static enumerated map convenience:
- In static map layouts where keys are already rendered as fixed rows, typing letters from either the row shell or a focused value control may jump to the value input for the best matching map key when the current control does not meaningfully accept those letters.
- Matching should be based on the rendered static key label.
- The jump should focus the value field for that key, not the key label.
- If multiple keys share a prefix, repeated typing may refine the match or cycle deterministically among matches.
- Numeric value fields are especially good candidates because letter keys are usually unclaimed there.

Guardrails:
- Do not steal valid text entry from value controls that legitimately accept letters.
- Do not trigger key-jump behavior while a popup-backed child input is open.
- Do not use this behavior for large static maps where matching would become noisy or hard to predict.

Dynamic map convenience:
- The pending key and pending value fields should stay visually paired in one row; prefer `minmax(0, 1fr)`-style column sizing and `min-w-0` wrappers so child inputs do not force the row into a disjoint stacked layout.
- If existing-entry remove buttons are taken out of the tab order, the pending key or value field should provide an empty-field `Backspace` or `Delete` path that removes the previous entry and returns focus to the primary pending field.

### Radio-like and segmented inputs

Required behavior:
- If a control declares radio semantics, arrow keys must switch options.
- One option should be tabbable at a time, not every option.
- `Home` and `End` may jump to the first and last option.

Preferred behavior:
- Small closed-vocabulary segmented controls may also accept mnemonic single-key selection.
- Boolean controls should accept direct `t` and `f`.
- Tri-state controls should accept direct `t`, `a`, and `f`.
- Where synonyms are already accepted for paste parsing, equivalent direct keys may also be accepted if they stay unambiguous, such as `y` and `n` for true and false.
- `Space` may toggle a two-state control when that is faster and does not conflict with button semantics.
- `Space` on a focused tri-state control may cycle through values when that cycle order is stable and documented.

Guardrails:
- Do not require users to remember mnemonic keys; arrows and click/press must remain sufficient.
- Do not overload the same key with multiple different meanings in similar controls.
- Avoid adding mnemonic keys to controls with more than a few options unless the mapping is extremely obvious.
- If both `Space` toggle/cycle and mnemonic keys exist, they must agree with the visible option order and not produce surprising state jumps.

### Multi-slot text or number inputs

Required behavior:
- Left and right arrows move between slots at edges.
- Outer edges may continue to previous or next arguments.
- Pasting a full valid composite value should populate all slots.

Preferred behavior:
- If a slot does not accept letters, unclaimed typing may jump to another matching argument or nearby labeled subfield when that is more useful than ignoring the key.

## Popup Ownership Policy

Popup-backed inputs must explicitly indicate when their popup is open so shell handlers can defer.

While a popup is open:
- The popup owns `Esc`, `Enter`, and navigation keys that affect popup state.
- Parent field, shell, and dialog handlers must not treat those keys as unclaimed.

After popup close:
- Focus should remain in the owning argument unless the popup action intentionally moved it.

## Dialog Policy

Dialogs that host command UIs should adopt the same layered ownership model as the launcher.

Required behavior:
- `Esc` should not close the dialog while a more local owner is active.
- Closing a dialog via `Esc` should only happen when no popup, local field, compound input, or shell back action still applies.
- Dialog close buttons remain available, but they are not the primary keyboard escape route.

The launcher and command dialogs may be stricter than generic dialogs, but generic dialogs should move toward the same `Esc` hierarchy where it improves behavior and does not add complexity.

## Behavior Matrix

### Search box in launcher or picker

- Type: update filter
- `Enter`: open active result
- `ArrowDown`: update the active result
- `ArrowUp`: optional jump to last result
- `Esc` with query: clear query
- `Esc` with empty query: arm close or back
- second neutral `Esc`: close or go back
- DOM focus stays on the search input while the active result is exposed with `aria-activedescendant` on launcher-like surfaces

### Result row in row-focused picker or list

- `Enter`: activate
- `ArrowDown`: next row
- `ArrowUp`: previous row, possibly return to search at top
- `Home`: first row
- `End`: last row
- `PageUp` and `PageDown`: larger jump
- `Esc`: return to search or previous shell state

### Single-line argument field

- `Enter`: next eligible visible enabled argument in form order, unless locally owned
- `Ctrl+Enter` or `Cmd+Enter`: submit form
- `ArrowLeft` at start: previous argument
- `ArrowRight` at end: next argument
- `Esc`: move focus to the shell's explicit return target, then participate in shell back behavior
- unclaimed printable keys in non-textual fields: may jump to a matching argument or subfield

### Multiline argument field

- `Enter`: newline or local behavior
- `Ctrl+Enter` or `Cmd+Enter`: optional submit only if explicitly allowed
- Edge arrows do not leave the field while local multiline navigation still applies
- `Esc`: close popup first, then move focus to the shell's explicit return target or follow shell-back behavior

### Rich text or HTML editor field

- The editing surface remains the primary entry focus target.
- If the editor captures `Tab` for local indentation, structure, or toolbar behavior, mode switching must not depend on `Tab` traversal.
- Raw or WYSIWYG mode switches should stay local to the editor component and use documented local shortcuts or other local controls.
- If editor mode buttons are removed from the tab order, equivalent shortcuts and discoverable hints are required.

### Popup-backed argument field

- `Esc`: close popup first
- `Enter`: commit active popup item first
- arrows: navigate popup first
- after popup closes, shell shortcuts become active again
- printable keys belong to the popup while it is open

### Static enumerated map row

- `Enter` in key shell: move into value field when applicable
- `Enter` in value field: commit or stay in rapid-entry flow depending on map style
- `ArrowLeft` and `ArrowRight`: move within row first, then across arguments at outer edges
- unclaimed letters: jump to the value field for the matching static key
- repeated letters or additional typed prefix: refine or cycle matches deterministically

## Non-goals

- Making every surface identical regardless of context
- Preserving default browser behavior when it significantly slows expert command entry
- Adding many visible helper buttons to solve keyboard shortcomings that should be handled in the field model

## Implementation Guidance

For the coding plan, layer ownership, shared capability contract, and shell state machine, see `docs/keyboard-implementation-checklist.md`.

When implementing or updating keyboard behavior:
- Prefer shared shell helpers for ownership and edge-detection rules.
- Prefer the shared popup ownership contract so popup-open state is programmatically queryable in a single consistent way.
- Prefer explicit capability checks over ad hoc per-component exceptions.
- Prefer explicit focus targets over generic blur behavior.
- Document any component that intentionally diverges from this policy.
- Add focused tests for every non-trivial keyboard contract.

## Coverage Checklist

This document should be treated as incomplete if any of the following are unaddressed in either code or future follow-up work:

- Launcher search entry behavior
- Launcher invocation shortcut behavior
- Launcher result-list roving focus behavior
- Picker dialog search and result-list behavior
- Focus landing on open, close, commit, and popup dismissal
- Timed shell `Esc` back behavior
- Dialog-level `Esc` deferral to local owners
- Plain `Enter` argument advance
- `Ctrl+Enter` or `Cmd+Enter` form submit
- Popup ownership markers and deferral
- Edge-arrow movement across command arguments
- Intra-argument navigation for compound inputs
- Unclaimed typing navigation in non-textual controls
- Keyboard removal paths for set and map items
- Radio or segmented-control arrow handling
- Direct mnemonic shortcuts for closed-vocabulary controls, where adopted
- `Space` toggle or cycle behavior for eligible controls
- Static-map key-to-value focus jumping, where adopted
- Multi-slot input edge navigation
- Low-tab-stop philosophy for `ArgInput`
- Preservation of native text editing when not at boundaries
- IME and text-selection safety
- Virtualized list navigation with `Home`, `End`, `PageUp`, and `PageDown`

## Current Review Outcome

Based on the current codebase review, the policy is now substantially implemented across the highest-priority command surfaces:

- Launcher search keeps DOM focus, exposes the active result with `aria-activedescendant`, and opens the active result on plain `Enter`.
- Picker dialogs now follow the same single-focus search model in the main placeholder picker flow.
- Command shells use the shared timed double-`Escape` model, shared popup ownership contract, and shared neutral-typing jump state.
- Boolean and tri-state segmented controls now implement the intended one-tab-stop radio behavior, arrow keys, mnemonic shortcuts, and `Space` toggle or cycle behavior.
- Set and map inputs now keep the primary pending-entry path focused after add or remove actions, and existing map entries have a keyboard-reachable remove path.
- Shared dialog `Escape` handling now defers to clearly local owners before allowing the dialog itself to close.

The main remaining gaps are narrower and should be treated as follow-up work rather than missing core architecture:

- Plain scalar command fields now declare single-line shell behavior through the shared command-field wrapper, so controls such as `NumberInput`, `StringInput`, `TimeInput`, `TimeDiffInput`, and other text-backed scalar args no longer rely on fragile native `type=` inference to participate in form advance.
- Some non-textual slot controls are still partially covered. `MmrInput` now goes through the shared `InputOTP` wrapper, which is treated as the local slot-routing owner for OTP-style controls, `MmrDoubleInput` has explicit intra-slot edge navigation, and `NumberInput` now exposes clearer numeric versus decimal input intent but is not yet a general unclaimed-typing navigation owner.
- Query-backed inputs inherit the popup/list keyboard contract through `ListComponent`, but their wrapper-level keyboard coverage is still lighter than the main launcher and command-shell coverage.
- Generic dialog focus restoration is still intentionally conservative. Shared `Escape` deferral is in place, but richer shell-specific fallback targets remain owned by the surfaces hosted inside the dialog.
- Manual IME, selection-sensitive edge-arrow, and nested-popup verification are still outstanding and should remain on the rollout checklist until completed.

That remaining gap list is intentional and belongs here so the policy stays honest about what is finished versus what is still being verified or expanded.
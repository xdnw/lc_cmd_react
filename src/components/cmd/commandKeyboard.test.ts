import { describe, expect, it } from "vitest";

import {
  COMMAND_LOCAL_PRINTABLE_KEYS_ATTR,
  COMMAND_POPUP_OPEN_ATTR,
  COMMAND_SINGLE_LINE_ENTRY_ATTR,
  clampCommandActiveIndex,
  doesCommandTargetOwnPrintableKey,
  doesCommandTargetOwnPrintableInput,
  getCommandEdgeArrowDirection,
  getCommandSubmitShortcutLabel,
  getCommandTextEntryEdges,
  hasCommandTextSelection,
  isCommandComposingEvent,
  focusPrimaryCommandTarget,
  shouldFocusCommandShellFromPointerTarget,
  shouldAdvanceCommandField,
  shouldSubmitCommandForm,
} from "./commandKeyboard";

function createKeyboardEventInit(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: "Enter",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target: null,
    ...overrides,
  } as KeyboardEvent;
}

describe("commandKeyboard", () => {
  it("allows single-line text inputs to advance on plain Enter", () => {
    const input = document.createElement("input");
    input.type = "text";

    expect(shouldAdvanceCommandField(createKeyboardEventInit({ target: input }))).toBe(true);
  });

  it("honors explicit single-line command metadata for non-text native controls", () => {
    const input = document.createElement("input");
    input.type = "datetime-local";
    input.setAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR, "true");

    expect(shouldAdvanceCommandField(createKeyboardEventInit({ target: input }))).toBe(true);
  });

  it("allows explicit opt-out from command-level Enter advance", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR, "false");

    expect(shouldAdvanceCommandField(createKeyboardEventInit({ target: input }))).toBe(false);
  });

  it("treats single-line custom textboxes consistently with primary command focus targets", () => {
    const editable = document.createElement("div");
    editable.setAttribute("role", "textbox");
    editable.textContent = "alpha";

    expect(shouldAdvanceCommandField(createKeyboardEventInit({ target: editable }))).toBe(true);

    editable.setAttribute("aria-multiline", "true");
    expect(shouldAdvanceCommandField(createKeyboardEventInit({ target: editable }))).toBe(false);
    expect(shouldSubmitCommandForm(createKeyboardEventInit({ target: editable, ctrlKey: true }))).toBe(false);
  });

  it("keeps multiline textareas out of command-level Enter advance", () => {
    const textarea = document.createElement("textarea");

    expect(shouldAdvanceCommandField(createKeyboardEventInit({ target: textarea }))).toBe(false);
    expect(shouldSubmitCommandForm(createKeyboardEventInit({ target: textarea, ctrlKey: true }))).toBe(false);
  });

  it("keeps popup-owned inputs from bubbling Enter advance", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute(COMMAND_POPUP_OPEN_ATTR, "true");
    const input = document.createElement("input");
    input.type = "text";
    wrapper.appendChild(input);

    expect(shouldAdvanceCommandField(createKeyboardEventInit({ target: input }))).toBe(false);
  });

  it("accepts Ctrl+Enter submit shortcuts from settled single-line inputs", () => {
    const input = document.createElement("input");
    input.type = "search";

    expect(shouldSubmitCommandForm(createKeyboardEventInit({ target: input, ctrlKey: true }))).toBe(true);
  });

  it("returns a platform-aware shortcut label", () => {
    expect(["Ctrl+Enter", "Cmd+Enter"]).toContain(getCommandSubmitShortcutLabel());
  });

  it("detects selected text and edge positions for single-line inputs", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = "alpha";

    input.setSelectionRange(0, 0);
    expect(getCommandTextEntryEdges(input)).toEqual({ atStart: true, atEnd: false });

    input.setSelectionRange(input.value.length, input.value.length);
    expect(getCommandTextEntryEdges(input)).toEqual({ atStart: false, atEnd: true });

    input.setSelectionRange(1, 3);
    expect(hasCommandTextSelection(input)).toBe(true);
    expect(getCommandTextEntryEdges(input)).toEqual({ atStart: false, atEnd: false });
  });

  it("only allows shared edge-arrow escape when boundary checks pass", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = "alpha";

    input.setSelectionRange(0, 0);
    expect(getCommandEdgeArrowDirection(createKeyboardEventInit({ key: "ArrowLeft", target: input }))).toBe("previous");
    expect(getCommandEdgeArrowDirection(createKeyboardEventInit({ key: "ArrowRight", target: input }))).toBe(null);

    input.setSelectionRange(input.value.length, input.value.length);
    expect(getCommandEdgeArrowDirection(createKeyboardEventInit({ key: "ArrowRight", target: input }))).toBe("next");
    expect(getCommandEdgeArrowDirection(createKeyboardEventInit({ key: "ArrowDown", target: input }))).toBe("next");

    input.type = "number";
    expect(getCommandEdgeArrowDirection(createKeyboardEventInit({ key: "ArrowDown", target: input }))).toBe(null);

    const wrapper = document.createElement("div");
    wrapper.setAttribute(COMMAND_POPUP_OPEN_ATTR, "true");
    wrapper.appendChild(input);
    expect(getCommandEdgeArrowDirection(createKeyboardEventInit({ key: "ArrowLeft", target: input }))).toBe(null);
  });

  it("focuses the preferred editable descendant in command shells", () => {
    const wrapper = document.createElement("div");
    const button = document.createElement("button");
    const input = document.createElement("input");
    wrapper.append(button, input);
    document.body.appendChild(wrapper);

    expect(focusPrimaryCommandTarget(wrapper)).toBe(true);
    expect(document.activeElement).toBe(input);

    wrapper.remove();
  });

  it("distinguishes printable-input owners from shell-safe jump surfaces", () => {
    const textInput = document.createElement("input");
    textInput.type = "text";
    expect(doesCommandTargetOwnPrintableInput(textInput)).toBe(true);

    const textarea = document.createElement("textarea");
    expect(doesCommandTargetOwnPrintableInput(textarea)).toBe(true);

    const button = document.createElement("button");
    expect(doesCommandTargetOwnPrintableInput(button)).toBe(false);

    const radioGroup = document.createElement("div");
    radioGroup.setAttribute(COMMAND_LOCAL_PRINTABLE_KEYS_ATTR, "t,f,space");
    const radio = document.createElement("button");
    radioGroup.appendChild(radio);
    expect(doesCommandTargetOwnPrintableKey(radio, "t")).toBe(true);
    expect(doesCommandTargetOwnPrintableKey(radio, "f")).toBe(true);
    expect(doesCommandTargetOwnPrintableKey(radio, " ")).toBe(true);
    expect(doesCommandTargetOwnPrintableKey(radio, "u")).toBe(false);
  });

  it("focuses the shell when users click non-interactive surfaces but not real controls", () => {
    const plainDiv = document.createElement("div");
    expect(shouldFocusCommandShellFromPointerTarget(plainDiv)).toBe(true);

    const button = document.createElement("button");
    expect(shouldFocusCommandShellFromPointerTarget(button)).toBe(false);

    const link = document.createElement("a");
    link.href = "#test";
    expect(shouldFocusCommandShellFromPointerTarget(link)).toBe(false);
  });

  it("exposes shared composition and active-index helpers", () => {
    expect(isCommandComposingEvent({ isComposing: true, key: "a", keyCode: 65 })).toBe(true);
    expect(isCommandComposingEvent({ isComposing: false, key: "Process", keyCode: 0 })).toBe(true);
    expect(clampCommandActiveIndex(9, 3)).toBe(2);
    expect(clampCommandActiveIndex(-4, 3)).toBe(0);
    expect(clampCommandActiveIndex(2, 0)).toBe(0);
  });
});

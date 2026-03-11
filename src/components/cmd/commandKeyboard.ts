import { isEditableTarget } from "./commandLaunchUtils";

export const COMMAND_POPUP_OPEN_ATTR = "data-command-popup-open";
export const COMMAND_POPUP_OPEN_SELECTOR = `[${COMMAND_POPUP_OPEN_ATTR}='true']`;
export const COMMAND_SINGLE_LINE_ENTRY_ATTR = "data-command-single-line-entry";
export const COMMAND_LOCAL_PRINTABLE_KEYS_ATTR = "data-command-local-printable-keys";
export const COMMAND_ESCAPE_TIMEOUT_MS = 1600;
export const COMMAND_PREFIX_BUFFER_TIMEOUT_MS = 1000;
const IME_COMPOSITION_KEYCODE = 229;
const VERTICAL_BOUNDARY_TEXT_INPUT_TYPES = new Set([
    "",
    "email",
    "password",
    "search",
    "tel",
    "text",
    "url",
]);
const PRIMARY_COMMAND_FOCUS_TARGET_SELECTORS = [
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
    '[role="textbox"]:not([aria-disabled="true"])',
    'select:not([disabled])',
];

const TEXT_INPUT_TYPES = new Set([
    "",
    "email",
    "number",
    "password",
    "search",
    "tel",
    "text",
    "url",
]);

function asElement(target: EventTarget | null): HTMLElement | null {
    return target instanceof HTMLElement ? target : null;
}

function findEditableElement(target: EventTarget | null): HTMLElement | null {
    const element = asElement(target);
    if (!element) {
        return null;
    }

    return element.closest<HTMLElement>([
        "input",
        "textarea",
        "select",
        "[contenteditable='true']",
        "[contenteditable='plaintext-only']",
        "[role='textbox']",
    ].join(", "));
}

function findInteractiveElement(target: EventTarget | null): HTMLElement | null {
    const element = asElement(target);
    if (!element) {
        return null;
    }

    return element.closest<HTMLElement>([
        "button",
        "a[href]",
        "input",
        "textarea",
        "select",
        "summary",
        "[contenteditable='true']",
        "[contenteditable='plaintext-only']",
        "[role='button']",
        "[role='link']",
        "[role='radio']",
        "[role='switch']",
        "[role='tab']",
        "[role='textbox']",
        "[role='combobox']",
        "[tabindex]",
    ].join(", "));
}

function asTextEntryElement(target: EventTarget | null): HTMLInputElement | HTMLTextAreaElement | HTMLElement | null {
    const editable = findEditableElement(target);
    if (!editable) {
        return null;
    }

    if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        return editable;
    }

    return editable;
}

function getCommandSingleLinePreference(target: EventTarget | null): boolean | null {
    const editable = findEditableElement(target);
    const attr = editable?.getAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR);
    if (attr === "true") {
        return true;
    }

    if (attr === "false") {
        return false;
    }

    return null;
}

export function isCommandPopupOpenTarget(target: EventTarget | null): boolean {
    const element = asElement(target);
    return Boolean(element?.closest(COMMAND_POPUP_OPEN_SELECTOR));
}

export function hasOpenCommandPopup(container: ParentNode | null): boolean {
    if (!container || typeof (container as ParentNode).querySelector !== "function") {
        return false;
    }

    return Boolean(container.querySelector(COMMAND_POPUP_OPEN_SELECTOR));
}

export function observeCommandPopupOwnership(container: HTMLElement, onChange: (isOpen: boolean) => void): () => void {
    if (typeof MutationObserver === "undefined") {
        return () => undefined;
    }

    let isOpen = hasOpenCommandPopup(container);
    const observer = new MutationObserver(() => {
        const nextOpen = hasOpenCommandPopup(container);
        if (nextOpen === isOpen) {
            return;
        }

        isOpen = nextOpen;
        onChange(nextOpen);
    });

    observer.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: [COMMAND_POPUP_OPEN_ATTR],
    });

    return () => observer.disconnect();
}

export function isCommandComposingEvent(event: Pick<KeyboardEvent, "isComposing" | "keyCode" | "key">): boolean {
    return event.isComposing || event.key === "Process" || event.keyCode === IME_COMPOSITION_KEYCODE;
}

export function isMultilineTextEntryTarget(target: EventTarget | null): boolean {
    const editable = findEditableElement(target);
    if (!editable) {
        return false;
    }

    if (editable instanceof HTMLTextAreaElement) {
        return true;
    }

    if (editable instanceof HTMLInputElement || editable instanceof HTMLSelectElement) {
        return false;
    }

    if (editable.getAttribute("aria-multiline") === "true") {
        return true;
    }

    return editable.isContentEditable;
}

export function isSingleLineTextEntryTarget(target: EventTarget | null): boolean {
    if (!isEditableTarget(target) || isMultilineTextEntryTarget(target)) {
        return false;
    }

    const singleLinePreference = getCommandSingleLinePreference(target);
    if (singleLinePreference != null) {
        return singleLinePreference;
    }

    const editable = findEditableElement(target);
    if (!editable) {
        return false;
    }

    if (!(editable instanceof HTMLInputElement)) {
        return editable.getAttribute("role") === "textbox" || editable.isContentEditable;
    }

    return TEXT_INPUT_TYPES.has((editable.type || "").toLowerCase());
}

export function doesCommandTargetOwnPrintableInput(target: EventTarget | null): boolean {
    if (isCommandPopupOpenTarget(target)) {
        return true;
    }

    const editable = findEditableElement(target);
    if (!editable) {
        return false;
    }

    if (editable instanceof HTMLSelectElement) {
        return true;
    }

    if (editable instanceof HTMLTextAreaElement) {
        return !editable.readOnly && !editable.disabled;
    }

    if (editable instanceof HTMLInputElement) {
        const inputType = (editable.type || "").toLowerCase();
        if (["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image"].includes(inputType)) {
            return false;
        }

        return !editable.readOnly && !editable.disabled;
    }

    if (editable.getAttribute("aria-readonly") === "true") {
        return false;
    }

    return editable.isContentEditable || editable.getAttribute("role") === "textbox";
}

function normalizeCommandPrintableKey(key: string): string {
    if (key === " " || key === "Spacebar") {
        return "space";
    }

    return key.toLowerCase();
}

export function doesCommandTargetOwnPrintableKey(target: EventTarget | null, key: string): boolean {
    if (doesCommandTargetOwnPrintableInput(target)) {
        return true;
    }

    const element = asElement(target);
    const declaredOwner = element?.closest<HTMLElement>(`[${COMMAND_LOCAL_PRINTABLE_KEYS_ATTR}]`);
    const declaredKeys = declaredOwner?.getAttribute(COMMAND_LOCAL_PRINTABLE_KEYS_ATTR);
    if (!declaredKeys) {
        return false;
    }

    const normalizedKey = normalizeCommandPrintableKey(key);
    const allowedKeys = declaredKeys
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    return allowedKeys.includes("*") || allowedKeys.includes(normalizedKey);
}

export function shouldFocusCommandShellFromPointerTarget(target: EventTarget | null): boolean {
    return findInteractiveElement(target) == null;
}

export function hasCommandTextSelection(target: EventTarget | null): boolean {
    const editable = asTextEntryElement(target);
    if (!editable) {
        return false;
    }

    if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        const selectionStart = editable.selectionStart;
        const selectionEnd = editable.selectionEnd;
        return selectionStart != null && selectionEnd != null && selectionStart !== selectionEnd;
    }

    const selection = editable.ownerDocument?.getSelection();
    return Boolean(selection && !selection.isCollapsed && editable.contains(selection.anchorNode));
}

export function getCommandTextEntryEdges(target: EventTarget | null): { atStart: boolean; atEnd: boolean } {
    const editable = asTextEntryElement(target);
    if (!editable || hasCommandTextSelection(editable)) {
        return { atStart: false, atEnd: false };
    }

    if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        const valueLength = editable.value.length;
        const selectionStart = editable.selectionStart ?? valueLength;
        const selectionEnd = editable.selectionEnd ?? valueLength;
        return {
            atStart: selectionStart === 0 && selectionEnd === 0,
            atEnd: selectionStart === valueLength && selectionEnd === valueLength,
        };
    }

    const selection = editable.ownerDocument?.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        return { atStart: false, atEnd: false };
    }

    const range = selection.getRangeAt(0);
    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) {
        return { atStart: false, atEnd: false };
    }

    const startRange = range.cloneRange();
    startRange.selectNodeContents(editable);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange = range.cloneRange();
    endRange.selectNodeContents(editable);
    endRange.setStart(range.endContainer, range.endOffset);

    return {
        atStart: startRange.toString().length === 0,
        atEnd: endRange.toString().length === 0,
    };
}

export function getCommandEdgeArrowDirection(
    event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented" | "target" | "isComposing" | "keyCode">,
): "previous" | "next" | null {
    if (
        event.defaultPrevented
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
        || isCommandPopupOpenTarget(event.target)
        || isCommandComposingEvent(event)
        || hasCommandTextSelection(event.target)
        || isMultilineTextEntryTarget(event.target)
    ) {
        return null;
    }

    switch (event.key) {
        case "ArrowLeft": {
            const edges = getCommandTextEntryEdges(event.target);
            return edges.atStart ? "previous" : null;
        }
        case "ArrowRight": {
            const edges = getCommandTextEntryEdges(event.target);
            return edges.atEnd ? "next" : null;
        }
        case "ArrowUp":
        case "ArrowDown": {
            const editable = findEditableElement(event.target);
            if (!editable || editable instanceof HTMLSelectElement || editable instanceof HTMLTextAreaElement) {
                return null;
            }

            if (editable instanceof HTMLInputElement) {
                const inputType = (editable.type || "").toLowerCase();
                if (!VERTICAL_BOUNDARY_TEXT_INPUT_TYPES.has(inputType)) {
                    return null;
                }
            }

            return event.key === "ArrowUp" ? "previous" : "next";
        }
        default:
            return null;
    }
}

export function getPrimaryCommandFocusTarget(container: ParentNode | null): HTMLElement | null {
    if (!container || typeof container.querySelector !== "function") {
        return null;
    }

    for (const selector of PRIMARY_COMMAND_FOCUS_TARGET_SELECTORS) {
        const target = container.querySelector<HTMLElement>(selector);
        if (target) {
            return target;
        }
    }

    return null;
}

export function focusPrimaryCommandTarget(container: ParentNode | null): boolean {
    const target = getPrimaryCommandFocusTarget(container);
    if (!target) {
        return false;
    }

    target.focus();
    return true;
}

export function clampCommandActiveIndex(index: number, totalCount: number): number {
    if (totalCount <= 0) {
        return 0;
    }

    return Math.min(Math.max(index, 0), totalCount - 1);
}

export function isCommandAdvanceKey(event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented">): boolean {
    return event.key === "Enter"
        && !event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.shiftKey
        && !event.defaultPrevented;
}

export function shouldAdvanceCommandField(event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented" | "target">): boolean {
    return isCommandAdvanceKey(event)
        && !isCommandPopupOpenTarget(event.target)
        && isSingleLineTextEntryTarget(event.target);
}

export function isCommandSubmitShortcut(event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented">): boolean {
    return event.key === "Enter"
        && !event.altKey
        && !event.shiftKey
        && (event.ctrlKey || event.metaKey)
        && !event.defaultPrevented;
}

export function shouldSubmitCommandForm(event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented" | "target">): boolean {
    return isCommandSubmitShortcut(event)
        && !isMultilineTextEntryTarget(event.target);
}

export function getCommandSubmitShortcutLabel(): string {
    if (typeof navigator === "undefined") {
        return "Ctrl+Enter";
    }

    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
        ?? navigator.platform
        ?? "";

    return /mac/i.test(platform) ? "Cmd+Enter" : "Ctrl+Enter";
}

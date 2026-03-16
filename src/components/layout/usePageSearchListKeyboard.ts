import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";

import {
    clampCommandActiveIndex,
    doesCommandTargetOwnPrintableKey,
    getCommandTextEntryEdges,
    isCommandComposingEvent,
    isCommandPopupOpenTarget,
} from "@/components/cmd/commandKeyboard";
import { isEditableTarget } from "@/components/cmd/commandLaunchUtils";

export const PAGE_SEARCH_SHORTCUT_ARIA_VALUE = "Control+K Meta+K";

export type PageSearchListKeyboardActionTrigger = "enter" | "shift-enter" | "delete-empty-search";

export interface PageSearchListKeyboardAction<TItem> {
    trigger: PageSearchListKeyboardActionTrigger;
    run: (item: TItem, index: number) => void;
    isEnabled?: (item: TItem, index: number) => boolean;
}

export interface UsePageSearchListKeyboardOptions<TItem> {
    enabled?: boolean;
    scopeRef?: React.RefObject<HTMLElement | null>;
    searchRef: React.RefObject<HTMLInputElement | null>;
    searchValue: string;
    onSearchValueChange: (nextValue: string) => void;
    onSearchClear?: () => void;
    items: readonly TItem[];
    activeIndex: number;
    onActiveIndexChange: (index: number) => void;
    getItemId: (item: TItem, index: number) => string;
    listboxLabel: string;
    listboxId?: string;
    scrollToIndex?: (index: number) => void;
    pageStep?: number;
    resetActiveIndexKey?: unknown;
    actions?: readonly PageSearchListKeyboardAction<TItem>[];
    allowPrintableRedirect?: boolean;
}

export interface PageSearchListKeyboardResult<TItem> {
    activeIndex: number;
    activeDescendantId?: string;
    focusSearch: (options?: { selectAll?: boolean }) => boolean;
    listProps: {
        id: string;
        role: "listbox";
        "aria-label": string;
    };
    searchInputProps: {
        role: "combobox";
        "aria-autocomplete": "list";
        "aria-expanded": boolean;
        "aria-haspopup": "listbox";
        "aria-controls": string;
        "aria-activedescendant"?: string;
        "aria-keyshortcuts": string;
    };
    onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    getItemProps: (item: TItem, index: number) => {
        id: string;
        role: "option";
        "aria-selected": boolean;
        "data-page-search-active"?: string;
        onMouseMove: () => void;
    };
}

function isMacLikePlatform(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
        ?? navigator.platform
        ?? "";

    return /mac/i.test(platform);
}

function focusSearchInput(
    input: HTMLInputElement | null,
    options?: { selectAll?: boolean; cursorToEnd?: boolean },
): boolean {
    if (!input) {
        return false;
    }

    input.focus();
    if (options?.selectAll) {
        input.select();
        return true;
    }

    if (options?.cursorToEnd) {
        const end = input.value.length;
        input.setSelectionRange(end, end);
    }

    return true;
}

function queueCursorToEnd(searchRef: React.RefObject<HTMLInputElement | null>) {
    if (typeof window === "undefined") {
        return;
    }

    window.requestAnimationFrame(() => {
        const input = searchRef.current;
        if (!input || document.activeElement !== input) {
            return;
        }

        const end = input.value.length;
        input.setSelectionRange(end, end);
    });
}

function isInteractiveRedirectBlocker(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return Boolean(target.closest([
        "button",
        "a[href]",
        "summary",
        "label",
        "[role='button']",
        "[role='link']",
        "[role='menuitem']",
        "[role='option']",
        "[role='radio']",
        "[role='switch']",
        "[role='tab']",
        "[role='checkbox']",
        "[tabindex]",
    ].join(", ")));
}

function isTargetWithinScope(target: EventTarget | null, scope: HTMLElement | null | undefined): boolean {
    if (!scope || !(target instanceof Node)) {
        return !scope;
    }

    return scope.contains(target);
}

function isPrintableRedirectKey(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isCommandComposingEvent(event)) {
        return false;
    }

    return event.key.length === 1 && event.key.trim().length > 0;
}

function matchesActionTrigger(
    event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented" | "target">,
    trigger: PageSearchListKeyboardActionTrigger,
    searchValue: string,
): boolean {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return false;
    }

    switch (trigger) {
        case "enter":
            return event.key === "Enter" && !event.shiftKey;
        case "shift-enter":
            return event.key === "Enter" && event.shiftKey;
        case "delete-empty-search": {
            if (event.shiftKey || searchValue.length > 0) {
                return false;
            }

            if (event.key !== "Delete" && event.key !== "Backspace") {
                return false;
            }

            const edges = getCommandTextEntryEdges(event.target);
            return edges.atStart && edges.atEnd;
        }
        default:
            return false;
    }
}

export function getPageSearchShortcutLabel(): string {
    return isMacLikePlatform() ? "Cmd+K" : "Ctrl+K";
}

function useLatestRef<T>(value: T) {
    const ref = useRef(value);

    useLayoutEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

export default function usePageSearchListKeyboard<TItem>(
    options: UsePageSearchListKeyboardOptions<TItem>,
): PageSearchListKeyboardResult<TItem> {
    const {
        enabled = true,
        scopeRef,
        searchRef,
        searchValue,
        onSearchValueChange,
        onSearchClear,
        items,
        activeIndex,
        onActiveIndexChange,
        getItemId,
        listboxLabel,
        listboxId,
        scrollToIndex,
        pageStep = 10,
        resetActiveIndexKey,
        actions = [],
        allowPrintableRedirect = true,
    } = options;

    const generatedListboxId = useId();
    const lastResetKeyRef = useRef(resetActiveIndexKey);
    // Keep the hot-path handlers stable even when call sites pass inline callbacks or arrays.
    const actionsRef = useLatestRef(actions);
    const allowPrintableRedirectRef = useLatestRef(allowPrintableRedirect);
    const getItemIdRef = useLatestRef(getItemId);
    const itemsRef = useLatestRef(items);
    const onActiveIndexChangeRef = useLatestRef(onActiveIndexChange);
    const onSearchClearRef = useLatestRef(onSearchClear);
    const onSearchValueChangeRef = useLatestRef(onSearchValueChange);
    const pageStepRef = useLatestRef(pageStep);
    const scrollToIndexRef = useLatestRef(scrollToIndex);
    const searchValueRef = useLatestRef(searchValue);
    const resolvedListboxId = listboxId ?? `page-search-list-${generatedListboxId}`;
    const resolvedActiveIndex = clampCommandActiveIndex(activeIndex, items.length);
    const resolvedActiveIndexRef = useLatestRef(resolvedActiveIndex);
    const activeDescendantId = items[resolvedActiveIndex]
        ? getItemId(items[resolvedActiveIndex] as TItem, resolvedActiveIndex)
        : undefined;

    const focusSearch = useCallback((focusOptions?: { selectAll?: boolean }) => {
        return focusSearchInput(searchRef.current, { selectAll: focusOptions?.selectAll === true });
    }, [searchRef]);

    const clearSearch = useCallback(() => {
        if (onSearchClearRef.current) {
            onSearchClearRef.current();
            return;
        }

        onSearchValueChangeRef.current("");
    }, [onSearchClearRef, onSearchValueChangeRef]);

    const updateActiveIndex = useCallback((nextIndex: number) => {
        const clampedIndex = clampCommandActiveIndex(nextIndex, itemsRef.current.length);
        if (clampedIndex !== resolvedActiveIndexRef.current) {
            onActiveIndexChangeRef.current(clampedIndex);
        }
        scrollToIndexRef.current?.(clampedIndex);
    }, [itemsRef, onActiveIndexChangeRef, resolvedActiveIndexRef, scrollToIndexRef]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        if (items.length === 0) {
            if (activeIndex !== 0) {
                onActiveIndexChange(0);
            }
            return;
        }

        const clampedIndex = clampCommandActiveIndex(activeIndex, items.length);
        if (clampedIndex !== activeIndex) {
            onActiveIndexChange(clampedIndex);
        }
    }, [activeIndex, enabled, items.length, onActiveIndexChange]);

    useEffect(() => {
        if (!enabled) {
            lastResetKeyRef.current = resetActiveIndexKey;
            return;
        }

        if (Object.is(lastResetKeyRef.current, resetActiveIndexKey)) {
            return;
        }

        lastResetKeyRef.current = resetActiveIndexKey;

        if (items.length === 0) {
            if (activeIndex !== 0) {
                onActiveIndexChange(0);
            }
            return;
        }

        if (resolvedActiveIndex !== 0) {
            onActiveIndexChange(0);
            scrollToIndex?.(0);
        }
    }, [activeIndex, enabled, items.length, onActiveIndexChange, resetActiveIndexKey, resolvedActiveIndex, scrollToIndex]);

    const runMatchingAction = useCallback((event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented" | "target">) => {
        const currentItems = itemsRef.current;
        if (currentItems.length === 0 || isCommandPopupOpenTarget(event.target)) {
            return false;
        }

        const currentIndex = resolvedActiveIndexRef.current;
        const activeItem = currentItems[currentIndex];
        if (!activeItem) {
            return false;
        }

        const matchingAction = actionsRef.current.find((action) => {
            if (!matchesActionTrigger(event, action.trigger, searchValueRef.current)) {
                return false;
            }

            return action.isEnabled?.(activeItem, currentIndex) ?? true;
        });

        if (!matchingAction) {
            return false;
        }

        matchingAction.run(activeItem, currentIndex);
        return true;
    }, [actionsRef, itemsRef, resolvedActiveIndexRef, searchValueRef]);

    const onSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!enabled || event.defaultPrevented) {
            return;
        }

        if (isCommandComposingEvent(event.nativeEvent) || isCommandPopupOpenTarget(event.target)) {
            return;
        }

        if (event.key === "Escape" && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && searchValueRef.current.length > 0) {
            event.preventDefault();
            clearSearch();
            return;
        }

        if (runMatchingAction(event.nativeEvent)) {
            event.preventDefault();
            return;
        }

        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }

        if (itemsRef.current.length === 0) {
            return;
        }

        const currentIndex = resolvedActiveIndexRef.current;
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                updateActiveIndex(currentIndex + 1);
                return;
            case "ArrowUp":
                event.preventDefault();
                updateActiveIndex(currentIndex - 1);
                return;
            case "PageDown":
                event.preventDefault();
                updateActiveIndex(currentIndex + pageStepRef.current);
                return;
            case "PageUp":
                event.preventDefault();
                updateActiveIndex(currentIndex - pageStepRef.current);
                return;
            case "Home":
                event.preventDefault();
                updateActiveIndex(0);
                return;
            case "End":
                event.preventDefault();
                updateActiveIndex(itemsRef.current.length - 1);
                return;
            default:
                return;
        }
    }, [clearSearch, enabled, itemsRef, pageStepRef, resolvedActiveIndexRef, runMatchingAction, searchValueRef, updateActiveIndex]);

    useEffect(() => {
        if (!enabled || typeof window === "undefined") {
            return undefined;
        }

        const handleWindowKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || isCommandComposingEvent(event) || isCommandPopupOpenTarget(event.target)) {
                return;
            }

            if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
                event.preventDefault();
                focusSearchInput(searchRef.current, { selectAll: true });
                return;
            }

            if (!allowPrintableRedirectRef.current || !isPrintableRedirectKey(event) || isEditableTarget(event.target) || isInteractiveRedirectBlocker(event.target)) {
                return;
            }

            const scope = scopeRef?.current;
            const withinScope = isTargetWithinScope(event.target, scope) || document.activeElement === document.body;
            if (!withinScope || doesCommandTargetOwnPrintableKey(event.target, event.key)) {
                return;
            }

            event.preventDefault();
            onSearchValueChangeRef.current(`${searchValueRef.current}${event.key}`);
            focusSearchInput(searchRef.current);
            queueCursorToEnd(searchRef);
        };

        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, [allowPrintableRedirectRef, enabled, onSearchValueChangeRef, scopeRef, searchRef, searchValueRef]);

    const listProps = useMemo(() => ({
        id: resolvedListboxId,
        role: "listbox" as const,
        "aria-label": listboxLabel,
    }), [listboxLabel, resolvedListboxId]);

    const searchInputProps = useMemo(() => ({
        role: "combobox" as const,
        "aria-autocomplete": "list" as const,
        "aria-expanded": items.length > 0,
        "aria-haspopup": "listbox" as const,
        "aria-controls": resolvedListboxId,
        "aria-activedescendant": activeDescendantId,
        "aria-keyshortcuts": PAGE_SEARCH_SHORTCUT_ARIA_VALUE,
    }), [activeDescendantId, items.length, resolvedListboxId]);

    const getItemProps = useCallback((item: TItem, index: number) => ({
        id: getItemId(item, index),
        role: "option" as const,
        "aria-selected": index === resolvedActiveIndex,
        "data-page-search-active": index === resolvedActiveIndex ? "true" : undefined,
        onMouseMove: () => {
            if (index !== resolvedActiveIndexRef.current) {
                onActiveIndexChangeRef.current(index);
            }
        },
    }), [getItemId, onActiveIndexChangeRef, resolvedActiveIndex, resolvedActiveIndexRef]);

    return {
        activeIndex: resolvedActiveIndex,
        activeDescendantId,
        focusSearch,
        listProps,
        searchInputProps,
        onSearchKeyDown,
        getItemProps,
    };
}

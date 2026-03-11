import { Fragment, memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { clampCommandActiveIndex } from "./commandKeyboard";

export type SearchListMoveAction = {
    type: "move";
    nextIndex: number;
    align: "start" | "center" | "end";
};

export type SearchListKeyboardAction = SearchListMoveAction
    | { type: "activate" }
    | { type: "clear-query" }
    | { type: "escape" }
    | { type: "none" };

export type SearchListScrollAlign = SearchListMoveAction["align"];

type SearchListScrollToIndex = (index: number, align: SearchListScrollAlign) => void;

export function getSearchListKeyboardAction({
    key,
    itemCount,
    activeIndex,
    hasQuery,
    pageSize,
    wrapArrowUp = false,
    wrapArrowDown = false,
}: {
    key: string;
    itemCount: number;
    activeIndex: number;
    hasQuery: boolean;
    pageSize: number;
    wrapArrowUp?: boolean;
    wrapArrowDown?: boolean;
}): SearchListKeyboardAction {
    switch (key) {
        case "ArrowDown":
            if (itemCount === 0) {
                return { type: "none" };
            }
            if (wrapArrowDown && activeIndex === itemCount - 1) {
                return { type: "move", nextIndex: 0, align: "start" };
            }
            return { type: "move", nextIndex: activeIndex + 1, align: "start" };
        case "ArrowUp":
            if (itemCount === 0) {
                return { type: "none" };
            }
            if (wrapArrowUp && activeIndex === 0) {
                return { type: "move", nextIndex: itemCount - 1, align: "end" };
            }
            return { type: "move", nextIndex: activeIndex - 1, align: "start" };
        case "Home":
            if (itemCount === 0) {
                return { type: "none" };
            }
            return { type: "move", nextIndex: 0, align: "start" };
        case "End":
            if (itemCount === 0) {
                return { type: "none" };
            }
            return { type: "move", nextIndex: itemCount - 1, align: "end" };
        case "PageDown":
            if (itemCount === 0) {
                return { type: "none" };
            }
            return { type: "move", nextIndex: activeIndex + pageSize, align: "center" };
        case "PageUp":
            if (itemCount === 0) {
                return { type: "none" };
            }
            return { type: "move", nextIndex: activeIndex - pageSize, align: "center" };
        case "Enter":
            return itemCount > 0 ? { type: "activate" } : { type: "none" };
        case "Escape":
            return hasQuery ? { type: "clear-query" } : { type: "escape" };
        default:
            return { type: "none" };
    }
}

export function getSearchListOptionId(listboxId: string, optionKey: string): string {
    return `${listboxId}-${optionKey.replace(/[^a-z0-9_-]+/gi, "-")}`;
}

export function scrollFixedRowListToIndex({
    container,
    index,
    rowHeight,
    viewportHeight,
    align,
}: {
    container: HTMLElement | null;
    index: number;
    rowHeight: number;
    viewportHeight: number;
    align: SearchListScrollAlign;
}) {
    if (!container) {
        return;
    }

    const setScrollTop = (top: number) => {
        if (typeof container.scrollTo === "function") {
            container.scrollTo({ top });
            return;
        }

        container.scrollTop = top;
    };

    const rowTop = index * rowHeight;
    const rowBottom = rowTop + rowHeight;
    const currentScrollTop = container.scrollTop;

    if (align === "start") {
        setScrollTop(rowTop);
        return;
    }

    if (align === "end") {
        setScrollTop(Math.max(0, rowBottom - viewportHeight));
        return;
    }

    if (rowTop < currentScrollTop) {
        setScrollTop(rowTop);
        return;
    }

    if (rowBottom > currentScrollTop + viewportHeight) {
        setScrollTop(Math.max(0, rowBottom - viewportHeight));
    }
}

export function useSearchListActiveNavigation({
    itemCount,
    scrollToIndex,
}: {
    itemCount: number;
    scrollToIndex?: SearchListScrollToIndex;
}) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        setActiveIndex((currentIndex) => clampCommandActiveIndex(currentIndex, itemCount));
    }, [itemCount]);

    const moveActiveIndex = useCallback((nextIndex: number, align: SearchListScrollAlign = "center") => {
        if (itemCount <= 0) {
            setActiveIndex(0);
            return false;
        }

        const clampedIndex = clampCommandActiveIndex(nextIndex, itemCount);
        setActiveIndex(clampedIndex);
        scrollToIndex?.(clampedIndex, align);
        return true;
    }, [itemCount, scrollToIndex]);

    const resetActiveIndex = useCallback((align?: SearchListScrollAlign) => {
        setActiveIndex(0);
        if (align && itemCount > 0) {
            scrollToIndex?.(0, align);
        }
    }, [itemCount, scrollToIndex]);

    return {
        activeIndex,
        setActiveIndex,
        moveActiveIndex,
        resetActiveIndex,
    };
}

export type FixedRowWindow = {
    startIndex: number;
    endIndex: number;
    paddingTop: number;
    paddingBottom: number;
};

export function rankSearchMatches<T>(
    items: readonly T[],
    query: string,
    getSearchText: (item: T) => string,
    getPrefixCandidates: (item: T) => readonly string[],
): T[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return [...items];
    }

    const prefixMatches: T[] = [];
    const partialMatches: T[] = [];

    for (const item of items) {
        const searchText = getSearchText(item).toLowerCase();
        if (!searchText.includes(normalizedQuery)) {
            continue;
        }

        if (getPrefixCandidates(item).some((candidate) => candidate.toLowerCase().startsWith(normalizedQuery))) {
            prefixMatches.push(item);
            continue;
        }

        partialMatches.push(item);
    }

    return prefixMatches.concat(partialMatches);
}

export function getFixedRowWindow(
    totalItems: number,
    scrollTop: number,
    rowHeight: number,
    viewportHeight: number,
    overscan: number,
): FixedRowWindow {
    const visibleRowCapacity = Math.max(1, Math.ceil(viewportHeight / rowHeight));
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(totalItems, startIndex + visibleRowCapacity + (overscan * 2));

    return {
        startIndex,
        endIndex,
        paddingTop: startIndex * rowHeight,
        paddingBottom: Math.max(0, (totalItems - endIndex) * rowHeight),
    };
}

function splitHighlightedText(text: string, query: string): Array<{ text: string; match: boolean }> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
        return [{ text, match: false }];
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = normalizedQuery.toLowerCase();
    const parts: Array<{ text: string; match: boolean }> = [];
    let cursor = 0;

    while (cursor < text.length) {
        const matchIndex = lowerText.indexOf(lowerQuery, cursor);
        if (matchIndex === -1) {
            parts.push({ text: text.slice(cursor), match: false });
            break;
        }

        if (matchIndex > cursor) {
            parts.push({ text: text.slice(cursor, matchIndex), match: false });
        }

        parts.push({ text: text.slice(matchIndex, matchIndex + normalizedQuery.length), match: true });
        cursor = matchIndex + normalizedQuery.length;
    }

    return parts.length > 0 ? parts : [{ text, match: false }];
}

export const SearchMatchText = memo(function SearchMatchText({
    text,
    query,
    highlightClassName = "bg-amber-200/70 text-foreground dark:bg-amber-500/20",
}: {
    text: string;
    query: string;
    highlightClassName?: string;
}) {
    const parts = useMemo(() => splitHighlightedText(text, query), [text, query]);

    return (
        <>
            {parts.map((part, index) => {
                if (!part.text) {
                    return null;
                }

                return part.match ? (
                    <mark key={`${part.text}-${index}`} className={highlightClassName}>
                        {part.text}
                    </mark>
                ) : (
                    <Fragment key={`${part.text}-${index}`}>{part.text}</Fragment>
                );
            }) as ReactNode}
        </>
    );
});
import { Fragment, memo, useMemo, type ReactNode } from "react";

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
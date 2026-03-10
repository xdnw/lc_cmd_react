import {
    useCallback,
    memo,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type UIEvent,
} from "react";

import { filterSelectOptions, type SelectOption } from "./selectValueUtils";
import {
    materializeLazyOptionSuggestion,
    type ExpressionLazyOptionSource,
    type ExpressionSuggestion,
} from "./expression/expressionAnalysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SEARCH_THRESHOLD = 50;
const VISIBLE_ROW_COUNT = 8;
const ROW_HEIGHT = 28;
const ROW_OVERSCAN = 3;

function rankSearchMatches<T>(
    items: T[],
    query: string,
    getSearchText: (item: T) => string,
    getPrefixCandidates: (item: T) => string[],
): T[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return items;
    }

    const exactOrPrefixMatches: T[] = [];
    const partialMatches: T[] = [];

    for (const item of items) {
        const searchText = getSearchText(item).toLowerCase();
        if (!searchText.includes(normalizedQuery)) {
            continue;
        }

        if (getPrefixCandidates(item).some((candidate) => candidate.toLowerCase().startsWith(normalizedQuery))) {
            exactOrPrefixMatches.push(item);
            continue;
        }

        partialMatches.push(item);
    }

    return exactOrPrefixMatches.concat(partialMatches);
}

function buildSuggestionSearchText(suggestion: ExpressionSuggestion): string {
    return [
        suggestion.label,
        suggestion.insertText,
        suggestion.detail,
        suggestion.subtext,
    ]
        .filter(Boolean)
        .join(" ");
}

export function filterExpressionSuggestions(
    suggestions: ExpressionSuggestion[],
    query: string,
): ExpressionSuggestion[] {
    return rankSearchMatches(
        suggestions,
        query,
        buildSuggestionSearchText,
        (suggestion) => [suggestion.label, suggestion.insertText],
    );
}

function buildOptionSearchText(option: SelectOption): string {
    return [
        option.label,
        option.value,
        option.subtext,
        ...(option.aliases ?? []),
    ]
        .filter(Boolean)
        .join(" ");
}

function filterLazyOptions(
    options: SelectOption[],
    query: string,
): SelectOption[] {
    return rankSearchMatches(
        options,
        query,
        buildOptionSearchText,
        (option) => [option.label, option.value],
    );
}

function mergeExpressionSuggestions(
    suggestions: ExpressionSuggestion[],
    lazySuggestions: ExpressionSuggestion[],
): ExpressionSuggestion[] {
    if (lazySuggestions.length === 0) {
        return suggestions;
    }

    if (suggestions.length === 0) {
        return lazySuggestions;
    }

    const merged: ExpressionSuggestion[] = [];
    const seen = new Set<string>();

    for (const suggestion of suggestions.concat(lazySuggestions)) {
        const key = `${suggestion.kind}:${suggestion.insertText}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        merged.push(suggestion);
    }

    return merged;
}

type SuggestionRowProps = {
    suggestion: ExpressionSuggestion;
    index: number;
    isHighlighted: boolean;
    onApplySuggestion: (suggestion: ExpressionSuggestion) => void;
    onHighlight: (index: number) => void;
};

const SuggestionRow = memo(function SuggestionRow({
    suggestion,
    index,
    isHighlighted,
    onApplySuggestion,
    onHighlight,
}: SuggestionRowProps) {
    const secondaryText = suggestion.detail ?? suggestion.subtext;
    const handleMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    }, []);
    const handleMouseEnter = useCallback(() => {
        onHighlight(index);
    }, [index, onHighlight]);
    const handleClick = useCallback(() => {
        onApplySuggestion(suggestion);
    }, [onApplySuggestion, suggestion]);

    return (
        <div className="px-0.5 py-px">
            <Button
                type="button"
                variant="ghost"
                aria-label={suggestion.label}
                className={cn(
                    "flex h-7 w-full items-center justify-between overflow-hidden rounded-md px-2 py-1 text-left",
                    isHighlighted && "before:bg-accent text-accent-foreground",
                )}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                onClick={handleClick}
                title={suggestion.detail}
            >
                <span className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
                    <span className="truncate font-mono text-[11px] text-foreground">{suggestion.label}</span>
                    {secondaryText && (
                        <span aria-hidden="true" className="truncate text-[10px] text-muted-foreground">
                            {secondaryText}
                        </span>
                    )}
                </span>
            </Button>
        </div>
    );
});

export default function PlaceholderSuggestionPanel({
    suggestions,
    lazyOptionSource,
    searchValue,
    onSearchValueChange,
    onApplySuggestion,
}: {
    suggestions: ExpressionSuggestion[];
    lazyOptionSource?: ExpressionLazyOptionSource;
    searchValue: string;
    onSearchValueChange: (value: string) => void;
    onApplySuggestion: (suggestion: ExpressionSuggestion) => void;
}) {
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const deferredSearchValue = useDeferredValue(searchValue);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const lazyToken = lazyOptionSource?.token.trim() ?? "";
    const searchQuery = deferredSearchValue.trim();
    const effectiveLazyQuery = searchValue.trim() || lazyToken;
    const lazyOptionUniverse = lazyOptionSource?.entry.optionCount ?? lazyOptionSource?.entry.options.length ?? 0;
    const requiresExplicitSearch = Boolean(
        lazyOptionSource?.minQueryLength
        && lazyOptionUniverse >= SEARCH_THRESHOLD,
    );
    const canBrowseLazyOptions = !lazyOptionSource
        || !requiresExplicitSearch
        || lazyOptionSource.entry.options.length > 0
        || lazyToken.length >= (lazyOptionSource.minQueryLength ?? 0)
        || searchQuery.length >= (lazyOptionSource.minQueryLength ?? 0);

    const lazyBaseOptions = useMemo(() => {
        if (!lazyOptionSource) {
            return [] as SelectOption[];
        }
        if (!canBrowseLazyOptions) {
            return [] as SelectOption[];
        }
        return filterSelectOptions(effectiveLazyQuery, lazyOptionSource.entry.options);
    }, [canBrowseLazyOptions, effectiveLazyQuery, lazyOptionSource]);

    const filteredSuggestions = useMemo(
        () => filterExpressionSuggestions(suggestions, deferredSearchValue),
        [deferredSearchValue, suggestions],
    );

    const filteredLazyOptions = useMemo(() => {
        if (!lazyOptionSource) {
            return [] as SelectOption[];
        }
        return filterLazyOptions(lazyBaseOptions, deferredSearchValue);
    }, [deferredSearchValue, lazyBaseOptions, lazyOptionSource]);

    const lazySuggestions = useMemo(() => {
        if (!lazyOptionSource) {
            return [] as ExpressionSuggestion[];
        }

        return filteredLazyOptions.map((option) => materializeLazyOptionSuggestion(lazyOptionSource, option));
    }, [filteredLazyOptions, lazyOptionSource]);

    const renderedSuggestions = useMemo(
        () => mergeExpressionSuggestions(filteredSuggestions, lazySuggestions),
        [filteredSuggestions, lazySuggestions],
    );

    const visibleSuggestions = renderedSuggestions.length;
    const allLazyOptionsCount = lazyOptionUniverse;
    const totalSuggestionUniverse = suggestions.length + (lazyOptionSource ? allLazyOptionsCount : 0);
    const showSearch = totalSuggestionUniverse > SEARCH_THRESHOLD;
    const showLazySearchPrompt = Boolean(lazyOptionSource && !canBrowseLazyOptions);
    const lazyMinQueryLength = lazyOptionSource?.minQueryLength ?? 0;
    const listHeight = Math.max(3, Math.min(visibleSuggestions || 1, VISIBLE_ROW_COUNT)) * ROW_HEIGHT;
    const visibleRowCapacity = Math.max(1, Math.ceil(listHeight / ROW_HEIGHT));
    const windowStartIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - ROW_OVERSCAN);
    const windowEndIndex = Math.min(renderedSuggestions.length, windowStartIndex + visibleRowCapacity + (ROW_OVERSCAN * 2));
    const windowedSuggestions = renderedSuggestions.slice(windowStartIndex, windowEndIndex);
    const paddingTop = windowStartIndex * ROW_HEIGHT;
    const paddingBottom = Math.max(0, (renderedSuggestions.length - windowEndIndex) * ROW_HEIGHT);

    useEffect(() => {
        setHighlightedIndex(0);
        setScrollTop(0);
        const container = listContainerRef.current;
        if (container) {
            container.scrollTop = 0;
        }
    }, [visibleSuggestions]);

    useEffect(() => {
        const container = listContainerRef.current;
        if (!container || visibleSuggestions === 0) {
            return;
        }

        const itemTop = highlightedIndex * ROW_HEIGHT;
        const itemBottom = itemTop + ROW_HEIGHT;
        const viewportTop = container.scrollTop;
        const viewportBottom = viewportTop + container.clientHeight;

        if (itemTop < viewportTop) {
            container.scrollTop = itemTop;
            return;
        }

        if (itemBottom > viewportBottom) {
            container.scrollTop = itemBottom - container.clientHeight;
        }
    }, [highlightedIndex, visibleSuggestions]);

    const activeSuggestion = useMemo(() => {
        return renderedSuggestions[Math.min(highlightedIndex, Math.max(renderedSuggestions.length - 1, 0))] ?? null;
    }, [highlightedIndex, renderedSuggestions]);
    const renderSuggestionRow = useCallback((index: number, suggestion?: ExpressionSuggestion) => {
        if (!suggestion) {
            return null;
        }

        return (
            <SuggestionRow
                key={`${suggestion.kind}:${suggestion.insertText}:${suggestion.label}:${index}`}
                suggestion={suggestion}
                index={index}
                isHighlighted={index === highlightedIndex}
                onApplySuggestion={onApplySuggestion}
                onHighlight={setHighlightedIndex}
            />
        );
    }, [highlightedIndex, onApplySuggestion]);

    const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (visibleSuggestions === 0) {
            return;
        }

        switch (event.key) {
            case "ArrowDown": {
                event.preventDefault();
                setHighlightedIndex((previous) => {
                    return Math.min(previous + 1, visibleSuggestions - 1);
                });
                break;
            }
            case "ArrowUp": {
                event.preventDefault();
                setHighlightedIndex((previous) => {
                    return Math.max(previous - 1, 0);
                });
                break;
            }
            case "Enter":
            case "Tab": {
                if (!activeSuggestion) {
                    return;
                }
                event.preventDefault();
                onApplySuggestion(activeSuggestion);
                break;
            }
            default:
                break;
        }
    }, [activeSuggestion, onApplySuggestion, visibleSuggestions]);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchValueChange(event.currentTarget.value);
    }, [onSearchValueChange]);

    const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);

    return (
        <div className="rounded-md border border-border bg-muted/40 p-1.5">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Suggestions</span>
                <span>{visibleSuggestions.toLocaleString()} / {totalSuggestionUniverse.toLocaleString()}</span>
            </div>

            {showSearch && (
                <Input
                    value={searchValue}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search suggestions"
                    aria-label="Search suggestions"
                    className="mb-1.5 font-mono text-xs"
                />
            )}

            {showLazySearchPrompt && (
                <div className="rounded-md border border-dashed border-border/70 bg-background/70 px-2 py-3 text-xs text-muted-foreground">
                    Type at least {lazyMinQueryLength.toString()} characters to search {totalSuggestionUniverse.toLocaleString()} options.
                </div>
            )}

            {!showLazySearchPrompt && visibleSuggestions === 0 ? (
                <div className="rounded-md border border-dashed border-border/70 bg-background/70 px-2 py-3 text-xs text-muted-foreground">
                    No suggestions match the current search.
                </div>
            ) : visibleSuggestions > 0 ? (
                <div className="overflow-hidden rounded-md border border-border/70 bg-background/70">
                    <div
                        ref={listContainerRef}
                        style={{ height: listHeight }}
                        className="overflow-y-auto"
                        onScroll={handleScroll}
                    >
                        <div style={{ paddingTop, paddingBottom }}>
                            {windowedSuggestions.map((suggestion, index) => renderSuggestionRow(windowStartIndex + index, suggestion))}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
import {
    useCallback,
    memo,
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
import { getFixedRowWindow, getSearchListKeyboardAction, getSearchListOptionId, rankSearchMatches, SearchMatchText } from "./searchListPrimitives";

const SEARCH_THRESHOLD = 50;
export const PLACEHOLDER_SUGGESTION_VISIBLE_ROW_COUNT = 8;
const ROW_HEIGHT = 28;
const ROW_OVERSCAN = 3;
const SUGGESTION_ACCEPT_HINT = "Navigate: Up/Down   Accept: Ctrl+Right / Ctrl+Enter";

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

export type PlaceholderSuggestionViewModel = {
    renderedSuggestions: ExpressionSuggestion[];
    visibleSuggestions: number;
    totalSuggestionUniverse: number;
    showSearch: boolean;
    showLazySearchPrompt: boolean;
    lazyMinQueryLength: number;
    searchQuery: string;
    resultKey: string;
};

export function getPlaceholderSuggestionKey(suggestion: ExpressionSuggestion): string {
    return `${suggestion.kind}:${suggestion.insertText}`;
}

export function buildPlaceholderSuggestionView({
    suggestions,
    lazyOptionSource,
    searchValue,
}: {
    suggestions: ExpressionSuggestion[];
    lazyOptionSource?: ExpressionLazyOptionSource;
    searchValue: string;
}): PlaceholderSuggestionViewModel {
    const searchQuery = searchValue.trim();
    const lazyToken = lazyOptionSource?.token.trim() ?? "";
    const effectiveLazyQuery = searchQuery || lazyToken;
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

    const lazyBaseOptions = !lazyOptionSource || !canBrowseLazyOptions
        ? [] as SelectOption[]
        : filterSelectOptions(effectiveLazyQuery, lazyOptionSource.entry.options);
    const filteredSuggestions = filterExpressionSuggestions(suggestions, searchValue);
    const filteredLazyOptions = !lazyOptionSource
        ? [] as SelectOption[]
        : filterLazyOptions(lazyBaseOptions, searchValue);
    const lazySuggestions = !lazyOptionSource
        ? [] as ExpressionSuggestion[]
        : filteredLazyOptions.map((option) => materializeLazyOptionSuggestion(lazyOptionSource, option));
    const renderedSuggestions = mergeExpressionSuggestions(filteredSuggestions, lazySuggestions);
    const visibleSuggestions = renderedSuggestions.length;
    const totalSuggestionUniverse = suggestions.length + (lazyOptionSource ? lazyOptionUniverse : 0);

    return {
        renderedSuggestions,
        visibleSuggestions,
        totalSuggestionUniverse,
        showSearch: totalSuggestionUniverse > SEARCH_THRESHOLD,
        showLazySearchPrompt: Boolean(lazyOptionSource && !canBrowseLazyOptions),
        lazyMinQueryLength: lazyOptionSource?.minQueryLength ?? 0,
        searchQuery,
        resultKey: renderedSuggestions.map(getPlaceholderSuggestionKey).join("|"),
    };
}

type SuggestionRowProps = {
    id: string;
    suggestion: ExpressionSuggestion;
    index: number;
    isHighlighted: boolean;
    onApplySuggestion: (suggestion: ExpressionSuggestion) => void;
    onHighlight: (index: number) => void;
    searchQuery: string;
};

const SuggestionRow = memo(function SuggestionRow({
    id,
    suggestion,
    index,
    isHighlighted,
    onApplySuggestion,
    onHighlight,
    searchQuery,
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
                id={id}
                type="button"
                variant="ghost"
                role="option"
                aria-selected={isHighlighted}
                aria-label={suggestion.label}
                tabIndex={-1}
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
                    <span className="truncate font-mono text-[11px] text-foreground">
                        <SearchMatchText text={suggestion.label} query={searchQuery} />
                    </span>
                    {secondaryText && (
                        <span aria-hidden="true" className="truncate text-[10px] text-muted-foreground">
                            <SearchMatchText text={secondaryText} query={searchQuery} />
                        </span>
                    )}
                </span>
            </Button>
        </div>
    );
});

export default function PlaceholderSuggestionPanel({
    view,
    searchValue,
    listboxId,
    activeIndex,
    activeDescendantId,
    onSearchValueChange,
    onApplySuggestion,
    onActiveIndexChange,
}: {
    view: PlaceholderSuggestionViewModel;
    searchValue: string;
    listboxId: string;
    activeIndex: number;
    activeDescendantId?: string;
    onSearchValueChange: (value: string) => void;
    onApplySuggestion: (suggestion: ExpressionSuggestion) => void;
    onActiveIndexChange: (index: number) => void;
}) {
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const listHeight = Math.max(3, Math.min(view.visibleSuggestions || 1, PLACEHOLDER_SUGGESTION_VISIBLE_ROW_COUNT)) * ROW_HEIGHT;
    const windowState = getFixedRowWindow(view.renderedSuggestions.length, scrollTop, ROW_HEIGHT, listHeight, ROW_OVERSCAN);
    const windowStartIndex = windowState.startIndex;
    const windowEndIndex = windowState.endIndex;
    const windowedSuggestions = view.renderedSuggestions.slice(windowStartIndex, windowEndIndex);
    const paddingTop = windowState.paddingTop;
    const paddingBottom = windowState.paddingBottom;

    useEffect(() => {
        setScrollTop(0);
        const container = listContainerRef.current;
        if (container) {
            container.scrollTop = 0;
        }
    }, [view.resultKey]);

    useEffect(() => {
        const container = listContainerRef.current;
        if (!container || view.visibleSuggestions === 0) {
            return;
        }

        const itemTop = activeIndex * ROW_HEIGHT;
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
    }, [activeIndex, view.visibleSuggestions]);

    const activeSuggestion = useMemo(() => {
        return view.renderedSuggestions[Math.min(activeIndex, Math.max(view.renderedSuggestions.length - 1, 0))] ?? null;
    }, [activeIndex, view.renderedSuggestions]);
    const renderSuggestionRow = useCallback((index: number, suggestion?: ExpressionSuggestion) => {
        if (!suggestion) {
            return null;
        }

        return (
            <SuggestionRow
                key={`${getPlaceholderSuggestionKey(suggestion)}:${index}`}
                id={getSearchListOptionId(listboxId, getPlaceholderSuggestionKey(suggestion))}
                suggestion={suggestion}
                index={index}
                isHighlighted={index === activeIndex}
                onApplySuggestion={onApplySuggestion}
                onHighlight={onActiveIndexChange}
                searchQuery={view.searchQuery}
            />
        );
    }, [activeIndex, listboxId, onActiveIndexChange, onApplySuggestion, view.searchQuery]);

    const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        const action = getSearchListKeyboardAction({
            key: event.key,
            itemCount: view.visibleSuggestions,
            activeIndex,
            hasQuery: searchValue.trim().length > 0,
            pageSize: PLACEHOLDER_SUGGESTION_VISIBLE_ROW_COUNT,
            wrapArrowUp: true,
            wrapArrowDown: true,
        });

        switch (action.type) {
            case "move":
                event.preventDefault();
                onActiveIndexChange(action.nextIndex);
                return;
            case "activate":
                if (!activeSuggestion) {
                    return;
                }
                event.preventDefault();
                onApplySuggestion(activeSuggestion);
                return;
            case "none":
                if (event.key !== "Tab" || !activeSuggestion) {
                    return;
                }
                event.preventDefault();
                onApplySuggestion(activeSuggestion);
                return;
            default:
                return;
        }
    }, [activeIndex, activeSuggestion, onActiveIndexChange, onApplySuggestion, searchValue, view.visibleSuggestions]);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchValueChange(event.currentTarget.value);
    }, [onSearchValueChange]);

    const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);

    return (
        <div className="rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-sm">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span className="text-[10px] normal-case tracking-normal text-muted-foreground">{SUGGESTION_ACCEPT_HINT}</span>
                <div className="flex items-center gap-2 text-[10px] normal-case tracking-normal text-muted-foreground">
                    <span>{view.visibleSuggestions.toLocaleString()} / {view.totalSuggestionUniverse.toLocaleString()}</span>
                </div>
            </div>

            {view.showSearch && (
                <Input
                    value={searchValue}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Filter suggestions"
                    role="combobox"
                    aria-label="Search suggestions"
                    aria-autocomplete="list"
                    aria-expanded={view.visibleSuggestions > 0}
                    aria-haspopup="listbox"
                    aria-controls={listboxId}
                    aria-activedescendant={activeDescendantId}
                    className="mb-1.5 font-mono text-xs"
                />
            )}

            {view.showLazySearchPrompt && (
                <div className="rounded-md border border-dashed border-border/70 bg-background px-2 py-3 text-xs text-muted-foreground">
                    Type {view.lazyMinQueryLength.toString()}+ characters to search {view.totalSuggestionUniverse.toLocaleString()} options.
                </div>
            )}

            {!view.showLazySearchPrompt && view.visibleSuggestions === 0 ? (
                <div className="rounded-md border border-dashed border-border/70 bg-background px-2 py-3 text-xs text-muted-foreground">
                    No matches.
                </div>
            ) : view.visibleSuggestions > 0 ? (
                <div id={listboxId} role="listbox" aria-label="Expression suggestions" className="overflow-hidden rounded-md border border-border/70 bg-background">
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
import { startTransition, useCallback, useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSyncedState } from "@/utils/StateUtil";
import type { TypeBreakdown } from "@/utils/Command";
import {
    analyzeParsedExpression,
    getFirstLazyOptionSuggestion,
    parseExpressionCursorContext,
    type ExpressionAnalysis,
    type ExpressionSuggestion,
} from "./expression/expressionAnalysis";
import type { ExpressionValueSourceRegistry } from "./expression/expressionValueFetcher";
import type { ExpressionValueSourceRef } from "./expression/expressionSchema";
import { getExpressionExample, getExpressionTypeSchema } from "./expression/expressionSchema";
import { useExpressionValueSources } from "./expression/expressionValueFetcher";
import { getPlaceholderExpressionDescriptor } from "./expression/expressionTypes";
import PlaceholderSuggestionPanel, {
    buildPlaceholderSuggestionView,
    getPlaceholderSuggestionKey,
    PLACEHOLDER_SUGGESTION_VISIBLE_ROW_COUNT,
} from "./PlaceholderSuggestionPanel";
import { COMMAND_POPUP_OPEN_ATTR } from "./commandKeyboard";
import { getSearchListKeyboardAction, getSearchListOptionId, useSearchListActiveNavigation } from "./searchListPrimitives";

type SourceMessage = { kind: "loading" | "warning" | "error"; text: string };

const EMPTY_SOURCE_MESSAGES: SourceMessage[] = [];
const EMPTY_REGISTRY: ExpressionValueSourceRegistry = {};
const EMPTY_ANALYSIS: ExpressionAnalysis = { suggestions: [], errors: [] };
const STATUS_SLOT_HEIGHT_CLASS = "h-[3.25rem]";
const PLACEHOLDER_SUGGESTION_PAGE_SIZE = PLACEHOLDER_SUGGESTION_VISIBLE_ROW_COUNT;
const HIDDEN_PANEL_STYLE: React.CSSProperties = {
    position: "fixed",
    top: -9999,
    left: -9999,
    width: 0,
    maxHeight: 300,
    visibility: "hidden",
    zIndex: 90,
};

const PASSWORD_MANAGER_IGNORE_PROPS = {
    "data-bwignore": "true",
} as const;

function isSuggestionAcceptKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && event.ctrlKey) {
        return true;
    }

    if (event.key !== "ArrowRight") {
        return false;
    }

    return event.ctrlKey || event.metaKey;
}

function resolveSearchTokenTargetCacheKey(activeSourceRef: ExpressionValueSourceRef | undefined): string | null {
    if (!activeSourceRef) {
        return null;
    }

    if (activeSourceRef.kind === "query-options" || activeSourceRef.kind === "composite-query-options") {
        return activeSourceRef.cacheKey;
    }

    if (activeSourceRef.kind === "map-key-options") {
        return resolveSearchTokenTargetCacheKey(activeSourceRef.keySource);
    }

    return null;
}

function buildSearchTokensByCacheKey(
    requiredSources: Array<{ cacheKey: string; kind: string }>,
    activeSourceRef: ExpressionValueSourceRef | undefined,
    activeToken: string,
    panelSearchValue: string,
): Record<string, string> {
    const targetCacheKey = resolveSearchTokenTargetCacheKey(activeSourceRef);
    if (!targetCacheKey) {
        return {};
    }

    const activeSource = requiredSources.find((source) => source.cacheKey === targetCacheKey);
    if (!activeSource || (activeSource.kind !== "query-options" && activeSource.kind !== "composite-query-options")) {
        return {};
    }

    const workerToken = panelSearchValue.trim() || activeToken.trim();
    return { [targetCacheKey]: workerToken };
}

function collectSourceMessages(
    cacheKeys: string[],
    registry: ExpressionValueSourceRegistry,
): SourceMessage[] {
    if (cacheKeys.length === 0) {
        return EMPTY_SOURCE_MESSAGES;
    }

    const messages: SourceMessage[] = [];
    for (const cacheKey of cacheKeys) {
        const entry = registry[cacheKey];
        if (!entry) {
            continue;
        }
        if (entry.status === "loading") {
            messages.push({ kind: "loading", text: `Loading ${entry.typeLabel} options...` });
        }
        if (entry.warning) {
            messages.push({ kind: "warning", text: entry.warning });
        }
        if (entry.error) {
            messages.push({ kind: "error", text: entry.error });
        }
    }

    return messages.length > 0 ? messages : EMPTY_SOURCE_MESSAGES;
}

export default function PlaceholderExpressionInput({
    argName,
    initialValue,
    setOutputValue,
    breakdown,
    forceMountAll,
}: {
    argName: string;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
    breakdown: TypeBreakdown;
    forceMountAll?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const controlRef = useRef<HTMLInputElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const suggestionListboxId = useId();
    const descriptor = useMemo(() => getPlaceholderExpressionDescriptor(breakdown), [breakdown]);
    const [value, setValue] = useSyncedState(initialValue || "");
    const [cursor, setCursor] = useState((initialValue || "").length);
    const [hasFocusWithin, setHasFocusWithin] = useState(false);
    const [panelSearchValue, setPanelSearchValue] = useState("");
    const [hasPanelInteraction, setHasPanelInteraction] = useState((initialValue || "").trim().length > 0);
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>(HIDDEN_PANEL_STYLE);
    const pendingSelectionRef = useRef<number | null>(null);
    const deferredValue = useDeferredValue(value);
    const shouldAnalyze = forceMountAll || hasFocusWithin || deferredValue.trim().length > 0;

    const updateCursor = useCallback((nextCursor: number) => {
        setCursor((previousCursor) => previousCursor === nextCursor ? previousCursor : nextCursor);
    }, []);

    const schema = useMemo(
        () => (descriptor ? getExpressionTypeSchema(descriptor.rootType) : null),
        [descriptor],
    );

    const cursorContext = useMemo(() => {
        if (!descriptor || !shouldAnalyze) {
            return null;
        }
        return parseExpressionCursorContext(descriptor, deferredValue, cursor);
    }, [cursor, deferredValue, descriptor, shouldAnalyze]);

    const activeSourceCacheKey = cursorContext?.activeSourceRef?.cacheKey;

    useEffect(() => {
        setPanelSearchValue("");
    }, [activeSourceCacheKey]);

    const searchTokensByCacheKey = useMemo(() => buildSearchTokensByCacheKey(
        cursorContext?.requiredSources ?? [],
        cursorContext?.activeSourceRef,
        cursorContext?.activeToken ?? "",
        panelSearchValue,
    ), [cursorContext, panelSearchValue]);

    const sourceRegistry = useExpressionValueSources(
        cursorContext?.requiredSources ?? [],
        searchTokensByCacheKey,
        shouldAnalyze && hasFocusWithin,
    );
    const requiredSourceCacheKeys = useMemo(
        () => cursorContext?.requiredSources.map((source) => source.cacheKey) ?? [],
        [cursorContext],
    );

    const analysis = useMemo(() => {
        if (!descriptor) {
            return {
                suggestions: [],
                errors: [`Unsupported placeholder expression type: ${breakdown.element}`],
            };
        }

        if (!shouldAnalyze) {
            return EMPTY_ANALYSIS;
        }

        if (!cursorContext) {
            return analyzeParsedExpression(descriptor, deferredValue, parseExpressionCursorContext(descriptor, deferredValue, cursor), sourceRegistry);
        }

        return analyzeParsedExpression(descriptor, deferredValue, cursorContext, sourceRegistry);
    }, [breakdown.element, cursor, cursorContext, deferredValue, descriptor, shouldAnalyze, sourceRegistry]);

    const placeholderText = useMemo(() => {
        if (!descriptor) {
            return "Enter expression";
        }
        return `Example: ${getExpressionExample(descriptor, schema)}`;
    }, [descriptor, schema]);

    const sourceMessages = useMemo(() => {
        return collectSourceMessages(requiredSourceCacheKeys, sourceRegistry ?? EMPTY_REGISTRY);
    }, [requiredSourceCacheKeys, sourceRegistry]);
    const suggestionView = useMemo(() => buildPlaceholderSuggestionView({
        suggestions: analysis.suggestions,
        lazyOptionSource: analysis.lazyOptionSource,
        searchValue: panelSearchValue,
    }), [analysis.lazyOptionSource, analysis.suggestions, panelSearchValue]);
    const {
        activeIndex,
        setActiveIndex,
        moveActiveIndex,
        resetActiveIndex,
    } = useSearchListActiveNavigation({
        itemCount: suggestionView.renderedSuggestions.length,
    });
    const activeSuggestion = suggestionView.renderedSuggestions[activeIndex] ?? null;
    const activeDescendantId = activeSuggestion
        ? getSearchListOptionId(suggestionListboxId, getPlaceholderSuggestionKey(activeSuggestion))
        : undefined;
    const topSuggestion = useMemo(() => {
        return analysis.suggestions[0] ?? getFirstLazyOptionSuggestion(analysis.lazyOptionSource) ?? null;
    }, [analysis.lazyOptionSource, analysis.suggestions]);

    const applySuggestion = useCallback((suggestion: ExpressionSuggestion) => {
        const nextValue = `${value.slice(0, suggestion.replaceFrom)}${suggestion.insertText}${value.slice(suggestion.replaceTo)}`;
        const nextCursor = suggestion.replaceFrom + suggestion.caretOffset;
        pendingSelectionRef.current = nextCursor;
        setValue(nextValue);
        startTransition(() => {
            setOutputValue(argName, nextValue);
        });
        updateCursor(nextCursor);
    }, [argName, setOutputValue, setValue, updateCursor, value]);

    useEffect(() => {
        const pendingSelection = pendingSelectionRef.current;
        if (pendingSelection == null) {
            return;
        }

        pendingSelectionRef.current = null;
        controlRef.current?.focus();
        controlRef.current?.setSelectionRange(pendingSelection, pendingSelection);
    }, [value]);

    const assignInputRef = useCallback((node: HTMLInputElement | null) => {
        controlRef.current = node;
    }, []);

    const requestPanelInteraction = useCallback(() => {
        setHasPanelInteraction((previous) => previous ? previous : true);
    }, []);

    useEffect(() => {
        resetActiveIndex();
    }, [resetActiveIndex, suggestionView.resultKey]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.currentTarget.value;
        requestPanelInteraction();
        setValue(nextValue);
        startTransition(() => {
            setOutputValue(argName, nextValue);
        });
        updateCursor(event.currentTarget.selectionStart ?? nextValue.length);
    }, [argName, requestPanelInteraction, setOutputValue, setValue, updateCursor]);

    const syncCursor = useCallback((event: React.SyntheticEvent<HTMLInputElement>) => {
        requestPanelInteraction();
        const target = event.currentTarget;
        updateCursor(target.selectionStart ?? target.value.length);
    }, [requestPanelInteraction, updateCursor]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        const usesLocalTextNavigation = !event.altKey && !event.ctrlKey && !event.metaKey;
        if (usesLocalTextNavigation) {
            requestPanelInteraction();
        }

        if (usesLocalTextNavigation) {
            const action = getSearchListKeyboardAction({
                key: event.key,
                itemCount: suggestionView.visibleSuggestions,
                activeIndex,
                hasQuery: value.trim().length > 0,
                pageSize: PLACEHOLDER_SUGGESTION_PAGE_SIZE,
                wrapArrowUp: true,
                wrapArrowDown: true,
            });

            if (action.type === "move") {
                event.preventDefault();
                moveActiveIndex(action.nextIndex, action.align);
                return;
            }
        }

        if (isSuggestionAcceptKey(event) && (activeSuggestion ?? topSuggestion)) {
            event.preventDefault();
            applySuggestion(activeSuggestion ?? topSuggestion!);
        }
    }, [activeIndex, activeSuggestion, applySuggestion, moveActiveIndex, requestPanelInteraction, suggestionView.visibleSuggestions, topSuggestion, value]);

    const handleSuggestionPanelMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
    }, []);

    const handleFocusWithin = useCallback(() => {
        setHasFocusWithin((previous) => previous ? previous : true);
    }, []);

    const handleBlurWithin = useCallback((event: FocusEvent<HTMLDivElement>) => {
        const nextFocusedElement = event.relatedTarget;
        if (nextFocusedElement instanceof Node && (
            containerRef.current?.contains(nextFocusedElement)
            || panelRef.current?.contains(nextFocusedElement)
        )) {
            return;
        }

        setHasFocusWithin((previous) => previous ? false : previous);
        setPanelSearchValue("");
    }, []);

    const showSuggestionPanel = shouldAnalyze && hasFocusWithin && hasPanelInteraction && (
        analysis.lazyOptionSource != null || analysis.suggestions.length > 0
    );
    const hasStatusContent = Boolean(analysis.hint || analysis.errors.length > 0 || sourceMessages.length > 0);

    const updatePanelPosition = useCallback(() => {
        const anchor = controlRef.current;
        const panel = panelRef.current;
        if (!showSuggestionPanel || !anchor || !panel) {
            return;
        }

        const anchorRect = anchor.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const viewportPadding = 8;
        const desiredTop = anchorRect.bottom + 4;
        const availableBelow = window.innerHeight - desiredTop - viewportPadding;
        const availableAbove = anchorRect.top - viewportPadding - 4;
        const shouldOpenAbove = availableBelow < 180 && availableAbove > availableBelow;
        const maxHeight = Math.max(140, Math.min(320, shouldOpenAbove ? availableAbove : availableBelow));
        const measuredHeight = Math.min(panelRect.height || maxHeight, maxHeight);
        const top = shouldOpenAbove
            ? Math.max(viewportPadding, anchorRect.top - measuredHeight - 4)
            : Math.min(desiredTop, window.innerHeight - measuredHeight - viewportPadding);
        const width = Math.max(anchorRect.width, 240);
        const left = Math.min(
            Math.max(viewportPadding, anchorRect.left),
            Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
        );

        setPanelStyle({
            position: "fixed",
            top,
            left,
            width,
            maxHeight,
            visibility: "visible",
            zIndex: 90,
        });
    }, [showSuggestionPanel]);

    useLayoutEffect(() => {
        if (!showSuggestionPanel) {
            setPanelStyle((previousStyle) => (
                previousStyle.visibility === "hidden"
                    ? previousStyle
                    : HIDDEN_PANEL_STYLE
            ));
            return;
        }

        updatePanelPosition();

        const handleWindowChange = () => updatePanelPosition();
        window.addEventListener("resize", handleWindowChange);
        window.addEventListener("scroll", handleWindowChange, true);
        return () => {
            window.removeEventListener("resize", handleWindowChange);
            window.removeEventListener("scroll", handleWindowChange, true);
        };
    }, [cursor, panelSearchValue, showSuggestionPanel, updatePanelPosition, value]);

    return (
        <div
            ref={containerRef}
            className="space-y-1.5"
            onFocusCapture={handleFocusWithin}
            onBlurCapture={handleBlurWithin}
            {...{ [COMMAND_POPUP_OPEN_ATTR]: showSuggestionPanel ? "true" : "false" }}
        >
            <div>
                <Input
                    ref={assignInputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onClick={syncCursor}
                    onSelect={syncCursor}
                    spellCheck={false}
                    role={showSuggestionPanel ? "combobox" : undefined}
                    aria-autocomplete={showSuggestionPanel ? "list" : undefined}
                    aria-expanded={showSuggestionPanel ? suggestionView.visibleSuggestions > 0 : undefined}
                    aria-haspopup={showSuggestionPanel ? "listbox" : undefined}
                    aria-controls={showSuggestionPanel ? suggestionListboxId : undefined}
                    aria-activedescendant={showSuggestionPanel ? activeDescendantId : undefined}
                    {...PASSWORD_MANAGER_IGNORE_PROPS}
                    className={cn(
                        "h-6.5 bg-background px-2 text-xs font-mono",
                        (analysis.errors.length > 0 || sourceMessages.some((message) => message.kind === "error"))
                            && "border-destructive focus-visible:ring-destructive/25",
                    )}
                    placeholder={placeholderText}
                />
            </div>

            {showSuggestionPanel && typeof document !== "undefined" && createPortal(
                <div
                    ref={panelRef}
                    style={panelStyle}
                    className="overflow-hidden rounded-md border border-border/70 bg-popover shadow-xl"
                    onMouseDown={handleSuggestionPanelMouseDown}
                >
                    <div className="max-h-[inherit] overflow-y-auto">
                        <PlaceholderSuggestionPanel
                            view={suggestionView}
                            searchValue={panelSearchValue}
                            listboxId={suggestionListboxId}
                            activeIndex={activeIndex}
                            activeDescendantId={activeDescendantId}
                            onSearchValueChange={setPanelSearchValue}
                            onApplySuggestion={applySuggestion}
                            onActiveIndexChange={setActiveIndex}
                        />
                    </div>
                </div>,
                document.body,
            )}

            <div className={STATUS_SLOT_HEIGHT_CLASS}>
                {hasStatusContent ? (
                    <div className="h-full space-y-1 overflow-y-auto text-[11px]">
                        {analysis.hint && (
                            <div>
                                <div className="font-medium text-foreground">{analysis.hint.title}</div>
                                {analysis.hint.detail && <div className="text-muted-foreground">{analysis.hint.detail}</div>}
                            </div>
                        )}
                        {sourceMessages.length > 0 && (
                            <div className="space-y-1">
                                {sourceMessages.map((message) => (
                                    <div
                                        key={`${message.kind}:${message.text}`}
                                        className={cn(
                                            message.kind === "error" && "text-destructive",
                                            message.kind === "warning" && "text-amber-700",
                                            message.kind === "loading" && "text-muted-foreground",
                                        )}
                                    >
                                        {message.text}
                                    </div>
                                ))}
                            </div>
                        )}
                        {analysis.errors.length > 0 && (
                            <div className="space-y-1 text-destructive">
                                {analysis.errors.slice(0, 4).map((error) => (
                                    <div key={error}>{error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div aria-hidden="true" className="h-full" />
                )}
            </div>
        </div>
    );
}

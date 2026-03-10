import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSyncedState } from "@/utils/StateUtil";
import type { TypeBreakdown } from "@/utils/Command";
import {
    analyzeParsedExpression,
    getFirstLazyOptionSuggestion,
    isLazyOptionSourceReady,
    parseExpressionCursorContext,
    type ExpressionSuggestion,
} from "./expression/expressionAnalysis";
import type { ExpressionValueSourceRegistry } from "./expression/expressionValueFetcher";
import { getExpressionExample, getExpressionTypeSchema } from "./expression/expressionSchema";
import { useExpressionValueSources } from "./expression/expressionValueFetcher";
import { getPlaceholderExpressionDescriptor } from "./expression/expressionTypes";
import PlaceholderSuggestionPanel from "./PlaceholderSuggestionPanel";

type SourceMessage = { kind: "loading" | "warning" | "error"; text: string };

const EMPTY_SOURCE_MESSAGES: SourceMessage[] = [];
const EMPTY_REGISTRY: ExpressionValueSourceRegistry = {};

function buildSearchTokensByCacheKey(
    requiredSources: Array<{ cacheKey: string; kind: string }>,
    activeSourceRef: { cacheKey: string; kind: string } | undefined,
    activeToken: string,
    panelSearchValue: string,
): Record<string, string> {
    if (!activeSourceRef) {
        return {};
    }

    const activeSource = requiredSources.find((source) => source.cacheKey === activeSourceRef.cacheKey);
    if (!activeSource || activeSource.kind !== "query-options") {
        return {};
    }

    const workerToken = panelSearchValue.trim() || activeToken.trim();
    return { [activeSourceRef.cacheKey]: workerToken };
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
    compact,
}: {
    argName: string;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
    breakdown: TypeBreakdown;
    compact?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const descriptor = useMemo(() => getPlaceholderExpressionDescriptor(breakdown), [breakdown]);
    const [value, setValue] = useSyncedState(initialValue || "");
    const [cursor, setCursor] = useState((initialValue || "").length);
    const [hasFocusWithin, setHasFocusWithin] = useState(false);
    const [panelSearchValue, setPanelSearchValue] = useState("");
    const pendingSelectionRef = useRef<number | null>(null);

    const updateCursor = useCallback((nextCursor: number) => {
        setCursor((previousCursor) => previousCursor === nextCursor ? previousCursor : nextCursor);
    }, []);

    const schema = useMemo(
        () => (descriptor ? getExpressionTypeSchema(descriptor.rootType) : null),
        [descriptor],
    );

    const cursorContext = useMemo(() => {
        if (!descriptor) {
            return null;
        }
        return parseExpressionCursorContext(descriptor, value, cursor);
    }, [cursor, descriptor, value]);

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
        hasFocusWithin,
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

        if (!cursorContext) {
            return analyzeParsedExpression(descriptor, value, parseExpressionCursorContext(descriptor, value, cursor), sourceRegistry);
        }

        return analyzeParsedExpression(descriptor, value, cursorContext, sourceRegistry);
    }, [breakdown.element, cursor, cursorContext, descriptor, sourceRegistry, value]);

    const placeholderText = useMemo(() => {
        if (!descriptor) {
            return "Enter expression";
        }
        return `Example: ${getExpressionExample(descriptor, schema)}`;
    }, [descriptor, schema]);

    const sourceMessages = useMemo(() => {
        return collectSourceMessages(requiredSourceCacheKeys, sourceRegistry ?? EMPTY_REGISTRY);
    }, [requiredSourceCacheKeys, sourceRegistry]);

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
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(pendingSelection, pendingSelection);
    }, [value]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const nextValue = event.currentTarget.value;
        setValue(nextValue);
        startTransition(() => {
            setOutputValue(argName, nextValue);
        });
        updateCursor(event.currentTarget.selectionStart ?? nextValue.length);
    }, [argName, setOutputValue, setValue, updateCursor]);

    const syncCursor = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = event.currentTarget;
        updateCursor(target.selectionStart ?? target.value.length);
    }, [updateCursor]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
        const firstSuggestion = analysis.suggestions[0] ?? getFirstLazyOptionSuggestion(analysis.lazyOptionSource);
        if ((event.key === "Tab" || (event.key === "Enter" && event.ctrlKey)) && firstSuggestion) {
            event.preventDefault();
            applySuggestion(firstSuggestion);
        }
    }, [analysis.lazyOptionSource, analysis.suggestions, applySuggestion]);

    const handleFocusWithin = useCallback(() => {
        setHasFocusWithin((previous) => previous ? previous : true);
    }, []);

    const handleBlurWithin = useCallback((event: FocusEvent<HTMLDivElement>) => {
        const nextFocusedElement = event.relatedTarget;
        if (nextFocusedElement instanceof Node && containerRef.current?.contains(nextFocusedElement)) {
            return;
        }

        setHasFocusWithin((previous) => previous ? false : previous);
        setPanelSearchValue("");
    }, []);

    const showSuggestionPanel = hasFocusWithin && (
        analysis.lazyOptionSource
            ? isLazyOptionSourceReady(analysis.lazyOptionSource)
            : analysis.suggestions.length > 0
    );

    return (
        <div
            ref={containerRef}
            className="space-y-1.5"
            onFocusCapture={handleFocusWithin}
            onBlurCapture={handleBlurWithin}
        >
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onClick={syncCursor}
                onSelect={syncCursor}
                spellCheck={false}
                className={cn(
                    "rounded-md bg-background font-mono text-xs leading-5",
                    compact ? "min-h-16 px-2 py-1.5" : "min-h-24 px-2.5 py-2",
                    (analysis.errors.length > 0 || sourceMessages.some((message) => message.kind === "error"))
                        && "border-destructive focus-visible:ring-destructive/25",
                )}
                placeholder={placeholderText}
            />

            {showSuggestionPanel && (
                <PlaceholderSuggestionPanel
                    suggestions={analysis.suggestions}
                    lazyOptionSource={analysis.lazyOptionSource}
                    searchValue={panelSearchValue}
                    onSearchValueChange={setPanelSearchValue}
                    onApplySuggestion={applySuggestion}
                />
            )}

            {(analysis.hint || analysis.errors.length > 0 || sourceMessages.length > 0) && (
                <div className="space-y-1 text-[11px]">
                    {analysis.hint && (
                        <div>
                            <div className="font-medium text-foreground">{analysis.hint.title}</div>
                            {analysis.hint.detail && <div className="text-muted-foreground">{analysis.hint.detail}</div>}
                            {analysis.hint.meta && <div className="font-mono text-[10px] text-muted-foreground">{analysis.hint.meta}</div>}
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
            )}
        </div>
    );
}

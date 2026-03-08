import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSyncedState } from "@/utils/StateUtil";
import type { TypeBreakdown } from "@/utils/Command";
import { analyzeExpression, type ExpressionSuggestion } from "./expression/expressionAnalysis";
import { getExpressionInputConfig } from "./expression/expressionTypes";

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
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const config = useMemo(() => getExpressionInputConfig(breakdown), [breakdown]);
    const [value, setValue] = useSyncedState(initialValue || "");
    const [cursor, setCursor] = useState((initialValue || "").length);
    const [isFocused, setIsFocused] = useState(false);
    const pendingSelectionRef = useRef<number | null>(null);

    const analysis = useMemo(() => {
        if (!config) {
            return {
                suggestions: [],
                errors: [`Unsupported placeholder expression type: ${breakdown.element}`],
            };
        }
        return analyzeExpression(config, value, cursor);
    }, [breakdown.element, config, cursor, value]);

    const applySuggestion = useCallback((suggestion: ExpressionSuggestion) => {
        const nextValue = `${value.slice(0, suggestion.replaceFrom)}${suggestion.insertText}${value.slice(suggestion.replaceTo)}`;
        const nextCursor = suggestion.replaceFrom + suggestion.caretOffset;
        pendingSelectionRef.current = nextCursor;
        setValue(nextValue);
        setOutputValue(argName, nextValue);
        setCursor(nextCursor);
    }, [argName, setOutputValue, setValue, value]);

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
        setOutputValue(argName, nextValue);
        setCursor(event.currentTarget.selectionStart ?? nextValue.length);
    }, [argName, setOutputValue, setValue]);

    const syncCursor = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = event.currentTarget;
        setCursor(target.selectionStart ?? target.value.length);
    }, []);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.key === "Tab" || (event.key === "Enter" && event.ctrlKey)) && analysis.suggestions.length > 0) {
            event.preventDefault();
            applySuggestion(analysis.suggestions[0]);
        }
    }, [analysis.suggestions, applySuggestion]);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
    }, []);

    const preventButtonMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    }, []);

    const handleSuggestionClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const index = Number(event.currentTarget.dataset.index);
        const suggestion = analysis.suggestions[index];
        if (!suggestion) {
            return;
        }
        applySuggestion(suggestion);
    }, [analysis.suggestions, applySuggestion]);

    return (
        <div className="space-y-2">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onClick={syncCursor}
                onKeyUp={syncCursor}
                onSelect={syncCursor}
                onFocus={handleFocus}
                onBlur={handleBlur}
                spellCheck={false}
                className={cn(
                    "font-mono text-xs leading-5",
                    compact ? "min-h-24" : "min-h-32",
                    analysis.errors.length > 0 && "border-destructive focus-visible:ring-destructive/25",
                )}
                placeholder={config?.kind === "function-string"
                    ? "Example: {getalliance.getname} - {getscore}"
                    : config?.kind === "function-double"
                        ? "Example: {getscore} + 5"
                        : "Example: nation:Borg,#vm_turns=0"}
            />

            {isFocused && analysis.suggestions.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-2">
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Suggestions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {analysis.suggestions.map((suggestion, index) => (
                            <Button
                                key={`${suggestion.kind}:${suggestion.label}:${suggestion.insertText}`}
                                data-index={index}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="max-w-full"
                                onMouseDown={preventButtonMouseDown}
                                onClick={handleSuggestionClick}
                                title={suggestion.detail}
                            >
                                {suggestion.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {(analysis.hint || analysis.errors.length > 0) && (
                <div className="rounded-md border border-border bg-background/80 p-2 text-xs">
                    {analysis.hint && (
                        <div className="mb-1">
                            <div className="font-medium text-foreground">{analysis.hint.title}</div>
                            {analysis.hint.detail && <div className="text-muted-foreground">{analysis.hint.detail}</div>}
                            {analysis.hint.meta && <div className="mt-1 font-mono text-[11px] text-muted-foreground">{analysis.hint.meta}</div>}
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

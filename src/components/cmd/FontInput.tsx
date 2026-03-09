import { useCallback } from "react";
import { Button } from "../ui/button";
import { useSyncedStateFunc } from "@/utils/StateUtil";
import ListComponent from "./ListComponent";
import { resolveOptionMatch } from "./selectValueUtils";
import { acceptedParsedInput, handleParsedInputPaste, rejectedParsedInput, useParsedInputFeedback } from "./field/parsedInputFeedback";
import FieldMessage from "./field/FieldMessage";

type FontState = {
    base: string;
    bold: boolean;
    italic: boolean;
};

function formatFontValue(state: FontState): string {
    const parts = [state.base.trim()];
    if (state.bold) parts.push("bold");
    if (state.italic) parts.push("italic");
    return parts.filter(Boolean).join(" ");
}

function parseFontValue(input: string, options: string[]): FontState {
    const trimmed = (input || "").trim();
    if (!trimmed) {
        return { base: "", bold: false, italic: false };
    }

    const labelled = options.map((value) => ({ label: value, value }));
    const exact = resolveOptionMatch(trimmed, labelled);
    if (exact.option) {
        return { base: exact.option.value, bold: false, italic: false };
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    let bold = false;
    let italic = false;

    while (parts.length > 0) {
        const tail = parts[parts.length - 1]?.toLowerCase();
        if (tail === "bold" && !bold) {
            bold = true;
            parts.pop();
            continue;
        }
        if (tail === "italic" && !italic) {
            italic = true;
            parts.pop();
            continue;
        }
        break;
    }

    const baseCandidate = parts.join(" ").trim();
    const matched = baseCandidate ? resolveOptionMatch(baseCandidate, labelled) : null;

    return {
        base: matched?.option?.value ?? baseCandidate,
        bold,
        italic,
    };
}

function parseFontControlValue(input: string, options: string[]) {
    const trimmed = (input || "").trim();
    const parsed = parseFontValue(trimmed, options);
    if (!trimmed) {
        return acceptedParsedInput(parsed);
    }
    if (!parsed.base) {
        return rejectedParsedInput(parsed, "Expected a known font name, optionally followed by bold and/or italic.");
    }

    const labelled = options.map((value) => ({ label: value, value }));
    const matched = resolveOptionMatch(parsed.base, labelled);
    if (!matched.option) {
        return rejectedParsedInput(parsed, `Unknown font \"${parsed.base}\".`);
    }

    return acceptedParsedInput({ ...parsed, base: matched.option.value });
}

export default function FontInput({
    argName,
    initialValue,
    options,
    setOutputValue,
}: {
    argName: string;
    initialValue: string;
    options: string[];
    setOutputValue: (name: string, value: string) => void;
}) {
    const parseControlValue = useCallback((input: string) => parseFontControlValue(input, options), [options]);
    const { initialResult, parseError, clearParseError, applyParsedResult } = useParsedInputFeedback(initialValue, parseControlValue);
    const [state, setState] = useSyncedStateFunc<FontState>(initialValue, () => initialResult.value);

    const updateState = useCallback((updater: (current: FontState) => FontState) => {
        setState((current) => {
            const next = updater(current);
            clearParseError();
            setOutputValue(argName, formatFontValue(next));
            return next;
        });
    }, [argName, clearParseError, setOutputValue, setState]);

    const setBase = useCallback((_name: string, value: string) => {
        updateState((current) => ({ ...current, base: value }));
    }, [updateState]);

    const toggleBold = useCallback(() => {
        updateState((current) => ({ ...current, bold: !current.bold }));
    }, [updateState]);

    const toggleItalic = useCallback(() => {
        updateState((current) => ({ ...current, italic: !current.italic }));
    }, [updateState]);

    const handlePasteCapture = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        handleParsedInputPaste(event, {
            parse: parseControlValue,
            applyParsedResult,
            onAccept: (next) => {
                setState(next);
                setOutputValue(argName, formatFontValue(next));
            },
        });
    }, [applyParsedResult, argName, parseControlValue, setOutputValue, setState]);

    return (
        <div className="flex flex-col gap-2" onPasteCapture={handlePasteCapture}>
            <ListComponent
                argName={`${argName}-base`}
                options={options.map((value) => ({ label: value, value }))}
                isMulti={false}
                initialValue={state.base}
                setOutputValue={setBase}
            />
            <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant={state.bold ? "default" : "outline"} aria-pressed={state.bold} onClick={toggleBold}>B</Button>
                <Button type="button" size="sm" variant={state.italic ? "default" : "outline"} aria-pressed={state.italic} onClick={toggleItalic}><span className="italic">I</span></Button>
                <span className="text-xs text-muted-foreground">{formatFontValue(state) || "No font selected"}</span>
            </div>
            <FieldMessage error={parseError} />
        </div>
    );
}
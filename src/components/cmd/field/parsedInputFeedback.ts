import { useCallback, useMemo } from "react";

import { useSyncedState } from "@/utils/StateUtil";
import { getPastedText } from "../pasteUtils";

export type ParsedInputResult<T> = {
    value: T;
    accept: boolean;
    error?: string;
};

export function acceptedParsedInput<T>(value: T, error?: string): ParsedInputResult<T> {
    return {
        value,
        accept: true,
        error,
    };
}

export function rejectedParsedInput<T>(value: T, error: string): ParsedInputResult<T> {
    return {
        value,
        accept: false,
        error,
    };
}

function normalizeParsedInputText(value: string | null | undefined): string {
    return typeof value === "string" ? value : "";
}

export function useParsedInputFeedback<T>(
    initialValue: string | null | undefined,
    parseInitial: (input: string) => ParsedInputResult<T>,
) {
    const normalizedInitialValue = useMemo(() => normalizeParsedInputText(initialValue), [initialValue]);
    const initialResult = useMemo(() => parseInitial(normalizedInitialValue), [normalizedInitialValue, parseInitial]);
    const initialError = useMemo(() => {
        if (!normalizedInitialValue.trim() || !initialResult.error) {
            return "";
        }
        return initialResult.error;
    }, [initialResult.error, normalizedInitialValue]);

    const [parseError, setParseErrorState] = useSyncedState(initialError);

    const setParseError = useCallback((error?: string) => {
        setParseErrorState(error ?? "");
    }, [setParseErrorState]);

    const clearParseError = useCallback(() => {
        setParseErrorState("");
    }, [setParseErrorState]);

    const applyParsedResult = useCallback((
        result: ParsedInputResult<T>,
        onAccept: (value: T) => void,
    ) => {
        if (!result.accept) {
            setParseError(result.error);
            return false;
        }

        onAccept(result.value);
        setParseError(result.error);
        return true;
    }, [setParseError]);

    return {
        initialResult,
        parseError: parseError || undefined,
        setParseError,
        clearParseError,
        applyParsedResult,
    };
}

export function handleParsedInputPaste<T>(
    event: { preventDefault: () => void; stopPropagation: () => void; clipboardData?: { getData: (kind: string) => string } | null },
    options: {
        parse: (input: string) => ParsedInputResult<T>;
        applyParsedResult: (result: ParsedInputResult<T>, onAccept: (value: T) => void) => boolean;
        onAccept: (value: T) => void;
    },
): boolean {
    const pastedText = normalizeParsedInputText(getPastedText(event));
    if (!pastedText.trim()) {
        return false;
    }

    const parsed = options.parse(pastedText);
    if (!parsed.accept && !parsed.error) {
        return false;
    }

    event.preventDefault();
    event.stopPropagation();
    return options.applyParsedResult(parsed, options.onAccept);
}

import type { TypeBreakdown } from "./Command";

type MapEntry = { [key: string]: string };

export type MapParseResult = {
    entries: MapEntry[] | null;
    error?: string;
};

function supportsIso88591DoubleFallback(
    keyBreakdown?: TypeBreakdown,
    valueBreakdown?: TypeBreakdown,
): keyBreakdown is TypeBreakdown {
    if (!keyBreakdown || !valueBreakdown) {
        return false;
    }

    const keyOptions = keyBreakdown.getOptionData().options;
    if (!keyOptions || keyOptions.length === 0) {
        return false;
    }

    const lower = valueBreakdown.element.toLowerCase();
    return lower === "double" || lower === "number";
}

function looksLikeBinaryMapPayload(input: string): boolean {
    for (let index = 0; index < input.length; index++) {
        const code = input.charCodeAt(index);
        const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
        const isPrintableAscii = code >= 32 && code <= 126;
        if (!isPrintableAscii && !isAllowedWhitespace) {
            return true;
        }
    }

    return false;
}

function isIgnorableTextWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function trimMapText(input: string): string {
    let start = 0;
    let end = input.length;

    while (start < end && isIgnorableTextWhitespace(input[start])) {
        start++;
    }
    while (end > start && isIgnorableTextWhitespace(input[end - 1])) {
        end--;
    }

    return input.slice(start, end);
}

function parseTextMap(input: string): MapParseResult {
    const trimmedInput = trimMapText(input);
    if (!trimmedInput) {
        return { entries: null, error: "Map input was empty after trimming." };
    }

    let text = trimmedInput;
    if (text.startsWith('{') && text.endsWith('}')) {
        text = trimMapText(text.substring(1, text.length - 1));
    }

    if (!text) {
        return { entries: null, error: "Map input was empty after trimming." };
    }

    const result: MapEntry[] = [];
    let i = 0;

    function skipWhitespaceAndComma() {
        while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === ',')) {
            i++;
        }
    }

    function readString(isKey: boolean): string | null {
        if (i >= text.length) return isKey ? null : '';
        const quote = text[i];
        if (quote === '"' || quote === "'") {
            i++;
            let str = '';
            while (i < text.length) {
                if (text[i] === '\\') {
                    i++;
                    if (i < text.length) str += text[i++];
                } else if (text[i] === quote) {
                    i++;
                    return str;
                } else {
                    str += text[i++];
                }
            }
            return str;
        }

        let str = '';
        while (i < text.length) {
            const c = text[i];
            if (isKey) {
                if (c === ':' || c === '=' || c === ' ' || c === '\t' || c === '\n' || c === ',') {
                    break;
                }
                str += c;
                i++;
                continue;
            }

            if (c === ',' || c === ' ' || c === '\t' || c === '\n') {
                const lookaheadRegex = /^[\s,]*((?:"(?:[^"\\]*(?:\\.[^"\\]*)*)")|(?:'(?:[^'\\]*(?:\\.[^'\\]*)*)')|(?:[^\s:=,]+))\s*[:=]/;
                const remaining = text.substring(i);
                if (lookaheadRegex.test(remaining)) {
                    break;
                }
            }
            str += c;
            i++;
        }
        return trimMapText(str);
    }

    while (i < text.length) {
        skipWhitespaceAndComma();
        if (i >= text.length) break;

        const key = readString(true);
        if (!key) {
            break;
        }

        while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n')) {
            i++;
        }

        if (i >= text.length || (text[i] !== ':' && text[i] !== '=')) {
            return {
                entries: null,
                error: `Expected ':' or '=' after key "${key}".`,
            };
        }
        i++;

        while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n')) {
            i++;
        }

        const value = readString(false);
        if (value === null) {
            return {
                entries: null,
                error: `Missing value for key "${key}".`,
            };
        }

        result.push({ [key]: value });
    }

    if (result.length === 0) {
        return {
            entries: null,
            error: "No map entries were parsed. Expected format like key=value, one per line or comma-separated.",
        };
    }

    return { entries: result };
}

function decodeIso88591DoubleArray(input: string, keyOptions: string[]): MapParseResult {
    const expectedByteLength = keyOptions.length * 8;
    if (input.length !== expectedByteLength) {
        return {
            entries: null,
            error: `Byte fallback skipped: expected ${expectedByteLength} bytes for ${keyOptions.length} keys, received ${input.length}.`,
        };
    }

    const bytes = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index++) {
        bytes[index] = input.charCodeAt(index) & 0xff;
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const entries: MapEntry[] = [];
    for (let index = 0; index < keyOptions.length; index++) {
        const value = view.getFloat64(index * 8, false);
        if (!Number.isFinite(value)) {
            return {
                entries: null,
                error: `Byte fallback failed: value for key "${keyOptions[index]}" decoded to a non-finite number (${String(value)}).`,
            };
        }
        entries.push({ [keyOptions[index]]: value === 0 ? "" : String(value) });
    }

    return { entries };
}

export function parseMapStringDetailed(
    input?: string | null,
    keyBreakdown?: TypeBreakdown,
    valueBreakdown?: TypeBreakdown,
): MapParseResult {
    const rawInput = input ?? "";
    if (!trimMapText(rawInput)) {
        return { entries: null, error: "Input was empty." };
    }

    const isBinaryLike = looksLikeBinaryMapPayload(rawInput);
    if (supportsIso88591DoubleFallback(keyBreakdown, valueBreakdown) && isBinaryLike) {
        const keyOptions = keyBreakdown.getOptionData().options ?? [];
        const fallback = decodeIso88591DoubleArray(rawInput, keyOptions);
        if (fallback.entries) {
            return fallback;
        }
        return fallback;
    }

    return parseTextMap(rawInput);
}

export function parseMapString(input?: string | null): MapEntry[] | null {
    return parseMapStringDetailed(input).entries;
}

export function parseMapString(input: string): { [key: string]: string }[] | null {
    let text = input.trim();
    
    // Remove surrounding brackets if present
    if (text.startsWith('{') && text.endsWith('}')) {
        text = text.substring(1, text.length - 1).trim();
    }
    
    if (!text) return null;
    
    const result: { [key: string]: string }[] = [];
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
            return str; // Unclosed quote
        } else {
            // Unquoted string
            let str = '';
            while (i < text.length) {
                const c = text[i];
                if (isKey) {
                    if (c === ':' || c === '=' || c === ' ' || c === '\t' || c === '\n' || c === ',') {
                        break;
                    }
                    str += c;
                    i++;
                } else {
                    // Value
                    if (c === ',' || c === ' ' || c === '\t' || c === '\n') {
                        // Lookahead to see if this is the start of a new key
                        // A new key is optional whitespace/comma, then a string (quoted or unquoted), then optional whitespace, then : or =
                        const lookaheadRegex = /^[\s,]*((?:"(?:[^"\\]*(?:\\.[^"\\]*)*)")|(?:'(?:[^'\\]*(?:\\.[^'\\]*)*)')|(?:[^\s:=,]+))\s*[:=]/;
                        const remaining = text.substring(i);
                        if (lookaheadRegex.test(remaining)) {
                            break; // End of value
                        }
                    }
                    str += c;
                    i++;
                }
            }
            return str.trim();
        }
    }

    while (i < text.length) {
        skipWhitespaceAndComma();
        if (i >= text.length) break;

        const key = readString(true);
        if (!key) break;

        // Skip whitespace before separator
        while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n')) {
            i++;
        }

        if (i >= text.length || (text[i] !== ':' && text[i] !== '=')) {
            // Invalid format, missing separator
            break;
        }
        i++; // Skip separator

        // Skip whitespace before value
        while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n')) {
            i++;
        }

        const value = readString(false);
        if (value === null) break;

        result.push({ [key]: value });
    }

    return result.length > 0 ? result : null;
}

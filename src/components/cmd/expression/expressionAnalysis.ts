import { getTypeBreakdown, CM, STRIP_PREFIXES } from "@/utils/Command";
import { filterSelectOptions, resolveOptionMatch } from "../selectValueUtils";
import type {
    ExpressionArgument,
    ExpressionFilterField,
    ExpressionMember,
    ExpressionSelector,
    ExpressionTypeSchema,
    ExpressionValueSourceRef,
} from "./expressionSchema";
import {
    buildMemberInsert,
    getExpressionCompletionSourceRefs,
    getExpressionTypeSchema,
    getExpressionValueSourceRef,
} from "./expressionSchema";
import type {
    ExpressionValueSourceRegistry,
    ExpressionValueSourceRegistryEntry,
} from "./expressionValueFetcher";
import type { PlaceholderExpressionDescriptor } from "./expressionTypes";

export type ExpressionSuggestion = {
    label: string;
    insertText: string;
    detail?: string;
    subtext?: string;
    replaceFrom: number;
    replaceTo: number;
    caretOffset: number;
    kind: "member" | "filter" | "selector" | "option";
    sourceKind: "member" | ExpressionValueSourceRef["kind"];
};

export type ExpressionHint = {
    title: string;
    detail?: string;
    meta?: string;
};

export type ExpressionAnalysis = {
    suggestions: ExpressionSuggestion[];
    hint?: ExpressionHint;
    errors: string[];
};

export type ExpressionCursorMode =
    | "set-root"
    | "predicate-root"
    | "predicate-filter-field"
    | "predicate-operator"
    | "predicate-rhs"
    | "member-chain"
    | "function-argument"
    | "outside-braces";

export type ExpressionCursorContext = {
    mode: ExpressionCursorMode;
    rootType: string;
    receiverType: string;
    activeToken: string;
    replaceFrom: number;
    replaceTo: number;
    activeMember?: ExpressionMember;
    activeArgument?: ExpressionArgument;
    requiredSources: ExpressionValueSourceRef[];
    structuralErrors: string[];
    activeSourceRef?: ExpressionValueSourceRef;
    rootTokenContext?: RootTokenContext;
    argumentInsertPrefix?: string;
    suggestionInsertPrefix?: string;
    suggestionLabelPrefix?: string;
    usedArgumentNames?: string[];
    comparisonOperator?: string;
    needsClosingBrace?: boolean;
};

type TokenRange = {
    from: number;
    to: number;
    text: string;
};

type RootTokenContext = {
    rawText: string;
    selectorText: string;
    filterText: string;
    matchedSelector?: ExpressionSelector;
    partialSelector?: ExpressionSelector;
    selectorValue: string;
    selectorRange: TokenRange;
    valueRange: TokenRange;
    filterRange?: TokenRange;
    cursorArea: "selector" | "value" | "filter";
};

type MemberResolution = {
    typeName: string;
    member?: ExpressionMember;
    errors: string[];
};

type CallContext = {
    openParen: number;
    functionName: string;
    functionStart: number;
};

type FilterExpressionSplit = {
    expressionText: string;
    expressionCursor: number;
    operator?: string;
    operatorFrom?: number;
    operatorTo?: number;
    rhsText?: string;
    rhsCursor?: number;
};

type TopLevelOperatorMatch = {
    operator: string;
    from: number;
    to: number;
};

type ActiveBinarySegment = {
    leftText: string;
    leftStart: number;
    leftEnd: number;
    operator: TopLevelOperatorMatch;
    rightText: string;
    rightStart: number;
    rightEnd: number;
};

type MemberLookup = {
    member: ExpressionMember;
    matchedAlias: string;
};

function uniqueSources(sources: ExpressionValueSourceRef[]): ExpressionValueSourceRef[] {
    const seen = new Set<string>();
    const ordered: ExpressionValueSourceRef[] = [];
    sources.forEach((source) => {
        if (seen.has(source.cacheKey)) {
            return;
        }
        seen.add(source.cacheKey);
        ordered.push(source);
    });
    return ordered;
}

function splitTopLevel(text: string, separator: string): string[] {
    const parts: string[] = [];
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;
    let start = 0;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === "(") depthParen += 1;
        if (char === ")") depthParen = Math.max(0, depthParen - 1);
        if (char === "{") depthBrace += 1;
        if (char === "}") depthBrace = Math.max(0, depthBrace - 1);
        if (char === "[") depthBracket += 1;
        if (char === "]") depthBracket = Math.max(0, depthBracket - 1);

        if (char === separator && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
            parts.push(text.slice(start, index));
            start = index + 1;
        }
    }

    parts.push(text.slice(start));
    return parts;
}

function trimTokenRange(baseFrom: number, rawText: string): TokenRange {
    const leadingWhitespace = rawText.match(/^\s*/)?.[0].length ?? 0;
    const trailingWhitespace = rawText.match(/\s*$/)?.[0].length ?? 0;
    const from = baseFrom + leadingWhitespace;
    const to = baseFrom + rawText.length - trailingWhitespace;
    return {
        from,
        to,
        text: rawText.slice(leadingWhitespace, rawText.length - trailingWhitespace),
    };
}

function findDelimitedTokenRange(text: string, cursor: number): TokenRange {
    let from = cursor;
    while (from > 0) {
        const char = text[from - 1];
        if (char === "," || char === "\n") {
            break;
        }
        from -= 1;
    }

    let to = cursor;
    while (to < text.length) {
        const char = text[to];
        if (char === "," || char === "\n") {
            break;
        }
        to += 1;
    }

    return trimTokenRange(from, text.slice(from, to));
}

function trimTokenText(rawText: string): string {
    return trimTokenRange(0, rawText).text;
}

function findSpanAroundCursor(text: string, cursor: number, predicate: (char: string) => boolean): TokenRange {
    let from = Math.max(0, Math.min(cursor, text.length));
    while (from > 0 && predicate(text[from - 1])) {
        from -= 1;
    }

    let to = Math.max(0, Math.min(cursor, text.length));
    while (to < text.length && predicate(text[to])) {
        to += 1;
    }

    return {
        from,
        to,
        text: text.slice(from, to),
    };
}

function findValueSpan(text: string, cursor: number): TokenRange {
    const stopChars = new Set([" ", "\t", "\n", "\r", ",", "(", ")", "[", "]", "{", "}", "<", ">", "!", "=", ":", "+", "-", "*", "/"]);
    return findSpanAroundCursor(text, cursor, (char: string) => !stopChars.has(char));
}


function isIdentifierChar(char: string): boolean {
    return /[A-Za-z0-9_]/.test(char);
}
function isNumericTypeName(typeName: string): boolean {
    return ["double", "int", "integer", "long", "number"].includes(typeName.toLowerCase());
}

function isBooleanTypeName(typeName: string): boolean {
    return ["boolean", "bool"].includes(typeName.toLowerCase());
}

function isNumericLiteral(value: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function isBooleanLiteral(value: string): boolean {
    return /^(true|false|yes|no|0|1)$/i.test(value.trim());
}

function getMapValueType(typeName: string): string | undefined {
    const breakdown = getTypeBreakdown(CM, typeName);
    if (breakdown.element !== "Map") {
        return undefined;
    }
    return breakdown.child?.[1]?.element;
}

function getPreferredSourceForType(typeName: string): ExpressionValueSourceRef | undefined {
    return getExpressionCompletionSourceRefs(typeName).find((source) => source.kind !== "placeholder")
        ?? getExpressionCompletionSourceRefs(typeName)[0];
}

function stripLeadingPredicatePrefix(text: string, cursor: number): { text: string; cursor: number; offset: number } {
    const prefixMatch = text.match(/^\s*#/);
    if (!prefixMatch) {
        return { text, cursor, offset: 0 };
    }

    const offset = prefixMatch[0].length;
    return {
        text: text.slice(offset),
        cursor: Math.max(0, cursor - offset),
        offset,
    };
}

function shiftContextOffsets(context: ExpressionCursorContext, offset: number): ExpressionCursorContext {
    return {
        ...context,
        replaceFrom: context.replaceFrom + offset,
        replaceTo: context.replaceTo + offset,
    };
}

function shouldTreatOperatorAsUnary(text: string, index: number, operator: string): boolean {
    if (operator !== "+" && operator !== "-") {
        return false;
    }

    let previous = index - 1;
    while (previous >= 0 && /\s/.test(text[previous])) {
        previous -= 1;
    }

    return previous < 0 || "(,[{+-*/!<>=:".includes(text[previous]);
}

function findMatchingClose(text: string, openIndex: number, openChar: string, closeChar: string): number {
    let depth = 0;
    for (let index = openIndex; index < text.length; index += 1) {
        const char = text[index];
        if (char === openChar) {
            depth += 1;
        } else if (char === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return index;
            }
        }
    }
    return -1;
}

function selectorAcceptsValue(selector: ExpressionSelector): boolean {
    return selector.insertText.endsWith(":") || selector.insertText.endsWith("=");
}

function findMatchedSelector(text: string, selectors: ExpressionSelector[]): ExpressionSelector | undefined {
    const lowered = text.toLowerCase();
    return selectors
        .filter((selector) => lowered.startsWith(selector.insertText.toLowerCase()))
        .sort((left, right) => right.insertText.length - left.insertText.length)[0];
}

function findPartialSelector(text: string, selectors: ExpressionSelector[]): ExpressionSelector | undefined {
    const lowered = text.toLowerCase();
    return selectors.find((selector) => selector.insertText.toLowerCase().startsWith(lowered));
}

function parseRootTokenContext(token: TokenRange, cursor: number, selectors: ExpressionSelector[]): RootTokenContext {
    const cursorOffset = Math.max(0, cursor - token.from);
    const bracketIndex = token.text.indexOf("[");
    const selectorTextRaw = bracketIndex >= 0 ? token.text.slice(0, bracketIndex) : token.text;
    const filterTextRaw = bracketIndex >= 0 ? token.text.slice(bracketIndex + 1) : "";
    const selectorText = trimTokenText(selectorTextRaw);
    const matchedSelector = findMatchedSelector(selectorText, selectors);
    const partialSelector = matchedSelector ? undefined : findPartialSelector(selectorText, selectors);

    const rawValue = matchedSelector && selectorAcceptsValue(matchedSelector)
        ? selectorText.slice(matchedSelector.insertText.length)
        : "";
    const valueText = trimTokenText(rawValue);
    const valueLeadingWhitespace = rawValue.match(/^\s*/)?.[0].length ?? 0;
    const selectorLeadingWhitespace = selectorTextRaw.match(/^\s*/)?.[0].length ?? 0;
    const selectorRange: TokenRange = {
        from: token.from + selectorLeadingWhitespace,
        to: token.from + selectorLeadingWhitespace + selectorText.length,
        text: selectorText,
    };
    const valueRange: TokenRange = matchedSelector && selectorAcceptsValue(matchedSelector)
        ? {
            from: selectorRange.from + matchedSelector.insertText.length + valueLeadingWhitespace,
            to: selectorRange.from + matchedSelector.insertText.length + valueLeadingWhitespace + valueText.length,
            text: valueText,
        }
        : selectorRange;
    const filterRange = bracketIndex >= 0
        ? (() => {
            const filterBase = token.from + bracketIndex + 1;
            const fieldMatch = filterTextRaw.match(/#[a-z0-9_]*$/i);
            if (!fieldMatch) {
                return undefined;
            }
            return {
                from: filterBase + fieldMatch.index!,
                to: filterBase + fieldMatch.index! + fieldMatch[0].length,
                text: fieldMatch[0],
            } satisfies TokenRange;
        })()
        : undefined;

    const cursorArea = filterRange && cursor >= filterRange.from
        ? "filter"
        : matchedSelector && selectorAcceptsValue(matchedSelector) && cursor >= selectorRange.from + matchedSelector.insertText.length
            ? "value"
            : "selector";

    return {
        rawText: token.text,
        selectorText,
        filterText: trimTokenText(filterTextRaw),
        matchedSelector,
        partialSelector,
        selectorValue: valueText,
        selectorRange,
        valueRange,
        filterRange,
        cursorArea,
    };
}

function findBraceContext(text: string, cursor: number): { from: number; to: number } | null {
    const stack: number[] = [];
    for (let index = 0; index < cursor; index += 1) {
        if (text[index] === "{") {
            stack.push(index);
        } else if (text[index] === "}") {
            stack.pop();
        }
    }

    const from = stack.length > 0 ? stack[stack.length - 1] : undefined;
    if (from == null) {
        return null;
    }

    let to = text.length;
    for (let index = cursor; index < text.length; index += 1) {
        if (text[index] === "}") {
            to = index;
            break;
        }
    }

    return { from, to };
}

function findCurrentCall(text: string, cursor: number): CallContext | null {
    let depth = 0;

    for (let index = cursor - 1; index >= 0; index -= 1) {
        const char = text[index];
        if (char === ")") {
            depth += 1;
            continue;
        }
        if (char !== "(") {
            continue;
        }
        if (depth > 0) {
            depth -= 1;
            continue;
        }

        const nameEnd = index;
        let nameStart = index;
        while (nameStart > 0 && /[A-Za-z0-9_]/.test(text[nameStart - 1])) {
            nameStart -= 1;
        }

        const functionName = text.slice(nameStart, nameEnd).trim();
        if (!functionName) {
            return null;
        }

        return {
            openParen: index,
            functionName,
            functionStart: nameStart,
        };
    }

    return null;
}

function findCurrentMapKeyContext(text: string, cursor: number): { ownerExpression: string; token: string; replaceFrom: number; replaceTo: number } | null {
    let depth = 0;

    for (let index = cursor - 1; index >= 0; index -= 1) {
        const char = text[index];
        if (char === "]") {
            depth += 1;
            continue;
        }
        if (char !== "[") {
            continue;
        }
        if (depth > 0) {
            depth -= 1;
            continue;
        }

        const tokenSpan = findValueSpan(text.slice(index + 1, text.length), Math.max(0, cursor - index - 1));
        return {
            ownerExpression: text.slice(0, index).trim(),
            token: tokenSpan.text,
            replaceFrom: index + 1 + tokenSpan.from,
            replaceTo: index + 1 + tokenSpan.to,
        };
    }

    return null;
}

function splitFilterExpression(text: string, cursor: number): FilterExpressionSplit {
    const body = text.startsWith("#") ? text.slice(1) : text;
    const bodyCursor = Math.max(0, cursor - (text.startsWith("#") ? 1 : 0));
    const comparison = findActiveTopLevelBinarySegment(body, bodyCursor, [">=", "<=", "!=", ">", "<", "="]);
    if (comparison) {
        return {
            expressionText: trimTokenText(comparison.leftText),
            expressionCursor: Math.max(0, Math.min(bodyCursor, comparison.leftEnd) - comparison.leftStart),
            operator: comparison.operator.operator,
            operatorFrom: comparison.operator.from,
            operatorTo: comparison.operator.to,
            rhsText: comparison.rightText,
            rhsCursor: Math.max(0, bodyCursor - comparison.rightStart),
        };
    }

    return {
        expressionText: body.trim(),
        expressionCursor: bodyCursor,
    };
}

function looksLikePredicateToken(text: string): boolean {
    const trimmed = trimTokenText(text);
    if (!trimmed) {
        return false;
    }

    if (trimmed.includes("#")) {
        return true;
    }

    return findTopLevelOperators(trimmed, [">=", "<=", "!=", ">", "<", "="]).length > 0;
}

function getFilterFieldPrefixMatches(typeName: string, token: string): ExpressionFilterField[] {
    const schema = getExpressionTypeSchema(typeName);
    if (!schema) {
        return [];
    }

    const normalized = token.toLowerCase();
    return schema.filterFields.filter((field) => !normalized || field.key.startsWith(normalized));
}

function findTopLevelOperators(text: string, operators: string[]): TopLevelOperatorMatch[] {
    const matches: TopLevelOperatorMatch[] = [];
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === "(") {
            depthParen += 1;
            continue;
        }
        if (char === ")") {
            depthParen = Math.max(0, depthParen - 1);
            continue;
        }
        if (char === "{") {
            depthBrace += 1;
            continue;
        }
        if (char === "}") {
            depthBrace = Math.max(0, depthBrace - 1);
            continue;
        }
        if (char === "[") {
            depthBracket += 1;
            continue;
        }
        if (char === "]") {
            depthBracket = Math.max(0, depthBracket - 1);
            continue;
        }
        if (depthParen > 0 || depthBrace > 0 || depthBracket > 0) {
            continue;
        }

        const match = operators.find((operator) => text.startsWith(operator, index));
        if (match) {
            if (shouldTreatOperatorAsUnary(text, index, match)) {
                continue;
            }
            matches.push({ operator: match, from: index, to: index + match.length });
            index += match.length - 1;
        }
    }

    return matches;
}

function findActiveTopLevelBinarySegment(text: string, cursor: number, operators: string[]): ActiveBinarySegment | null {
    const matches = findTopLevelOperators(text, operators);
    if (matches.length === 0) {
        return null;
    }

    const activeMatch = matches.find((match, index) => {
        const prevEnd = index === 0 ? 0 : matches[index - 1].to;
        const nextStart = index === matches.length - 1 ? text.length : matches[index + 1].from;
        return cursor >= prevEnd && cursor <= nextStart;
    }) ?? matches[0];

    return {
        leftText: text.slice(0, activeMatch.from),
        leftStart: 0,
        leftEnd: activeMatch.from,
        operator: activeMatch,
        rightText: text.slice(activeMatch.to),
        rightStart: activeMatch.to,
        rightEnd: text.length,
    };
}

function createEmptyTokenRange(position: number): TokenRange {
    return {
        from: position,
        to: position,
        text: "",
    };
}

function isScalarArgumentBreakdown(breakdown: ExpressionArgument["breakdown"]): boolean {
    return !["Predicate", "TypedFunction", "Set", "Map", "List"].includes(breakdown.element);
}

function collectUsedArgumentNames(member: ExpressionMember, argsText: string): string[] {
    const used = new Set<string>();
    const segments = splitTopLevel(argsText, ",").map((segment) => segment.trim()).filter(Boolean);
    segments.forEach((segment, index) => {
        const colonIndex = segment.indexOf(":");
        if (colonIndex >= 0) {
            const name = segment.slice(0, colonIndex).trim();
            if (member.arguments.some((arg) => arg.name === name)) {
                used.add(name);
            }
            return;
        }

        const positionalArg = member.arguments[index];
        if (positionalArg) {
            used.add(positionalArg.name);
        }
    });
    return Array.from(used);
}

function getScalarArgumentSuffixContext(rawValue: string, cursorOffset: number): {
    completedValueEnd: number;
    replaceFromOffset: number;
    replaceToOffset: number;
    activeToken: string;
} | null {
    const leadingWhitespace = rawValue.match(/^\s*/)?.[0].length ?? 0;
    let tokenEnd = leadingWhitespace;
    while (tokenEnd < rawValue.length && !/\s/.test(rawValue[tokenEnd])) {
        tokenEnd += 1;
    }

    if (tokenEnd <= leadingWhitespace) {
        return null;
    }

    let gapEnd = tokenEnd;
    while (gapEnd < rawValue.length && /\s/.test(rawValue[gapEnd])) {
        gapEnd += 1;
    }

    if (gapEnd === tokenEnd || cursorOffset < tokenEnd) {
        return null;
    }

    return {
        completedValueEnd: tokenEnd,
        replaceFromOffset: tokenEnd,
        replaceToOffset: rawValue.length,
        activeToken: rawValue.slice(gapEnd).trim(),
    };
}

function getComparisonOperators(typeName: string): string[] {
    if (isNumericTypeName(typeName)) {
        return [">=", "<=", ">", "<", "=", "!="];
    }

    if (isBooleanTypeName(typeName)) {
        return ["=", "!="];
    }

    return ["=", "!="];
}

function needsPredicateRightHandSide(typeName: string): boolean {
    return !isNumericTypeName(typeName) && !isBooleanTypeName(typeName);
}

function findPostExpressionContinuationContext(text: string, cursor: number): {
    expressionText: string;
    token: string;
    replaceFrom: number;
    replaceTo: number;
} | null {
    let expressionEnd = cursor;
    while (expressionEnd > 0 && /\s/.test(text[expressionEnd - 1])) {
        expressionEnd -= 1;
    }

    if (expressionEnd <= 0) {
        return null;
    }

    const endChar = text[expressionEnd - 1];
    if (!(endChar === ")" || endChar === "]")) {
        return null;
    }

    const suffix = text.slice(expressionEnd, cursor);
    if (suffix.includes(".") || suffix.includes("[") || suffix.includes(",") || suffix.includes("=") || suffix.includes(">") || suffix.includes("<")) {
        return null;
    }

    return {
        expressionText: text.slice(0, expressionEnd).trim(),
        token: suffix.trim(),
        replaceFrom: expressionEnd,
        replaceTo: cursor,
    };
}

function findCurrentArgumentSegment(text: string, openParen: number, cursor: number): { from: number; to: number; text: string; name?: string; valueFrom: number; index: number; hasNamedArguments: boolean } {
    let depthParen = 0;
    let depthBrace = 0;
    let segmentFrom = openParen + 1;
    let segmentTo = text.length;
    let argumentIndex = 0;
    let hasNamedArguments = false;

    for (let index = openParen + 1; index < cursor; index += 1) {
        const char = text[index];
        if (char === "(") depthParen += 1;
        if (char === ")") depthParen = Math.max(0, depthParen - 1);
        if (char === "{") depthBrace += 1;
        if (char === "}") depthBrace = Math.max(0, depthBrace - 1);
        if (char === ":" && depthParen === 0 && depthBrace === 0) {
            hasNamedArguments = true;
        }
        if (char === "," && depthParen === 0 && depthBrace === 0) {
            segmentFrom = index + 1;
            argumentIndex += 1;
            hasNamedArguments = false;
        }
    }

    depthParen = 0;
    depthBrace = 0;
    for (let index = cursor; index < text.length; index += 1) {
        const char = text[index];
        if (char === "(") depthParen += 1;
        if (char === ")") {
            if (depthParen === 0 && depthBrace === 0) {
                segmentTo = index;
                break;
            }
            depthParen = Math.max(0, depthParen - 1);
        }
        if (char === "{") depthBrace += 1;
        if (char === "}") depthBrace = Math.max(0, depthBrace - 1);
        if (char === "," && depthParen === 0 && depthBrace === 0) {
            segmentTo = index;
            break;
        }
    }

    const segmentText = text.slice(segmentFrom, segmentTo);
    const colonIndex = segmentText.indexOf(":");
    if (colonIndex < 0) {
        return {
            from: segmentFrom,
            to: segmentTo,
            text: segmentText,
            valueFrom: segmentFrom,
            index: argumentIndex,
            hasNamedArguments,
        };
    }

    return {
        from: segmentFrom,
        to: segmentTo,
        text: segmentText,
        name: segmentText.slice(0, colonIndex).trim(),
        valueFrom: segmentFrom + colonIndex + 1,
        index: argumentIndex,
        hasNamedArguments,
    };
}

function normalizeIdentifier(value: string): string {
    return value.trim().toLowerCase();
}

function stripMemberPrefix(name: string): string {
    const lowered = normalizeIdentifier(name);
    for (const prefix of STRIP_PREFIXES) {
        if (lowered.startsWith(prefix) && lowered.length > prefix.length) {
            return lowered.slice(prefix.length);
        }
    }
    return lowered;
}

function getMemberAliases(member: ExpressionMember): string[] {
    const lowered = normalizeIdentifier(member.name);
    const aliases = new Set<string>([lowered, stripMemberPrefix(lowered)]);
    return Array.from(aliases).filter(Boolean);
}

function resolveExactMember(schema: ExpressionTypeSchema | null, token: string): MemberLookup | null {
    if (!schema) {
        return null;
    }

    const normalized = normalizeIdentifier(token);
    if (!normalized) {
        return null;
    }

    for (const member of schema.members) {
        const alias = getMemberAliases(member).find((candidate) => candidate === normalized);
        if (alias) {
            return { member, matchedAlias: alias };
        }
    }

    return null;
}

function resolvePrefixMembers(schema: ExpressionTypeSchema | null, token: string): MemberLookup[] {
    if (!schema) {
        return [];
    }

    const normalized = normalizeIdentifier(token);
    const results: MemberLookup[] = [];
    schema.members.forEach((member) => {
        const alias = getMemberAliases(member).find((candidate) => !normalized || candidate.startsWith(normalized));
        if (alias) {
            results.push({ member, matchedAlias: alias });
        }
    });
    return results;
}

function resolvePathExpression(rootType: string, text: string, allowPartialLastSegment: boolean = false): MemberResolution {
    const errors: string[] = [];
    let typeName = rootType;
    const parts = splitTopLevel(text, ".").map((part) => part.trim()).filter(Boolean);
    let lastMember: ExpressionMember | undefined;

    for (const [index, part] of parts.entries()) {
        const nameMatch = part.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
        if (!nameMatch) {
            break;
        }

        const schema = getExpressionTypeSchema(typeName);
        if (!schema) {
            break;
        }

        const memberLookup = resolveExactMember(schema, nameMatch[1]);
        if (!memberLookup) {
            const isLastSegment = index === parts.length - 1;
            if (allowPartialLastSegment && isLastSegment) {
                return { typeName, errors };
            }
            errors.push(`Unknown member \`${nameMatch[1]}\` on ${typeName}`);
            return { typeName, errors };
        }
        const member = memberLookup.member;

        let rest = part.slice(nameMatch[0].length).trim();

        if (rest.startsWith("(")) {
            const closeParen = findMatchingClose(rest, 0, "(", ")");
            if (closeParen < 0) {
                if (allowPartialLastSegment && index === parts.length - 1) {
                    return { typeName, member, errors: Array.from(new Set(errors)) };
                }
                errors.push(`Unclosed argument list for ${member.name}`);
                return { typeName, member, errors: Array.from(new Set(errors)) };
            }

            const argsText = rest.slice(1, closeParen);
            const args = splitTopLevel(argsText, ",").map((arg) => arg.trim()).filter(Boolean);
            const usedArguments = new Set<string>();
            for (const [argIndex, arg] of args.entries()) {
                const colonIndex = arg.indexOf(":");
                const argName = colonIndex >= 0 ? arg.slice(0, colonIndex).trim() : undefined;
                const argValue = colonIndex >= 0 ? arg.slice(colonIndex + 1).trim() : arg.trim();
                const argDef = argName
                    ? member.arguments.find((candidate) => candidate.name === argName)
                    : member.arguments[argIndex];
                if (!argDef) {
                    errors.push(argName
                        ? `Unknown argument \`${argName}\` for ${member.name}`
                        : `Unknown positional argument ${argIndex + 1} for ${member.name}`);
                    continue;
                }
                usedArguments.add(argDef.name);
                errors.push(...validateNestedArgument(argDef, argValue));
            }

            member.arguments
                .filter((arg) => !arg.optional)
                .forEach((arg) => {
                    if (!usedArguments.has(arg.name)) {
                        errors.push(`Missing required argument \`${arg.name}\` for ${member.name}`);
                    }
                });

            rest = rest.slice(closeParen + 1).trim();
        }

        typeName = member.returnType;
        lastMember = member;

        while (rest.startsWith("[")) {
            const closeBracket = findMatchingClose(rest, 0, "[", "]");
            if (closeBracket < 0) {
                if (allowPartialLastSegment && index === parts.length - 1) {
                    return { typeName, member: lastMember, errors: Array.from(new Set(errors)) };
                }
                errors.push(`Unclosed map key access on ${typeName}`);
                return { typeName, member: lastMember, errors: Array.from(new Set(errors)) };
            }

            const mapValueType = getMapValueType(typeName);
            if (!mapValueType) {
                errors.push(`Type ${typeName} does not support key access.`);
                return { typeName, member: lastMember, errors: Array.from(new Set(errors)) };
            }

            typeName = mapValueType;
            rest = rest.slice(closeBracket + 1).trim();
        }

        if (rest.length > 0) {
            if (allowPartialLastSegment && index === parts.length - 1) {
                return { typeName, member: lastMember, errors: Array.from(new Set(errors)) };
            }
            errors.push(`Could not parse expression segment \`${part}\``);
            return { typeName, member: lastMember, errors: Array.from(new Set(errors)) };
        }
    }

    return {
        typeName,
        member: lastMember,
        errors: Array.from(new Set(errors)),
    };
}

function resolveExpressionType(rootType: string, text: string, allowPartialLastSegment: boolean = false): MemberResolution {
    const normalizedText = trimTokenText(text).replace(/^#/, "");
    const trimmed = trimTokenText(normalizedText);
    if (!trimmed) {
        return { typeName: rootType, errors: [] };
    }

    if (isNumericLiteral(trimmed)) {
        return { typeName: "Double", errors: [] };
    }

    if (isBooleanLiteral(trimmed)) {
        return { typeName: "Boolean", errors: [] };
    }

    const arithmetic = findActiveTopLevelBinarySegment(trimmed, trimmed.length, ["+", "-", "*", "/"]);
    if (arithmetic) {
        const leftResolution = resolveExpressionType(rootType, arithmetic.leftText, allowPartialLastSegment);
        const rightResolution = resolveExpressionType(rootType, arithmetic.rightText, allowPartialLastSegment);
        const errors = [...leftResolution.errors, ...rightResolution.errors];
        const leftIsNumeric = trimTokenText(arithmetic.leftText).length === 0 || isNumericTypeName(leftResolution.typeName);
        const rightIsNumeric = trimTokenText(arithmetic.rightText).length === 0 || isNumericTypeName(rightResolution.typeName);
        if (!leftIsNumeric || !rightIsNumeric) {
            errors.push("Arithmetic expressions require numeric operands.");
        }
        return {
            typeName: "Double",
            member: rightResolution.member ?? leftResolution.member,
            errors: Array.from(new Set(errors)),
        };
    }

    return resolvePathExpression(rootType, trimmed, allowPartialLastSegment);
}

function shouldUseInferredValueType(rootType: string, text: string, inferredType?: string): boolean {
    if (!inferredType) {
        return false;
    }

    const trimmed = trimTokenText(text);
    if (!trimmed) {
        return true;
    }

    if (findTopLevelOperators(trimmed, ["+", "-", "*", "/"]).length > 0 || trimmed.includes(".") || trimmed.includes("(") || trimmed.includes("[")) {
        return false;
    }

    if (isNumericLiteral(trimmed) || isBooleanLiteral(trimmed)) {
        return true;
    }

    const rootSchema = getExpressionTypeSchema(rootType);
    if (resolveExactMember(rootSchema, trimmed)) {
        return false;
    }

    const inferredSource = getPreferredSourceForType(inferredType);
    if (inferredSource && inferredSource.kind !== "placeholder") {
        return true;
    }

    return resolvePrefixMembers(rootSchema, trimmed).length === 0;
}

function parseLeafExpressionTextContext(rootType: string, text: string, cursor: number, inferredType?: string): ExpressionCursorContext {
    if (shouldUseInferredValueType(rootType, text, inferredType)) {
        const tokenSpan = findValueSpan(text, cursor);
        const receiverType = inferredType!;
        const activeSourceRef = getPreferredSourceForType(receiverType);
        return createContext({
            mode: "member-chain",
            rootType,
            receiverType,
            activeToken: tokenSpan.text.trim(),
            replaceFrom: tokenSpan.from,
            replaceTo: tokenSpan.to,
            requiredSources: getExpressionCompletionSourceRefs(receiverType),
            structuralErrors: [],
            activeSourceRef,
        });
    }

    const call = findCurrentCall(text, cursor);
    if (call) {
        const argumentContext = parseArgumentContext(rootType, text, cursor, call);
        if (argumentContext) {
            return argumentContext;
        }
    }

    const continuationContext = findPostExpressionContinuationContext(text, cursor);
    if (continuationContext) {
        const resolution = resolveExpressionType(rootType, continuationContext.expressionText, true);
        const continuationSource = getExpressionValueSourceRef(resolution.typeName);
        if (continuationSource.kind === "placeholder") {
            return createContext({
                mode: "member-chain",
                rootType,
                receiverType: resolution.typeName,
                activeToken: continuationContext.token,
                replaceFrom: continuationContext.replaceFrom,
                replaceTo: continuationContext.replaceTo,
                activeMember: resolution.member,
                requiredSources: [continuationSource],
                structuralErrors: resolution.errors,
                activeSourceRef: continuationSource,
                suggestionInsertPrefix: ".",
                suggestionLabelPrefix: ".",
            });
        }
    }

    const mapKeyContext = findCurrentMapKeyContext(text, cursor);
    if (mapKeyContext) {
        const ownerResolution = mapKeyContext.ownerExpression
            ? resolveExpressionType(rootType, mapKeyContext.ownerExpression, true)
            : { typeName: rootType, member: undefined, errors: [] };
        const activeSourceRef = getExpressionValueSourceRef(ownerResolution.typeName);
        return createContext({
            mode: "member-chain",
            rootType,
            receiverType: ownerResolution.typeName,
            activeToken: mapKeyContext.token,
            replaceFrom: mapKeyContext.replaceFrom,
            replaceTo: mapKeyContext.replaceTo,
            activeMember: ownerResolution.member,
            requiredSources: [activeSourceRef],
            structuralErrors: ownerResolution.errors,
            activeSourceRef,
        });
    }

    const chain = getTokenAfterDot(text, cursor);
    const ownerResolution = chain.ownerExpression
        ? resolveExpressionType(rootType, chain.ownerExpression, true)
        : { typeName: rootType, member: undefined, errors: [] };
    const activeSourceRef = getExpressionValueSourceRef(ownerResolution.typeName);

    return createContext({
        mode: "member-chain",
        rootType,
        receiverType: ownerResolution.typeName,
        activeToken: chain.token,
        replaceFrom: chain.replaceFrom,
        replaceTo: chain.replaceTo,
        activeMember: ownerResolution.member,
        requiredSources: [activeSourceRef],
        structuralErrors: ownerResolution.errors,
        activeSourceRef,
    });
}

function parseValueExpressionContext(rootType: string, text: string, cursor: number, inferredType?: string): ExpressionCursorContext {
    const prefixed = stripLeadingPredicatePrefix(text, cursor);
    if (prefixed.offset > 0) {
        // An explicit # starts a new root-member expression even inside nested arithmetic.
        return shiftContextOffsets(parseValueExpressionContext(rootType, prefixed.text, prefixed.cursor), prefixed.offset);
    }

    const arithmetic = findActiveTopLevelBinarySegment(text, cursor, ["+", "-", "*", "/"]);
    if (arithmetic) {
        const onRight = cursor >= arithmetic.operator.to;
        const segmentText = onRight ? arithmetic.rightText : arithmetic.leftText;
        const segmentStart = onRight ? arithmetic.rightStart : arithmetic.leftStart;
        const segmentCursor = Math.max(0, cursor - segmentStart);
        const siblingText = onRight ? arithmetic.leftText : arithmetic.rightText;
        const siblingType = trimTokenText(siblingText)
            ? resolveExpressionType(rootType, siblingText, true).typeName
            : inferredType;
        return shiftContextOffsets(parseValueExpressionContext(rootType, segmentText, segmentCursor, siblingType), segmentStart);
    }

    return parseLeafExpressionTextContext(rootType, text, cursor, inferredType);
}

function resolveMemberChain(rootType: string, text: string, allowPartialLastSegment: boolean = false): MemberResolution {
    return resolveExpressionType(rootType, text, allowPartialLastSegment);
}

function collectFilterFieldErrors(typeName: string, text: string): string[] {
    const schema = getExpressionTypeSchema(typeName);
    if (!schema) {
        return [];
    }

    const knownFields = new Set(schema.filterFields.map((field) => field.key));
    const knownPrefixes = schema.filterFields.map((field) => field.key);
    const errors: string[] = [];
    for (const match of text.matchAll(/#[a-z0-9_]+/gi)) {
        const key = match[0].toLowerCase();
        if (!knownFields.has(key) && !knownPrefixes.some((field) => field.startsWith(key))) {
            errors.push(`Unknown filter field \`${key}\` for ${typeName}`);
        }
    }
    return errors;
}

function validateNestedArgument(argDef: ExpressionArgument, value: string): string[] {
    if (!value) {
        return [];
    }

    const breakdown = argDef.breakdown;
    if (breakdown.element === "Predicate" && breakdown.child?.[0]?.element) {
        const trimmed = value.trim();
        if (trimmed.startsWith("#")) {
            const split = splitFilterExpression(trimmed, trimmed.length);
            const lhsErrors = resolveExpressionType(breakdown.child[0].element, split.expressionText, true).errors;
            const rhsErrors = split.rhsText?.trim()
                ? resolveExpressionType(breakdown.child[0].element, split.rhsText, true).errors
                : [];
            return Array.from(new Set([...lhsErrors, ...rhsErrors]));
        }
        return [];
    }

    if (breakdown.element === "TypedFunction" && breakdown.child?.[0]?.element) {
        return resolveExpressionType(breakdown.child[0].element, value).errors;
    }

    return [];
}

function collectFunctionErrors(
    descriptor: PlaceholderExpressionDescriptor,
    value: string,
    activeBraceContext?: { from: number; to: number } | null,
): string[] {
    const errors: string[] = [];
    const braceMatches = value.match(/\{/g)?.length ?? 0;
    const closingBraceMatches = value.match(/\}/g)?.length ?? 0;
    if (braceMatches !== closingBraceMatches) {
        errors.push("Unbalanced braces in expression text");
    }

    const regex = /\{([^}]*)\}/g;
    for (const match of value.matchAll(regex)) {
        const matchStart = match.index ?? -1;
        const matchEnd = matchStart >= 0 ? matchStart + match[0].length - 1 : -1;
        const isActiveMatch = activeBraceContext
            && matchStart === activeBraceContext.from
            && matchEnd === activeBraceContext.to;
        errors.push(...resolveExpressionType(descriptor.rootType, match[1].trim(), Boolean(isActiveMatch)).errors);
    }
    return Array.from(new Set(errors));
}

function createContext(base: Omit<ExpressionCursorContext, "requiredSources"> & { requiredSources?: ExpressionValueSourceRef[] }): ExpressionCursorContext {
    return {
        ...base,
        requiredSources: uniqueSources(base.requiredSources ?? []),
    };
}

function parseRootContext(descriptor: PlaceholderExpressionDescriptor, value: string, cursor: number): ExpressionCursorContext {
    const token = findDelimitedTokenRange(value, cursor);
    if (looksLikePredicateToken(token.text)) {
        return parsePredicateExpressionContext(descriptor.rootType, token, cursor);
    }

    const schema = getExpressionTypeSchema(descriptor.rootType);
    const rootToken = parseRootTokenContext(token, cursor, schema?.selectors ?? []);
    const rootSources = descriptor.rootValueSources;
    const placeholderSource = rootSources.find((source) => source.kind === "placeholder");

    return createContext({
        mode: descriptor.kind === "set" ? "set-root" : "predicate-root",
        rootType: descriptor.rootType,
        receiverType: descriptor.rootType,
        activeToken: rootToken.cursorArea === "value" ? rootToken.selectorValue : rootToken.selectorText,
        replaceFrom: rootToken.cursorArea === "value" ? rootToken.valueRange.from : rootToken.selectorRange.from,
        replaceTo: rootToken.cursorArea === "value" ? rootToken.valueRange.to : rootToken.selectorRange.to,
        requiredSources: rootSources,
        structuralErrors: [],
        activeSourceRef: rootToken.cursorArea === "value"
            ? rootSources.find((source) => source.kind !== "placeholder") ?? placeholderSource
            : placeholderSource ?? rootSources[0],
        rootTokenContext: rootToken,
    });
}

function getTokenAfterDot(text: string, cursor: number): { ownerExpression: string; token: string; replaceFrom: number; replaceTo: number } {
    const tokenSpan = findSpanAroundCursor(text, cursor, isIdentifierChar);
    const lastDotIndex = text.lastIndexOf(".", Math.max(0, tokenSpan.from - 1));
    return {
        ownerExpression: lastDotIndex >= 0 ? text.slice(0, lastDotIndex).trim() : "",
        token: tokenSpan.text,
        replaceFrom: tokenSpan.from,
        replaceTo: tokenSpan.to,
    };
}

function parseArgumentContext(
    rootType: string,
    text: string,
    cursor: number,
    call: CallContext,
): ExpressionCursorContext | null {
    const ownerPrefix = text.slice(0, call.functionStart).replace(/\.$/, "");
    const ownerType = ownerPrefix ? resolveExpressionType(rootType, ownerPrefix, true).typeName : rootType;
    const ownerSchema = getExpressionTypeSchema(ownerType);
    const memberLookup = resolveExactMember(ownerSchema, call.functionName);
    if (!memberLookup) {
        return null;
    }
    const member = memberLookup.member;

    const currentArg = findCurrentArgumentSegment(text, call.openParen, cursor);
    const namedArg = currentArg.name
        ? member.arguments.find((arg) => arg.name === currentArg.name)
        : member.arguments[currentArg.index];
    const errors = [...resolveExpressionType(rootType, text, true).errors];
    if (currentArg.name && !namedArg) {
        errors.push(`Unknown argument \`${currentArg.name}\` for ${member.name}`);
        return createContext({
            mode: "function-argument",
            rootType,
            receiverType: ownerType,
            activeToken: currentArg.text.trim(),
            replaceFrom: currentArg.from,
            replaceTo: currentArg.to,
            activeMember: member,
            structuralErrors: Array.from(new Set(errors)),
        });
    }

    if (!namedArg) {
        return createContext({
            mode: "function-argument",
            rootType,
            receiverType: ownerType,
            activeToken: currentArg.text.trim(),
            replaceFrom: currentArg.from,
            replaceTo: currentArg.to,
            activeMember: member,
            structuralErrors: Array.from(new Set(errors)),
        });
    }

    const rawValue = text.slice(currentArg.valueFrom, currentArg.to);
    const valueSpan = findValueSpan(rawValue, Math.max(0, cursor - currentArg.valueFrom));
    const valueText = valueSpan.text;
    const valueOffset = currentArg.valueFrom;
    const valueBreakdown = namedArg.breakdown;
    const receiverType = valueBreakdown.child?.[0]?.element ?? valueBreakdown.element;
    const shouldInsertNamedArgument = !currentArg.name && (currentArg.index === 0 || currentArg.hasNamedArguments);
    const argumentInsertPrefix = shouldInsertNamedArgument ? `${namedArg.name}: ` : undefined;

    if (currentArg.name && isScalarArgumentBreakdown(valueBreakdown)) {
        const suffixContext = getScalarArgumentSuffixContext(rawValue, Math.max(0, cursor - currentArg.valueFrom));
        if (suffixContext) {
            return createContext({
                mode: "function-argument",
                rootType,
                receiverType: ownerType,
                activeToken: suffixContext.activeToken,
                replaceFrom: currentArg.valueFrom + suffixContext.replaceFromOffset,
                replaceTo: currentArg.valueFrom + suffixContext.replaceToOffset,
                activeMember: member,
                requiredSources: [],
                structuralErrors: Array.from(new Set(errors)),
                suggestionInsertPrefix: ", ",
                usedArgumentNames: collectUsedArgumentNames(member, text.slice(call.openParen + 1, currentArg.valueFrom + suffixContext.completedValueEnd)),
            });
        }
    }

    const trimmedValueRange = rawValue.trim().length > 0
        ? trimTokenRange(valueOffset, rawValue)
        : createEmptyTokenRange(currentArg.to);
    const replaceFrom = argumentInsertPrefix
        ? currentArg.from
        : isScalarArgumentBreakdown(valueBreakdown)
            ? trimmedValueRange.from
            : valueOffset + valueSpan.from;
    const replaceTo = argumentInsertPrefix
        ? currentArg.to
        : isScalarArgumentBreakdown(valueBreakdown)
            ? currentArg.to
            : valueOffset + valueSpan.to;

    if (valueBreakdown.element === "Predicate") {
        const trimmedRawValue = trimTokenRange(0, rawValue);
        if (trimmedRawValue.text.startsWith("#")) {
            const predicateContext = parsePredicateExpressionContext(
                receiverType,
                trimmedRawValue,
                Math.max(0, cursor - currentArg.valueFrom),
            );
            return createContext({
                ...predicateContext,
                replaceFrom: argumentInsertPrefix
                    ? currentArg.from
                    : currentArg.valueFrom + predicateContext.replaceFrom,
                replaceTo: argumentInsertPrefix
                    ? currentArg.to
                    : currentArg.valueFrom + predicateContext.replaceTo,
                activeMember: member,
                activeArgument: namedArg,
                structuralErrors: Array.from(new Set([...errors, ...predicateContext.structuralErrors])),
                argumentInsertPrefix,
            });
        }

        const receiverSources = getExpressionCompletionSourceRefs(receiverType);
        const nestedSchema = getExpressionTypeSchema(receiverType);
        const token = trimTokenRange(0, valueText);
        const rootToken = parseRootTokenContext(token, Math.max(0, cursor - valueOffset - valueSpan.from), nestedSchema?.selectors ?? []);
        const placeholderSource = receiverSources.find((source) => source.kind === "placeholder");

        if (rootToken.cursorArea === "filter" && rootToken.filterRange) {
            return createContext({
                mode: "function-argument",
                rootType,
                receiverType,
                activeToken: rootToken.filterRange.text,
                replaceFrom,
                replaceTo,
                activeMember: member,
                activeArgument: namedArg,
                requiredSources: receiverSources,
                structuralErrors: Array.from(new Set(errors)),
                activeSourceRef: placeholderSource,
                rootTokenContext: rootToken,
                argumentInsertPrefix,
            });
        }

        return createContext({
            mode: "function-argument",
            rootType,
            receiverType,
            activeToken: rootToken.cursorArea === "value" ? rootToken.selectorValue : rootToken.selectorText,
            replaceFrom,
            replaceTo,
            activeMember: member,
            activeArgument: namedArg,
            requiredSources: receiverSources,
            structuralErrors: Array.from(new Set(errors)),
            activeSourceRef: rootToken.cursorArea === "value"
                ? receiverSources.find((source) => source.kind !== "placeholder") ?? placeholderSource
                : placeholderSource ?? receiverSources[0],
            rootTokenContext: rootToken,
            argumentInsertPrefix,
        });
    }

    if (valueBreakdown.element === "TypedFunction" && valueBreakdown.child?.[0]) {
        const nestedContext = parseValueExpressionContext(receiverType, valueText, Math.max(0, cursor - valueOffset - valueSpan.from));
        return createContext({
            ...shiftContextOffsets(nestedContext, valueOffset + valueSpan.from),
            mode: "function-argument",
            rootType,
            activeMember: member,
            activeArgument: namedArg,
            structuralErrors: Array.from(new Set([...errors, ...nestedContext.structuralErrors])),
            argumentInsertPrefix,
        });
    }

    return createContext({
        mode: "function-argument",
        rootType,
        receiverType,
        activeToken: valueText.trim(),
        replaceFrom,
        replaceTo,
        activeMember: member,
        activeArgument: namedArg,
        requiredSources: [namedArg.valueSourceRef],
        structuralErrors: Array.from(new Set(errors)),
        activeSourceRef: namedArg.valueSourceRef,
        argumentInsertPrefix,
    });
}

function parseExpressionTextContext(rootType: string, text: string, cursor: number): ExpressionCursorContext {
    return parseValueExpressionContext(rootType, text, cursor);
}

function parsePredicateExpressionContext(rootType: string, token: TokenRange, cursor: number): ExpressionCursorContext {
    const split = splitFilterExpression(token.text, cursor - token.from);
    if (split.operator && split.operatorFrom != null && split.operatorTo != null) {
        const lhsResolution = resolveExpressionType(rootType, split.expressionText, true);
        const rhsResolution = split.rhsText?.trim()
            ? resolveExpressionType(rootType, split.rhsText, true)
            : { typeName: "", errors: [] };
        const comparisonType = lhsResolution.typeName || rhsResolution.typeName || rootType;
        const operatorRange: TokenRange = {
            from: token.from + 1 + split.operatorFrom,
            to: token.from + 1 + split.operatorTo,
            text: split.operator,
        };
        const rhsBase = token.from + 1 + split.operatorTo;
        const rhsRange = split.rhsText && split.rhsText.trim().length > 0
            ? trimTokenRange(rhsBase, split.rhsText)
            : createEmptyTokenRange(rhsBase + (split.rhsText?.match(/^\s*/)?.[0].length ?? 0));

        if (cursor >= operatorRange.from && cursor < operatorRange.to) {
            return createContext({
                mode: "predicate-operator",
                rootType,
                receiverType: comparisonType,
                activeToken: split.operator,
                replaceFrom: operatorRange.from,
                replaceTo: operatorRange.to,
                activeMember: lhsResolution.member,
                structuralErrors: Array.from(new Set([...lhsResolution.errors, ...rhsResolution.errors])),
                comparisonOperator: split.operator,
            });
        }

        const cursorInRight = cursor >= rhsBase;
        const activeContext = cursorInRight
            ? parseValueExpressionContext(rootType, split.rhsText ?? "", split.rhsCursor ?? 0, lhsResolution.typeName)
            : parseValueExpressionContext(rootType, split.expressionText, split.expressionCursor, rhsResolution.typeName || undefined);

        const shiftedActiveContext = shiftContextOffsets(activeContext, cursorInRight ? rhsBase : token.from + 1);
        const shouldKeepStructuredMode = Boolean(
            activeContext.activeMember
            || activeContext.activeArgument
            || activeContext.activeSourceRef?.kind === "placeholder"
            || activeContext.suggestionInsertPrefix
            || activeContext.suggestionLabelPrefix,
        );

        return createContext({
            ...shiftedActiveContext,
            mode: cursorInRight && !shouldKeepStructuredMode ? "predicate-rhs" : activeContext.mode,
            rootType,
            comparisonOperator: split.operator,
            structuralErrors: Array.from(new Set([
                ...lhsResolution.errors,
                ...rhsResolution.errors,
                ...activeContext.structuralErrors,
            ])),
            activeMember: cursorInRight ? activeContext.activeMember ?? lhsResolution.member : activeContext.activeMember,
        });
    }

    const filterFieldToken = `#${split.expressionText}`;
    if (token.text.trim().startsWith("#") && getFilterFieldPrefixMatches(rootType, filterFieldToken).length > 0) {
        return createContext({
            mode: "predicate-filter-field",
            rootType,
            receiverType: rootType,
            activeToken: filterFieldToken,
            replaceFrom: token.from,
            replaceTo: token.to,
            requiredSources: [getExpressionValueSourceRef(rootType)],
            structuralErrors: [],
            activeSourceRef: getExpressionValueSourceRef(rootType),
        });
    }

    const innerContext = parseExpressionTextContext(rootType, split.expressionText, split.expressionCursor);
    const lhsResolution = resolveExpressionType(rootType, split.expressionText, true);
    const completedLhsResolution = resolveExpressionType(rootType, split.expressionText, false);
    return createContext({
        ...innerContext,
        replaceFrom: token.from + 1 + innerContext.replaceFrom,
        replaceTo: token.from + 1 + innerContext.replaceTo,
        structuralErrors: Array.from(new Set([
            ...innerContext.structuralErrors,
            ...(completedLhsResolution.member && completedLhsResolution.errors.length === 0 && needsPredicateRightHandSide(completedLhsResolution.typeName)
                ? [`${lhsResolution.typeName} filters require a comparator and right-hand side value.`]
                : []),
        ])),
    });
}

function parseBraceContext(descriptor: PlaceholderExpressionDescriptor, value: string, cursor: number): ExpressionCursorContext {
    const braceContext = findBraceContext(value, cursor);
    const baseErrors = collectFunctionErrors(descriptor, value, braceContext);
    if (!braceContext) {
        return createContext({
            mode: "outside-braces",
            rootType: descriptor.rootType,
            receiverType: descriptor.rootType,
            activeToken: "",
            replaceFrom: cursor,
            replaceTo: cursor,
            structuralErrors: baseErrors,
        });
    }

    const innerText = value.slice(braceContext.from + 1, braceContext.to);
    const innerCursor = Math.max(0, cursor - braceContext.from - 1);
    const innerContext = parseExpressionTextContext(descriptor.rootType, innerText, innerCursor);
    const needsClosingBrace = braceContext.to === value.length || value[braceContext.to] !== "}";
    return createContext({
        ...innerContext,
        replaceFrom: braceContext.from + 1 + innerContext.replaceFrom,
        replaceTo: braceContext.from + 1 + innerContext.replaceTo,
        structuralErrors: Array.from(new Set([...baseErrors, ...innerContext.structuralErrors, ...resolveExpressionType(descriptor.rootType, innerText, true).errors])),
        needsClosingBrace,
    });
}

export function parseExpressionCursorContext(
    descriptor: PlaceholderExpressionDescriptor,
    value: string,
    cursor: number,
): ExpressionCursorContext {
    if (descriptor.kind === "set" || descriptor.kind === "predicate") {
        return parseRootContext(descriptor, value, cursor);
    }
    return parseBraceContext(descriptor, value, cursor);
}

function getRegistryEntry(
    registry: ExpressionValueSourceRegistry,
    source?: ExpressionValueSourceRef,
): ExpressionValueSourceRegistryEntry | undefined {
    return source ? registry[source.cacheKey] : undefined;
}

function getRegistryEntries(
    registry: ExpressionValueSourceRegistry,
    sources: ExpressionValueSourceRef[],
): ExpressionValueSourceRegistryEntry[] {
    return sources
        .map((source) => getRegistryEntry(registry, source))
        .filter((entry): entry is ExpressionValueSourceRegistryEntry => entry != null);
}

function getRootOptionSource(context: ExpressionCursorContext): ExpressionValueSourceRef | undefined {
    return context.requiredSources.find((source) => source.kind !== "placeholder");
}

function getRootOptionEntry(
    context: ExpressionCursorContext,
    registry: ExpressionValueSourceRegistry,
): ExpressionValueSourceRegistryEntry | undefined {
    return getRegistryEntry(registry, getRootOptionSource(context));
}

function getBestPrefixMember(schema: ExpressionTypeSchema | null, token: string): ExpressionMember | undefined {
    return resolvePrefixMembers(schema, token)[0]?.member;
}

function formatMemberSignature(member: ExpressionMember): string {
    if (member.arguments.length === 0) {
        return member.name;
    }

    return `${member.name}(${member.arguments.map((arg) => `${arg.name}: ${arg.type}${arg.optional ? "?" : ""}`).join(", ")})`;
}

function getPreferredMemberInsertName(member: ExpressionMember, token: string): string {
    const normalized = normalizeIdentifier(token);
    if (!normalized) {
        return stripMemberPrefix(member.name);
    }

    const canonical = normalizeIdentifier(member.name);
    for (const prefix of STRIP_PREFIXES) {
        if (normalized.startsWith(prefix) && canonical.startsWith(prefix)) {
            return member.name;
        }
    }

    return stripMemberPrefix(member.name);
}

function getOptionMatchToken(rootToken: RootTokenContext): string {
    return rootToken.cursorArea === "value" ? rootToken.selectorValue : rootToken.selectorText;
}

function getExactOptionMatch(
    rootToken: RootTokenContext | undefined,
    entry: ExpressionValueSourceRegistryEntry | undefined,
) {
    if (!rootToken || !entry || entry.options.length === 0) {
        return null;
    }

    const token = getOptionMatchToken(rootToken);
    if (!token) {
        return null;
    }

    const match = resolveOptionMatch(token, entry.options);
    return match.option ? match : null;
}

function getSuggestionSourceKind(source: ExpressionValueSourceRef | undefined, fallback: ExpressionSuggestion["sourceKind"]): ExpressionSuggestion["sourceKind"] {
    return source?.kind ?? fallback;
}

function toFilterSuggestions(
    fields: ExpressionFilterField[],
    token: string,
    replaceFrom: number,
    replaceTo: number,
    source: ExpressionValueSourceRef | undefined,
): ExpressionSuggestion[] {
    const prefix = token.toLowerCase();
    return fields
        .filter((field) => !prefix || field.key.startsWith(prefix))
        .slice(0, 12)
        .map((field) => ({
            label: field.key,
            insertText: field.key,
            detail: field.description || field.returnType,
            replaceFrom,
            replaceTo,
            caretOffset: field.key.length,
            kind: "filter",
            sourceKind: getSuggestionSourceKind(source, "placeholder"),
        }));
}

function toSelectorSuggestions(
    selectors: ExpressionSelector[],
    token: string,
    replaceFrom: number,
    replaceTo: number,
    source: ExpressionValueSourceRef | undefined,
): ExpressionSuggestion[] {
    const prefix = token.toLowerCase();
    return selectors
        .filter((selector) => !prefix || selector.insertText.toLowerCase().startsWith(prefix) || selector.label.toLowerCase().startsWith(prefix))
        .slice(0, 12)
        .map((selector) => ({
            label: selector.insertText,
            insertText: selector.insertText,
            detail: selector.description,
            replaceFrom,
            replaceTo,
            caretOffset: selector.insertText.length,
            kind: "selector",
            sourceKind: getSuggestionSourceKind(source, "placeholder"),
        }));
}

function toMemberSuggestions(
    schema: ExpressionTypeSchema | null,
    token: string,
    replaceFrom: number,
    replaceTo: number,
): ExpressionSuggestion[] {
    return resolvePrefixMembers(schema, token)
        .slice(0, 12)
        .map(({ member }) => {
            const preferredName = getPreferredMemberInsertName(member, token);
            const insert = buildMemberInsert(member);
            const insertText = preferredName === member.name
                ? insert.insertText
                : insert.insertText.replace(member.name, preferredName);
            const signature = formatMemberSignature(member);
            return {
                label: preferredName,
                insertText,
                detail: member.description || signature,
                subtext: signature,
                replaceFrom,
                replaceTo,
                caretOffset: insert.caretOffset - member.name.length + preferredName.length,
                kind: "member",
                sourceKind: "member",
            } satisfies ExpressionSuggestion;
        });
}

function toOptionSuggestions(
    entry: ExpressionValueSourceRegistryEntry | undefined,
    token: string,
    replaceFrom: number,
    replaceTo: number,
    insertPrefix: string = "",
): ExpressionSuggestion[] {
    if (!entry || entry.options.length === 0) {
        return [];
    }

    return filterSelectOptions(token, entry.options)
        .slice(0, 12)
        .map((option) => ({
            label: option.label || option.value,
            insertText: `${insertPrefix}${option.value}`,
            detail: option.label === option.value
                ? (insertPrefix ? `${insertPrefix}${option.value}` : undefined)
                : `${option.label} [${insertPrefix}${option.value}]`,
            subtext: option.subtext,
            replaceFrom,
            replaceTo,
            caretOffset: insertPrefix.length + option.value.length,
            kind: "option",
            sourceKind: entry.sourceKind,
        }));
}

function toArgumentSuggestions(
    member: ExpressionMember,
    token: string,
    replaceFrom: number,
    replaceTo: number,
    usedArgumentNames: string[] = [],
): ExpressionSuggestion[] {
    const normalized = normalizeIdentifier(token);
    const usedNames = new Set(usedArgumentNames);
    return member.arguments
        .filter((arg) => !usedNames.has(arg.name))
        .filter((arg) => !normalized || normalizeIdentifier(arg.name).startsWith(normalized))
        .slice(0, 12)
        .map((arg) => ({
            label: arg.name,
            insertText: `${arg.name}: `,
            detail: arg.description || `${arg.type}${arg.optional ? " (optional)" : ""}`,
            replaceFrom,
            replaceTo,
            caretOffset: arg.name.length + 2,
            kind: "member",
            sourceKind: "member",
        }));
}

function applySuggestionPrefix(
    suggestions: ExpressionSuggestion[],
    insertPrefix?: string,
    labelPrefix?: string,
): ExpressionSuggestion[] {
    if (!insertPrefix && !labelPrefix) {
        return suggestions;
    }

    return suggestions.map((suggestion) => ({
        ...suggestion,
        label: `${labelPrefix ?? ""}${suggestion.label}`,
        insertText: `${insertPrefix ?? ""}${suggestion.insertText}`,
        caretOffset: (insertPrefix?.length ?? 0) + suggestion.caretOffset,
    }));
}

function toComparatorSuggestions(
    typeName: string,
    replaceFrom: number,
    replaceTo: number,
): ExpressionSuggestion[] {
    return getComparisonOperators(typeName).map((operator) => ({
        label: operator,
        insertText: operator,
        detail: `${typeName} comparator`,
        replaceFrom,
        replaceTo,
        caretOffset: operator.length,
        kind: "option",
        sourceKind: "member",
    }));
}

function applyClosingBraceSuffix(
    suggestions: ExpressionSuggestion[],
    needsClosingBrace?: boolean,
): ExpressionSuggestion[] {
    if (!needsClosingBrace) {
        return suggestions;
    }

    return suggestions.map((suggestion) => ({
        ...suggestion,
        insertText: `${suggestion.insertText}}`,
    }));
}

function validateArgumentValue(
    context: ExpressionCursorContext,
    entry: ExpressionValueSourceRegistryEntry | undefined,
    suggestions: ExpressionSuggestion[],
): string[] {
    if (!context.activeArgument || !context.activeToken) {
        return [];
    }

    const typeName = context.activeArgument.type;
    if (entry?.options.length) {
        const exactMatch = resolveOptionMatch(context.activeToken, entry.options);
        if (!exactMatch.option && suggestions.length === 0) {
            return [`Invalid ${typeName} value \`${context.activeToken}\``];
        }
        return [];
    }

    if (isNumericTypeName(typeName) && !/^-?\d+(\.\d+)?$/.test(context.activeToken)) {
        return [`Invalid numeric value \`${context.activeToken}\` for ${typeName}`];
    }

    if (isBooleanTypeName(typeName) && !/^(true|false|yes|no|0|1)$/i.test(context.activeToken)) {
        return [`Invalid boolean value \`${context.activeToken}\``];
    }

    return [];
}

function validateStandaloneValue(
    typeName: string,
    activeToken: string,
    entry: ExpressionValueSourceRegistryEntry | undefined,
    suggestions: ExpressionSuggestion[],
): string[] {
    if (!activeToken) {
        return [];
    }

    if (entry?.options.length) {
        const exactMatch = resolveOptionMatch(activeToken, entry.options);
        if (!exactMatch.option && suggestions.length === 0) {
            return [`Invalid ${typeName} value \`${activeToken}\``];
        }
        return [];
    }

    if (isNumericTypeName(typeName) && !isNumericLiteral(activeToken)) {
        return [`Invalid numeric value \`${activeToken}\` for ${typeName}`];
    }

    if (isBooleanTypeName(typeName) && !isBooleanLiteral(activeToken)) {
        return [`Invalid boolean value \`${activeToken}\``];
    }

    return [];
}

function validateFunctionDoubleText(value: string): string[] {
    const stripped = value.replace(/\{[^}]*\}/g, "").trim();
    if (!stripped) {
        return [];
    }

    if (/[A-Za-z_]/.test(stripped)) {
        return ["TypedFunction<Double> expressions cannot contain arbitrary text outside placeholder braces."];
    }

    return [];
}

function toRootSuggestions(
    context: ExpressionCursorContext,
    schema: ExpressionTypeSchema | null,
    optionEntry: ExpressionValueSourceRegistryEntry | undefined,
): ExpressionSuggestion[] {
    if (context.mode === "predicate-filter-field") {
        return toFilterSuggestions(
            schema?.filterFields ?? [],
            context.activeToken,
            context.replaceFrom,
            context.replaceTo,
            context.requiredSources.find((source) => source.kind === "placeholder"),
        );
    }

    const rootToken = context.rootTokenContext;
    if (!rootToken) {
        return [];
    }

    const suggestions: ExpressionSuggestion[] = [];
    const placeholderSource = context.requiredSources.find((source) => source.kind === "placeholder");

    if (rootToken.cursorArea === "selector") {
        suggestions.push(
            ...toSelectorSuggestions(
                schema?.selectors ?? [],
                rootToken.selectorText,
                context.replaceFrom,
                context.replaceTo,
                placeholderSource,
            ),
        );
    }

    if (optionEntry) {
        const token = rootToken.cursorArea === "value"
            ? rootToken.selectorValue
            : (!rootToken.matchedSelector ? rootToken.selectorText : "");

        if (rootToken.cursorArea === "value" || !rootToken.matchedSelector) {
            suggestions.push(
                ...toOptionSuggestions(
                    optionEntry,
                    token,
                    context.replaceFrom,
                    context.replaceTo,
                ),
            );
        }
    }

    const deduped = new Map<string, ExpressionSuggestion>();
    suggestions.forEach((suggestion) => {
        deduped.set(`${suggestion.kind}:${suggestion.insertText}`, suggestion);
    });
    return Array.from(deduped.values()).slice(0, 12);
}

function buildHintMeta(context: ExpressionCursorContext, sourceLabel: string): string | undefined {
    const parts: string[] = [];
    if (context.receiverType) {
        parts.push(`receiver: ${context.receiverType}`);
    }
    if (context.activeMember?.returnType) {
        parts.push(`returns: ${context.activeMember.returnType}`);
    }
    if (context.activeMember?.arguments.length) {
        parts.push(`args: ${context.activeMember.arguments.map((arg) => `${arg.name}: ${arg.type}${arg.optional ? "?" : ""}`).join(", ")}`);
    }
    if (context.activeArgument) {
        parts.push(`active arg: ${context.activeArgument.name}: ${context.activeArgument.type}`);
    }
    parts.push(`source: ${sourceLabel}`);
    return parts.length > 0 ? parts.join(" | ") : undefined;
}

function buildRootHint(
    context: ExpressionCursorContext,
    schema: ExpressionTypeSchema | null,
    entry: ExpressionValueSourceRegistryEntry | undefined,
): ExpressionHint {
    const placeholderSource = context.requiredSources.find((source) => source.kind === "placeholder");
    const rootToken = context.rootTokenContext;
    const isFilterFieldContext = context.mode === "predicate-filter-field"
        || (context.activeArgument?.breakdown.element === "Predicate" && context.activeToken.startsWith("#"));

    if (isFilterFieldContext) {
        const field = schema?.filterFields.find((candidate) => candidate.key === context.activeToken.toLowerCase());
        return {
            title: field?.memberName ?? `${context.receiverType} filter`,
            detail: field?.description ?? "Use a known filter field to match nations.",
            meta: buildHintMeta(context, "filter"),
        };
    }

    const exactOptionMatch = getExactOptionMatch(rootToken, entry);
    const hasOptionCandidates = rootToken && entry
        ? filterSelectOptions(getOptionMatchToken(rootToken), entry.options).length > 0
        : false;

    if (rootToken?.matchedSelector && rootToken.cursorArea === "value") {
        const selectorDetail = rootToken.matchedSelector.description || "Recognized selector.";
        return {
            title: exactOptionMatch?.option?.label ?? `${rootToken.matchedSelector.insertText} value`,
            detail: exactOptionMatch?.option
                ? `${selectorDetail}${selectorDetail ? " | " : ""}Matched ${entry?.typeLabel ?? context.receiverType} option.`
                : `${rootToken.matchedSelector.description || "Recognized selector."} ${entry?.options.length ? `Type to match ${entry.typeLabel} options.` : "No loaded options matched yet."}`,
            meta: buildHintMeta(context, `${rootToken.matchedSelector.insertText} -> ${entry?.sourceKind ?? "selector"}`),
        };
    }

    if (exactOptionMatch?.option) {
        return {
            title: exactOptionMatch.option.label || exactOptionMatch.option.value,
            detail: `Recognized ${entry?.typeLabel ?? context.receiverType} option${exactOptionMatch.reason ? ` via ${exactOptionMatch.reason}` : ""}.`,
            meta: buildHintMeta(context, entry?.sourceKind ?? "option"),
        };
    }

    if (rootToken?.matchedSelector) {
        return {
            title: rootToken.matchedSelector.insertText,
            detail: rootToken.matchedSelector.description || "Recognized selector prefix.",
            meta: buildHintMeta(context, placeholderSource?.kind ?? "selector"),
        };
    }

    if (rootToken?.partialSelector) {
        return {
            title: `${context.receiverType} selector`,
            detail: `Continue typing a known selector such as ${rootToken.partialSelector.insertText}.`,
            meta: buildHintMeta(context, placeholderSource?.kind ?? "selector"),
        };
    }

    if (entry?.options.length && context.activeToken && hasOptionCandidates) {
        return {
            title: entry.typeLabel,
            detail: `Type to match a ${entry.typeLabel} option by value, label, or alias.`,
            meta: buildHintMeta(context, entry.sourceKind),
        };
    }

    return {
        title: `${context.receiverType} selector`,
        detail: context.activeToken
            ? "Unrecognized selector or option. Backend may still accept raw selectors, but no known selector or loaded option matched this token."
            : "Start with a selector prefix or a known option value.",
        meta: buildHintMeta(context, placeholderSource?.kind ?? entry?.sourceKind ?? "selector"),
    };
}

function buildMemberHint(
    context: ExpressionCursorContext,
    source: ExpressionValueSourceRef | undefined,
    schema: ExpressionTypeSchema | null,
    entry: ExpressionValueSourceRegistryEntry | undefined,
): ExpressionHint {
    if (context.mode === "function-argument" && context.activeMember && context.activeArgument) {
        return {
            title: `${context.activeMember.name}(${context.activeArgument.name}: ${context.activeArgument.type}${context.activeArgument.optional ? "?" : ""})`,
            detail: context.activeArgument.description || context.activeMember.description,
            meta: buildHintMeta(context, source?.kind === "placeholder" ? "member" : source?.kind ?? "member"),
        };
    }

    if (context.mode === "function-argument" && context.activeMember) {
        return {
            title: formatMemberSignature(context.activeMember),
            detail: context.activeMember.description || `Returns ${context.activeMember.returnType}.`,
            meta: buildHintMeta(context, source?.kind === "placeholder" ? "member" : source?.kind ?? "member"),
        };
    }

    const exactMember = resolveExactMember(schema, context.activeToken)?.member;
    const suggestedMember = exactMember ?? getBestPrefixMember(schema, context.activeToken);
    if (exactMember) {
        return {
            title: formatMemberSignature(exactMember),
            detail: exactMember.description || `Returns ${exactMember.returnType}.`,
            meta: buildHintMeta({ ...context, activeMember: exactMember }, "member"),
        };
    }

    if (source?.kind === "map-key-options") {
        return {
            title: entry?.typeLabel ?? `${context.receiverType} key`,
            detail: `Pick a key for ${context.receiverType}.`,
            meta: buildHintMeta(context, source.kind),
        };
    }

    if (suggestedMember) {
        return {
            title: formatMemberSignature(suggestedMember),
            detail: suggestedMember.description || `Returns ${suggestedMember.returnType}.`,
            meta: buildHintMeta({ ...context, activeMember: suggestedMember }, "member"),
        };
    }

    if (source?.kind === "placeholder") {
        return {
            title: context.receiverType,
            detail: "Browse placeholder members for the current receiver.",
            meta: buildHintMeta(context, "member"),
        };
    }

    return {
        title: entry?.typeLabel ?? context.receiverType,
        detail: `Choose a value from ${entry?.typeLabel ?? context.receiverType}.`,
        meta: buildHintMeta(context, source?.kind ?? "member"),
    };
}

function finalizeValueContext(
    context: ExpressionCursorContext,
    source: ExpressionValueSourceRef | undefined,
    entry: ExpressionValueSourceRegistryEntry | undefined,
    schema: ExpressionTypeSchema | null,
    errors: string[],
): ExpressionAnalysis {
    const suggestions = source?.kind === "placeholder"
        ? toMemberSuggestions(schema, context.activeToken, context.replaceFrom, context.replaceTo)
        : toOptionSuggestions(entry, context.activeToken, context.replaceFrom, context.replaceTo);
    const prefixedSuggestions = applySuggestionPrefix(
        applySuggestionPrefix(suggestions, context.argumentInsertPrefix),
        context.suggestionInsertPrefix,
        context.suggestionLabelPrefix,
    );
    const completedSuggestions = applyClosingBraceSuffix(prefixedSuggestions, context.needsClosingBrace);
    const validationErrors = validateArgumentValue(context, entry, completedSuggestions);
    const standaloneValueErrors = (!context.activeArgument || context.mode === "predicate-rhs") && source?.kind !== "placeholder"
        ? validateStandaloneValue(context.receiverType, context.activeToken, entry, completedSuggestions)
        : [];
    const nextErrors = [...errors, ...validationErrors, ...standaloneValueErrors];

    if (source?.kind === "placeholder" && context.activeToken && completedSuggestions.length === 0) {
        nextErrors.push(`Unknown member \`${context.activeToken}\` on ${context.receiverType}`);
    }

    return {
        suggestions: completedSuggestions,
        hint: buildMemberHint(context, source, schema, entry),
        errors: Array.from(new Set(nextErrors)),
    };
}

export function analyzeExpression(
    descriptor: PlaceholderExpressionDescriptor,
    value: string,
    cursor: number,
    registry: ExpressionValueSourceRegistry,
): ExpressionAnalysis {
    const context = parseExpressionCursorContext(descriptor, value, cursor);
    const source = context.activeSourceRef ?? context.requiredSources[0];
    const entry = getRegistryEntry(registry, source);
    const rootOptionEntry = getRootOptionEntry(context, registry);
    const schema = getExpressionTypeSchema(context.receiverType);
    const errors = Array.from(new Set(context.structuralErrors));

    if (context.mode === "outside-braces") {
        return {
            suggestions: [],
            hint: descriptor.kind === "function-string"
                ? {
                    title: `${descriptor.rootType} string template`,
                    detail: "Use { ... } for placeholder expressions and leave the rest as literal text.",
                    meta: buildHintMeta(context, "member"),
                }
                : {
                    title: `${descriptor.rootType} numeric expression`,
                    detail: "Use { ... } for typed members and combine them with numeric operators outside the braces.",
                    meta: buildHintMeta(context, "member"),
                },
            errors: descriptor.kind === "function-double"
                ? Array.from(new Set([...errors, ...validateFunctionDoubleText(value)]))
                : errors,
        };
    }

    if (context.mode === "set-root" || context.mode === "predicate-root" || context.mode === "predicate-filter-field") {
        return {
            suggestions: toRootSuggestions(context, schema, rootOptionEntry),
            hint: buildRootHint(context, schema, rootOptionEntry),
            errors,
        };
    }

    if (context.mode === "predicate-operator") {
        return {
            suggestions: toComparatorSuggestions(context.receiverType, context.replaceFrom, context.replaceTo),
            hint: {
                title: `${context.receiverType} comparator`,
                detail: `Choose a comparator for ${context.receiverType}.`,
                meta: buildHintMeta(context, "member"),
            },
            errors,
        };
    }

    if (context.mode === "predicate-rhs") {
        const finalized = finalizeValueContext(context, source, entry, schema, errors);
        return {
            suggestions: finalized.suggestions,
            hint: {
                title: entry?.typeLabel ?? context.receiverType,
                detail: entry?.options.length
                    ? `Choose a ${entry.typeLabel ?? context.receiverType} value for the right-hand side.`
                    : `Enter a ${context.receiverType} value for the right-hand side.`,
                meta: buildHintMeta(context, source?.kind ?? "member"),
            },
            errors: finalized.errors,
        };
    }

    const isPredicateArgument = context.activeArgument?.breakdown.element === "Predicate";
    const isSelectorArgument = isPredicateArgument || context.activeArgument?.breakdown.element === "Set";

    if (isPredicateArgument && context.activeToken.startsWith("#")) {
        return {
            suggestions: toFilterSuggestions(schema?.filterFields ?? [], context.activeToken, context.replaceFrom, context.replaceTo, source),
            hint: buildRootHint(context, schema, rootOptionEntry),
            errors,
        };
    }

    if (isSelectorArgument && context.rootTokenContext) {
        return {
            suggestions: toRootSuggestions(context, schema, rootOptionEntry),
            hint: buildRootHint(context, schema, rootOptionEntry),
            errors,
        };
    }

    if (context.mode === "function-argument" && context.activeMember && !context.activeArgument) {
        return {
            suggestions: applyClosingBraceSuffix(
                applySuggestionPrefix(
                    toArgumentSuggestions(
                        context.activeMember,
                        context.activeToken,
                        context.replaceFrom,
                        context.replaceTo,
                        context.usedArgumentNames,
                    ),
                    context.suggestionInsertPrefix,
                    context.suggestionLabelPrefix,
                ),
                context.needsClosingBrace,
            ),
            hint: buildMemberHint(context, source, schema, entry),
            errors,
        };
    }

    return finalizeValueContext(context, source, entry, schema, errors);
}

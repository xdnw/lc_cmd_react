import { getTypeBreakdown, CM } from "@/utils/Command";
import {
    buildMemberInsert,
    getExpressionTypeSchema,
    getExpressionValueSource,
    type ExpressionArgument,
    type ExpressionFilterField,
    type ExpressionMember,
    type ExpressionSelector,
} from "./expressionSchema";
import type { ExpressionInputConfig } from "./expressionTypes";

export type ExpressionSuggestion = {
    label: string;
    insertText: string;
    detail?: string;
    replaceFrom: number;
    replaceTo: number;
    caretOffset: number;
    kind: "member" | "filter" | "selector" | "option";
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

type TokenRange = {
    from: number;
    to: number;
    text: string;
};

type MemberResolution = {
    typeName: string;
    member?: ExpressionMember;
    errors: string[];
};

function splitTopLevel(text: string, separator: string): string[] {
    const parts: string[] = [];
    let depthParen = 0;
    let depthBrace = 0;
    let start = 0;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === "(") depthParen += 1;
        if (char === ")") depthParen = Math.max(0, depthParen - 1);
        if (char === "{") depthBrace += 1;
        if (char === "}") depthBrace = Math.max(0, depthBrace - 1);

        if (char === separator && depthParen === 0 && depthBrace === 0) {
            parts.push(text.slice(start, index));
            start = index + 1;
        }
    }

    parts.push(text.slice(start));
    return parts;
}

function findPredicateTokenRange(text: string, cursor: number): TokenRange {
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

    return {
        from,
        to,
        text: text.slice(from, to).trim(),
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

function findCurrentCall(text: string, cursor: number): { openParen: number; functionName: string; functionStart: number } | null {
    let depth = 0;

    for (let index = cursor - 1; index >= 0; index -= 1) {
        const char = text[index];
        if (char === ")") {
            depth += 1;
            continue;
        }
        if (char === "(") {
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
    }

    return null;
}

function findCurrentArgumentSegment(text: string, openParen: number, cursor: number): { from: number; text: string; name?: string; valueFrom: number } {
    let depthParen = 0;
    let depthBrace = 0;
    let segmentFrom = openParen + 1;

    for (let index = openParen + 1; index < cursor; index += 1) {
        const char = text[index];
        if (char === "(") depthParen += 1;
        if (char === ")") depthParen = Math.max(0, depthParen - 1);
        if (char === "{") depthBrace += 1;
        if (char === "}") depthBrace = Math.max(0, depthBrace - 1);
        if (char === "," && depthParen === 0 && depthBrace === 0) {
            segmentFrom = index + 1;
        }
    }

    const segmentText = text.slice(segmentFrom, cursor);
    const colonIndex = segmentText.indexOf(":");
    if (colonIndex < 0) {
        return {
            from: segmentFrom,
            text: segmentText,
            valueFrom: segmentFrom,
        };
    }

    return {
        from: segmentFrom,
        text: segmentText,
        name: segmentText.slice(0, colonIndex).trim(),
        valueFrom: segmentFrom + colonIndex + 1,
    };
}

function resolveMemberChain(rootType: string, text: string, allowPartialLastSegment: boolean = false): MemberResolution {
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

        const member = schema.membersByName[nameMatch[1]];
        if (!member) {
            const isLastSegment = index === parts.length - 1;
            if (allowPartialLastSegment && isLastSegment) {
                return { typeName, errors };
            }
            errors.push(`Unknown member \`${nameMatch[1]}\` on ${typeName}`);
            return { typeName, errors };
        }

        if (part.includes("(") && part.includes(")")) {
            const argsText = part.slice(part.indexOf("(") + 1, part.lastIndexOf(")"));
            const args = splitTopLevel(argsText, ",").map((arg) => arg.trim()).filter(Boolean);
            for (const arg of args) {
                const colonIndex = arg.indexOf(":");
                if (colonIndex < 0) {
                    continue;
                }
                const argName = arg.slice(0, colonIndex).trim();
                const argValue = arg.slice(colonIndex + 1).trim();
                const argDef = member.arguments.find((candidate) => candidate.name === argName);
                if (!argDef) {
                    errors.push(`Unknown argument \`${argName}\` for ${member.name}`);
                    continue;
                }
                errors.push(...validateNestedArgument(argDef, argValue));
            }
        }

        typeName = member.returnType;
        lastMember = member;
    }

    return {
        typeName,
        member: lastMember,
        errors,
    };
}

function validateNestedArgument(argDef: ExpressionArgument, value: string): string[] {
    if (!value) {
        return [];
    }

    const breakdown = getTypeBreakdown(CM, argDef.type);
    if (breakdown.element === "Predicate" && breakdown.child?.[0]?.element) {
        return collectFilterFieldErrors(breakdown.child[0].element, value);
    }

    if (breakdown.element === "TypedFunction" && breakdown.child?.[0]?.element) {
        return resolveMemberChain(breakdown.child[0].element, value).errors;
    }

    return [];
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

function toFilterSuggestions(fields: ExpressionFilterField[], token: TokenRange, offset: number): ExpressionSuggestion[] {
    const prefix = token.text.toLowerCase();
    return fields
        .filter((field) => !prefix || field.key.startsWith(prefix))
        .slice(0, 12)
        .map((field) => ({
            label: field.key,
            insertText: field.key,
            detail: field.description || field.returnType,
            replaceFrom: offset + token.from,
            replaceTo: offset + token.to,
            caretOffset: field.key.length,
            kind: "filter",
        }));
}

function toSelectorSuggestions(selectors: ExpressionSelector[], token: TokenRange, offset: number): ExpressionSuggestion[] {
    const prefix = token.text.toLowerCase();
    return selectors
        .filter((selector) => !prefix || selector.insertText.toLowerCase().startsWith(prefix) || selector.label.toLowerCase().startsWith(prefix))
        .slice(0, 12)
        .map((selector) => ({
            label: selector.insertText,
            insertText: selector.insertText,
            detail: selector.description,
            replaceFrom: offset + token.from,
            replaceTo: offset + token.to,
            caretOffset: selector.insertText.length,
            kind: "selector",
        }));
}

function toMemberSuggestions(typeName: string, prefix: string, replaceFrom: number, replaceTo: number): ExpressionSuggestion[] {
    const schema = getExpressionTypeSchema(typeName);
    if (!schema) {
        return [];
    }

    const normalizedPrefix = prefix.toLowerCase();
    return schema.members
        .filter((member) => !normalizedPrefix || member.name.toLowerCase().startsWith(normalizedPrefix))
        .slice(0, 12)
        .map((member) => {
            const insert = buildMemberInsert(member);
            return {
                label: member.name,
                insertText: insert.insertText,
                detail: member.description || member.returnType,
                replaceFrom,
                replaceTo,
                caretOffset: insert.caretOffset,
                kind: "member",
            } satisfies ExpressionSuggestion;
        });
}

function toOptionSuggestions(typeName: string, prefix: string, replaceFrom: number, replaceTo: number): ExpressionSuggestion[] {
    const valueSource = getExpressionValueSource(typeName);
    if (valueSource.kind !== "options") {
        return [];
    }

    const normalizedPrefix = prefix.toLowerCase();
    return valueSource.options
        .filter((option) => !normalizedPrefix || option.value.toLowerCase().startsWith(normalizedPrefix) || option.label.toLowerCase().startsWith(normalizedPrefix))
        .slice(0, 12)
        .map((option) => ({
            label: option.value,
            insertText: option.value,
            detail: option.label === option.value ? undefined : option.label,
            replaceFrom,
            replaceTo,
            caretOffset: option.value.length,
            kind: "option",
        }));
}

function analyzePredicateLike(typeName: string, text: string, cursor: number, offset: number): ExpressionAnalysis {
    const schema = getExpressionTypeSchema(typeName);
    if (!schema) {
        return { suggestions: [], errors: [] };
    }

    const token = findPredicateTokenRange(text, cursor);
    const fieldMatch = token.text.match(/#[a-z0-9_]*$/i);
    if (fieldMatch) {
        const fieldToken: TokenRange = {
            from: token.from + fieldMatch.index!,
            to: token.from + fieldMatch.index! + fieldMatch[0].length,
            text: fieldMatch[0],
        };
        const field = schema.filterFields.find((candidate) => candidate.key === fieldToken.text.toLowerCase());
        return {
            suggestions: toFilterSuggestions(schema.filterFields, fieldToken, offset),
            hint: field ? {
                title: field.memberName,
                detail: field.description,
                meta: field.returnType,
            } : {
                title: `${typeName} filter`,
                detail: "Start with a known filter field like #active_m or #vm_turns.",
            },
            errors: collectFilterFieldErrors(typeName, text),
        };
    }

    const selector = schema.selectors.find((candidate) => candidate.insertText === token.text);
    return {
        suggestions: toSelectorSuggestions(schema.selectors, token, offset),
        hint: selector ? {
            title: selector.label,
            detail: selector.description,
        } : {
            title: `${typeName} selector`,
            detail: "Selectors stay permissive so raw backend-supported tokens still work.",
        },
        errors: [],
    };
}

function analyzeMemberExpression(typeName: string, text: string, cursor: number, offset: number): ExpressionAnalysis {
    const call = findCurrentCall(text, cursor);
    if (call) {
        const ownerPrefix = text.slice(0, call.functionStart).replace(/\.$/, "");
        const ownerType = ownerPrefix ? resolveMemberChain(typeName, ownerPrefix, true).typeName : typeName;
        const ownerSchema = getExpressionTypeSchema(ownerType);
        const member = ownerSchema?.membersByName[call.functionName];

        if (member) {
            const currentArg = findCurrentArgumentSegment(text, call.openParen, cursor);
            const argHint = member.arguments.map((arg) => `${arg.name}: ${arg.type}${arg.optional ? "?" : ""}`).join(", ");
            const namedArg = currentArg.name ? member.arguments.find((arg) => arg.name === currentArg.name) : undefined;
            if (namedArg) {
                const argValue = text.slice(currentArg.valueFrom, cursor).trimStart();
                const argOffset = offset + currentArg.valueFrom + (text.slice(currentArg.valueFrom, cursor).length - argValue.length);
                const breakdown = getTypeBreakdown(CM, namedArg.type);
                if (breakdown.element === "Predicate" && breakdown.child?.[0]?.element) {
                    const nested = analyzePredicateLike(breakdown.child[0].element, argValue, argValue.length, argOffset);
                    return {
                        ...nested,
                        hint: {
                            title: `${member.name}(${namedArg.name})`,
                            detail: member.description,
                            meta: namedArg.type,
                        },
                        errors: [...resolveMemberChain(typeName, text, true).errors, ...nested.errors],
                    };
                }
                if (breakdown.element === "TypedFunction" && breakdown.child?.[0]?.element) {
                    const nested = analyzeMemberExpression(breakdown.child[0].element, argValue, argValue.length, argOffset);
                    return {
                        ...nested,
                        hint: {
                            title: `${member.name}(${namedArg.name})`,
                            detail: member.description,
                            meta: namedArg.type,
                        },
                        errors: [...resolveMemberChain(typeName, text, true).errors, ...nested.errors],
                    };
                }
            }

            return {
                suggestions: [],
                hint: {
                    title: member.name,
                    detail: member.description,
                    meta: argHint || member.returnType,
                },
                errors: resolveMemberChain(typeName, text, true).errors,
            };
        }
    }

    const cursorText = text.slice(0, cursor);
    const segments = splitTopLevel(cursorText, ".");
    const currentSegment = (segments.length > 0 ? segments[segments.length - 1] : "")?.trim() ?? "";
    const ownerExpression = segments.slice(0, -1).join(".").trim();
    const ownerType = ownerExpression ? resolveMemberChain(typeName, ownerExpression, true).typeName : typeName;
    const currentNameMatch = currentSegment.match(/^([A-Za-z_][A-Za-z0-9_]*)?$/);
    const currentName = currentNameMatch?.[0] ?? "";
    const lastDotIndex = cursorText.lastIndexOf(".");
    const replaceFrom = offset + (lastDotIndex >= 0 ? lastDotIndex + 1 : 0);
    const replaceTo = offset + cursor;
    const memberResolution = resolveMemberChain(typeName, text, true);
    const valueSource = getExpressionValueSource(ownerType);

    const suggestions = valueSource.kind === "options"
        ? toOptionSuggestions(ownerType, currentName, replaceFrom, replaceTo)
        : toMemberSuggestions(ownerType, currentName, replaceFrom, replaceTo);

    const exactMember = getExpressionTypeSchema(ownerType)?.membersByName[currentName];
    return {
        suggestions,
        hint: exactMember ? {
            title: exactMember.name,
            detail: exactMember.description,
            meta: exactMember.returnType,
        } : {
            title: ownerType,
            detail: valueSource.kind === "options"
                ? `Pick a ${ownerType} key.`
                : `Browse members from ${ownerType}.`,
        },
        errors: memberResolution.errors,
    };
}

function collectFunctionErrors(
    value: string,
    placeholderType: string,
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
        errors.push(...resolveMemberChain(placeholderType, match[1].trim(), Boolean(isActiveMatch)).errors);
    }
    return Array.from(new Set(errors));
}

export function analyzeExpression(config: ExpressionInputConfig, value: string, cursor: number): ExpressionAnalysis {
    if (config.kind === "set" || config.kind === "predicate") {
        return analyzePredicateLike(config.placeholderType, value, cursor, 0);
    }

    const braceContext = findBraceContext(value, cursor);
    const baseErrors = collectFunctionErrors(value, config.placeholderType, braceContext);
    if (!braceContext) {
        return {
            suggestions: [],
            hint: config.kind === "function-string"
                ? {
                    title: `${config.placeholderType} string template`,
                    detail: "Use { ... } blocks for placeholder expressions and leave the rest as plain text.",
                }
                : {
                    title: `${config.placeholderType} numeric expression`,
                    detail: "Use { ... } blocks for typed members and combine them with math outside the braces.",
                },
            errors: baseErrors,
        };
    }

    const innerText = value.slice(braceContext.from + 1, braceContext.to);
    const innerCursor = Math.max(0, cursor - braceContext.from - 1);
    const analyzed = analyzeMemberExpression(config.placeholderType, innerText, innerCursor, braceContext.from + 1);
    return {
        ...analyzed,
        errors: Array.from(new Set([...baseErrors, ...analyzed.errors])),
    };
}

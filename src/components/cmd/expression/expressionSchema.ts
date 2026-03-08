import { COMMANDS } from "@/lib/commands";
import { CM, getTypeBreakdown, toPlaceholderName, type TypeBreakdown } from "@/utils/Command";

export type ExpressionValueSourceRef =
    | {
        kind: "placeholder";
        cacheKey: string;
        typeName: string;
        placeholderType: string;
    }
    | {
        kind: "static-options";
        cacheKey: string;
        typeName: string;
        typeKey: string;
    }
    | {
        kind: "query-options";
        cacheKey: string;
        typeName: string;
        typeKey: string;
    }
    | {
        kind: "composite-query-options";
        cacheKey: string;
        typeName: string;
        composite: string[];
        typeKey: string;
    }
    | {
        kind: "map-key-options";
        cacheKey: string;
        typeName: string;
        keyType: string;
        keySource: ExpressionValueSourceRef;
    }
    | {
        kind: "unknown";
        cacheKey: string;
        typeName: string;
    };

export type ExpressionArgument = {
    name: string;
    type: string;
    optional: boolean;
    description?: string;
    breakdown: TypeBreakdown;
    valueSourceRef: ExpressionValueSourceRef;
};

export type ExpressionMember = {
    name: string;
    description: string;
    returnType: string;
    returnBreakdown: TypeBreakdown;
    returnSourceRef: ExpressionValueSourceRef;
    arguments: ExpressionArgument[];
};

export type ExpressionSelector = {
    label: string;
    insertText: string;
    description: string;
};

export type ExpressionFilterField = {
    key: string;
    memberName: string;
    description: string;
    returnType: string;
};

export type ExpressionTypeSchema = {
    typeName: string;
    members: ExpressionMember[];
    membersByName: Record<string, ExpressionMember>;
    selectors: ExpressionSelector[];
    filterFields: ExpressionFilterField[];
};

type RawPlaceholder = {
    commands?: Record<string, {
        desc?: string;
        return_type?: string;
        arguments?: Record<string, { name?: string; type?: string; optional?: boolean; desc?: string }>;
    }>;
    selectors?: Array<[string, string | null, string | null]>;
};

const schemaCache = new Map<string, ExpressionTypeSchema>();
const valueSourceCache = new Map<string, ExpressionValueSourceRef>();

function dedupeValueSources(sources: ExpressionValueSourceRef[]): ExpressionValueSourceRef[] {
    const seen = new Set<string>();
    return sources.filter((source) => {
        if (seen.has(source.cacheKey)) {
            return false;
        }
        seen.add(source.cacheKey);
        return true;
    });
}

function stripBackticks(value: string): string {
    return value.replace(/`/g, "").trim();
}

function toSelectorInsertText(label: string, example: string | null): string {
    if (label === "*") {
        return "*";
    }

    const cleaned = stripBackticks(example ?? label)
        .split(/\s+or\s+/i)[0]
        .split(",")[0]
        .trim();

    const colonIndex = cleaned.indexOf(":");
    if (colonIndex > 0) {
        return `${cleaned.slice(0, colonIndex + 1)}`;
    }

    const eqIndex = cleaned.indexOf("=");
    if (eqIndex > 0) {
        return `${cleaned.slice(0, eqIndex + 1)}`;
    }

    return cleaned || label;
}

function isFilterFieldCandidate(member: ExpressionMember): boolean {
    if (!member.name.startsWith("get")) {
        return false;
    }

    return member.arguments.every((arg) => arg.optional);
}

function toFilterKey(memberName: string): string {
    return `#${memberName.slice(3)}`.toLowerCase();
}

function getRawPlaceholder(typeName: string): RawPlaceholder | null {
    const raw = (COMMANDS.placeholders as unknown as Record<string, RawPlaceholder | undefined>)[typeName];
    return raw ?? null;
}

function getTypeLabel(typeName: string): string {
    return toPlaceholderName(typeName) || typeName;
}

function getOptionExampleValue(typeName: string): string | null {
    const breakdown = getTypeBreakdown(CM, typeName);
    const optionData = breakdown.getOptionData();
    if (optionData.options?.[0]) {
        return optionData.options[0];
    }

    const keyMap = COMMANDS.keys as Record<string, { examples?: unknown[] } | undefined>;
    const keyExamples = keyMap[typeName]?.examples ?? [];
    const firstExample = keyExamples.find((example: unknown): example is string => typeof example === "string" && example.trim().length > 0);
    if (!firstExample) {
        return null;
    }

    return firstExample
        .replace(/[{}]/g, "")
        .split(/[\s,|]+/)
        .map((part: string) => part.trim())
        .find(Boolean) ?? null;
}

function isNumericType(typeName: string): boolean {
    return ["double", "number", "int", "integer", "long"].includes(typeName.toLowerCase());
}

export function buildMemberInsert(member: ExpressionMember): { insertText: string; caretOffset: number } {
    if (member.arguments.length === 0) {
        return {
            insertText: member.name,
            caretOffset: member.name.length,
        };
    }

    const renderedArgs = member.arguments.map((arg) => `${arg.name}: `).join(", ");
    return {
        insertText: `${member.name}(${renderedArgs})`,
        caretOffset: member.name.length + 2,
    };
}

export function getExpressionTypeSchema(typeName: string): ExpressionTypeSchema | null {
    const cached = schemaCache.get(typeName);
    if (cached) {
        return cached;
    }

    const rawPlaceholder = getRawPlaceholder(typeName);
    if (!rawPlaceholder?.commands) {
        return null;
    }

    const members = Object.entries(rawPlaceholder.commands).map(([name, rawCommand]) => {
        const returnType = rawCommand.return_type ?? "Object";
        return {
            name,
            description: rawCommand.desc ?? "",
            returnType,
            returnBreakdown: getTypeBreakdown(CM, returnType),
            returnSourceRef: getExpressionValueSourceRef(returnType),
            arguments: Object.values(rawCommand.arguments ?? {}).map((arg) => {
                const type = arg.type ?? "Object";
                return {
                    name: arg.name ?? "arg",
                    type,
                    optional: Boolean(arg.optional),
                    description: arg.desc,
                    breakdown: getTypeBreakdown(CM, type),
                    valueSourceRef: getExpressionValueSourceRef(type),
                } satisfies ExpressionArgument;
            }),
        } satisfies ExpressionMember;
    });

    const selectors = (rawPlaceholder.selectors ?? []).map(([label, example, description]) => ({
        label,
        insertText: toSelectorInsertText(label, example),
        description: description ?? "",
    } satisfies ExpressionSelector));

    const filterFields = members
        .filter(isFilterFieldCandidate)
        .map((member) => ({
            key: toFilterKey(member.name),
            memberName: member.name,
            description: member.description,
            returnType: member.returnType,
        } satisfies ExpressionFilterField))
        .sort((left, right) => left.key.localeCompare(right.key));

    const schema: ExpressionTypeSchema = {
        typeName,
        members,
        membersByName: Object.fromEntries(members.map((member) => [member.name, member])),
        selectors,
        filterFields,
    };

    schemaCache.set(typeName, schema);
    return schema;
}

export function getExpressionValueSourceRef(typeName: string): ExpressionValueSourceRef {
    const cached = valueSourceCache.get(typeName);
    if (cached) {
        return cached;
    }

    if (getRawPlaceholder(typeName)) {
        const source: ExpressionValueSourceRef = {
            kind: "placeholder",
            cacheKey: `placeholder:${typeName}`,
            typeName,
            placeholderType: typeName,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    const breakdown = getTypeBreakdown(CM, typeName);
    if (breakdown.element === "Map" && breakdown.child?.[0]) {
        const keyType = breakdown.child[0].element;
        const keySource = getExpressionCompletionSourceRefs(keyType).find((source) => source.kind !== "placeholder")
            ?? getExpressionValueSourceRef(keyType);
        const source: ExpressionValueSourceRef = {
            kind: "map-key-options",
            cacheKey: `map-key:${typeName}:${keySource.cacheKey}`,
            typeName,
            keyType,
            keySource,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    const optionData = breakdown.getOptionData();
    if (optionData.options?.length) {
        const source: ExpressionValueSourceRef = {
            kind: "static-options",
            cacheKey: `static:${optionData.typeKey}`,
            typeName,
            typeKey: optionData.typeKey,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    if (optionData.composite.length > 0) {
        const source: ExpressionValueSourceRef = {
            kind: "composite-query-options",
            cacheKey: `composite:${optionData.composite.join("|")}`,
            typeName,
            composite: optionData.composite,
            typeKey: optionData.typeKey,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    if (optionData.query) {
        const source: ExpressionValueSourceRef = {
            kind: "query-options",
            cacheKey: `query:${optionData.typeKey}`,
            typeName,
            typeKey: optionData.typeKey,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    const source: ExpressionValueSourceRef = {
        kind: "unknown",
        cacheKey: `unknown:${typeName}`,
        typeName,
    };
    valueSourceCache.set(typeName, source);
    return source;
}

export function getExpressionCompletionSourceRefs(typeName: string): ExpressionValueSourceRef[] {
    const sources: ExpressionValueSourceRef[] = [];

    if (getRawPlaceholder(typeName)) {
        sources.push(getExpressionValueSourceRef(typeName));
    }

    const breakdown = getTypeBreakdown(CM, typeName);
    if (breakdown.element === "Map" && breakdown.child?.[0]) {
        sources.push(getExpressionValueSourceRef(typeName));
        return dedupeValueSources(sources);
    }

    const optionData = breakdown.getOptionData();
    if (optionData.options?.length || optionData.query || optionData.composite.length > 0) {
        const optionSource = (() => {
            if (optionData.options?.length) {
                return {
                    kind: "static-options",
                    cacheKey: `static:${optionData.typeKey}`,
                    typeName,
                    typeKey: optionData.typeKey,
                } satisfies ExpressionValueSourceRef;
            }

            if (optionData.composite.length > 0) {
                return {
                    kind: "composite-query-options",
                    cacheKey: `composite:${optionData.composite.join("|")}`,
                    typeName,
                    composite: optionData.composite,
                    typeKey: optionData.typeKey,
                } satisfies ExpressionValueSourceRef;
            }

            return {
                kind: "query-options",
                cacheKey: `query:${optionData.typeKey}`,
                typeName,
                typeKey: optionData.typeKey,
            } satisfies ExpressionValueSourceRef;
        })();

        sources.push(optionSource);
    }

    if (sources.length === 0) {
        sources.push(getExpressionValueSourceRef(typeName));
    }

    return dedupeValueSources(sources);
}

export function getExpressionExample(
    descriptor: {
        kind: string;
        rootType: string;
        rootValueSources: ExpressionValueSourceRef[];
        exampleMode: string;
    },
    schema: ExpressionTypeSchema | null,
): string {
    const firstSelector = schema?.selectors[0]?.insertText;
    const optionExample = getOptionExampleValue(descriptor.rootType);
    const fallbackLabel = getTypeLabel(descriptor.rootType);

    if (descriptor.kind === "set" || descriptor.kind === "predicate") {
        return firstSelector ?? optionExample ?? fallbackLabel;
    }

    if (descriptor.kind === "function-string") {
        const stringMembers = schema?.members.filter((member) => member.returnType === "String") ?? [];
        const first = stringMembers[0] ? buildMemberInsert(stringMembers[0]).insertText : null;
        const second = stringMembers[1] ? buildMemberInsert(stringMembers[1]).insertText : null;
        if (first && second) {
            return `{${first}} - {${second}}`;
        }
        if (first) {
            return `{${first}}`;
        }
        return `{${fallbackLabel}}`;
    }

    const numericMember = schema?.members.find((member) => isNumericType(member.returnType));
    if (numericMember) {
        return `{${buildMemberInsert(numericMember).insertText}} + 1`;
    }
    return `{${fallbackLabel}} + 1`;
}

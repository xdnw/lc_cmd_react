import { COMMANDS } from "@/lib/commands";
import { CM, getTypeBreakdown } from "@/utils/Command";
import type { SelectOption } from "../selectValueUtils";

export type ExpressionArgument = {
    name: string;
    type: string;
    optional: boolean;
    description?: string;
};

export type ExpressionMember = {
    name: string;
    description: string;
    returnType: string;
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

export type ExpressionValueSource =
    | { kind: "placeholder"; placeholderType: string }
    | { kind: "options"; options: SelectOption[] }
    | { kind: "unknown" };

type RawPlaceholder = {
    commands?: Record<string, {
        desc?: string;
        return_type?: string;
        arguments?: Record<string, { name?: string; type?: string; optional?: boolean; desc?: string }>;
    }>;
    selectors?: Array<[string, string | null, string | null]>;
};

const schemaCache = new Map<string, ExpressionTypeSchema>();
const valueSourceCache = new Map<string, ExpressionValueSource>();

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

    const members = Object.entries(rawPlaceholder.commands).map(([name, rawCommand]) => ({
        name,
        description: rawCommand.desc ?? "",
        returnType: rawCommand.return_type ?? "Object",
        arguments: Object.values(rawCommand.arguments ?? {}).map((arg) => ({
            name: arg.name ?? "arg",
            type: arg.type ?? "Object",
            optional: Boolean(arg.optional),
            description: arg.desc,
        })),
    } satisfies ExpressionMember));

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

function toSelectOptions(typeName: string): SelectOption[] {
    const breakdown = getTypeBreakdown(CM, typeName);
    const options = breakdown.getOptionData().options;
    if (!options) {
        return [];
    }

    return options.map((option) => ({
        label: option,
        value: option,
    }));
}

export function getExpressionValueSource(typeName: string): ExpressionValueSource {
    const cached = valueSourceCache.get(typeName);
    if (cached) {
        return cached;
    }

    if (getRawPlaceholder(typeName)) {
        const source: ExpressionValueSource = {
            kind: "placeholder",
            placeholderType: typeName,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    const breakdown = getTypeBreakdown(CM, typeName);
    if (breakdown.child?.[0] && getRawPlaceholder(breakdown.child[0].element)) {
        const source: ExpressionValueSource = {
            kind: "placeholder",
            placeholderType: breakdown.child[0].element,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    if (breakdown.element === "Map" && breakdown.child?.[0]) {
        const keyOptions = toSelectOptions(breakdown.child[0].element);
        if (keyOptions.length > 0) {
            const source: ExpressionValueSource = {
                kind: "options",
                options: keyOptions,
            };
            valueSourceCache.set(typeName, source);
            return source;
        }
    }

    const options = toSelectOptions(typeName);
    if (options.length > 0) {
        const source: ExpressionValueSource = {
            kind: "options",
            options,
        };
        valueSourceCache.set(typeName, source);
        return source;
    }

    const source: ExpressionValueSource = { kind: "unknown" };
    valueSourceCache.set(typeName, source);
    return source;
}

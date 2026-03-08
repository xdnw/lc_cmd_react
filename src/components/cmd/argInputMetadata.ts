import type { SelectOption } from "./selectValueUtils";
import { toPlainSelectOptions } from "./selectValueUtils";
import { toPlaceholderName, type TypeBreakdown } from "@/utils/Command";

type OptionData = ReturnType<TypeBreakdown["getOptionData"]>;

export type ArgInputSupport = {
    supported: boolean;
    reason?: string;
};

export type ArgInputResolutionKind =
    | "font-options"
    | "static-options"
    | "composite-query"
    | "placeholder-expression"
    | "typed-placeholder"
    | "placeholder-string"
    | "wysiwyg"
    | "textarea"
    | "integer-list"
    | "placeholder-class"
    | "set"
    | "query"
    | "boolean"
    | "time"
    | "timediff"
    | "map"
    | "color"
    | "number"
    | "spreadsheet"
    | "google-doc"
    | "dbwar"
    | "dbcity"
    | "message"
    | "cityranges"
    | "uuid"
    | "mmr"
    | "mmr-double"
    | "string"
    | "taxrate"
    | "custom-condition-message"
    | "unknown";

export type ArgInputResolution = {
    kind: ArgInputResolutionKind;
    componentName: string;
    support: ArgInputSupport;
    optionData: OptionData;
    querySource?: string;
};

function unsupported(reason: string): ArgInputSupport {
    return { supported: false, reason };
}

function supported(): ArgInputSupport {
    return { supported: true };
}

function getQuerySource(optionData: OptionData): string | undefined {
    if (optionData.composite.length > 0) {
        return optionData.composite.join(", ");
    }
    if (optionData.query) {
        return optionData.typeKey;
    }
    return undefined;
}

export function isIntegerListType(breakdown: TypeBreakdown): boolean {
    return (breakdown.element === "List" || breakdown.element === "Set")
        && breakdown.child?.[0].element === "Integer";
}

function isCollectionType(breakdown: TypeBreakdown): boolean {
    const lower = breakdown.element.toLowerCase();
    return lower === "set" || lower === "list";
}

export function isPlaceholderClass(breakdown: TypeBreakdown): boolean {
    return breakdown.element.startsWith("Class") && Boolean(breakdown.annotations?.includes("PlaceholderType"));
}

export function buildPlaceholderTypeOptions(breakdown: TypeBreakdown): SelectOption[] {
    const rawTypes = breakdown.map.getPlaceholderTypes(false);
    return rawTypes.map((rawType) => {
        const label = toPlaceholderName(rawType);
        const aliases = new Set<string>([
            rawType,
            rawType.toLowerCase(),
            label.toLowerCase(),
        ]);
        aliases.delete(label);

        return {
            label,
            value: label,
            aliases: Array.from(aliases).filter(Boolean),
        } satisfies SelectOption;
    });
}

export function buildStaticOptions(breakdown: TypeBreakdown): SelectOption[] | null {
    if (isPlaceholderClass(breakdown)) {
        return buildPlaceholderTypeOptions(breakdown);
    }

    const options = breakdown.getOptionData().options;
    if (!options) {
        return null;
    }

    return toPlainSelectOptions(options);
}

function isPlaceholderExpressionType(breakdown: TypeBreakdown): boolean {
    const children = breakdown.child;
    const placeholderType = children?.[0]?.element;
    if (!children || !placeholderType || !(placeholderType in breakdown.map.data.placeholders)) {
        return false;
    }

    if (breakdown.element === "Predicate") {
        return true;
    }

    if (breakdown.element === "Set") {
        return true;
    }

    if (breakdown.element !== "TypedFunction" || !children[1]) {
        return false;
    }

    return children[1].element === "String" || children[1].element === "Double";
}

export function resolveArgInput(breakdown: TypeBreakdown): ArgInputResolution {
    const optionData = breakdown.getOptionData();
    const placeholder = breakdown.getPlaceholder();
    const lower = breakdown.element.toLowerCase();

    if (isPlaceholderExpressionType(breakdown)) {
        return {
            kind: "placeholder-expression",
            componentName: "PlaceholderExpressionInput",
            support: supported(),
            optionData,
        };
    }

    if (isPlaceholderClass(breakdown)) {
        return { kind: "placeholder-class", componentName: "ListComponentBreakdown", support: supported(), optionData };
    }

    if (lower === "font" && optionData.options) {
        return { kind: "font-options", componentName: "FontInput", support: supported(), optionData };
    }

    if (optionData.options) {
        return { kind: "static-options", componentName: "ListComponentOptions", support: supported(), optionData };
    }

    if (optionData.composite.length > 0) {
        return {
            kind: "composite-query",
            componentName: "CompositeQueryComponent",
            support: supported(),
            optionData,
            querySource: getQuerySource(optionData),
        };
    }

    if (placeholder != null) {
        if (lower === "typedfunction") {
            if (!breakdown.child || breakdown.child.length < 2) {
                return {
                    kind: "unknown",
                    componentName: "UnknownType",
                    support: unsupported("TypedFunction is missing child type metadata"),
                    optionData,
                };
            }
            return { kind: "typed-placeholder", componentName: "TypedInput", support: supported(), optionData };
        }

        return { kind: "placeholder-string", componentName: "StringInput", support: supported(), optionData };
    }

    if (breakdown.annotations?.includes("WYSIWYG")) {
        return { kind: "wysiwyg", componentName: "HtmlEditor", support: supported(), optionData };
    }

    if (breakdown.annotations?.includes("TextArea")) {
        return { kind: "textarea", componentName: "TextInput", support: supported(), optionData };
    }

    if (isIntegerListType(breakdown)) {
        return { kind: "integer-list", componentName: "StringInput", support: supported(), optionData };
    }

    if (isCollectionType(breakdown)) {
        if (!breakdown.child?.[0]) {
            return {
                kind: "unknown",
                componentName: "UnknownType",
                support: unsupported("Set type is missing child type metadata"),
                optionData,
            };
        }

        if (optionData.query) {
            return {
                kind: "query",
                componentName: "QueryComponent",
                support: supported(),
                optionData,
                querySource: getQuerySource(optionData),
            };
        }

        return { kind: "set", componentName: "SetInput", support: supported(), optionData };
    }

    if (lower === "boolean") {
        return {
            kind: "boolean",
            componentName: breakdown.element === "Boolean" ? "TriStateInput" : "BooleanInput",
            support: supported(),
            optionData,
        };
    }

    if (lower === "long" && breakdown.annotations?.includes("Timestamp")) {
        return { kind: "time", componentName: "TimeInput", support: supported(), optionData };
    }

    if (lower === "long" && breakdown.annotations?.includes("Timediff")) {
        return { kind: "timediff", componentName: "TimeDiffInput", support: supported(), optionData };
    }

    const simpleKinds: Partial<Record<string, ArgInputResolution>> = {
        map: { kind: "map", componentName: "MapInput", support: supported(), optionData },
        color: { kind: "color", componentName: "ColorInput", support: supported(), optionData },
        double: { kind: "number", componentName: "NumberInput", support: supported(), optionData },
        number: { kind: "number", componentName: "NumberInput", support: supported(), optionData },
        long: { kind: "number", componentName: "NumberInput", support: supported(), optionData },
        integer: { kind: "number", componentName: "NumberInput", support: supported(), optionData },
        int: { kind: "number", componentName: "NumberInput", support: supported(), optionData },
        transfersheet: { kind: "spreadsheet", componentName: "StringInput", support: supported(), optionData },
        spreadsheet: { kind: "spreadsheet", componentName: "StringInput", support: supported(), optionData },
        googledoc: { kind: "google-doc", componentName: "StringInput", support: supported(), optionData },
        dbwar: { kind: "dbwar", componentName: "StringInput", support: supported(), optionData },
        dbcity: { kind: "dbcity", componentName: "StringInput", support: supported(), optionData },
        message: { kind: "message", componentName: "StringInput", support: supported(), optionData },
        cityranges: { kind: "cityranges", componentName: "CityRanges", support: supported(), optionData },
        uuid: { kind: "uuid", componentName: "StringInput", support: supported(), optionData },
        mmrint: { kind: "mmr", componentName: "MmrInput", support: supported(), optionData },
        mmrmatcher: { kind: "mmr", componentName: "MmrInput", support: supported(), optionData },
        mmrdouble: { kind: "mmr-double", componentName: "MmrDoubleInput", support: supported(), optionData },
        string: { kind: "string", componentName: "StringInput", support: supported(), optionData },
        taxrate: { kind: "taxrate", componentName: "TaxRateInput", support: supported(), optionData },
        customconditionmessage: { kind: "custom-condition-message", componentName: "CustomConditionMessageInput", support: supported(), optionData },
    };

    const simpleResolution = simpleKinds[lower];
    if (simpleResolution) {
        return simpleResolution;
    }

    if (optionData.query) {
        return {
            kind: "query",
            componentName: "QueryComponent",
            support: supported(),
            optionData,
            querySource: getQuerySource(optionData),
        };
    }

    return {
        kind: "unknown",
        componentName: "UnknownType",
        support: unsupported(`Unsupported input control for type ${breakdown.element} | ${JSON.stringify(breakdown)}`),
        optionData,
    };
}
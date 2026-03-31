import type { SelectOption } from "./selectValueUtils";
import { toPlainSelectOptions } from "./selectValueUtils";
import { toPlaceholderName, type TypeBreakdown } from "@/utils/Command";
import { getPlaceholderExpressionDescriptor } from "./expression/expressionTypes";
import { REGEX_PATTERN } from "@/lib/regex-patterns";

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
    | "citybuild"
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
    booleanMode?: "boolean" | "tri-state";
    numberIsFloat?: boolean;
    textInputConfig?: {
        placeholder?: string;
        filter?: string;
        filterHelp?: string;
    };
    typedPlaceholderConfig?: {
        placeholderName: string;
        valueType: string;
    };
    allowWildcard?: boolean;
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
        return optionData.queryTypeKey;
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

    const optionData = breakdown.getOptionData();
    const options = optionData.options;
    if (!options) {
        return null;
    }

    return toPlainSelectOptions(options, optionData.subtext);
}

export function isPlaceholderExpressionType(breakdown: TypeBreakdown): boolean {
    return getPlaceholderExpressionDescriptor(breakdown) != null;
}

const ARG_INPUT_RESOLUTION_CACHE = new WeakMap<TypeBreakdown, ArgInputResolution>();

export function resolveArgInput(breakdown: TypeBreakdown): ArgInputResolution {
    const cached = ARG_INPUT_RESOLUTION_CACHE.get(breakdown);
    if (cached) {
        return cached;
    }

    const resolution = resolveArgInputUncached(breakdown);
    ARG_INPUT_RESOLUTION_CACHE.set(breakdown, resolution);
    return resolution;
}

function resolveArgInputUncached(breakdown: TypeBreakdown): ArgInputResolution {
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
            return {
                kind: "typed-placeholder",
                componentName: "TypedInput",
                support: supported(),
                optionData,
                typedPlaceholderConfig: {
                    placeholderName: breakdown.child[0].element,
                    valueType: breakdown.child[1].element,
                },
            };
        }

        return buildTextInputResolution("placeholder-string", optionData, {
            placeholder: breakdown.element,
        });
    }

    if (breakdown.annotations?.includes("WYSIWYG")) {
        return { kind: "wysiwyg", componentName: "HtmlEditor", support: supported(), optionData };
    }

    if (breakdown.annotations?.includes("TextArea")) {
        return { kind: "textarea", componentName: "TextInput", support: supported(), optionData };
    }

    if (isIntegerListType(breakdown)) {
        return buildTextInputResolution("integer-list", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.NUMBER_LIST,
            filterHelp: "a comma separated list of numbers",
        });
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

    // Annotated string families use the base String query config, but they must
    // still resolve to the query-backed selector instead of the generic textbox.
    if (lower === "string" && optionData.query && breakdown.annotations) {
        return {
            kind: "query",
            componentName: "QueryComponent",
            support: supported(),
            optionData,
            querySource: getQuerySource(optionData),
        };
    }

    if (lower === "boolean") {
        return {
            kind: "boolean",
            componentName: breakdown.element === "Boolean" ? "TriStateInput" : "BooleanInput",
            support: supported(),
            optionData,
            booleanMode: breakdown.element === "Boolean" ? "tri-state" : "boolean",
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
        double: { kind: "number", componentName: "NumberInput", support: supported(), optionData, numberIsFloat: true },
        number: { kind: "number", componentName: "NumberInput", support: supported(), optionData, numberIsFloat: true },
        long: { kind: "number", componentName: "NumberInput", support: supported(), optionData, numberIsFloat: false },
        integer: { kind: "number", componentName: "NumberInput", support: supported(), optionData, numberIsFloat: false },
        int: { kind: "number", componentName: "NumberInput", support: supported(), optionData, numberIsFloat: false },
        transfersheet: buildTextInputResolution("spreadsheet", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.SPREADSHEET,
            filterHelp: "a link to a google sheet",
        }),
        spreadsheet: buildTextInputResolution("spreadsheet", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.SPREADSHEET,
            filterHelp: "a link to a google sheet",
        }),
        googledoc: buildTextInputResolution("google-doc", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.GOOGLE_DOC,
            filterHelp: "a link to a google document",
        }),
        dbwar: buildTextInputResolution("dbwar", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.WAR,
            filterHelp: "a war timeline url",
        }),
        dbcity: buildTextInputResolution("dbcity", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.CITY,
            filterHelp: "a city url",
        }),
        citybuild: { kind: "citybuild", componentName: "CityBuildInput", support: supported(), optionData },
        message: buildTextInputResolution("message", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.CHANNEL,
            filterHelp: "a discord message url",
        }),
        cityranges: { kind: "cityranges", componentName: "CityRanges", support: supported(), optionData },
        uuid: buildTextInputResolution("uuid", optionData, {
            placeholder: breakdown.element,
            filter: REGEX_PATTERN.UUID,
            filterHelp: "a uuid in the form XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
        }),
        mmrint: { kind: "mmr", componentName: "MmrInput", support: supported(), optionData, allowWildcard: false },
        mmrmatcher: { kind: "mmr", componentName: "MmrInput", support: supported(), optionData, allowWildcard: true },
        mmrdouble: { kind: "mmr-double", componentName: "MmrDoubleInput", support: supported(), optionData },
        string: buildTextInputResolution("string", optionData, {
            placeholder: breakdown.element,
        }),
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

function buildTextInputResolution(
    kind: Extract<ArgInputResolutionKind, "placeholder-string" | "integer-list" | "spreadsheet" | "google-doc" | "dbwar" | "dbcity" | "message" | "uuid" | "string">,
    optionData: OptionData,
    config: ArgInputResolution["textInputConfig"],
): ArgInputResolution {
    return {
        kind,
        componentName: "StringInput",
        support: supported(),
        optionData,
        textInputConfig: config,
    };
}
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { CM, getTypeBreakdown } from "@/utils/Command";
import { buildStaticOptions } from "../argInputMetadata";
import { toPlainSelectOptions, type SelectOption } from "../selectValueUtils";
import {
    combineCompositeSourceResults,
    resolveQueryOptionsPayload,
    toCompositeSourceResult,
} from "../queryOptionUtils";
import {
    getExpressionTypeSchema,
    type ExpressionValueSourceRef,
} from "./expressionSchema";

export type ExpressionValueSourceRegistryEntry = {
    status: "ready" | "loading" | "error";
    sourceKind: ExpressionValueSourceRef["kind"];
    typeLabel: string;
    options: SelectOption[];
    warning?: string;
    error?: string;
};

export type ExpressionValueSourceRegistry = Record<string, ExpressionValueSourceRegistryEntry>;

type QueryRequest = {
    requestKey: string;
    type: string;
};

function isCompositeSourceResult(
    value: ReturnType<typeof toCompositeSourceResult> | null,
): value is ReturnType<typeof toCompositeSourceResult> {
    return value != null;
}

function getTypeLabel(typeName: string): string {
    const schema = getExpressionTypeSchema(typeName);
    if (schema) {
        return typeName.replace(/^DB/, "");
    }
    return typeName.replace(/^DB/, "");
}

function dedupeRequests(requests: ExpressionValueSourceRef[]): ExpressionValueSourceRef[] {
    const seen = new Set<string>();
    return requests.filter((request) => {
        if (seen.has(request.cacheKey)) {
            return false;
        }
        seen.add(request.cacheKey);
        return true;
    });
}

function flattenQueryRequests(requests: ExpressionValueSourceRef[]): QueryRequest[] {
    const flattened: QueryRequest[] = [];

    const visit = (request: ExpressionValueSourceRef) => {
        if (request.kind === "query-options") {
            flattened.push({
                requestKey: `${request.cacheKey}:${request.typeKey}`,
                type: request.typeKey,
            });
            return;
        }

        if (request.kind === "composite-query-options") {
            request.composite.forEach((type) => {
                flattened.push({
                    requestKey: `${request.cacheKey}:${type}`,
                    type,
                });
            });
            return;
        }

        if (request.kind === "map-key-options") {
            visit(request.keySource);
        }
    };

    requests.forEach(visit);
    return flattened;
}

function getStaticOptionsForType(typeName: string): SelectOption[] {
    const breakdown = getTypeBreakdown(CM, typeName);
    return buildStaticOptions(breakdown)
        ?? toPlainSelectOptions(breakdown.getOptionData().options ?? []);
}

function buildPlaceholderRegistryEntry(request: Extract<ExpressionValueSourceRef, { kind: "placeholder" }>): ExpressionValueSourceRegistryEntry {
    const schema = getExpressionTypeSchema(request.placeholderType);
    return {
        status: "ready",
        sourceKind: request.kind,
        typeLabel: getTypeLabel(request.placeholderType),
        options: (schema?.selectors ?? []).map((selector) => ({
            label: selector.label,
            value: selector.insertText,
            subtext: selector.description,
        })),
    };
}

export function useExpressionValueSources(requests: ExpressionValueSourceRef[]): ExpressionValueSourceRegistry {
    const uniqueRequests = useMemo(() => dedupeRequests(requests), [requests]);
    const queryRequests = useMemo(() => flattenQueryRequests(uniqueRequests), [uniqueRequests]);

    const queryResults = useQueries({
        queries: queryRequests.map((request) => bulkQueryOptions(
            INPUT_OPTIONS.endpoint,
            { type: request.type },
            false,
        )),
    });

    return useMemo(() => {
        const queryByRequestKey = new Map<string, (typeof queryResults)[number]>();
        queryRequests.forEach((request, index) => {
            queryByRequestKey.set(request.requestKey, queryResults[index]);
        });

        const registry: ExpressionValueSourceRegistry = {};

        const resolveRequest = (request: ExpressionValueSourceRef): ExpressionValueSourceRegistryEntry => {
            const existing = registry[request.cacheKey];
            if (existing) {
                return existing;
            }

            if (request.kind === "placeholder") {
                const entry = buildPlaceholderRegistryEntry(request);
                registry[request.cacheKey] = entry;
                return entry;
            }

            if (request.kind === "static-options") {
                const entry: ExpressionValueSourceRegistryEntry = {
                    status: "ready",
                    sourceKind: request.kind,
                    typeLabel: getTypeLabel(request.typeName),
                    options: getStaticOptionsForType(request.typeName),
                };
                registry[request.cacheKey] = entry;
                return entry;
            }

            if (request.kind === "query-options") {
                const query = queryByRequestKey.get(`${request.cacheKey}:${request.typeKey}`);
                if (!query || query.isLoading) {
                    const entry: ExpressionValueSourceRegistryEntry = {
                        status: "loading",
                        sourceKind: request.kind,
                        typeLabel: getTypeLabel(request.typeName),
                        options: [],
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                if (query.error) {
                    const entry: ExpressionValueSourceRegistryEntry = {
                        status: "error",
                        sourceKind: request.kind,
                        typeLabel: getTypeLabel(request.typeName),
                        options: [],
                        error: query.error instanceof Error ? query.error.message : String(query.error),
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                const resolved = resolveQueryOptionsPayload(request.typeKey, query.data?.data);
                const entry: ExpressionValueSourceRegistryEntry = {
                    status: resolved.error ? "error" : "ready",
                    sourceKind: request.kind,
                    typeLabel: getTypeLabel(request.typeName),
                    options: resolved.options,
                    error: resolved.error,
                };
                registry[request.cacheKey] = entry;
                return entry;
            }

            if (request.kind === "composite-query-options") {
                const resultEntries = request.composite.map((type) => {
                    const query = queryByRequestKey.get(`${request.cacheKey}:${type}`);
                    if (!query || query.isLoading) {
                        return null;
                    }
                    return toCompositeSourceResult(type, query);
                });

                if (resultEntries.some((result) => result == null)) {
                    const entry: ExpressionValueSourceRegistryEntry = {
                        status: "loading",
                        sourceKind: request.kind,
                        typeLabel: getTypeLabel(request.typeName),
                        options: [],
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                const combined = combineCompositeSourceResults(resultEntries.filter(isCompositeSourceResult));
                const entry: ExpressionValueSourceRegistryEntry = {
                    status: combined.blockingError ? "error" : "ready",
                    sourceKind: request.kind,
                    typeLabel: getTypeLabel(request.typeName),
                    options: combined.options,
                    warning: combined.warning,
                    error: combined.blockingError,
                };
                registry[request.cacheKey] = entry;
                return entry;
            }

            if (request.kind === "map-key-options") {
                const keyEntry = resolveRequest(request.keySource);
                const entry: ExpressionValueSourceRegistryEntry = {
                    status: keyEntry.status,
                    sourceKind: request.kind,
                    typeLabel: `${getTypeLabel(request.keyType)} key`,
                    options: keyEntry.options,
                    warning: keyEntry.warning,
                    error: keyEntry.error,
                };
                registry[request.cacheKey] = entry;
                return entry;
            }

            const entry: ExpressionValueSourceRegistryEntry = {
                status: "ready",
                sourceKind: request.kind,
                typeLabel: getTypeLabel(request.typeName),
                options: [],
            };
            registry[request.cacheKey] = entry;
            return entry;
        };

        uniqueRequests.forEach(resolveRequest);
        return registry;
    }, [queryRequests, queryResults, uniqueRequests]);
}

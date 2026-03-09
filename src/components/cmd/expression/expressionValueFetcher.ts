import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { INPUT_OPTIONS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { CM, getTypeBreakdown } from "@/utils/Command";

import { buildStaticOptions } from "../argInputMetadata";
import {
    ASYNC_QUERY_OPTION_MIN_QUERY_LENGTH,
    ASYNC_QUERY_OPTION_THRESHOLD,
    combineCompositeSourceResults,
    resolveQueryOptionsPayload,
    toCompositeSourceResult,
} from "../queryOptionUtils";
import { ensureQueryOptionDataset, searchQueryOptionDataset } from "../queryOptionWorkerClient";
import { toPlainSelectOptions, type SelectOption } from "../selectValueUtils";
import {
    getExpressionTypeSchema,
    type ExpressionValueSourceRef,
} from "./expressionSchema";

export type ExpressionValueSourceRegistryEntry = {
    status: "ready" | "loading" | "error";
    sourceKind: ExpressionValueSourceRef["kind"];
    typeLabel: string;
    options: SelectOption[];
    optionCount?: number;
    workerDatasetId?: string;
    hasAnyMatch?: boolean;
    hasExactMatch?: boolean;
    warning?: string;
    error?: string;
};

export type ExpressionValueSourceRegistry = Record<string, ExpressionValueSourceRegistryEntry>;

type BatchedQueryRequest = {
    requestKey: string;
    cacheKey: string;
    type: string;
};

type AsyncQueryOptionState = {
    token: string;
    status: "loading" | "ready" | "error";
    optionCount: number;
    options: SelectOption[];
    hasAnyMatch?: boolean;
    hasExactMatch?: boolean;
    error?: string;
};

type QueryOptionRequest = Extract<ExpressionValueSourceRef, { kind: "query-options" }>;

const typeLabelCache = new Map<string, string>();
const staticOptionsCache = new Map<string, SelectOption[]>();
const placeholderEntryCache = new Map<string, ExpressionValueSourceRegistryEntry>();

function getRequestSignature(requests: ExpressionValueSourceRef[]): string {
    return requests.map((request) => request.cacheKey).join("|");
}

function getSearchTokenSignature(searchTokensByCacheKey: Record<string, string>): string {
    return Object.entries(searchTokensByCacheKey)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([cacheKey, token]) => `${cacheKey}:${token}`)
        .join("|");
}

function isCompositeSourceResult(
    value: ReturnType<typeof toCompositeSourceResult> | null,
): value is ReturnType<typeof toCompositeSourceResult> {
    return value != null;
}

function getTypeLabel(typeName: string): string {
    const cached = typeLabelCache.get(typeName);
    if (cached) {
        return cached;
    }

    const schema = getExpressionTypeSchema(typeName);
    const label = schema ? typeName.replace(/^DB/, "") : typeName.replace(/^DB/, "");
    typeLabelCache.set(typeName, label);
    return label;
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

function flattenBatchedQueryRequests(requests: ExpressionValueSourceRef[]): BatchedQueryRequest[] {
    const flattened: BatchedQueryRequest[] = [];

    const visit = (request: ExpressionValueSourceRef) => {
        if (request.kind === "composite-query-options") {
            request.composite.forEach((type) => {
                flattened.push({
                    requestKey: `${request.cacheKey}:${type}`,
                    cacheKey: request.cacheKey,
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

function getQueryOptionRequests(requests: ExpressionValueSourceRef[]): QueryOptionRequest[] {
    return requests.filter((request): request is QueryOptionRequest => request.kind === "query-options");
}

function shouldSearchAsyncQueryOptions(token: string, optionCount: number): boolean {
    return token.length === 0
        || optionCount < ASYNC_QUERY_OPTION_THRESHOLD
        || token.length >= ASYNC_QUERY_OPTION_MIN_QUERY_LENGTH;
}

function buildAsyncQueryLoadingState(
    token: string,
    currentState: AsyncQueryOptionState | undefined,
): AsyncQueryOptionState {
    return {
        token,
        status: "loading",
        optionCount: currentState?.optionCount ?? 0,
        options: [],
    };
}

function buildAsyncQueryErrorState(
    token: string,
    currentState: AsyncQueryOptionState | undefined,
    error: unknown,
): AsyncQueryOptionState {
    return {
        token,
        status: "error",
        optionCount: currentState?.optionCount ?? 0,
        options: [],
        error: error instanceof Error ? error.message : String(error),
    };
}

function buildAsyncQueryReadyState(
    token: string,
    optionCount: number,
    searchResult: {
        options: SelectOption[];
        hasAnyMatch?: boolean;
        hasExactMatch?: boolean;
    },
): AsyncQueryOptionState {
    return {
        token,
        status: "ready",
        optionCount,
        options: searchResult.options,
        hasAnyMatch: searchResult.hasAnyMatch,
        hasExactMatch: searchResult.hasExactMatch,
    };
}

function useAsyncQueryOptionStates(
    requests: QueryOptionRequest[],
    searchTokensByCacheKey: Record<string, string>,
    enabled: boolean,
): Record<string, AsyncQueryOptionState> {
    const [asyncQueryOptions, setAsyncQueryOptions] = useState<Record<string, AsyncQueryOptionState>>({});
    const asyncQueryOptionsRef = useRef<Record<string, AsyncQueryOptionState>>({});
    const asyncRequestVersionRef = useRef<Record<string, number>>({});
    const requestSignature = useMemo(
        () => requests.map((request) => request.cacheKey).join("|"),
        [requests],
    );
    const searchTokenSignature = useMemo(
        () => getSearchTokenSignature(searchTokensByCacheKey),
        [searchTokensByCacheKey],
    );

    useEffect(() => {
        asyncQueryOptionsRef.current = asyncQueryOptions;
    }, [asyncQueryOptions]);

    useEffect(() => {
        if (!enabled || requests.length === 0) {
            setAsyncQueryOptions((current) => {
                if (Object.keys(current).length === 0) {
                    return current;
                }
                return {};
            });
            asyncQueryOptionsRef.current = {};
            asyncRequestVersionRef.current = {};
            return;
        }

        let disposed = false;
        const activeKeys = new Set<string>();

        requests.forEach((request) => {
            activeKeys.add(request.cacheKey);
            const token = (searchTokensByCacheKey[request.cacheKey] ?? "").trim();
            const currentState = asyncQueryOptionsRef.current[request.cacheKey];
            if (currentState?.token === token) {
                return;
            }

            const requestVersion = (asyncRequestVersionRef.current[request.cacheKey] ?? 0) + 1;
            asyncRequestVersionRef.current[request.cacheKey] = requestVersion;

            setAsyncQueryOptions((current) => ({
                ...current,
                [request.cacheKey]: buildAsyncQueryLoadingState(token, current[request.cacheKey]),
            }));

            void (async () => {
                const optionCount = (currentState?.optionCount ?? 0) > 0
                    ? currentState.optionCount
                    : await ensureQueryOptionDataset(request.cacheKey, request.typeKey);
                const searchResult = shouldSearchAsyncQueryOptions(token, optionCount)
                    ? await searchQueryOptionDataset(request.cacheKey, token)
                    : { options: [] as SelectOption[], hasAnyMatch: undefined, hasExactMatch: undefined };

                if (disposed || asyncRequestVersionRef.current[request.cacheKey] !== requestVersion) {
                    return;
                }

                setAsyncQueryOptions((current) => ({
                    ...current,
                    [request.cacheKey]: buildAsyncQueryReadyState(token, optionCount, searchResult),
                }));
            })().catch((error: unknown) => {
                if (disposed || asyncRequestVersionRef.current[request.cacheKey] !== requestVersion) {
                    return;
                }

                setAsyncQueryOptions((current) => ({
                    ...current,
                    [request.cacheKey]: buildAsyncQueryErrorState(token, current[request.cacheKey], error),
                }));
            });
        });

        setAsyncQueryOptions((current) => {
            let changed = false;
            const next: Record<string, AsyncQueryOptionState> = {};
            Object.entries(current).forEach(([cacheKey, value]) => {
                if (activeKeys.has(cacheKey)) {
                    next[cacheKey] = value;
                    return;
                }
                delete asyncRequestVersionRef.current[cacheKey];
                changed = true;
            });
            return changed ? next : current;
        });

        return () => {
            disposed = true;
        };
    }, [enabled, requestSignature, requests, searchTokenSignature, searchTokensByCacheKey]);

    return asyncQueryOptions;
}

function getStaticOptionsForType(typeName: string): SelectOption[] {
    const cached = staticOptionsCache.get(typeName);
    if (cached) {
        return cached;
    }

    const breakdown = getTypeBreakdown(CM, typeName);
    const options = buildStaticOptions(breakdown)
        ?? toPlainSelectOptions(breakdown.getOptionData().options ?? []);
    staticOptionsCache.set(typeName, options);
    return options;
}

function buildPlaceholderRegistryEntry(request: Extract<ExpressionValueSourceRef, { kind: "placeholder" }>): ExpressionValueSourceRegistryEntry {
    const cached = placeholderEntryCache.get(request.cacheKey);
    if (cached) {
        return cached;
    }

    const schema = getExpressionTypeSchema(request.placeholderType);
    const entry: ExpressionValueSourceRegistryEntry = {
        status: "ready",
        sourceKind: request.kind,
        typeLabel: getTypeLabel(request.placeholderType),
        options: (schema?.selectors ?? []).map((selector) => ({
            label: selector.label,
            value: selector.insertText,
            subtext: selector.description,
        })),
    };
    placeholderEntryCache.set(request.cacheKey, entry);
    return entry;
}

export function useExpressionValueSources(
    requests: ExpressionValueSourceRef[],
    searchTokensByCacheKey: Record<string, string> = {},
    enableQueryOptionFetch: boolean = false,
): ExpressionValueSourceRegistry {
    const uniqueRequests = useMemo(() => dedupeRequests(requests), [requests]);
    const queryOptionRequests = useMemo(() => getQueryOptionRequests(uniqueRequests), [uniqueRequests]);
    const batchedQueryRequests = useMemo(() => flattenBatchedQueryRequests(uniqueRequests), [uniqueRequests]);

    const batchedQueryResults = useQueries({
        queries: batchedQueryRequests.map((request) => bulkQueryOptions(
            INPUT_OPTIONS.endpoint,
            { type: request.type },
            false,
        )),
    });
    const asyncQueryOptions = useAsyncQueryOptionStates(
        queryOptionRequests,
        searchTokensByCacheKey,
        enableQueryOptionFetch,
    );

    return useMemo(() => {
        const queryByRequestKey = new Map<string, (typeof batchedQueryResults)[number]>();
        batchedQueryRequests.forEach((request, index) => {
            queryByRequestKey.set(request.requestKey, batchedQueryResults[index]);
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
                const asyncState = asyncQueryOptions[request.cacheKey];
                const entry: ExpressionValueSourceRegistryEntry = {
                    status: asyncState?.status ?? "ready",
                    sourceKind: request.kind,
                    typeLabel: getTypeLabel(request.typeName),
                    options: asyncState?.options ?? [],
                    optionCount: asyncState?.optionCount,
                    workerDatasetId: request.cacheKey,
                    hasAnyMatch: asyncState?.hasAnyMatch,
                    hasExactMatch: asyncState?.hasExactMatch,
                    error: asyncState?.error,
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
                    optionCount: keyEntry.optionCount,
                    workerDatasetId: keyEntry.workerDatasetId,
                    hasAnyMatch: keyEntry.hasAnyMatch,
                    hasExactMatch: keyEntry.hasExactMatch,
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
    }, [asyncQueryOptions, batchedQueryRequests, batchedQueryResults, uniqueRequests]);
}

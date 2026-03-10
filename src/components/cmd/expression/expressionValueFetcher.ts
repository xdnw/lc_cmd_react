import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";

import type { WebError, WebOptions } from "@/lib/apitypes";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { CM, getTypeBreakdown } from "@/utils/Command";

import { buildStaticOptions } from "../argInputMetadata";
import {
    ASYNC_QUERY_OPTION_MIN_QUERY_LENGTH,
    ASYNC_QUERY_OPTION_THRESHOLD,
    combineCompositeSourceResults,
    getQueryOptionCount,
    resolveQueryOptionsPayload,
    shouldSearchDeferredQueryOptions,
    shouldUseDeferredQueryOptionsPayload,
} from "../queryOptionUtils";
import { ensureQueryOptionDatasetFromPayload, searchQueryOptionDataset } from "../queryOptionWorkerClient";
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

type QueryPayloadSource = {
    requestKey: string;
    cacheKey: string;
    type: string;
    loading: boolean;
    payload?: WebOptions | WebError | unknown;
    error?: string;
    optionCount: number;
};

type BatchedQueryResult = {
    isLoading: boolean;
    error: unknown;
    data?: {
        data?: WebOptions | WebError | unknown;
    };
};

type AsyncQueryOptionState = {
    token: string;
    status: "loading" | "ready" | "error";
    optionCount: number;
    options: SelectOption[];
    hasAnyMatch?: boolean;
    hasExactMatch?: boolean;
    warning?: string;
    error?: string;
};

type AsyncQueryRequest = Extract<ExpressionValueSourceRef, { kind: "query-options" | "composite-query-options" }>;

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

function getBatchedQueryResultSignature(
    requests: BatchedQueryRequest[],
    results: readonly BatchedQueryResult[],
): string {
    return requests.map((request, index) => {
        const result = results[index];
        const payload = result?.data?.data;
        const error = result?.error ? getPayloadError(result.error) : "";
        return [
            request.requestKey,
            result?.isLoading ? "loading" : "ready",
            getQueryOptionCount(payload),
            error,
        ].join(":");
    }).join("|");
}

function isCompositeSourceResult(
    value: { type: string; options: SelectOption[]; error?: string } | null,
): value is { type: string; options: SelectOption[]; error?: string } {
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
        if (request.kind === "query-options") {
            flattened.push({
                requestKey: request.cacheKey,
                cacheKey: request.cacheKey,
                type: request.typeKey,
            });
            return;
        }

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

function getAsyncQueryRequests(requests: ExpressionValueSourceRef[]): AsyncQueryRequest[] {
    return requests.filter((request): request is AsyncQueryRequest => request.kind === "query-options" || request.kind === "composite-query-options");
}

function shouldSearchAsyncQueryOptions(token: string, optionCount: number): boolean {
    return shouldSearchDeferredQueryOptions(token, optionCount);
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
        warning?: string;
        error?: string;
    },
): AsyncQueryOptionState {
    return {
        token,
        status: searchResult.error ? "error" : "ready",
        optionCount,
        options: searchResult.options,
        hasAnyMatch: searchResult.hasAnyMatch,
        hasExactMatch: searchResult.hasExactMatch,
        warning: searchResult.warning,
        error: searchResult.error,
    };
}

function getPayloadError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function buildQueryPayloadSources(
    request: AsyncQueryRequest,
    queryByRequestKey: Map<string, BatchedQueryResult>,
): QueryPayloadSource[] {
    if (request.kind === "query-options") {
        const query = queryByRequestKey.get(request.cacheKey);
        return [{
            requestKey: request.cacheKey,
            cacheKey: request.cacheKey,
            type: request.typeKey,
            loading: !query || query.isLoading,
            payload: query?.data?.data,
            error: query?.error ? getPayloadError(query.error) : undefined,
            optionCount: getQueryOptionCount(query?.data?.data),
        }];
    }

    return request.composite.map((type) => {
        const requestKey = `${request.cacheKey}:${type}`;
        const query = queryByRequestKey.get(requestKey);
        return {
            requestKey,
            cacheKey: request.cacheKey,
            type,
            loading: !query || query.isLoading,
            payload: query?.data?.data,
            error: query?.error ? getPayloadError(query.error) : undefined,
            optionCount: getQueryOptionCount(query?.data?.data),
        } satisfies QueryPayloadSource;
    });
}

function areQueryPayloadSourcesReady(sources: QueryPayloadSource[]): boolean {
    return sources.length > 0 && sources.every((source) => !source.loading);
}

function getTotalPayloadOptionCount(sources: QueryPayloadSource[]): number {
    return sources.reduce((sum, source) => sum + source.optionCount, 0);
}

function shouldUseAsyncQueryOptions(sources: QueryPayloadSource[]): boolean {
    return getTotalPayloadOptionCount(sources) >= ASYNC_QUERY_OPTION_THRESHOLD;
}

function useAsyncQueryOptionStates(
    requests: AsyncQueryRequest[],
    queryByRequestKey: Map<string, BatchedQueryResult>,
    searchTokensByCacheKey: Record<string, string>,
    enabled: boolean,
    queryPayloadSignature: string,
): Record<string, AsyncQueryOptionState> {
    const [asyncQueryOptions, setAsyncQueryOptions] = useState<Record<string, AsyncQueryOptionState>>({});
    const asyncQueryOptionsRef = useRef<Record<string, AsyncQueryOptionState>>({});
    const asyncRequestVersionRef = useRef<Record<string, number>>({});
    const requestsRef = useRef(requests);
    const queryByRequestKeyRef = useRef(queryByRequestKey);
    const searchTokensRef = useRef(searchTokensByCacheKey);
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

    requestsRef.current = requests;
    queryByRequestKeyRef.current = queryByRequestKey;
    searchTokensRef.current = searchTokensByCacheKey;

    useEffect(() => {
        const latestRequests = requestsRef.current;
        const latestQueryByRequestKey = queryByRequestKeyRef.current;
        const latestSearchTokensByCacheKey = searchTokensRef.current;

        if (!enabled || latestRequests.length === 0) {
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

        latestRequests.forEach((request) => {
            const sources = buildQueryPayloadSources(request, latestQueryByRequestKey);
            if (!areQueryPayloadSourcesReady(sources) || !shouldUseAsyncQueryOptions(sources)) {
                return;
            }

            activeKeys.add(request.cacheKey);
            const token = (latestSearchTokensByCacheKey[request.cacheKey] ?? "").trim();
            const currentState = asyncQueryOptionsRef.current[request.cacheKey];
            const totalOptionCount = getTotalPayloadOptionCount(sources);
            if (currentState?.token === token && currentState.optionCount === totalOptionCount) {
                return;
            }

            if (!shouldSearchAsyncQueryOptions(token, totalOptionCount)) {
                setAsyncQueryOptions((current) => ({
                    ...current,
                    [request.cacheKey]: buildAsyncQueryReadyState(token, totalOptionCount, {
                        options: [],
                        hasAnyMatch: undefined,
                        hasExactMatch: undefined,
                    }),
                }));
                return;
            }

            const requestVersion = (asyncRequestVersionRef.current[request.cacheKey] ?? 0) + 1;
            asyncRequestVersionRef.current[request.cacheKey] = requestVersion;

            setAsyncQueryOptions((current) => ({
                ...current,
                [request.cacheKey]: buildAsyncQueryLoadingState(token, current[request.cacheKey]),
            }));

            void (async () => {
                const searchResults = await Promise.allSettled(sources.map(async (source) => {
                    if (source.error) {
                        return {
                            type: source.type,
                            options: [] as SelectOption[],
                            error: source.error,
                            hasAnyMatch: false,
                            hasExactMatch: false,
                        };
                    }

                    const payload = source.payload;
                    await ensureQueryOptionDatasetFromPayload(`query:${source.type}`, source.type, payload);
                    const searchResult = await searchQueryOptionDataset(`query:${source.type}`, token);

                    return {
                        type: source.type,
                        options: searchResult.options,
                        hasAnyMatch: searchResult.hasAnyMatch,
                        hasExactMatch: searchResult.hasExactMatch,
                    };
                }));

                const settledResults = searchResults.map((result, index) => {
                    if (result.status === "fulfilled") {
                        return result.value;
                    }

                    return {
                        type: sources[index]?.type ?? request.cacheKey,
                        options: [] as SelectOption[],
                        error: getPayloadError(result.reason),
                        hasAnyMatch: false,
                        hasExactMatch: false,
                    };
                });

                const combined = combineCompositeSourceResults(settledResults.map((result) => ({
                    type: result.type,
                    options: result.options,
                    error: result.error,
                })));
                const hasAnyMatch = settledResults.some((result) => result.hasAnyMatch);
                const hasExactMatch = settledResults.some((result) => result.hasExactMatch);

                if (disposed || asyncRequestVersionRef.current[request.cacheKey] !== requestVersion) {
                    return;
                }

                setAsyncQueryOptions((current) => ({
                    ...current,
                    [request.cacheKey]: buildAsyncQueryReadyState(token, totalOptionCount, {
                        options: combined.options,
                        hasAnyMatch,
                        hasExactMatch,
                        warning: combined.warning,
                        error: combined.blockingError,
                    }),
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
    }, [enabled, queryPayloadSignature, requestSignature, searchTokenSignature]);

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
    const asyncQueryRequests = useMemo(() => getAsyncQueryRequests(uniqueRequests), [uniqueRequests]);
    const batchedQueryRequests = useMemo(() => flattenBatchedQueryRequests(uniqueRequests), [uniqueRequests]);

    const batchedQueryResults = useQueries({
        queries: batchedQueryRequests.map((request) => bulkQueryOptions(
            INPUT_OPTIONS.endpoint,
            { type: request.type },
            false,
        )),
    });
    const queryPayloadSignature = useMemo(
        () => getBatchedQueryResultSignature(batchedQueryRequests, batchedQueryResults as BatchedQueryResult[]),
        [batchedQueryRequests, batchedQueryResults],
    );
    const queryByRequestKey = useMemo(() => {
        const map = new Map<string, BatchedQueryResult>();
        batchedQueryRequests.forEach((request, index) => {
            map.set(request.requestKey, batchedQueryResults[index] as BatchedQueryResult);
        });
        return map;
    }, [batchedQueryRequests, batchedQueryResults]);
    const asyncQueryOptions = useAsyncQueryOptionStates(
        asyncQueryRequests,
        queryByRequestKey,
        searchTokensByCacheKey,
        enableQueryOptionFetch,
        queryPayloadSignature,
    );

    return useMemo(() => {
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
                if (asyncState) {
                    const entry: ExpressionValueSourceRegistryEntry = {
                        status: asyncState.status,
                        sourceKind: request.kind,
                        typeLabel: getTypeLabel(request.typeName),
                        options: asyncState.options,
                        optionCount: asyncState.optionCount,
                        workerDatasetId: request.cacheKey,
                        hasAnyMatch: asyncState.hasAnyMatch,
                        hasExactMatch: asyncState.hasExactMatch,
                        warning: asyncState.warning,
                        error: asyncState.error,
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                const query = queryByRequestKey.get(request.cacheKey);
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
                        error: getPayloadError(query.error),
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                const payload = query.data?.data;
                const optionCount = getQueryOptionCount(payload);
                if (shouldUseDeferredQueryOptionsPayload(payload)) {
                    const entry: ExpressionValueSourceRegistryEntry = {
                        status: "ready",
                        sourceKind: request.kind,
                        typeLabel: getTypeLabel(request.typeName),
                        options: [],
                        optionCount,
                        workerDatasetId: request.cacheKey,
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                const resolved = resolveQueryOptionsPayload(request.typeKey, payload);
                const entry: ExpressionValueSourceRegistryEntry = {
                    status: resolved.error ? "error" : "ready",
                    sourceKind: request.kind,
                    typeLabel: getTypeLabel(request.typeName),
                    options: resolved.options,
                    optionCount,
                    error: resolved.error,
                };
                registry[request.cacheKey] = entry;
                return entry;
            }

            if (request.kind === "composite-query-options") {
                const asyncState = asyncQueryOptions[request.cacheKey];
                if (asyncState) {
                    const entry: ExpressionValueSourceRegistryEntry = {
                        status: asyncState.status,
                        sourceKind: request.kind,
                        typeLabel: getTypeLabel(request.typeName),
                        options: asyncState.options,
                        optionCount: asyncState.optionCount,
                        workerDatasetId: request.cacheKey,
                        hasAnyMatch: asyncState.hasAnyMatch,
                        hasExactMatch: asyncState.hasExactMatch,
                        warning: asyncState.warning,
                        error: asyncState.error,
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                const resultEntries = request.composite.map((type) => {
                    const query = queryByRequestKey.get(`${request.cacheKey}:${type}`);
                    if (!query || query.isLoading) {
                        return null;
                    }

                    if (query.error) {
                        return {
                            type,
                            options: [],
                            error: getPayloadError(query.error),
                        };
                    }

                    const resolved = resolveQueryOptionsPayload(type, query.data?.data);
                    return {
                        type,
                        options: resolved.options,
                        error: resolved.error,
                    };
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

                const settledEntries = resultEntries.flatMap((result) => result ? [result] : []);
                const optionCount = request.composite.reduce((sum, type) => {
                    const query = queryByRequestKey.get(`${request.cacheKey}:${type}`);
                    return sum + getQueryOptionCount(query?.data?.data);
                }, 0);
                const hasDeferredPayload = request.composite.some((type) => {
                    const query = queryByRequestKey.get(`${request.cacheKey}:${type}`);
                    return shouldUseDeferredQueryOptionsPayload(query?.data?.data);
                });

                if (hasDeferredPayload) {
                    const entry: ExpressionValueSourceRegistryEntry = {
                        status: "ready",
                        sourceKind: request.kind,
                        typeLabel: getTypeLabel(request.typeName),
                        options: [],
                        optionCount,
                        workerDatasetId: request.cacheKey,
                    };
                    registry[request.cacheKey] = entry;
                    return entry;
                }

                const combined = combineCompositeSourceResults(settledEntries);
                const entry: ExpressionValueSourceRegistryEntry = {
                    status: combined.blockingError ? "error" : "ready",
                    sourceKind: request.kind,
                    typeLabel: getTypeLabel(request.typeName),
                    options: combined.options,
                    optionCount,
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
    }, [asyncQueryOptions, queryPayloadSignature, uniqueRequests]);
}

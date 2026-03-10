import { extractBackendError } from "@/lib/BulkQuery";
import type { WebError, WebOptions } from "@/lib/apitypes";
import {
    buildQuerySelectOptions,
    getQueryOptionCount,
    toCompositeCanonicalOption,
} from "./queryOptionDataset";
import type { SelectOption } from "./selectValueUtils";

export type QueryOptionsResolution = {
    options: SelectOption[];
    error?: string;
};

const resolvedPayloadCache = new WeakMap<object, Map<string, QueryOptionsResolution>>();

export type CompositeSourceResult = {
    type: string;
    options: SelectOption[];
    error?: string;
};

export type CombinedCompositeResult = {
    options: SelectOption[];
    blockingError?: string;
    warning?: string;
};

export type CompositeQueryState = {
    error: unknown;
    data?: {
        data?: WebOptions | WebError | null;
    };
};

export const ASYNC_QUERY_OPTION_THRESHOLD = 5000;
export const ASYNC_QUERY_OPTION_MIN_QUERY_LENGTH = 1;

export function resolveQueryOptionsPayload(type: string, payload: WebOptions | WebError | unknown): QueryOptionsResolution {
    const error = extractBackendError(payload);
    if (error) {
        return { options: [], error };
    }

    if (!payload || typeof payload !== "object") {
        return { options: [], error: `Invalid input_options payload for ${type || "query"}` };
    }

    const cachedByType = resolvedPayloadCache.get(payload);
    const cached = cachedByType?.get(type);
    if (cached) {
        return cached;
    }

    const resolved = { options: buildQuerySelectOptions(type, payload as WebOptions) };
    const nextCachedByType = cachedByType ?? new Map<string, QueryOptionsResolution>();
    nextCachedByType.set(type, resolved);
    if (!cachedByType) {
        resolvedPayloadCache.set(payload, nextCachedByType);
    }

    return resolved;
}

export function shouldUseDeferredQueryOptionsPayload(payload: WebOptions | WebError | unknown): boolean {
    return Boolean(
        payload
        && typeof payload === "object"
        && !extractBackendError(payload)
        && getQueryOptionCount(payload) >= ASYNC_QUERY_OPTION_THRESHOLD,
    );
}

export function shouldSearchDeferredQueryOptions(token: string, optionCount: number): boolean {
    if (optionCount < ASYNC_QUERY_OPTION_THRESHOLD) {
        return true;
    }

    return token.trim().length >= ASYNC_QUERY_OPTION_MIN_QUERY_LENGTH;
}

export function toCompositeSourceResult(type: string, query: CompositeQueryState): CompositeSourceResult {
    if (query.error) {
        return {
            type,
            options: [],
            error: query.error instanceof Error ? query.error.message : String(query.error),
        };
    }

    const payload = query.data?.data;
    if (payload === undefined) {
        return {
            type,
            options: [],
            error: "No data returned by the backend.",
        };
    }

    const resolved = resolveQueryOptionsPayload(type, payload);
    return {
        type,
        options: resolved.options,
        error: resolved.error,
    };
}

export function combineCompositeSourceResults(results: CompositeSourceResult[]): CombinedCompositeResult {
    const errors: string[] = [];
    const options: SelectOption[] = [];
    const shouldCanonicalize = results.length > 1;

    results.forEach((result) => {
        if (result.error) {
            errors.push(result.type ? `${result.type}: ${result.error}` : result.error);
            return;
        }
        options.push(...result.options.map((option) => {
            if (!shouldCanonicalize) {
                return option;
            }

            return {
                ...option,
                ...toCompositeCanonicalOption(result.type, option),
            };
        }));
    });

    if (options.length === 0) {
        return {
            options,
            blockingError: errors.length > 0 ? errors.join(" | ") : undefined,
        };
    }

    return {
        options,
        warning: errors.length > 0 ? errors.join(" | ") : undefined,
    };
}

export { buildQuerySelectOptions, getQueryOptionCount } from "./queryOptionDataset";

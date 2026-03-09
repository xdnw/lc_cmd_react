import { extractBackendError } from "@/lib/BulkQuery";
import type { WebError, WebOptions } from "@/lib/apitypes";
import {
    buildQuerySelectOptions,
    getQueryOptionCount,
} from "./queryOptionDataset";
import type { SelectOption } from "./selectValueUtils";

export type QueryOptionsResolution = {
    options: SelectOption[];
    error?: string;
};

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

    return { options: buildQuerySelectOptions(type, payload as WebOptions) };
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

    results.forEach((result) => {
        if (result.error) {
            errors.push(result.type ? `${result.type}: ${result.error}` : result.error);
            return;
        }
        options.push(...result.options);
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

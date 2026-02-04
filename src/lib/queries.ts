import { UseQueryOptions, UseSuspenseQueryOptions } from "@tanstack/react-query";
import { ApiEndpoint, fetchBulk, QueryResult } from "./BulkQuery";

export function suspenseQueryOptions<T>(
    endpoint: ApiEndpoint<T>,
    query: { readonly [key: string]: string | string[] },
    is_post?: boolean,
    cache_duration?: number,
    batch_wait_ms?: number
): UseSuspenseQueryOptions<QueryResult<T>, Error, QueryResult<T>, readonly unknown[]> {
    return bulkQueryOptions(endpoint, query, is_post, cache_duration, batch_wait_ms) as UseSuspenseQueryOptions<QueryResult<T>, Error, QueryResult<T>, readonly unknown[]>;
}

export function bulkQueryOptions<T>(
    endpoint: ApiEndpoint<T>,
    query: { readonly [key: string]: string | string[] },
    is_post?: boolean,
    cache_duration?: number,
    batch_wait_ms?: number,
): UseQueryOptions<QueryResult<T>, Error, QueryResult<T>, readonly unknown[]> {
    const isPostFinal = is_post ?? endpoint.isPost;
    return {
        queryKey: [endpoint.name, query],
        queryFn: async (meta) => {
            const keys = meta.queryKey as [string, { [key: string]: string }];
            const result = await fetchBulk<T>({
                endpoint: keys[0],
                query: keys[1],
                cache: undefined,
                batch_wait_ms: batch_wait_ms ?? 200
            });
            if (result.error || result?.data?.errorr != null) {
                console.log("Error in query", result.error);
                throw new BackendError(result?.error ?? result.data?.errorr ?? "Unknown error");
            }
            return result;
        },
        refetchOnReconnect: !isPostFinal,
        refetchOnWindowFocus: !isPostFinal,
        refetchOnMount: !isPostFinal,
        staleTime: cache_duration ?? endpoint.cache_duration ?? 5000,
        retry: (failureCount, err) =>
            !isPostFinal && (!(err instanceof BackendError) && failureCount < 3) || failureCount < 1,
    };
}

export function singleQueryOptions<T>(
    endpoint: ApiEndpoint<T>,
    query: { readonly [key: string]: string | string[] },
    cache_duration?: number,
    batch_wait_ms?: number
): UseQueryOptions<QueryResult<T>, Error, QueryResult<T>, readonly unknown[]> {
    return {
        queryKey: [endpoint.name, query],
        queryFn: async (meta) => {
            console.log("Fetching single query", meta.queryKey);
            const keys = meta.queryKey as [string, { [key: string]: string }];

            // 5s delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const result = await fetchBulk<T>({
                endpoint: keys[0],
                query: keys[1],
                cache: undefined,
                batch_wait_ms: batch_wait_ms ?? 200
            });
            if (result.error) {
                console.log("Error in query 2", result.error);
                throw new BackendError(result.error);
            }
            return result;
        },
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        staleTime: cache_duration ?? endpoint.cache_duration ?? 5000,
        retry: (failureCount, err) => false,
    };
}

export class BackendError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BackendError";
    }
}
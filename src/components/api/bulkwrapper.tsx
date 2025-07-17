import { ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import { ApiEndpoint, CommonEndpoint, QueryResult } from "../../lib/BulkQuery";
import { deepEqual } from "@/lib/utils";
import { ErrorBoundary } from "react-error-boundary";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../ui/loading";
import { Button } from "../ui/button";
import { suspenseQueryOptions } from "@/lib/queries";


export function useDeepMemo<T>(value: T): T {
    const [memoValue, setMemoValue] = useState(value);

    useEffect(() => {
        if (!deepEqual(value, memoValue)) {
            setMemoValue(value);
        }
    }, [value, memoValue]);

    return memoValue;
}

export function renderEndpointFallback({
    error,
    resetErrorBoundary,
    endpoint,
    query,
}: {
    error: Error;
    resetErrorBoundary: () => void;
    endpoint: string;
    query: { readonly [key: string]: string | string[] };
}) {
    return (
        <ErrorBoundaryFallback
            endpoint={endpoint}
            query={query}
            error={error}
            resetErrorBoundary={resetErrorBoundary}
        />
    );
}
export default function EndpointWrapper<T, A extends { [key: string]: string | string[] | undefined }, B extends { [key: string]: string | string[] | undefined }>({
    endpoint,
    args,
    handle_error,
    batch_wait_ms,
    isPostOverride,
    children,
}: {
    readonly endpoint: CommonEndpoint<T, A, B>;
    readonly args: A;
    readonly handle_error?: (error: Error) => void;
    readonly batch_wait_ms?: number;
    readonly isPostOverride?: boolean;
    readonly children: (data: Omit<QueryResult<T>, 'data'> & {
        data: NonNullable<QueryResult<T>['data']>;
    }) => ReactNode;
}) {
    const stableQuery: { [k: string]: string | string[] } = useDeepMemo(args ?
        (Object.fromEntries(Object.entries(args).filter(([_, value]) => value !== undefined)) as { [k: string]: string | string[] }) : {});

    const fallbackRender = useCallback(
        (fallbackProps: { error: Error; resetErrorBoundary: () => void }) =>
            renderEndpointFallback({
                ...fallbackProps,
                endpoint: endpoint.endpoint.name,
                query: stableQuery,
            }),
        [endpoint.endpoint.name, stableQuery]
    );

    return (
        <ErrorBoundary fallbackRender={fallbackRender} onError={handle_error ?? console.error}>
            <Suspense fallback={<Loading variant="ripple" />}>
                <BulkQueryWrapper
                    endpoint={endpoint.endpoint}
                    query={stableQuery}
                    is_post={isPostOverride ?? endpoint.endpoint.isPost}
                    cache_duration={endpoint.endpoint.cache_duration}
                    batch_wait_ms={batch_wait_ms}
                >
                    {(data) => children(data as Omit<QueryResult<T>, 'data'> & { data: NonNullable<QueryResult<T>['data']>; })}
                </BulkQueryWrapper>
            </Suspense>
        </ErrorBoundary>
    );
}


export function ErrorBoundaryFallback({
    endpoint,
    query,
    error,
    resetErrorBoundary,
}: {
    readonly endpoint: string;
    readonly query: { readonly [key: string]: string | string[] };
    readonly error: Error;
    readonly resetErrorBoundary: () => void;
}) {
    const queryClient = useQueryClient();

    const handleRetry = useCallback(() => {
        queryClient.removeQueries({ queryKey: [endpoint, query] });
        resetErrorBoundary();
    }, [queryClient, endpoint, query, resetErrorBoundary]);

    return (
        <>
            <div role="alert" className="whitespace-pre-wrap bg-accent relative px-2 border-2 border-destructive">
                <pre className="whitespace-pre-wrap break-all">{error.name}: {error.message}</pre>
            </div>
            <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </>
    );
}

export function BulkQueryWrapper<T>({
    endpoint,
    query,
    is_post,
    cache_duration,
    batch_wait_ms,
    children,
}: {
    readonly endpoint: ApiEndpoint<T>;
    readonly query: { readonly [key: string]: string | string[] };
    readonly is_post: boolean;
    readonly cache_duration: number;
    readonly batch_wait_ms?: number;
    readonly children: (data: QueryResult<T>) => ReactNode;
}) {
    const { data } = useSuspenseQuery<QueryResult<T>>(suspenseQueryOptions(endpoint, query, is_post, cache_duration, batch_wait_ms));
    return children(data);
}
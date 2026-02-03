import { ReactNode, Suspense, useCallback, useMemo } from "react";
import { ApiEndpoint, CommonEndpoint, QueryResult } from "../../lib/BulkQuery";
import { ErrorBoundary } from "react-error-boundary";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import Loading from "../ui/loading";
import { Button } from "../ui/button";
import { suspenseQueryOptions, BackendError } from "@/lib/queries";


function stableSerialize(value: unknown): string {
    // must always return valid JSON
    if (value === undefined) return "null";
    if (value === null) return "null";
    if (typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort();

    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(",")}}`;
}

export function useDeepMemo<T>(value: T): T {
    const key = stableSerialize(value);
    return useMemo(() => JSON.parse(key) as T, [key]);
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
export default function EndpointWrapper<T, A extends Record<string, string | string[] | undefined>, B extends Record<string, string | string[] | undefined>>({
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
  readonly children: (args: {
    data: NonNullable<QueryResult<T>["data"]>;
    reload: () => void;
    isRefetching: boolean;
  } & Omit<QueryResult<T>, "data">) => ReactNode;
}) {
  const stableQuery: { [k: string]: string | string[] } = useDeepMemo(
    args
      ? (Object.fromEntries(Object.entries(args).filter(([_, v]) => v !== undefined)) as {
          [k: string]: string | string[];
        })
      : {}
  );

  const fallbackRender = useCallback(
    (fallbackProps: { error: Error; resetErrorBoundary: () => void }) =>
      renderEndpointFallback({
        ...fallbackProps,
        endpoint: endpoint.endpoint.name,
        query: stableQuery,
      }),
    [endpoint.endpoint.name, stableQuery]
  );

  const renderChildren = useCallback(
    ({ result, reload, isRefetching }: { result: QueryResult<T>; reload: () => void; isRefetching: boolean }) =>
      children({
        ...(result as Omit<QueryResult<T>, "data">),
        data: result.data!,
        reload,
        isRefetching,
      }),
    [children]
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
          {renderChildren}
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

    const handleRetry = useCallback(async () => {
        // Reset the query to idle state and force a refetch so the ErrorBoundary
        // will see a new error (if the backend still returns one).
        await queryClient.resetQueries({ queryKey: [endpoint, query], exact: true });
        await queryClient.refetchQueries({ queryKey: [endpoint, query], exact: true });
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
    readonly children: (args: {
        result: QueryResult<T>;
        reload: () => void;
        isRefetching: boolean;
    }) => ReactNode;
}) {
    const { data, refetch, isRefetching } = useSuspenseQuery<QueryResult<T>>(
        suspenseQueryOptions(endpoint, query, is_post, cache_duration, batch_wait_ms)
    );

    // If the backend returned an application-level error for this query,
    // throw so ErrorBoundary can show the message (consistent with non-suspense flow).
    if (data && data.error) {
        throw new BackendError(data.error);
    }

    const reload = useCallback(() => {
        return refetch(); // return the Promise so callers can await
    }, [refetch]);

    return children({ result: data, reload, isRefetching });
}
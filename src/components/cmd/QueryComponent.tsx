import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ListComponent from "./ListComponent";
import { useCommandQueryResults, type CommandQueryLookupResult } from "./CommandQueryRegistry";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { extractBackendError } from "@/lib/BulkQuery";
import { WebError, WebOptions } from "../../lib/apitypes";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";
import Loading from "../ui/loading";
import {
    ASYNC_QUERY_OPTION_THRESHOLD,
    type CombinedCompositeResult,
    type CompositeQueryState,
    combineCompositeSourceResults,
    getQueryOptionCount,
    resolveQueryOptionsPayload,
    shouldSearchDeferredQueryOptions,
    shouldUseDeferredQueryOptionsPayload,
    toCompositeSourceResult,
} from "./queryOptionUtils";
import { ensureQueryOptionDatasetFromPayload, searchQueryOptionDataset } from "./queryOptionWorkerClient";
import type { SelectOption } from "./selectValueUtils";
import { scheduleWhenIdle } from "./interactionScheduling";

type QueryNoticeTone = "error" | "warning";

type CompositePayloadSource = {
    type: string;
    payload?: WebOptions | WebError | null;
    error?: string;
    optionCount: number;
};

type CompositeSearchResult = {
    type: string;
    options: SelectOption[];
    error?: string;
};

const QUERY_WARMUP_ROOT_MARGIN = "1400px 0px";
const EMPTY_OPTIONS: SelectOption[] = [];
const EMPTY_COMPOSITE_RESULT: CombinedCompositeResult = { options: EMPTY_OPTIONS };

type QueryLookupResult = CommandQueryLookupResult;

function useIdleDatasetWarmup(enabled: boolean, warmup: () => Promise<unknown>) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        return scheduleWhenIdle(() => {
            void warmup().catch(() => undefined);
        });
    }, [enabled, warmup]);
}

function useNearViewportWarmup(containerRef: React.RefObject<HTMLElement | null>, enabled: boolean): boolean {
    const [isNearViewport, setIsNearViewport] = useState<boolean>(() => !enabled || typeof IntersectionObserver === "undefined");

    useEffect(() => {
        if (!enabled) {
            setIsNearViewport(true);
            return;
        }

        if (typeof IntersectionObserver === "undefined") {
            setIsNearViewport(true);
            return;
        }

        if (isNearViewport) {
            return;
        }

        const node = containerRef.current;
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) {
                return;
            }

            setIsNearViewport(true);
            observer.disconnect();
        }, { rootMargin: QUERY_WARMUP_ROOT_MARGIN });

        observer.observe(node);
        return () => observer.disconnect();
    }, [containerRef, enabled, isNearViewport]);

    return isNearViewport;
}

function getSourceError(payload: WebOptions | WebError | unknown): string | undefined {
    return extractBackendError(payload) ?? undefined;
}

function toCompositeWarmSearchResult(source: CompositePayloadSource, result: Awaited<ReturnType<typeof searchQueryOptionDataset>>): CompositeSearchResult {
    return {
        type: source.type,
        options: result.options,
    };
}

async function warmCompositeDatasets(sources: CompositePayloadSource[]): Promise<void> {
    await Promise.allSettled(sources.map(async (source) => {
        if (source.error) {
            return;
        }

        await ensureQueryOptionDatasetFromPayload(`query:${source.type}`, source.type, source.payload);
    }));
}

async function searchCompositeDatasets(sources: CompositePayloadSource[], searchValue: string): Promise<CompositeSearchResult[]> {
    const results = await Promise.allSettled(sources.map(async (source) => {
        if (source.error) {
            return {
                type: source.type,
                options: [],
                error: source.error,
            } satisfies CompositeSearchResult;
        }

        await ensureQueryOptionDatasetFromPayload(`query:${source.type}`, source.type, source.payload);
        const result = await searchQueryOptionDataset(`query:${source.type}`, searchValue);
        return toCompositeWarmSearchResult(source, result);
    }));

    return results.map((result, index) => {
        if (result.status === "fulfilled") {
            return result.value;
        }

        return {
            type: sources[index]?.type ?? "composite",
            options: [],
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
    });
}

function EmptyQueryOptions({ element, message }: { element: string; message?: string }) {
    return (
        <div role="alert" className="rounded-md border border-destructive/35 bg-destructive/6 px-2 py-1.5 text-[11px] text-destructive">
            {message ?? `No options were returned by the backend for \`${element}\`.`}
        </div>
    );
}

function QueryNotice({ tone, message }: { tone: QueryNoticeTone; message: string }) {
    const className = tone === "warning"
        ? "rounded-md border border-amber-400/40 bg-amber-500/8 px-2 py-1.5 text-[11px] text-amber-900 dark:text-amber-200"
        : "rounded-md border border-destructive/35 bg-destructive/6 px-2 py-1.5 text-[11px] text-destructive";

    return (
        <div role={tone === "warning" ? "status" : "alert"} className={className}>
            {message}
        </div>
    );
}

function formatDeferredSearchPrompt(optionCount: number): string {
    return `Type 1+ characters to search ${optionCount.toLocaleString()} options.`;
}

export default function QueryComponent(
    {element, multi, argName, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        element: string,
        multi: boolean,
        argName: string,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    return <SingleQueryOptionsComponent
        element={element}
        multi={multi}
        argName={argName}
        initialValue={initialValue}
        allowCustomOption={allowCustomOption}
        preloadOptions={preloadOptions}
        setOutputValue={setOutputValue}
    />;
}

export function CompositeQueryComponent(
    {composites, multi, argName, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        composites: string[],
        multi: boolean,
        argName: string,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    return <ResolvedQueryOptionsComponent
        types={composites}
        multi={multi}
        argName={argName}
        initialValue={initialValue}
        allowCustomOption={allowCustomOption}
        preloadOptions={preloadOptions}
        setOutputValue={setOutputValue}
    />;
}

function ResolvedQueryOptionsComponent(
    {types, argName, multi, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        types: string[],
        argName: string,
        multi: boolean,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const sharedQueries = useCommandQueryResults(types);

    if (sharedQueries) {
        return (
            <ResolvedQueryOptionsContent
                types={types}
                queries={sharedQueries}
                multi={multi}
                argName={argName}
                initialValue={initialValue}
                allowCustomOption={allowCustomOption}
                preloadOptions={preloadOptions}
                setOutputValue={setOutputValue}
            />
        );
    }

    return (
        <ResolvedQueryOptionsWithLocalQueries
            types={types}
            multi={multi}
            argName={argName}
            initialValue={initialValue}
            allowCustomOption={allowCustomOption}
            preloadOptions={preloadOptions}
            setOutputValue={setOutputValue}
        />
    );
}

function ResolvedQueryOptionsWithLocalQueries(
    {types, argName, multi, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        types: string[],
        argName: string,
        multi: boolean,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const queries = useQueries({
        queries: types.map((type) => bulkQueryOptions<WebOptions | WebError>(
            INPUT_OPTIONS.endpoint,
            { type },
            false,
        )),
    }) as QueryLookupResult[];

    return (
        <ResolvedQueryOptionsContent
            types={types}
            queries={queries}
            multi={multi}
            argName={argName}
            initialValue={initialValue}
            allowCustomOption={allowCustomOption}
            preloadOptions={preloadOptions}
            setOutputValue={setOutputValue}
        />
    );
}

function ResolvedQueryOptionsContent(
    {types, queries, argName, multi, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        types: string[],
        queries: QueryLookupResult[],
        argName: string,
        multi: boolean,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const sources = useMemo<CompositePayloadSource[]>(() => {
        return types.map((type, index) => {
            const query = queries[index];
            if (query?.error) {
                return {
                    type,
                    error: query.error instanceof Error ? query.error.message : String(query.error),
                    optionCount: 0,
                };
            }

            const payload = query?.data?.data;
            const payloadError = getSourceError(payload);
            return {
                type,
                payload,
                error: payload === undefined ? "No data returned by the backend." : payloadError,
                optionCount: getQueryOptionCount(payload),
            };
        });
    }, [queries, types]);

    if (queries.some((query) => query.isLoading)) {
        return (
            <div className="flex min-h-8 items-center rounded-md border border-dashed border-border/70 bg-muted/15 px-2 py-1.5 text-[11px] text-muted-foreground">
                <span className="mr-2 inline-flex"><Loading /></span>
                <span>Loading options...</span>
            </div>
        );
    }

    const totalOptionCount = sources.reduce((sum, source) => sum + source.optionCount, 0);
    const hasResolvedPayload = sources.some((source) => source.payload != null);
    const shouldUseDeferredWorker = !initialValue && totalOptionCount >= ASYNC_QUERY_OPTION_THRESHOLD && hasResolvedPayload;

    if (shouldUseDeferredWorker) {
        return (
            <DeferredCompositeQueryOptionsList
                sources={sources}
                multi={multi}
                argName={argName}
                initialValue={initialValue}
                allowCustomOption={allowCustomOption}
                preloadOptions={preloadOptions}
                setOutputValue={setOutputValue}
            />
        );
    }

    const combined = combineCompositeSourceResults(
        types.map((type, index) => toCompositeSourceResult(type, queries[index] as CompositeQueryState)),
    );

    if (combined.blockingError) {
        return <EmptyQueryOptions element={types.length > 1 ? "composite query" : types[0]} message={combined.blockingError} />;
    }

    if (combined.options.length === 0) {
        return <EmptyQueryOptions element={types.length > 1 ? "composite query" : types[0]} />;
    }

    return (
        <div className="flex flex-col gap-2">
            {combined.warning && <QueryNotice tone="warning" message={combined.warning} />}
            <ListComponent argName={argName} options={combined.options} isMulti={multi} initialValue={initialValue}
                          setOutputValue={setOutputValue} allowCustomOption={allowCustomOption}/>
        </div>
    );
}

function DeferredCompositeQueryOptionsList({
    sources,
    multi,
    argName,
    initialValue,
    allowCustomOption = false,
    preloadOptions,
    setOutputValue,
}: {
    sources: CompositePayloadSource[];
    multi: boolean;
    argName: string;
    initialValue: string;
    allowCustomOption?: boolean;
    preloadOptions?: boolean;
    setOutputValue: (name: string, value: string) => void;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const requestVersionRef = useRef(0);
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [combinedResult, setCombinedResult] = useState<CombinedCompositeResult>(() => EMPTY_COMPOSITE_RESULT);
    const [hasInteracted, setHasInteracted] = useState(Boolean(preloadOptions));
    const sourceErrors = useMemo(() => sources.flatMap((source) => source.error ? [`${source.type}: ${source.error}`] : []), [sources]);
    const hasUsableSource = useMemo(() => sources.some((source) => !source.error && source.optionCount > 0), [sources]);
    const totalOptionCount = useMemo(() => sources.reduce((sum, source) => sum + source.optionCount, 0), [sources]);
    const blockingError = useMemo(() => {
        if (hasUsableSource || sourceErrors.length === 0) {
            return undefined;
        }
        return sourceErrors.join(" | ");
    }, [hasUsableSource, sourceErrors]);
    const backgroundWarning = useMemo(() => {
        return hasUsableSource && sourceErrors.length > 0 ? sourceErrors.join(" | ") : undefined;
    }, [hasUsableSource, sourceErrors]);
    const emptyMessage = useMemo(() => {
        if (shouldSearchDeferredQueryOptions(searchValue, totalOptionCount)) {
            return undefined;
        }

        return formatDeferredSearchPrompt(totalOptionCount);
    }, [searchValue, totalOptionCount]);

    const warmDatasets = useCallback(() => warmCompositeDatasets(sources), [sources]);
    const isNearViewport = useNearViewportWarmup(containerRef, !preloadOptions);
    const shouldWarmDatasets = !blockingError && (Boolean(preloadOptions) || hasInteracted || isNearViewport);

    useIdleDatasetWarmup(shouldWarmDatasets, warmDatasets);

    useEffect(() => {
        if (!shouldSearchDeferredQueryOptions(searchValue, totalOptionCount)) {
            setError((current) => current == null ? current : null);
            setLoading((current) => current ? false : current);
            setCombinedResult((current) => current.options.length === 0 ? current : EMPTY_COMPOSITE_RESULT);
            return;
        }

        const currentVersion = requestVersionRef.current + 1;
        requestVersionRef.current = currentVersion;
        setLoading(true);
        setError(null);

        void searchCompositeDatasets(sources, searchValue)
            .then((results) => {
                if (requestVersionRef.current !== currentVersion) {
                    return;
                }

                const nextCombined = combineCompositeSourceResults(results);

                setCombinedResult(nextCombined);
                setLoading(false);
            })
            .catch((nextError: unknown) => {
                if (requestVersionRef.current !== currentVersion) {
                    return;
                }
                setError(nextError instanceof Error ? nextError.message : String(nextError));
                setLoading(false);
            });
    }, [searchValue, sources, totalOptionCount]);

    const handleSearchValueChange = useCallback((nextValue: string) => {
        setHasInteracted(true);
        setSearchValue(nextValue);
    }, []);

    const handleFocusCapture = useCallback(() => {
        setHasInteracted(true);
    }, []);

    if (error) {
        return <EmptyQueryOptions element="composite query" message={error} />;
    }

    if (blockingError) {
        return <EmptyQueryOptions element="composite query" message={blockingError} />;
    }

    if (!loading && combinedResult.blockingError) {
        return <EmptyQueryOptions element="composite query" message={combinedResult.blockingError} />;
    }

    return (
        <div ref={containerRef} className="flex flex-col gap-2" onFocusCapture={handleFocusCapture}>
            {backgroundWarning && <QueryNotice tone="warning" message={backgroundWarning} />}
            {combinedResult.warning && !loading && <QueryNotice tone="warning" message={combinedResult.warning} />}
            <ListComponent
                argName={argName}
                options={combinedResult.options}
                isMulti={multi}
                initialValue={initialValue}
                setOutputValue={setOutputValue}
                allowCustomOption={allowCustomOption}
                onSearchValueChange={handleSearchValueChange}
                optionsArePrefiltered
                loadingOptions={loading}
                emptyMessage={emptyMessage}
            />
        </div>
    );
}

function SingleQueryOptionsComponent(
    {element, multi, argName, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        element: string,
        multi: boolean,
        argName: string,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const sharedQueries = useCommandQueryResults([element]);

    if (sharedQueries) {
        return (
            <SingleQueryOptionsContent
                element={element}
                query={sharedQueries[0]}
                multi={multi}
                argName={argName}
                initialValue={initialValue}
                allowCustomOption={allowCustomOption}
                preloadOptions={preloadOptions}
                setOutputValue={setOutputValue}
            />
        );
    }

    return (
        <SingleQueryOptionsWithLocalQuery
            element={element}
            multi={multi}
            argName={argName}
            initialValue={initialValue}
            allowCustomOption={allowCustomOption}
            preloadOptions={preloadOptions}
            setOutputValue={setOutputValue}
        />
    );
}

function SingleQueryOptionsWithLocalQuery(
    {element, multi, argName, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        element: string,
        multi: boolean,
        argName: string,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const queries = useQueries({
        queries: [bulkQueryOptions<WebOptions | WebError>(
            INPUT_OPTIONS.endpoint,
            { type: element },
            false,
        )],
    }) as QueryLookupResult[];

    return (
        <SingleQueryOptionsContent
            element={element}
            query={queries[0]}
            multi={multi}
            argName={argName}
            initialValue={initialValue}
            allowCustomOption={allowCustomOption}
            preloadOptions={preloadOptions}
            setOutputValue={setOutputValue}
        />
    );
}

function SingleQueryOptionsContent(
    {element, query, multi, argName, initialValue, setOutputValue, allowCustomOption = false, preloadOptions}:
    {
        element: string,
        query: QueryLookupResult | undefined,
        multi: boolean,
        argName: string,
        initialValue: string,
        allowCustomOption?: boolean,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {

    if (!query || query.isLoading) {
        return (
            <div className="flex min-h-8 items-center rounded-md border border-dashed border-border/70 bg-muted/15 px-2 py-1.5 text-[11px] text-muted-foreground">
                <span className="mr-2 inline-flex"><Loading /></span>
                <span>Loading options...</span>
            </div>
        );
    }

    const payload = query.data?.data;
    const payloadError = getSourceError(payload);
    const shouldUseDeferredWorker = !initialValue && shouldUseDeferredQueryOptionsPayload(payload);

    if (query.error) {
        return <EmptyQueryOptions element={element} message={query.error instanceof Error ? query.error.message : String(query.error)} />;
    }

    if (payloadError) {
        return <EmptyQueryOptions element={element} message={payloadError} />;
    }

    if (shouldUseDeferredWorker && payload) {
        return (
            <DeferredQueryOptionsList
                element={element}
                payload={payload}
                multi={multi}
                argName={argName}
                initialValue={initialValue}
                allowCustomOption={allowCustomOption}
                preloadOptions={preloadOptions}
                setOutputValue={setOutputValue}
            />
        );
    }

    const resolved = resolveQueryOptionsPayload(element, payload);
    if (resolved.error) {
        return <EmptyQueryOptions element={element} message={resolved.error} />;
    }
    if (resolved.options.length === 0) {
        return <EmptyQueryOptions element={element} />;
    }

    return (
        <ListComponent argName={argName} options={resolved.options} isMulti={multi} initialValue={initialValue}
                      setOutputValue={setOutputValue} allowCustomOption={allowCustomOption}/>
    );
}

function DeferredQueryOptionsList({
    element,
    payload,
    multi,
    argName,
    initialValue,
    allowCustomOption = false,
    preloadOptions,
    setOutputValue,
}: {
    element: string;
    payload: WebOptions | unknown;
    multi: boolean;
    argName: string;
    initialValue: string;
    allowCustomOption?: boolean;
    preloadOptions?: boolean;
    setOutputValue: (name: string, value: string) => void;
}) {
    const datasetId = useMemo(() => `query:${element}`, [element]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const requestVersionRef = useRef(0);
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [options, setOptions] = useState<SelectOption[]>(EMPTY_OPTIONS);
    const [hasInteracted, setHasInteracted] = useState(Boolean(preloadOptions));
    const optionCount = useMemo(() => getQueryOptionCount(payload), [payload]);
    const emptyMessage = useMemo(() => {
        if (shouldSearchDeferredQueryOptions(searchValue, optionCount)) {
            return undefined;
        }

        return formatDeferredSearchPrompt(optionCount);
    }, [optionCount, searchValue]);

    const warmDataset = useCallback(() => ensureQueryOptionDatasetFromPayload(datasetId, element, payload), [datasetId, element, payload]);
    const isNearViewport = useNearViewportWarmup(containerRef, !preloadOptions);
    const shouldWarmDataset = Boolean(preloadOptions) || hasInteracted || isNearViewport;

    useIdleDatasetWarmup(shouldWarmDataset, warmDataset);

    useEffect(() => {
        if (!shouldSearchDeferredQueryOptions(searchValue, optionCount)) {
            setError((current) => current == null ? current : null);
            setLoading((current) => current ? false : current);
            setOptions((current) => current.length === 0 ? current : EMPTY_OPTIONS);
            return;
        }

        const currentVersion = requestVersionRef.current + 1;
        requestVersionRef.current = currentVersion;
        setLoading(true);
        setError(null);

        warmDataset()
            .then(() => searchQueryOptionDataset(datasetId, searchValue))
            .then((result) => {
                if (requestVersionRef.current !== currentVersion) {
                    return;
                }
                setOptions(result.options);
                setLoading(false);
            })
            .catch((nextError: unknown) => {
                if (requestVersionRef.current !== currentVersion) {
                    return;
                }
                setError(nextError instanceof Error ? nextError.message : String(nextError));
                setLoading(false);
            });
    }, [datasetId, optionCount, searchValue, warmDataset]);

    const handleSearchValueChange = useCallback((nextValue: string) => {
        setHasInteracted(true);
        setSearchValue(nextValue);
    }, []);

    const handleFocusCapture = useCallback(() => {
        setHasInteracted(true);
    }, []);

    if (error) {
        return <EmptyQueryOptions element={element} message={error} />;
    }

    return (
        <div ref={containerRef} onFocusCapture={handleFocusCapture}>
            <ListComponent
                argName={argName}
                options={options}
                isMulti={multi}
                initialValue={initialValue}
                setOutputValue={setOutputValue}
                allowCustomOption={allowCustomOption}
                onSearchValueChange={handleSearchValueChange}
                optionsArePrefiltered
                loadingOptions={loading}
                emptyMessage={emptyMessage}
            />
        </div>
    );
}
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ListComponent from "./ListComponent";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { extractBackendError } from "@/lib/BulkQuery";
import { WebError, WebOptions } from "../../lib/apitypes";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";
import Loading from "../ui/loading";
import {
    ASYNC_QUERY_OPTION_THRESHOLD,
    combineCompositeSourceResults,
    getQueryOptionCount,
    resolveQueryOptionsPayload,
    shouldSearchDeferredQueryOptions,
    shouldUseDeferredQueryOptionsPayload,
    toCompositeSourceResult,
} from "./queryOptionUtils";
import { ensureQueryOptionDatasetFromPayload, searchQueryOptionDataset } from "./queryOptionWorkerClient";
import type { SelectOption } from "./selectValueUtils";
import { scheduleInteractionTransition, scheduleWhenIdle } from "./interactionScheduling";

type QueryNoticeTone = "error" | "warning";

type CompositePayloadSource = {
    type: string;
    payload?: WebOptions | WebError | unknown;
    error?: string;
    optionCount: number;
};

type CompositeSearchResult = {
    type: string;
    options: SelectOption[];
    error?: string;
};

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
    return `Type at least 1 character to search ${optionCount.toLocaleString()} options.`;
}

export default function QueryComponent(
    {element, multi, argName, initialValue, setOutputValue, preloadOptions}:
    {
        element: string,
        multi: boolean,
        argName: string,
        initialValue: string,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    return <SingleQueryOptionsComponent
        element={element}
        multi={multi}
        argName={argName}
        initialValue={initialValue}
        preloadOptions={preloadOptions}
        setOutputValue={setOutputValue}
    />;
}

export function CompositeQueryComponent(
    {composites, multi, argName, initialValue, setOutputValue, preloadOptions}:
    {
        composites: string[],
        multi: boolean,
        argName: string,
        initialValue: string,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    return <ResolvedQueryOptionsComponent
        types={composites}
        multi={multi}
        argName={argName}
        initialValue={initialValue}
        preloadOptions={preloadOptions}
        setOutputValue={setOutputValue}
    />;
}

function ResolvedQueryOptionsComponent(
    {types, argName, multi, initialValue, setOutputValue, preloadOptions}:
    {
        types: string[],
        argName: string,
        multi: boolean,
        initialValue: string,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const queries = useQueries({
        queries: types.map((type) => bulkQueryOptions<WebOptions>(
            INPUT_OPTIONS.endpoint,
            { type },
            false,
        )),
    });

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
                preloadOptions={preloadOptions}
                setOutputValue={setOutputValue}
            />
        );
    }

    const combined = combineCompositeSourceResults(
        types.map((type, index) => toCompositeSourceResult(type, queries[index])),
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
                          setOutputValue={setOutputValue}/>
        </div>
    );
}

function DeferredCompositeQueryOptionsList({
    sources,
    multi,
    argName,
    initialValue,
    preloadOptions,
    setOutputValue,
}: {
    sources: CompositePayloadSource[];
    multi: boolean;
    argName: string;
    initialValue: string;
    preloadOptions?: boolean;
    setOutputValue: (name: string, value: string) => void;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const focusAfterLoadRef = useRef(false);
    const requestVersionRef = useRef(0);
    const scheduledActivationRef = useRef<(() => void) | null>(null);
    const [isActivated, setIsActivated] = useState(Boolean(preloadOptions));
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(Boolean(preloadOptions));
    const [error, setError] = useState<string | null>(null);
    const [combinedResult, setCombinedResult] = useState(() => combineCompositeSourceResults([]));
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

    useIdleDatasetWarmup(!isActivated && !blockingError, warmDatasets);

    useEffect(() => {
        return () => {
            scheduledActivationRef.current?.();
            scheduledActivationRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!isActivated) {
            setLoading(false);
            return;
        }

        const currentVersion = requestVersionRef.current + 1;
        requestVersionRef.current = currentVersion;
        setLoading(true);
        setError(null);

        if (!shouldSearchDeferredQueryOptions(searchValue, totalOptionCount)) {
            setCombinedResult(combineCompositeSourceResults([]));
            setLoading(false);
            return;
        }

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
    }, [isActivated, searchValue, sources, totalOptionCount]);

    useEffect(() => {
        if (loading || !focusAfterLoadRef.current) {
            return;
        }

        focusAfterLoadRef.current = false;
        const handle = window.requestAnimationFrame(() => {
            const target = containerRef.current?.querySelector("input:not([disabled])") as HTMLElement | null;
            target?.focus();
        });

        return () => window.cancelAnimationFrame(handle);
    }, [loading]);

    const activate = useCallback((focusAfterLoad: boolean) => {
        if (focusAfterLoad) {
            focusAfterLoadRef.current = true;
        }
        if (isActivated || scheduledActivationRef.current) {
            return;
        }

        scheduledActivationRef.current = scheduleInteractionTransition(() => {
            scheduledActivationRef.current = null;
            setIsActivated(true);
        });
    }, [isActivated]);

    const handlePointerDownCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (isActivated) {
            return;
        }
        event.preventDefault();
        activate(true);
    }, [activate, isActivated]);

    const handleFocusCapture = useCallback(() => {
        if (!isActivated) {
            activate(true);
        }
    }, [activate, isActivated]);

    const handleSearchValueChange = useCallback((nextValue: string) => {
        setSearchValue(nextValue);
    }, []);

    if (error) {
        return <EmptyQueryOptions element="composite query" message={error} />;
    }

    if (!isActivated && blockingError) {
        return <EmptyQueryOptions element="composite query" message={blockingError} />;
    }

    if (isActivated && !loading) {
        if (combinedResult.blockingError) {
            return <EmptyQueryOptions element="composite query" message={combinedResult.blockingError} />;
        }
    }

    return (
        <div ref={containerRef} onPointerDownCapture={handlePointerDownCapture} onFocusCapture={handleFocusCapture}>
            {!isActivated && backgroundWarning && <QueryNotice tone="warning" message={backgroundWarning} />}
            {isActivated ? (
                <div className="flex flex-col gap-2">
                    {combinedResult.warning && !loading && <QueryNotice tone="warning" message={combinedResult.warning} />}
                    <ListComponent
                        argName={argName}
                        options={combinedResult.options}
                        isMulti={multi}
                        initialValue={initialValue}
                        setOutputValue={setOutputValue}
                        onSearchValueChange={handleSearchValueChange}
                        optionsArePrefiltered
                        loadingOptions={loading}
                        emptyMessage={emptyMessage}
                    />
                </div>
            ) : (
                <div className="flex min-h-8 items-center rounded-md border border-dashed border-border/70 bg-muted/15 px-2 py-1.5 text-[11px] text-muted-foreground">
                    <span>Focus to open options</span>
                </div>
            )}
        </div>
    );
}

function SingleQueryOptionsComponent(
    {element, multi, argName, initialValue, setOutputValue, preloadOptions}:
    {
        element: string,
        multi: boolean,
        argName: string,
        initialValue: string,
        preloadOptions?: boolean,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const queries = useQueries({
        queries: [bulkQueryOptions<WebOptions>(
            INPUT_OPTIONS.endpoint,
            { type: element },
            false,
        )],
    });
    const query = queries[0];

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
                      setOutputValue={setOutputValue}/>
    );
}

function DeferredQueryOptionsList({
    element,
    payload,
    multi,
    argName,
    initialValue,
    preloadOptions,
    setOutputValue,
}: {
    element: string;
    payload: WebOptions | unknown;
    multi: boolean;
    argName: string;
    initialValue: string;
    preloadOptions?: boolean;
    setOutputValue: (name: string, value: string) => void;
}) {
    const datasetId = useMemo(() => `query:${element}`, [element]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const focusAfterLoadRef = useRef(false);
    const requestVersionRef = useRef(0);
    const scheduledActivationRef = useRef<(() => void) | null>(null);
    const [isActivated, setIsActivated] = useState(Boolean(preloadOptions));
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(Boolean(preloadOptions));
    const [error, setError] = useState<string | null>(null);
    const [options, setOptions] = useState<SelectOption[]>([]);
    const optionCount = useMemo(() => getQueryOptionCount(payload), [payload]);
    const emptyMessage = useMemo(() => {
        if (shouldSearchDeferredQueryOptions(searchValue, optionCount)) {
            return undefined;
        }

        return formatDeferredSearchPrompt(optionCount);
    }, [optionCount, searchValue]);

    const warmDataset = useCallback(() => ensureQueryOptionDatasetFromPayload(datasetId, element, payload), [datasetId, element, payload]);

    useIdleDatasetWarmup(!isActivated, warmDataset);

    useEffect(() => {
        return () => {
            scheduledActivationRef.current?.();
            scheduledActivationRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!isActivated) {
            setLoading(false);
            return;
        }

        const currentVersion = requestVersionRef.current + 1;
        requestVersionRef.current = currentVersion;
        setLoading(true);
        setError(null);

        if (!shouldSearchDeferredQueryOptions(searchValue, optionCount)) {
            setOptions([]);
            setLoading(false);
            return;
        }

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
    }, [datasetId, isActivated, optionCount, searchValue, warmDataset]);

    useEffect(() => {
        if (loading || !focusAfterLoadRef.current) {
            return;
        }

        focusAfterLoadRef.current = false;
        const handle = window.requestAnimationFrame(() => {
            const target = containerRef.current?.querySelector("input:not([disabled])") as HTMLElement | null;
            target?.focus();
        });

        return () => window.cancelAnimationFrame(handle);
    }, [loading]);

    const activate = useCallback((focusAfterLoad: boolean) => {
        if (focusAfterLoad) {
            focusAfterLoadRef.current = true;
        }
        if (isActivated || scheduledActivationRef.current) {
            return;
        }

        scheduledActivationRef.current = scheduleInteractionTransition(() => {
            scheduledActivationRef.current = null;
            setIsActivated(true);
        });
    }, [isActivated]);

    const handlePointerDownCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (isActivated) {
            return;
        }
        event.preventDefault();
        activate(true);
    }, [activate, isActivated]);

    const handleFocusCapture = useCallback(() => {
        if (!isActivated) {
            activate(true);
        }
    }, [activate, isActivated]);

    const handleSearchValueChange = useCallback((nextValue: string) => {
        setSearchValue(nextValue);
    }, []);

    if (error) {
        return <EmptyQueryOptions element={element} message={error} />;
    }

    return (
        <div ref={containerRef} onPointerDownCapture={handlePointerDownCapture} onFocusCapture={handleFocusCapture}>
            {isActivated ? (
                <ListComponent
                    argName={argName}
                    options={options}
                    isMulti={multi}
                    initialValue={initialValue}
                    setOutputValue={setOutputValue}
                    onSearchValueChange={handleSearchValueChange}
                    optionsArePrefiltered
                    loadingOptions={loading}
                    emptyMessage={emptyMessage}
                />
            ) : (
                <div className="flex min-h-8 items-center rounded-md border border-dashed border-border/70 bg-muted/15 px-2 py-1.5 text-[11px] text-muted-foreground">
                    <span>Focus to open options</span>
                </div>
            )}
        </div>
    );
}
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ListComponent from "./ListComponent";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { WebOptions } from "../../lib/apitypes";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";
import Loading from "../ui/loading";
import {
    ASYNC_QUERY_OPTION_THRESHOLD,
    combineCompositeSourceResults,
    getQueryOptionCount,
    resolveQueryOptionsPayload,
    toCompositeSourceResult,
} from "./queryOptionUtils";
import { ensureQueryOptionDatasetFromPayload, searchQueryOptionDataset } from "./queryOptionWorkerClient";
import type { SelectOption } from "./selectValueUtils";

type QueryNoticeTone = "error" | "warning";

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
    {composites, multi, argName, initialValue, setOutputValue, preloadOptions: _preloadOptions}:
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
        setOutputValue={setOutputValue}
    />;
}

function ResolvedQueryOptionsComponent(
    {types, argName, multi, initialValue, setOutputValue}:
    {
        types: string[],
        argName: string,
        multi: boolean,
        initialValue: string,
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

    if (queries.some((query) => query.isLoading)) {
        return (
            <div className="flex min-h-8 items-center rounded-md border border-dashed border-border/70 bg-muted/15 px-2 py-1.5 text-[11px] text-muted-foreground">
                <span className="mr-2 inline-flex"><Loading /></span>
                <span>Loading options...</span>
            </div>
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
    const optionCount = getQueryOptionCount(payload);
    const shouldUseDeferredWorker = !initialValue && optionCount >= ASYNC_QUERY_OPTION_THRESHOLD;

    if (query.error) {
        return <EmptyQueryOptions element={element} message={query.error instanceof Error ? query.error.message : String(query.error)} />;
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
    const [isActivated, setIsActivated] = useState(Boolean(preloadOptions));
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [options, setOptions] = useState<SelectOption[]>([]);

    useEffect(() => {
        const currentVersion = requestVersionRef.current + 1;
        requestVersionRef.current = currentVersion;
        setLoading(true);
        setError(null);

        ensureQueryOptionDatasetFromPayload(datasetId, element, payload)
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
            }, [datasetId, element, payload, searchValue]);

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
        setIsActivated(true);
    }, []);

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
                />
            ) : (
                <div className="flex min-h-8 items-center rounded-md border border-dashed border-border/70 bg-muted/15 px-2 py-1.5 text-[11px] text-muted-foreground">
                    <span>{loading ? "Preparing options..." : "Focus to open options"}</span>
                </div>
            )}
        </div>
    );
}
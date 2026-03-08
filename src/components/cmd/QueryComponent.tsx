import ListComponent from "./ListComponent";
import {INPUT_OPTIONS} from "@/lib/endpoints";
import {WebOptions} from "../../lib/apitypes";
import { useMemo } from "react";
import EndpointWrapper from "../api/bulkwrapper";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";
import { resolveQueryOptionsPayload } from "./queryOptionUtils";
import type { SelectOption } from "./selectValueUtils";

type QueryNoticeTone = "error" | "warning";

type CompositeSourceResult = {
    type: string;
    options: SelectOption[];
    error?: string;
};

type CompositeQueryState = {
    error: unknown;
    data?: {
        data?: WebOptions | null;
    };
};

type CombinedCompositeResult = {
    options: SelectOption[];
    blockingError?: string;
    warning?: string;
};

function EmptyQueryOptions({ element, message }: { element: string; message?: string }) {
    return (
        <div role="alert" className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
            {message ?? `No options were returned by the backend for \`${element}\`.`}
        </div>
    );
}

function QueryNotice({ tone, message }: { tone: QueryNoticeTone; message: string }) {
    const className = tone === "warning"
        ? "rounded border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-900 dark:text-amber-200"
        : "rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive";

    return (
        <div role={tone === "warning" ? "status" : "alert"} className={className}>
            {message}
        </div>
    );
}

export default function QueryComponent(
    {element, multi, argName, initialValue, setOutputValue}:
    {
        element: string,
        multi: boolean,
        argName: string,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void
    }
) {
    /*
    endpoint,
    args,
    handle_error,
    batch_wait_ms,
    isPostOverride,
    children,
    */
    return <EndpointWrapper endpoint={INPUT_OPTIONS} args={{type: element}} handle_error={console.error} batch_wait_ms={10}>
        {({data: options}) => {
            const resolved = resolveQueryOptionsPayload(element, options);
            if (resolved.error) {
                return <EmptyQueryOptions element={element} message={resolved.error} />;
            }
            if (resolved.options.length === 0) {
                return <EmptyQueryOptions element={element} />;
            }
            return <ListComponent argName={argName} options={resolved.options} isMulti={multi} initialValue={initialValue}
                                  setOutputValue={setOutputValue}/>
        }}
    </EndpointWrapper>
}

function combineAndLabelData(results: CompositeSourceResult[]): CombinedCompositeResult {
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

function getCompositeSourceResult(type: string, query: CompositeQueryState): CompositeSourceResult {
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

export function CompositeQueryComponent(
    {composites, multi, argName, initialValue, setOutputValue}:
    {
        composites: string[],
        multi: boolean,
        argName: string,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const queries = useQueries({
        queries: composites.map(composite => (bulkQueryOptions<WebOptions>(
            INPUT_OPTIONS.endpoint,
            { type: composite },
            false
        )))
    });

    if (queries.some(query => query.isLoading)) {
        return <div>Loading...</div>;
    }

    const results = composites.map((type, index) => getCompositeSourceResult(type, queries[index]));

    return <CombinedCompositeComponent
                results={results}
                multi={multi}
                argName={argName}
                initialValue={initialValue}
                setOutputValue={setOutputValue} />;
}


function CombinedCompositeComponent(
    {results, argName, multi, initialValue, setOutputValue}:
    {
        results: CompositeSourceResult[],
        argName: string,
        multi: boolean,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const combined = useMemo(() => combineAndLabelData(results), [results]);

    if (combined.blockingError) {
        return <EmptyQueryOptions element="composite query" message={combined.blockingError} />;
    }

    if (combined.options.length === 0) {
        return <EmptyQueryOptions element="composite query" />;
    }

    return (
        <div className="flex flex-col gap-2">
            {combined.warning && <QueryNotice tone="warning" message={combined.warning} />}
            <ListComponent argName={argName} options={combined.options} isMulti={multi} initialValue={initialValue}
                          setOutputValue={setOutputValue}/>
        </div>
    );
}
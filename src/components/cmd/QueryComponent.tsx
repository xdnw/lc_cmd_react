import ListComponent from "./ListComponent";
import {INPUT_OPTIONS} from "@/lib/endpoints";
import {WebOptions} from "../../lib/apitypes";
import { useMemo } from "react";
import EndpointWrapper from "../api/bulkwrapper";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";
import {
    combineCompositeSourceResults,
    resolveQueryOptionsPayload,
    toCompositeSourceResult,
    type CompositeSourceResult,
} from "./queryOptionUtils";

type QueryNoticeTone = "error" | "warning";

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

    const results = composites.map((type, index) => toCompositeSourceResult(type, queries[index]));

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
    const combined = useMemo(() => combineCompositeSourceResults(results), [results]);

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
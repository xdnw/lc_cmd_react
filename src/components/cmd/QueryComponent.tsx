import ListComponent from "./ListComponent";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { WebOptions } from "../../lib/apitypes";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";
import {
    combineCompositeSourceResults,
    toCompositeSourceResult,
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
    return <ResolvedQueryOptionsComponent
        types={[element]}
        multi={multi}
        argName={argName}
        initialValue={initialValue}
        setOutputValue={setOutputValue}
    />;
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
        return <div>Loading...</div>;
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
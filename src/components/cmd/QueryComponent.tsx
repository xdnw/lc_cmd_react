import ListComponent from "./ListComponent";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { WebOptions } from "../../lib/apitypes";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";
import Loading from "../ui/loading";
import {
    combineCompositeSourceResults,
    toCompositeSourceResult,
} from "./queryOptionUtils";

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
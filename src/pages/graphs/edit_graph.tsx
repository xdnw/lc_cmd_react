import { WebGraph } from "../../lib/apitypes";
import React, { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChartWithButtons } from "./SimpleChart";
import { getGraphEndpoints } from "../../utils/GraphUtil";
import { ApiFormInputs } from "@/components/api/apiform";
import { CommonEndpoint, QueryResult } from "@/lib/BulkQuery";



export default function ParamEditGraph() {
    const { type } = useParams<{ type: string }>();
    const selected = type ? getGraphEndpoints()[type.toLowerCase()] : undefined;
    if (!selected) {
        return <PickAnEndpoint />
    }
    return <>
        <h1 className="text-4xl text-center font-bold">
            {selected.endpoint.url.split(/(?=[A-Z])/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
        </h1>
        <EditGraph endpoint={selected} />
    </>
}

export function PickAnEndpoint() {
    return <div className="container bg-light/10 border border-light/10 p-2 rounded mt-2">
        <h1 className="text-xl font-bold mb-2">Pick a Graph Option</h1>
        <p className="mb-2">Please select one of the options below</p>
        <ul className="list-disc pl-5">
            {Object.values(getGraphEndpoints()).map(endpoint => (
                <li key={endpoint.endpoint.name} className="mb-1">
                    <Link className="text-blue-600 hover:text-blue-800 underline"
                        to={`${process.env.BASE_PATH}edit_graph/${endpoint.endpoint.name}`}>
                        {endpoint.endpoint.url.split(/(?=[A-Z])/)
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                    </Link>
                </li>
            ))}
        </ul>
    </div>
}

function EditGraph<U extends { [key: string]: string | string[] | undefined }, V extends { [key: string]: string | string[] | undefined }>(
    { endpoint, args }: {
        endpoint: CommonEndpoint<WebGraph, U, V>,
        args?: U
    }) {
    const [graph, setGraph] = useState<WebGraph | null>(null);

    // Memoize initial state to avoid re-initializing on re-renders
    const initialArgs = useMemo(() => args || {} as U, [args]);
    const [usedArgs, setUsedArgs] = useState<U>(initialArgs);

    // Memoize the default values to prevent unnecessary re-renders
    const defaultValues = useMemo(() => ({ ...args } as V), [args]);

    // Wrap handler in useCallback to prevent recreation on each render
    const handleResponse = useCallback(({ data: newData, query }: Omit<QueryResult<WebGraph>, 'data'> & { data: NonNullable<QueryResult<WebGraph>['data']>; }) => {
        setGraph(newData);
        setUsedArgs(query as U);
        console.log("Setting graph", newData);
    }, [setUsedArgs, setGraph]);

    // Memoize the form component to prevent re-renders when parent re-renders
    const formComponent = useMemo(() => (
        <ApiFormInputs<WebGraph, U, V>
            endpoint={endpoint}
            showArguments={Object.keys(endpoint.endpoint.args) as (keyof U)[]}
            classes="bg-destructive"
            label="Generate Graph"
            default_values={defaultValues}
            handle_response={handleResponse}
        />
    ), [endpoint, defaultValues, handleResponse]);

    // Memoize the chart component to prevent re-renders
    const chartComponent = useMemo(() =>
        graph != null ? (
            <ChartWithButtons
                graph={graph}
                endpointName={endpoint.endpoint.name}
                usedArgs={usedArgs}
            />
        ) : null
        , [graph, endpoint.endpoint.name, usedArgs]);

    return (
        <div className="container bg-light/10 border border-light/10 p-2 mt-2">
            <pre className="whitespace-pre-wrap break-all">{endpoint.endpoint.desc}</pre>
            {endpoint.endpoint.desc && <hr className="my-2" />}
            {formComponent}
            {chartComponent}
        </div>
    );
}
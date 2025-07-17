import { WebGraph } from "../../lib/apitypes";
import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { PickAnEndpoint } from "./edit_graph";
import { getQueryParams, queryParamsToObject } from "../../lib/utils";
import { ChartWithButtons } from "./SimpleChart";
import { getGraphEndpoints } from "../../utils/GraphUtil";
import { Button } from "../../components/ui/button";
import EndpointWrapper from "@/components/api/bulkwrapper";
import { CommonEndpoint } from "@/lib/BulkQuery";

export default function ParamViewGraph() {
    const { type } = useParams<{ type: string }>();
    const selected = type ? getGraphEndpoints()[type.toLowerCase()] : undefined;
    const argsMemo = useMemo(() => {
        const params = getQueryParams();
        return queryParamsToObject(params);
    }, []);
    if (!selected) {
        return <PickAnEndpoint />
    }
    return <>
        <ViewGraph endpoint={selected} args={argsMemo} />
    </>
}

export type GraphEndpoint = CommonEndpoint<WebGraph, { [key: string]: string | string[] | undefined }, { [key: string]: string | string[] | undefined }>;

type GraphViewUtilProps<U extends { [key: string]: string | string[] | undefined },
    V extends { [key: string]: string | string[] | undefined }> = {
        endpoint: CommonEndpoint<WebGraph, U, V>;
        args: U;
    };

export function StaticViewGraph
    <U extends { [key: string]: string | string[] | undefined },
        V extends { [key: string]: string | string[] | undefined }>(
            { endpoint, args }: GraphViewUtilProps<U, V>
        ): React.ReactNode {
    // Cast the endpoint to a GraphEndpoint.
    const graphEndpoint = endpoint as GraphEndpoint;
    // Wrap the args in a mutable ref to match ViewGraph prop requirements.
    console.log("ARGS", args);
    return <ViewGraph endpoint={graphEndpoint} args={args} />;
}

export function ViewGraph<U extends { [key: string]: string | string[] | undefined }, V extends { [key: string]: string | string[] | undefined }>(
    { endpoint, args }: {
        endpoint: CommonEndpoint<WebGraph, U, V>,
        args: { [key: string]: string | string[] | undefined }
    }) {
    return <EndpointWrapper<WebGraph, U, V> endpoint={endpoint} args={Object.fromEntries(Object.entries(args).filter(([key]) => key.toLowerCase() in endpoint.endpoint.argsLower)) as U}>
        {({ data }) => {
            return <>
                <Button variant="outline" size="sm" className="me-1 no-underline" asChild>
                    <Link to={`${process.env.BASE_PATH}edit_graph/${endpoint.endpoint.name}`}>Edit</Link>
                </Button>
                <ChartWithButtons graph={data} endpointName={endpoint.endpoint.name} usedArgs={args} />
            </>
        }
        }
    </EndpointWrapper>;
}
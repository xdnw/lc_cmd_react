import ListComponent from "./ListComponent";
import {INPUT_OPTIONS} from "@/lib/endpoints";
import {WebOptions} from "../../lib/apitypes";
import { useState} from "react";
import EndpointWrapper from "../api/bulkwrapper";
import { useQueries } from "@tanstack/react-query";
import { bulkQueryOptions } from "@/lib/queries";

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
            const key = options.key_numeric ?? options.key_string ?? [];
            const labelled = key.map((o, i) => ({
                label: options.text ? options.text[i] : o + "",
                value: o + "",
                subtext: options.subtext ? options.subtext[i] : undefined,
                color: options.color ? options.color[i] : undefined,
                icon: options.icon ? options.icon[i] : undefined
            }));
            // log the icons
            console.log("Loaded options for element", element, labelled.map(o => o.icon));
            return <ListComponent argName={argName} options={labelled} isMulti={multi} initialValue={initialValue}
                                  setOutputValue={setOutputValue}/>
        }}
    </EndpointWrapper>
}

function combineAndLabelData(data: WebOptions[], queryIds: number[]): {label: string, value: string, subtext?: string, color?: string}[] {
    const labelled = queryIds.map((queryId) => {
        const options = data[queryId];
        const key = options.key_numeric ?? options.key_string ?? [];
        return key.map((o, i) => ({
            label: options.text ? options.text[i] : o + "",
            value: o + "",
            subtext: options.subtext ? options.subtext[i] : undefined,
            color: options.color ? options.color[i] : undefined
        }));
    });
    return labelled.flat();
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

    if (queries.some(query => query.data?.data === undefined)) {
        return <div>No Data...</div>;
    }

    if (queries.some(query => query.error)) {
        return <div>Error loading options: {JSON.stringify(queries.map(query => query.error))}</div>;
    }

    const data: WebOptions[] = queries.map(query => query.data!.data!);
    const queryIds: number[] = composites.map((_, idx) => idx);

    return <CombinedCompositeComponent
                data={data}
                queryIds={queryIds}
                multi={multi}
                argName={argName}
                initialValue={initialValue}
                setOutputValue={setOutputValue} />;
}


function CombinedCompositeComponent(
    {data, queryIds, argName, multi, initialValue, setOutputValue}:
    {
        data: WebOptions[],
        queryIds: number[],
        argName: string,
        multi: boolean,
        initialValue: string,
        setOutputValue: (name: string, value: string) => void
    }
) {
    const [combined] = useState(() => combineAndLabelData(data, queryIds));

    return <ListComponent argName={argName} options={combined} isMulti={multi} initialValue={initialValue}
                          setOutputValue={setOutputValue}/>
}
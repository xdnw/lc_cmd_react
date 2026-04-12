import type { CommonEndpoint } from "@/lib/BulkQuery";
import { normalizeArgInitialValue } from "@/components/cmd/argInitialValueNormalization";

export type EndpointArgValues = { [key: string]: string | string[] | undefined };
export type DefinedEndpointArgValues = { [key: string]: string | string[] };

export function filterDefinedEndpointArgValues(values?: EndpointArgValues): DefinedEndpointArgValues {
    if (!values) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(values).filter(([_, value]) => value !== undefined)
    ) as DefinedEndpointArgValues;
}

export function normalizeEndpointArgValues<T, A extends EndpointArgValues, B extends EndpointArgValues>(
    endpoint: CommonEndpoint<T, A, B>,
    values?: EndpointArgValues,
): DefinedEndpointArgValues {
    const filteredValues = filterDefinedEndpointArgValues(values);

    return Object.fromEntries(
        Object.entries(filteredValues).flatMap(([key, value]) => {
            const arg = endpoint.endpoint.args[key];
            if (typeof value !== "string" || !arg) {
                return [[key, value]];
            }

            const normalizedValue = normalizeArgInitialValue(arg.getTypeBreakdown(), value, { isOptional: arg.arg.optional });
            return normalizedValue ? [[key, normalizedValue]] : [];
        })
    ) as DefinedEndpointArgValues;
}
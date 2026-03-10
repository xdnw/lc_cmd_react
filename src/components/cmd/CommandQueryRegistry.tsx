import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";

import type { WebError, WebOptions } from "@/lib/apitypes";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import type { TypeBreakdown } from "@/utils/Command";

import { collectArgInputWarmQueryTargets } from "./argInputWarmup";

export type CommandQueryLookupResult = {
    isLoading: boolean;
    error: unknown;
    data?: {
        data?: WebOptions | WebError | null;
    };
};

type CommandQueryRegistryValue = {
    hasTypes: (types: readonly string[]) => boolean;
    getQueryResult: (type: string) => CommandQueryLookupResult | undefined;
};

const CommandQueryRegistryContext = createContext<CommandQueryRegistryValue | null>(null);

function dedupeQueryTypes(types: readonly string[]): string[] {
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const type of types) {
        if (!type || seen.has(type)) {
            continue;
        }
        seen.add(type);
        ordered.push(type);
    }

    return ordered;
}

export function collectCommandQueryTypes(breakdowns: readonly TypeBreakdown[]): string[] {
    return dedupeQueryTypes(
        breakdowns.flatMap((breakdown) => collectArgInputWarmQueryTargets(breakdown).map((target) => target.type)),
    );
}

export function CommandQueryRegistryProvider({
    queryTypes,
    breakdowns,
    children,
}: {
    queryTypes?: readonly string[];
    breakdowns?: readonly TypeBreakdown[];
    children: ReactNode;
}) {
    const resolvedQueryTypes = useMemo(() => {
        if (queryTypes) {
            return dedupeQueryTypes(queryTypes);
        }

        return collectCommandQueryTypes(breakdowns ?? []);
    }, [breakdowns, queryTypes]);
    const queries = useQueries({
        queries: resolvedQueryTypes.map((type) => bulkQueryOptions<WebOptions | WebError>(
            INPUT_OPTIONS.endpoint,
            { type },
            false,
        )),
    });

    const registryValue = useMemo<CommandQueryRegistryValue>(() => {
        const resultsByType = new Map<string, CommandQueryLookupResult>();
        resolvedQueryTypes.forEach((type, index) => {
            const query = queries[index];
            if (!query) {
                return;
            }
            resultsByType.set(type, query as CommandQueryLookupResult);
        });

        return {
            hasTypes: (types) => types.every((type) => resultsByType.has(type)),
            getQueryResult: (type) => resultsByType.get(type),
        };
    }, [queries, resolvedQueryTypes]);

    return (
        <CommandQueryRegistryContext.Provider value={registryValue}>
            {children}
        </CommandQueryRegistryContext.Provider>
    );
}

export function useCommandQueryRegistry(): CommandQueryRegistryValue | null {
    return useContext(CommandQueryRegistryContext);
}

export function useCommandQueryResults(queryTypes: readonly string[]): CommandQueryLookupResult[] | null {
    const registry = useCommandQueryRegistry();
    const normalizedTypes = useMemo(() => dedupeQueryTypes(queryTypes), [queryTypes]);

    if (!registry || normalizedTypes.length === 0 || !registry.hasTypes(normalizedTypes)) {
        return null;
    }

    return queryTypes.map((type) => registry.getQueryResult(type)).filter((query): query is CommandQueryLookupResult => query != null);
}

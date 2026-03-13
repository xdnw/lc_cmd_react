export type TriStateValue = "-1" | "0" | "1";
import { normalizeTriStateControlValue } from "./booleanValueUtils";
export type CmdTriFilterKey =
    | "viewable"
    | "whitelist"
    | "coalition"
    | "isalliance"
    | "hasapi"
    | "hasoffshore"
    | "isguild"
    | "role";

export type CmdBrowserFilterState = {
    triFilters: Partial<Record<CmdTriFilterKey, TriStateValue>>;
    hasArgs: TriStateValue;
    rolesAny: string;
    requiredArgs: string;
};

export type CmdBrowserState = {
    query: string;
    showFilters: boolean;
    filters: CmdBrowserFilterState;
};

export const CMD_TRI_FILTER_DEFS: Array<{ key: CmdTriFilterKey; label: string }> = [
    { key: "viewable", label: "Viewable" },
    { key: "whitelist", label: "Whitelisted" },
    { key: "coalition", label: "Coalition" },
    { key: "isalliance", label: "Alliance" },
    { key: "hasapi", label: "API" },
    { key: "hasoffshore", label: "Offshore" },
    { key: "isguild", label: "Guild" },
    { key: "role", label: "Role annotation" },
];

export const CMD_BROWSER_SEARCH_PARAM_KEYS = Object.freeze([
    "q",
    "filters",
    "hasArgs",
    "roles",
    "requiredArgs",
    ...CMD_TRI_FILTER_DEFS.map(({ key }) => `tri_${key}`),
]) as readonly string[];

const TRI_STATE_VALUES = new Set<TriStateValue>(["-1", "0", "1"]);

export function createDefaultCmdBrowserState(overrides?: Partial<CmdBrowserState>): CmdBrowserState {
    return {
        query: overrides?.query ?? "",
        showFilters: overrides?.showFilters ?? false,
        filters: {
            triFilters: overrides?.filters?.triFilters ?? {},
            hasArgs: overrides?.filters?.hasArgs ?? "0",
            rolesAny: overrides?.filters?.rolesAny ?? "",
            requiredArgs: overrides?.filters?.requiredArgs ?? "",
        },
    };
}

export function normalizeTriStateValue(value: string | null | undefined): TriStateValue {
    const normalized = normalizeTriStateControlValue(value);
    return TRI_STATE_VALUES.has(normalized) ? normalized : "0";
}

export function parseCmdBrowserStateFromSearchParams(searchParams: URLSearchParams): CmdBrowserState {
    const triFilters: Partial<Record<CmdTriFilterKey, TriStateValue>> = {};

    CMD_TRI_FILTER_DEFS.forEach(({ key }) => {
        const value = normalizeTriStateValue(searchParams.get(`tri_${key}`));
        if (value !== "0") {
            triFilters[key] = value;
        }
    });

    return createDefaultCmdBrowserState({
        query: searchParams.get("q") ?? "",
        showFilters: searchParams.get("filters") === "1",
        filters: {
            triFilters,
            hasArgs: normalizeTriStateValue(searchParams.get("hasArgs")),
            rolesAny: searchParams.get("roles") ?? "",
            requiredArgs: searchParams.get("requiredArgs") ?? "",
        },
    });
}

export function createCmdBrowserSearchParams(state: CmdBrowserState): URLSearchParams {
    const searchParams = new URLSearchParams();
    const trimmedQuery = state.query.trim();
    if (trimmedQuery) {
        searchParams.set("q", trimmedQuery);
    }
    if (state.showFilters) {
        searchParams.set("filters", "1");
    }
    CMD_TRI_FILTER_DEFS.forEach(({ key }) => {
        const value = state.filters.triFilters[key];
        if (value && value !== "0") {
            searchParams.set(`tri_${key}`, value);
        }
    });
    if (state.filters.hasArgs !== "0") {
        searchParams.set("hasArgs", state.filters.hasArgs);
    }
    if (state.filters.rolesAny.trim()) {
        searchParams.set("roles", state.filters.rolesAny.trim());
    }
    if (state.filters.requiredArgs.trim()) {
        searchParams.set("requiredArgs", state.filters.requiredArgs.trim());
    }
    return searchParams;
}

export function countActiveCmdBrowserFilters(state: CmdBrowserState): number {
    let count = 0;
    count += Object.values(state.filters.triFilters).filter((value) => value && value !== "0").length;
    if (state.filters.hasArgs !== "0") {
        count += 1;
    }
    if (state.filters.rolesAny.trim()) {
        count += 1;
    }
    if (state.filters.requiredArgs.trim()) {
        count += 1;
    }
    return count;
}

export function isCmdBrowserStateEqual(left: CmdBrowserState, right: CmdBrowserState): boolean {
    if (left.query !== right.query || left.showFilters !== right.showFilters) {
        return false;
    }

    if (left.filters.hasArgs !== right.filters.hasArgs) {
        return false;
    }

    if (left.filters.rolesAny !== right.filters.rolesAny || left.filters.requiredArgs !== right.filters.requiredArgs) {
        return false;
    }

    const triKeys = new Set<CmdTriFilterKey>([
        ...Object.keys(left.filters.triFilters) as CmdTriFilterKey[],
        ...Object.keys(right.filters.triFilters) as CmdTriFilterKey[],
    ]);

    for (const key of triKeys) {
        if (normalizeTriStateValue(left.filters.triFilters[key]) !== normalizeTriStateValue(right.filters.triFilters[key])) {
            return false;
        }
    }

    return true;
}


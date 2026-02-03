import { CacheType } from "./apitypes";
import { UNPACKR } from "@/lib/utils";
import { JSONValue } from "./internaltypes";
import Cookies from "js-cookie";
import { hashString } from "@/utils/StringUtil";
import { Argument, IArgument } from "@/utils/Command";

export class QueryResult<T> {
    endpoint: string;
    query: { [key: string]: string | string[] };
    update_ms: number;
    cache?: { cache_type: CacheType; duration?: number; };
    data?: T | null;
    error?: string | null;

    constructor({
        endpoint,
        query,
        update_ms,
        cache,
        data,
        error }: {
            endpoint: string;
            query: { [key: string]: string | string[] };
            update_ms: number;
            cache?: { cache_type: CacheType; duration?: number };
            data?: T | null;
            error?: string | null;
        }) {
        this.endpoint = endpoint;
        this.query = query;
        this.update_ms = update_ms;
        this.cache = cache;
        this.data = data ?? null;
        this.error = error ?? null;
    }

    clone(): QueryResult<T> {
        return new QueryResult({
            endpoint: this.endpoint,
            query: this.query,
            update_ms: this.update_ms,
            cache: this.cache,
            data: this.data,
            error: this.error
        });
    }
}

const cacheKeyMap = new Map<string, object>();
const memoryWeakMap = new WeakMap<object, object>();
function getCacheKey(key: string): object {
    let keyObj = cacheKeyMap.get(key);
    if (!keyObj) {
        keyObj = {};
        cacheKeyMap.set(key, keyObj);
    }
    return keyObj;
}

export function loadFromCache<T>({ cache }: { cache: { cache_type?: CacheType; duration?: number; cookie_id: string } }): T | null {
    if (cache) {
        if (cache.cache_type === 'Cookie') {
            const cookieVal = Cookies.get(cache.cookie_id);
            if (cookieVal) {
                return JSON.parse(cookieVal) as T;
            }
        } else if (cache.cache_type === 'LocalStorage') {
            const elemWithExpiry = localStorage.getItem(cache.cookie_id);
            if (elemWithExpiry) {
                const parsedElem = JSON.parse(elemWithExpiry) as { expirationTime: number, data: T };
                if (parsedElem.expirationTime && Date.now() > parsedElem.expirationTime) {
                    localStorage.removeItem(cache.cookie_id);
                } else {
                    return parsedElem.data;
                }
            }
        } else if (cache.cache_type === 'SessionStorage') {
            const elemWithExpiry = sessionStorage.getItem(cache.cookie_id);
            if (elemWithExpiry) {
                const parsedElem = JSON.parse(elemWithExpiry) as { expirationTime: number, data: T };
                if (parsedElem.expirationTime && Date.now() > parsedElem.expirationTime) {
                    sessionStorage.removeItem(cache.cookie_id);
                } else {
                    return parsedElem.data;
                }
            }
        } else if (cache.cache_type === 'Memory') {
            const keyObj = getCacheKey(cache.cookie_id);
            if (keyObj) {
                const parsedElem = memoryWeakMap.get(keyObj) as { expirationTime: number, data: T };
                if (parsedElem) {
                    if (parsedElem.expirationTime && Date.now() > parsedElem.expirationTime) {
                        memoryWeakMap.delete(keyObj);
                    } else {
                        return parsedElem.data;
                    }
                }
            }
        }
    }
    return null;
}

// Pending query type to hold individual request info and promise callbacks.
interface PendingQuery<T> {
    endpoint: string;
    query: { [key: string]: string | string[] };
    cache?: { cache_type: CacheType; duration?: number; cookie_id: string };
    resolve: (result: QueryResult<T>) => void;
    reject: (error: Error) => void;
}

function cacheData({ cache, val }: { cache: { cache_type: CacheType; duration?: number; cookie_id: string }; val: JSONValue }) {
    const duration = cache.duration ?? 5000; // 30 days default in seconds
    const now = Date.now();
    const expirationTime = now + duration * 1000; // Convert to milliseconds
    const dataWithExpiration = { data: val, expirationTime: expirationTime };
    if (cache.cache_type === 'Cookie') {
        Cookies.set(cache.cookie_id, JSON.stringify(val), { expires: new Date(expirationTime) });
    } else if (cache.cache_type === 'LocalStorage') {
        localStorage.setItem(cache.cookie_id, JSON.stringify(dataWithExpiration));
    } else if (cache.cache_type === 'SessionStorage') {
        sessionStorage.setItem(cache.cookie_id, JSON.stringify(dataWithExpiration));
    } else if (cache.cache_type === 'Memory') {
        const keyObj = getCacheKey(cache.cookie_id);
        memoryWeakMap.set(keyObj, dataWithExpiration);
    }
}

// A global list to hold pending queries.
const pendingQueries: PendingQuery<unknown>[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function dispatchBatch() {
    // First, check pending queries for cache hits and resolve them immediately.
    // Iterate backwards so removals don't affect the loop.
    for (let i = pendingQueries.length - 1; i >= 0; i--) {
        const pq = pendingQueries[i];
        if (pq.cache) {
            const cachedData = loadFromCache({ cache: pq.cache });
            if (cachedData != null) {
                // Resolve the query with cached data.
                const result = new QueryResult({
                    endpoint: pq.endpoint,
                    query: pq.query,
                    update_ms: Date.now(),
                    cache: pq.cache,
                    data: cachedData,
                    error: null
                });
                pq.resolve(result);
                // Remove from pendingQueries.
                pendingQueries.splice(i, 1);
            }
        }
    }

    // If all queries were resolved via cache, there's no need to fetch.
    if (pendingQueries.length === 0) {
        batchTimer = null;
        return;
    }

    // Save remaining queries for network fetch and clear the queue.
    const queriesToFetch = pendingQueries.splice(0, pendingQueries.length);
    batchTimer = null;

    if (queriesToFetch.length === 1) {
        const single = queriesToFetch[0];
        const myPromise: Promise<unknown> = fetchSingle(single.endpoint, single.query, single.cache);
        myPromise.then((result: unknown) => {
            const possibleError = result as { error: string };
            if (possibleError.error) {
                const queryResult = new QueryResult({
                    endpoint: single.endpoint,
                    query: single.query,
                    update_ms: Date.now(),
                    cache: single.cache,
                    data: null,
                    error: possibleError.error
                });
                single.resolve(queryResult);
                return;
            }
            const queryResult = new QueryResult({
                endpoint: single.endpoint,
                query: single.query,
                update_ms: Date.now(),
                cache: single.cache,
                data: result,
                error: null
            });
            single.resolve(queryResult);
        }).catch((error: Error) => {
            single.reject(error);
        });
        return;
    }

    // Map each pending query into a simpler structure for the batched request.
    const finalQueries = queriesToFetch.map(q => ([q.endpoint, q.query]));

    // Encode the queries as form body data.
    const formBody = new URLSearchParams({ queries: JSON.stringify(finalQueries) }).toString();

    // Build the URL for the batched endpoint.
    const url = `${process.env.API_URL}query`;

    const headers: { 'Content-Type': string, 'Accept': string } = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "application/msgpack",
    };

    console.log("dispatchBatch", url, finalQueries);

    fetch(url, {
        method: 'POST',
        headers: headers,
        body: formBody,
        credentials: 'include'
    })
        .then(async response => {
            if (response.ok) {
                const serializedData = await response.arrayBuffer();
                const data = new Uint8Array(serializedData);
                return UNPACKR.unpack(data) as { results: { [key: string]: JSONValue }[] };
            } else {
                throw new Error('Network response was not ok.');
            }
        })
        .then(fetchedData => {
            const arr = fetchedData.results as { [key: string]: JSONValue }[];
            if (Array.isArray(arr)) {
                for (let i = 0; i < arr.length; i++) {
                    let val: { [key: string]: JSONValue; } | null = arr[i];
                    const query = queriesToFetch[i];
                    let error = val.success === false ? val.error ?? val.message ?? "Unknown Error (1)" : null;
                    if (val && !error) {
                        const cache = query.cache;
                        if (cache) {
                            cacheData({ cache, val });
                        }
                    } else {
                        val = null;
                        error = error ?? "Unknown Error (2)";
                    }
                    const pq = queriesToFetch[i];
                    const result: QueryResult<unknown> = new QueryResult({
                        endpoint: pq.endpoint,
                        query: pq.query,
                        update_ms: Date.now(),
                        cache: pq.cache,
                        data: val,
                        error: error as string | null,
                    });
                    pq.resolve(result);
                }
            } else {
                console.error("Invalid response format:", fetchedData);
                queriesToFetch.forEach(pq => pq.resolve(new QueryResult({
                    endpoint: pq.endpoint,
                    query: pq.query,
                    update_ms: Date.now(),
                    cache: pq.cache,
                    data: null,
                    error: "Invalid response format\n" + ((fetchedData as unknown as { message: string }).message ?? JSON.stringify(fetchedData)).replace("\\n", "\n")
                })));
            }
        })
        .catch(error => {
            queriesToFetch.forEach(pq => pq.reject(error));
        });
}

export function fetchSingle<T>(endpoint: string, query: { [key: string]: string | string[] }, cache: { cache_type?: CacheType; duration?: number; cookie_id?: string } | undefined): Promise<T> {
    console.log("fetchSingle", endpoint, query, cache);
    // check cache
    const cachedData = cache && cache.cache_type && cache.cookie_id ? loadFromCache<T>({ cache: cache as { cache_type: CacheType; duration?: number; cookie_id: string } }) : null;
    if (cachedData != null) {
        return Promise.resolve(cachedData);
    }

    const url = `${process.env.API_URL}${endpoint}`;
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            for (const val of value) {
                urlParams.append(key, val);
            }
        } else {
            urlParams.append(key, value);
        }
    }

    console.log("fetchSingle", endpoint, query);

    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Accept": "application/msgpack",
        },
        body: urlParams.toString(),
        credentials: 'include',
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then(serializedData => {
            return UNPACKR.unpack(new Uint8Array(serializedData)) as T;
        })
        .catch((error: unknown) => {
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error("Fetch error: " + JSON.stringify(error));
            }
        });
}

export function fillOutCache(endpoint: string, query: { [key: string]: string | string[] }, cache: { cache_type?: CacheType; duration?: number; cookie_id?: string } | undefined) {
    const copy: { cache_type?: CacheType; duration?: number; cookie_id?: string } = cache ? { ...cache } : {};
    if (!copy.cache_type) {
        copy.cache_type = 'Memory';
    }
    if (!copy.duration) {
        copy.duration = 30000;
    }
    if (!copy.cookie_id) {
        copy.cookie_id = `${endpoint}-${hashString(JSON.stringify(query))}`;
    }
    return copy as { cache_type: CacheType; duration: number; cookie_id: string };
}

/**
 * BulkQuery batches individual queries and returns a promise resolving to a QueryResult.
 *
 * @param params - Object containing:
 *    endpoint: string - The endpoint or name of the query.
 *    query: The query params.
 *    cache: Optional cache settings.
 *    batch_wait_ms: Optional wait time to batch queries, defaulting to 50ms.
 * @returns Promise<QueryResult<T>>
 */
export function fetchBulk<T>({ endpoint, query, cache, batch_wait_ms }: {
    endpoint: string;
    query: { [key: string]: string | string[] };
    cache?: { cache_type: CacheType; duration?: number; cookie_id: string };
    batch_wait_ms?: number;
}): Promise<QueryResult<T>> {
    const cachedData = cache ? loadFromCache<T>({ cache }) : null;

    let promise: Promise<QueryResult<T>>;

    if (cachedData != null) {
        console.log("fetchBulk[cached]", endpoint, query, cache, batch_wait_ms);
        promise = Promise.resolve(new QueryResult<T>({
            endpoint,
            query,
            update_ms: Date.now(),
            cache,
            data: cachedData
        }));
    } else {
        console.log("Queuing query", endpoint, query, cache, batch_wait_ms);
        promise = new Promise((resolve, reject) => {
            pendingQueries.push({
                endpoint,
                query,
                cache,
                resolve: resolve as unknown as (result: QueryResult<unknown>) => void,
                reject
            });
            const waitTime = batch_wait_ms ?? 50;

            // Clear and reset the timer if a new query is added.
            if (batchTimer) {
                clearTimeout(batchTimer);
            }
            batchTimer = setTimeout(dispatchBatch, waitTime);
        }) as Promise<QueryResult<T>>;
    }

    return promise.then(result => {
        console.log("fetchBulk[result]", endpoint, query, cache, batch_wait_ms, result);
        return result;
    });
}

///
interface PlaceholderData {
    type: string;
    fields: {
        [key: string]: boolean | { [key: string]: string };
    };
}

export class AbstractBuilder {
    protected data: PlaceholderData = {
        type: "",
        fields: {}
    };

    set(field: string, value: boolean | { [key: string]: string }): this {
        this.data.fields[field] = value;
        return this;
    }

    build(): PlaceholderData {
        return this.data;
    }
}

export class ApiEndpoint<T> {
    name: string;
    url: string;
    args: { [name: string]: Argument };
    cast: (data: unknown) => T;
    cache_duration: number;
    cache_type: CacheType;
    typeName: string;
    desc: string;
    argsLower: { [name: string]: string };
    isPost: boolean;

    constructor(name: string, url: string, args: { [name: string]: IArgument }, cast: (data: unknown) => T, cache_duration: number, cacheType: CacheType, typeName: string, desc: string, isPost: boolean) {
        this.name = name;
        this.url = url;
        this.args = {};
        for (const [key, value] of Object.entries(args)) {
            this.args[key] = new Argument(key, value);
        }
        this.argsLower = Object.fromEntries(Object.entries(args).map(([key, value]) => [key.toLowerCase(), key]));
        this.cast = cast;
        this.cache_duration = cache_duration ?? 5000;
        this.cache_type = cacheType;
        this.typeName = typeName;
        this.desc = desc;
        this.isPost = isPost;
    }

    async call(params: { [key: string]: string }): Promise<T> {
        return fetchSingle<T>(this.url, params, undefined);
    }
}

export type CommonEndpoint<T, U extends { [key: string]: string | string[] | undefined }, V extends { [key: string]: string | string[] | undefined }> = {
    endpoint: ApiEndpoint<T>;
};
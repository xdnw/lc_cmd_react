import Cookies from "js-cookie";
import { UNPACKR } from "@/lib/utils";
import { hashString } from "@/utils/StringUtil";
import { CacheType } from "./apitypes";
import { Argument, IArgument } from "@/utils/Command";

export type QueryParams = Record<string, string | string[]>;

/**
 * Cache input supports both the new names and your old names:
 * - preferred: { duration_ms, key }
 * - back-compat: { duration, cookie_id }
 *
 * IMPORTANT: This implementation treats duration as milliseconds (duration_ms).
 * If your server/client previously intended seconds, pass duration_ms = seconds * 1000.
 */
export type CacheInput = {
    cache_type?: CacheType;

    /** TTL in milliseconds (preferred) */
    duration_ms?: number;

    /** Storage key / cookie name (preferred) */
    key?: string;

    /** Back-compat alias (treated as milliseconds) */
    duration?: number;

    /** Back-compat alias for `key` */
    cookie_id?: string;
};

export type CacheConfig = {
    cache_type: CacheType;
    duration_ms: number;
    key: string;
};

export class QueryResult<T> {
    readonly endpoint: string;
    readonly query: QueryParams;
    readonly update_ms: number;
    readonly cache?: CacheConfig;
    readonly data: T | null;
    readonly error: string | null;

    constructor(args: {
        endpoint: string;
        query: QueryParams;
        update_ms: number;
        cache?: CacheConfig;
        data?: T | null;
        error?: string | null;
    }) {
        this.endpoint = args.endpoint;
        this.query = cloneQuery(args.query);
        this.update_ms = args.update_ms;
        this.cache = args.cache;
        this.data = args.data ?? null;
        this.error = args.error ?? null;
    }

    clone(): QueryResult<T> {
        return new QueryResult<T>({
            endpoint: this.endpoint,
            query: this.query,
            update_ms: this.update_ms,
            cache: this.cache ? { ...this.cache } : undefined,
            data: this.data,
            error: this.error,
        });
    }
}

export interface BulkQueryClientOptions {
    /** Base API URL, e.g. "https://api.example.com/" */
    apiUrl: string;

    /** Batch endpoint path (relative to apiUrl). Default: "query" */
    batchEndpoint?: string;

    /** Default batch window. Default: 50ms */
    defaultBatchWaitMs?: number;

    /** Optional max queries per batch request. */
    maxBatchSize?: number;

    /** Defaults used by fillOutCache(...) */
    defaultCacheType?: CacheType;
    defaultCacheDurationMs?: number;

    /** fetch init defaults */
    credentials?: RequestCredentials;

    /** Add/override headers (e.g. auth) */
    headers?: HeadersInit;

    /** Dependency injection for tests */
    fetchFn?: typeof fetch;
    unpackFn?: (data: Uint8Array) => unknown;

    /** Logs batching decisions. */
    debug?: boolean;
}

interface PendingSubscriber {
    cache?: CacheConfig;
    resolve: (result: QueryResult<unknown>) => void;
    reject: (error: Error) => void;
}

interface PendingGroup {
    key: string;
    endpoint: string;
    query: QueryParams;
    useCache: boolean;
    status: "queued" | "fetching";
    subscribers: PendingSubscriber[];
}

type StorageKind = "localStorage" | "sessionStorage";

export class BulkQueryClient {
    private readonly apiUrl: string;
    private readonly batchEndpoint: string;
    private readonly defaultBatchWaitMs: number;
    private readonly maxBatchSize?: number;
    private readonly defaultCacheType: CacheType;
    private readonly defaultCacheDurationMs: number;
    private readonly credentials: RequestCredentials;
    private readonly extraHeaders?: HeadersInit;
    private readonly fetchFn: typeof fetch;
    private readonly unpackFn: (data: Uint8Array) => unknown;
    private readonly debug: boolean;

    private readonly pendingByKey = new Map<string, PendingGroup>();
    private readonly queue: string[] = [];
    private dispatchTimer: ReturnType<typeof setTimeout> | null = null;
    private dispatchDeadlineMs: number | null = null;

    // TTL memory cache
    private readonly memoryCache = new Map<string, { expiresAt: number; data: unknown }>();
    private lastMemorySweepMs = 0;

    constructor(options: BulkQueryClientOptions) {
        this.apiUrl = options.apiUrl;
        this.batchEndpoint = options.batchEndpoint ?? "query";
        this.defaultBatchWaitMs = options.defaultBatchWaitMs ?? 50;
        this.maxBatchSize = options.maxBatchSize;
        this.defaultCacheType = options.defaultCacheType ?? "Memory";
        this.defaultCacheDurationMs = options.defaultCacheDurationMs ?? 30_000;
        this.credentials = options.credentials ?? "include";
        this.extraHeaders = options.headers;
        this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
        this.unpackFn = options.unpackFn ?? ((buf) => UNPACKR.unpack(buf));
        this.debug = options.debug ?? false;
    }

    /** Equivalent of your old fillOutCache(...), but normalized and explicit about ms. */
    public fillOutCache(endpoint: string, query: QueryParams, cache: CacheInput = {}): CacheConfig {
        const queryHash = this.hashQuery(query);
        return this.normalizeCache(endpoint, queryHash, cache);
    }

    public fetchBulk<T>(args: {
        endpoint: string;
        query: QueryParams;
        cache?: CacheInput;
        batch_wait_ms?: number;
    }): Promise<QueryResult<T>> {
        const { endpoint, query } = args;

        const useCache = args.cache != null;
        const queryHash = this.hashQuery(query);
        const cacheConfig = useCache ? this.normalizeCache(endpoint, queryHash, args.cache!) : undefined;

        // Cache read (only if cache config provided)
        if (cacheConfig) {
            const cached = this.loadFromCache<T>(cacheConfig);
            if (cached != null) {
                return Promise.resolve(
                    new QueryResult<T>({
                        endpoint,
                        query,
                        update_ms: Date.now(),
                        cache: cacheConfig ? toQueryResultCache(cacheConfig) : undefined,
                        data: cached,
                        error: null,
                    }),
                );
            }
        }

        // Dedupe in-flight requests by (endpoint+queryHash) AND whether caller opted into cache.
        const groupKey = this.makeGroupKey(endpoint, queryHash, useCache);
        let group = this.pendingByKey.get(groupKey);

        if (!group) {
            group = {
                key: groupKey,
                endpoint,
                query: cloneQuery(query),
                useCache,
                status: "queued",
                subscribers: [],
            };
            this.pendingByKey.set(groupKey, group);
            this.queue.push(groupKey);
        }

        // If queued, allow shortening the window (never extend it).
        if (group.status === "queued") {
            const waitMs = args.batch_wait_ms ?? this.defaultBatchWaitMs;
            this.scheduleDispatch(waitMs);

            if (this.maxBatchSize != null && this.queue.length >= this.maxBatchSize) {
                this.scheduleDispatch(0);
            }
        }

        return new Promise<QueryResult<T>>((resolve, reject) => {
            group!.subscribers.push({
                cache: cacheConfig ? toQueryResultCache(cacheConfig) : undefined,
                resolve: (r) => resolve(r as QueryResult<T>),
                reject,
            });
        });
    }

    /** Direct non-batched request, included for parity with your old fetchSingle. */
    public async fetchSingle<T>(endpoint: string, query: QueryParams, cache?: CacheInput): Promise<T> {
        const useCache = cache != null;
        const queryHash = this.hashQuery(query);
        const cacheConfig = useCache ? this.normalizeCache(endpoint, queryHash, cache!) : undefined;

        if (cacheConfig) {
            const cached = this.loadFromCache<T>(cacheConfig);
            if (cached != null) return cached;
        }

        const url = this.buildUrl(endpoint);
        const body = encodeFormBody(query);

        const headers = mergeHeaders(
            {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                Accept: "application/msgpack",
            },
            this.extraHeaders,
        );

        const res = await this.fetchFn(url, {
            method: "POST",
            headers,
            body,
            credentials: this.credentials,
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        }

        const buf = await res.arrayBuffer();
        const data = this.unpackFn(new Uint8Array(buf)) as T;

        // Avoid caching explicit API errors.
        if (cacheConfig && this.extractError(data) == null) {
            this.saveToCache(cacheConfig, data);
        }

        return data;
    }

    // ----------------------------
    // batching internals
    // ----------------------------

    private scheduleDispatch(waitMs: number): void {
        const ms = Math.max(0, waitMs);
        const now = Date.now();
        const desiredAt = now + ms;

        if (this.dispatchTimer == null) {
            this.dispatchDeadlineMs = desiredAt;
            this.dispatchTimer = setTimeout(() => {
                this.dispatchTimer = null;
                this.dispatchDeadlineMs = null;
                void this.dispatch();
            }, ms);
            return;
        }

        // Only reschedule earlier; never push the batch further out.
        if (this.dispatchDeadlineMs != null && desiredAt < this.dispatchDeadlineMs) {
            clearTimeout(this.dispatchTimer);
            const delay = Math.max(0, desiredAt - Date.now());
            this.dispatchDeadlineMs = desiredAt;
            this.dispatchTimer = setTimeout(() => {
                this.dispatchTimer = null;
                this.dispatchDeadlineMs = null;
                void this.dispatch();
            }, delay);
        }
    }

    private async dispatch(): Promise<void> {
        const limit = this.maxBatchSize ?? this.queue.length;
        const keys = this.queue.splice(0, limit);
        if (keys.length === 0) return;

        const groups: PendingGroup[] = [];
        for (const key of keys) {
            const group = this.pendingByKey.get(key);
            if (!group || group.status !== "queued") continue;
            group.status = "fetching";
            groups.push(group);
        }

        if (groups.length === 0) {
            if (this.queue.length > 0) this.scheduleDispatch(0);
            return;
        }

        // Cache check right before fetch
        const toFetch: PendingGroup[] = [];
        for (const g of groups) {
            if (g.useCache && this.tryResolveGroupFromCache(g)) continue;
            toFetch.push(g);
        }

        if (toFetch.length === 0) {
            if (this.queue.length > 0) this.scheduleDispatch(0);
            return;
        }

        this.log("dispatchBatch", toFetch.map((g) => [g.endpoint, g.query]));

        try {
            const payload = await this.fetchBatchPayload(toFetch);
            const results = (payload as { results?: unknown })?.results;

            if (!Array.isArray(results)) {
                const message =
                    (payload as { message?: unknown })?.message ??
                    `Invalid response format: ${safeStringify(payload)}`;
                for (const g of toFetch) {
                    this.resolveGroup(g, null, `Invalid response format\n${String(message)}`);
                }
                if (this.queue.length > 0) this.scheduleDispatch(0);
                return;
            }

            for (let i = 0; i < toFetch.length; i++) {
                const g = toFetch[i];
                const value = results[i];

                let error: string | null = null;
                if (value == null) {
                    error = "Empty result";
                } else {
                    error = this.extractError(value);
                }

                if (!error) {
                    // store to all subscriber cache keys (unique by key)
                    const uniqueCaches = new Map<string, CacheConfig>();
                    for (const sub of g.subscribers) {
                        if (sub.cache) uniqueCaches.set(sub.cache.key, sub.cache);
                    }
                    for (const cache of uniqueCaches.values()) {
                        this.saveToCache(cache, value);
                    }
                }

                this.resolveGroup(g, value, error);
            }
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            for (const g of toFetch) this.rejectGroup(g, error);
        } finally {
            if (this.queue.length > 0) this.scheduleDispatch(0);
        }
    }

    private async fetchBatchPayload(groups: PendingGroup[]): Promise<unknown> {
        const finalQueries = groups.map((g) => [g.endpoint, g.query] as const);
        const body = new URLSearchParams({ queries: JSON.stringify(finalQueries) }).toString();
        const url = this.buildUrl(this.batchEndpoint);

        const headers = mergeHeaders(
            {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                Accept: "application/msgpack",
            },
            this.extraHeaders,
        );

        const res = await this.fetchFn(url, {
            method: "POST",
            headers,
            body,
            credentials: this.credentials,
        });

        if (!res.ok) {
            throw new Error(`Batch query failed: ${res.status} ${res.statusText}`);
        }

        const buf = await res.arrayBuffer();
        return this.unpackFn(new Uint8Array(buf));
    }

    private tryResolveGroupFromCache(group: PendingGroup): boolean {
        // Try any subscriber-provided cache key; if any hits, use it for everyone.
        const uniqueCaches: CacheConfig[] = [];
        const seen = new Set<string>();

        for (const sub of group.subscribers) {
            const c = sub.cache;
            if (!c || seen.has(c.key)) continue;
            seen.add(c.key);
            uniqueCaches.push(c);
        }

        for (const cache of uniqueCaches) {
            const cached = this.loadFromCache<unknown>(cache);
            if (cached != null) {
                // Refresh all caches (sliding expiration)
                for (const c of uniqueCaches) this.saveToCache(c, cached);
                this.resolveGroup(group, cached, null);
                return true;
            }
        }
        return false;
    }

    // ----------------------------
    // resolve/reject internals
    // ----------------------------

    private resolveGroup(group: PendingGroup, data: unknown, error: string | null): void {
        const now = Date.now();

        for (const sub of group.subscribers) {
            sub.resolve(
                new QueryResult<unknown>({
                    endpoint: group.endpoint,
                    query: group.query,
                    update_ms: now,
                    cache: sub.cache,
                    data: error ? null : data,
                    error,
                }),
            );
        }

        group.subscribers.length = 0;
        this.pendingByKey.delete(group.key);
    }

    private rejectGroup(group: PendingGroup, error: Error): void {
        for (const sub of group.subscribers) sub.reject(error);
        group.subscribers.length = 0;
        this.pendingByKey.delete(group.key);
    }

    // ----------------------------
    // cache internals
    // ----------------------------

    private normalizeCache(endpoint: string, queryHash: string, cache: CacheInput): CacheConfig {
        const cache_type = cache.cache_type ?? this.defaultCacheType;
        const duration_ms =
            cache.duration_ms ??
            (typeof cache.duration === "number" ? cache.duration * 1000 : undefined) ??
            this.defaultCacheDurationMs;
        const key = cache.key ?? cache.cookie_id ?? `${endpoint}-${queryHash}`;

        return {
            cache_type,
            duration_ms: Math.max(0, duration_ms),
            key,
        };
    }

    public loadFromCache<T>(cache: CacheConfig): T | null {
        const now = Date.now();

        switch (cache.cache_type) {
            case "Memory": {
                this.sweepMemoryCache(now);
                const entry = this.memoryCache.get(cache.key);
                if (!entry) return null;
                if (entry.expiresAt <= now) {
                    this.memoryCache.delete(cache.key);
                    return null;
                }
                return entry.data as T;
            }

            case "Cookie": {
                if (!canUseDom()) return null;
                const raw = Cookies.get(cache.key);
                if (!raw) return null;
                try {
                    return JSON.parse(raw) as T;
                } catch {
                    Cookies.remove(cache.key);
                    return null;
                }
            }

            case "LocalStorage":
                return this.loadFromWebStorage<T>("localStorage", cache.key, now);

            case "SessionStorage":
                return this.loadFromWebStorage<T>("sessionStorage", cache.key, now);

            default:
                return null;
        }
    }

    private loadFromWebStorage<T>(kind: StorageKind, key: string, now: number): T | null {
        const storage = this.getStorage(kind);
        if (!storage) return null;

        let raw: string | null = null;
        try {
            raw = storage.getItem(key);
        } catch {
            return null;
        }
        if (!raw) return null;

        try {
            const parsed = JSON.parse(raw) as {
                data?: T;
                expiresAt?: number;
                expirationTime?: number; // back-compat
            };

            const expiresAt =
                typeof parsed.expiresAt === "number"
                    ? parsed.expiresAt
                    : typeof parsed.expirationTime === "number"
                        ? parsed.expirationTime
                        : undefined;

            if (typeof expiresAt === "number" && now > expiresAt) {
                storage.removeItem(key);
                return null;
            }

            return (parsed.data ?? null) as T | null;
        } catch {
            try {
                storage.removeItem(key);
            } catch {
                // ignore
            }
            return null;
        }
    }

    private saveToCache(cache: CacheConfig, value: unknown): void {
        const now = Date.now();
        const expiresAt = now + cache.duration_ms;

        if (cache.duration_ms <= 0) {
            this.removeFromCache(cache);
            return;
        }

        switch (cache.cache_type) {
            case "Memory":
                this.sweepMemoryCache(now);
                this.memoryCache.set(cache.key, { expiresAt, data: value });
                return;

            case "Cookie": {
                if (!canUseDom()) return;
                try {
                    Cookies.set(cache.key, JSON.stringify(value), { expires: new Date(expiresAt) });
                } catch {
                    // ignore (size/serialization)
                }
                return;
            }

            case "LocalStorage":
                this.saveToWebStorage("localStorage", cache.key, value, expiresAt);
                return;

            case "SessionStorage":
                this.saveToWebStorage("sessionStorage", cache.key, value, expiresAt);
                return;

            default:
                return;
        }
    }

    private saveToWebStorage(kind: StorageKind, key: string, value: unknown, expiresAt: number): void {
        const storage = this.getStorage(kind);
        if (!storage) return;
        try {
            storage.setItem(key, JSON.stringify({ data: value, expiresAt }));
        } catch {
            // ignore (quota/serialization)
        }
    }

    private removeFromCache(cache: CacheConfig): void {
        switch (cache.cache_type) {
            case "Memory":
                this.memoryCache.delete(cache.key);
                return;

            case "Cookie":
                if (!canUseDom()) return;
                Cookies.remove(cache.key);
                return;

            case "LocalStorage": {
                const storage = this.getStorage("localStorage");
                if (!storage) return;
                try {
                    storage.removeItem(cache.key);
                } catch {
                    // ignore
                }
                return;
            }

            case "SessionStorage": {
                const storage = this.getStorage("sessionStorage");
                if (!storage) return;
                try {
                    storage.removeItem(cache.key);
                } catch {
                    // ignore
                }
                return;
            }

            default:
                return;
        }
    }

    private sweepMemoryCache(nowMs: number): void {
        if (nowMs - this.lastMemorySweepMs < 60_000) return;
        this.lastMemorySweepMs = nowMs;
        for (const [k, entry] of this.memoryCache) {
            if (entry.expiresAt <= nowMs) this.memoryCache.delete(k);
        }
    }

    private getStorage(kind: StorageKind): Storage | null {
        if (typeof window === "undefined") return null;
        try {
            return kind === "localStorage" ? window.localStorage : window.sessionStorage;
        } catch {
            return null;
        }
    }

    // ----------------------------
    // misc internals
    // ----------------------------

    private extractError(value: unknown): string | null {
        if (!value || typeof value !== "object") return null;
        const obj = value as Record<string, unknown>;
        if (obj.success === false) {
            const msg = obj.error ?? obj.message ?? "Unknown error";
            return typeof msg === "string" ? msg : safeStringify(msg);
        }
        return null;
    }

    private hashQuery(query: QueryParams): string {
        return hashString(stableSerializeQuery(query));
    }

    private makeGroupKey(endpoint: string, queryHash: string, useCache: boolean): string {
        return `${endpoint}-${queryHash}:${useCache ? "cache" : "nocache"}`;
    }

    private buildUrl(path: string): string {
        return joinUrl(this.apiUrl, path);
    }

    private log(...args: unknown[]): void {
        if (this.debug) console.log(...args);
    }
}

// ----------------------------
// helpers
// ----------------------------

function canUseDom(): boolean {
    return typeof document !== "undefined";
}

function cloneQuery(query: QueryParams): QueryParams {
    const out: QueryParams = {};
    for (const [k, v] of Object.entries(query)) {
        out[k] = Array.isArray(v) ? [...v] : v;
    }
    return out;
}

function stableSerializeQuery(query: QueryParams): string {
    const keys = Object.keys(query).sort();
    const out: Record<string, string | string[]> = {};
    for (const k of keys) {
        const v = query[k];
        out[k] = Array.isArray(v) ? [...v] : v;
    }
    return JSON.stringify(out);
}

function encodeFormBody(query: QueryParams): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            for (const v of value) params.append(key, v);
        } else {
            params.append(key, value);
        }
    }
    return params.toString();
}

function joinUrl(base: string, path: string): string {
    if (!base) return path;
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

function mergeHeaders(base: HeadersInit, extra?: HeadersInit): Headers {
    const headers = new Headers(base);
    if (extra) {
        new Headers(extra).forEach((value, key) => headers.set(key, value));
    }
    return headers;
}

function safeStringify(value: unknown): string {
    try {
        return typeof value === "string" ? value : JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function getDefaultApiUrl(): string {
    // keep compatibility with your previous `process.env.API_URL` usage
    const fromProcess =
        typeof process !== "undefined" ? (process as any)?.env?.API_URL : undefined;

    return typeof fromProcess === "string" ? fromProcess : "";
}

type GlobalWithBulkQueryClient = typeof globalThis & {
    __bulkQueryClient?: BulkQueryClient;
};

const _global = globalThis as GlobalWithBulkQueryClient;

/**
 * Single global instance (shared across the whole app, even with HMR).
 * All batching, in-flight de-duping, and cache are centralized here.
 */
export const bulkQueryClient: BulkQueryClient =
    _global.__bulkQueryClient ??
    (_global.__bulkQueryClient = new BulkQueryClient({
        apiUrl: getDefaultApiUrl(),
    }));

export type QueryResultCache = CacheConfig & {
    /** legacy alias (seconds) */
    duration?: number;
    /** legacy alias */
    cookie_id?: string;
};

function toQueryResultCache(c: CacheConfig): QueryResultCache {
    return {
        ...c,
        cookie_id: c.key,
        duration: c.duration_ms / 1000,
    };
}

// ----------------------------
// Legacy API wrappers (backwards compatible)
// ----------------------------

export type LegacyCache = {
    cache_type?: CacheType;
    /** legacy: seconds */
    duration?: number;
    cookie_id?: string;
};

export function fillOutCache(
    endpoint: string,
    query: QueryParams,
    cache: LegacyCache | undefined,
) {
    // Matches your old behavior/shape exactly
    const copy: LegacyCache = cache ? { ...cache } : {};
    if (!copy.cache_type) copy.cache_type = "Memory";
    if (!copy.duration) copy.duration = 30000; // legacy default (seconds) as in your old code
    if (!copy.cookie_id) {
        copy.cookie_id = `${endpoint}-${hashString(JSON.stringify(query))}`;
    }
    return copy as { cache_type: CacheType; duration: number; cookie_id: string };
}

export function fetchSingle<T>(
    endpoint: string,
    query: QueryParams,
    cache: LegacyCache | undefined,
): Promise<T> {
    return bulkQueryClient.fetchSingle<T>(endpoint, query, cache);
}

export function fetchBulk<T>({
    endpoint,
    query,
    cache,
    batch_wait_ms,
}: {
    endpoint: string;
    query: QueryParams;
    cache?: { cache_type: CacheType; duration?: number; cookie_id: string };
    batch_wait_ms?: number;
}): Promise<QueryResult<T>> {
    return bulkQueryClient.fetchBulk<T>({
        endpoint,
        query,
        cache,
        batch_wait_ms,
    });
}

// Optional: only add if you have callers importing it today.
export function loadFromCache<T>({
    cache,
}: {
    cache: { cache_type?: CacheType; duration?: number; cookie_id: string };
}): T | null {
    if (!cache?.cache_type) return null;
    return bulkQueryClient.loadFromCache<T>({
        cache_type: cache.cache_type,
        key: cache.cookie_id,
        duration_ms: (cache.duration ?? 30) * 1000
    });
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
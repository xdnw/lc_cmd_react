import { extractBackendError, fetchBulk } from "@/lib/BulkQuery";
import type { WebError, WebOptions } from "@/lib/apitypes";
import { INPUT_OPTIONS } from "@/lib/endpoints";

import type { SelectOption } from "./selectValueUtils";

type EnsureDatasetRequest = {
    id: string;
    type: "ensure-dataset";
    datasetId: string;
    queryType: string;
    payload: WebOptions | WebError | unknown;
};

type SearchDatasetRequest = {
    id: string;
    type: "search-dataset";
    datasetId: string;
    token: string;
    limit?: number;
};

type WorkerRequest = EnsureDatasetRequest | SearchDatasetRequest;

type EnsureDatasetResponse = {
    id: string;
    type: "ensure-dataset";
    datasetId: string;
    optionCount: number;
};

type SearchDatasetResponse = {
    id: string;
    type: "search-dataset";
    datasetId: string;
    options: SelectOption[];
    hasAnyMatch: boolean;
    hasExactMatch: boolean;
};

type WorkerErrorResponse = {
    id: string;
    error: string;
};

type WorkerResponse = EnsureDatasetResponse | SearchDatasetResponse | WorkerErrorResponse;

type PendingRequest = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
};

type SearchResult = {
    options: SelectOption[];
    hasAnyMatch: boolean;
    hasExactMatch: boolean;
};

let nextRequestId = 0;
let queryOptionsWorker: Worker | null = null;
const pendingRequests = new Map<string, PendingRequest>();
const ensuredDatasets = new Map<string, Promise<number>>();

function getWorker(): Worker {
    if (queryOptionsWorker) {
        return queryOptionsWorker;
    }

    queryOptionsWorker = new Worker(new URL("../../workers/queryOptions.worker.ts", import.meta.url), { type: "module" });
    queryOptionsWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const pending = pendingRequests.get(response.id);
        if (!pending) {
            return;
        }

        pendingRequests.delete(response.id);
        if ("error" in response) {
            pending.reject(new Error(response.error));
            return;
        }

        pending.resolve(response);
    };
    queryOptionsWorker.onerror = (event) => {
        const error = new Error(event.message || "Query option worker error");
        pendingRequests.forEach((pending) => pending.reject(error));
        pendingRequests.clear();
        ensuredDatasets.clear();
        queryOptionsWorker = null;
    };

    return queryOptionsWorker;
}

function postWorkerRequest<TResponse extends WorkerResponse>(message: WorkerRequest): Promise<TResponse> {
    const worker = getWorker();
    return new Promise<TResponse>((resolve, reject) => {
        pendingRequests.set(message.id, {
            resolve: (value) => resolve(value as TResponse),
            reject,
        });
        worker.postMessage(message);
    });
}

function createRequestId(prefix: string): string {
    nextRequestId += 1;
    return `${prefix}:${nextRequestId}`;
}

function postEnsureDataset(datasetId: string, queryType: string, payload: WebOptions | WebError | unknown): Promise<number> {
    const backendError = extractBackendError(payload);
    if (backendError) {
        return Promise.reject(new Error(backendError));
    }
    if (payload == null) {
        return Promise.reject(new Error(`No ${queryType} options were returned by the backend.`));
    }

    return postWorkerRequest<EnsureDatasetResponse>({
        id: createRequestId("ensure"),
        type: "ensure-dataset",
        datasetId,
        queryType,
        payload,
    }).then((response) => response.optionCount);
}

export function ensureQueryOptionDatasetFromPayload(datasetId: string, queryType: string, payload: WebOptions | WebError | unknown): Promise<number> {
    const cached = ensuredDatasets.get(datasetId);
    if (cached) {
        return cached;
    }

    const promise = postEnsureDataset(datasetId, queryType, payload);
    ensuredDatasets.set(datasetId, promise);
    return promise;
}

export function ensureQueryOptionDataset(datasetId: string, queryType: string): Promise<number> {
    const cached = ensuredDatasets.get(datasetId);
    if (cached) {
        return cached;
    }

    const promise = fetchBulk<WebOptions | WebError>({
        endpoint: INPUT_OPTIONS.endpoint.name,
        query: { type: queryType },
        cache: undefined,
        batch_wait_ms: 200,
    })
        .then((result) => {
            if (result.error) {
                throw new Error(result.error);
            }

            return postEnsureDataset(datasetId, queryType, result.data);
        });

    ensuredDatasets.set(datasetId, promise);
    return promise;
}

export async function searchQueryOptionDataset(datasetId: string, token: string, limit?: number): Promise<SearchResult> {
    const response = await postWorkerRequest<SearchDatasetResponse>({
        id: createRequestId("search"),
        type: "search-dataset",
        datasetId,
        token,
        limit,
    });

    return {
        options: response.options,
        hasAnyMatch: response.hasAnyMatch,
        hasExactMatch: response.hasExactMatch,
    };
}
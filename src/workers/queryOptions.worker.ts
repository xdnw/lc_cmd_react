import type { WebOptions } from "@/lib/apitypes";

import {
    buildQueryOptionDataset,
    searchQueryOptionDataset,
    type QueryOptionDataset,
} from "@/components/cmd/queryOptionDataset";
import type { SelectOption } from "@/components/cmd/selectValueUtils";

type EnsureDatasetMessage = {
    id: string;
    type: "ensure-dataset";
    datasetId: string;
    queryType: string;
    payload: WebOptions | unknown;
};

type SearchDatasetMessage = {
    id: string;
    type: "search-dataset";
    datasetId: string;
    token: string;
    limit?: number;
};

type WorkerRequest = EnsureDatasetMessage | SearchDatasetMessage;

type WorkerSuccessResponse =
    | {
        id: string;
        type: "ensure-dataset";
        datasetId: string;
        optionCount: number;
    }
    | {
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

const datasets = new Map<string, QueryOptionDataset>();

function toErrorResponse(id: string, error: unknown): WorkerErrorResponse {
    return {
        id,
        error: error instanceof Error ? error.message : String(error),
    };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const message = event.data;

    try {
        if (message.type === "ensure-dataset") {
            void (async () => {
                if (!datasets.has(message.datasetId)) {
                    const payload = message.payload;
                    if (!payload || typeof payload !== "object") {
                        throw new Error(`Invalid input_options response for ${message.queryType}`);
                    }
                    if ("error" in (payload as Record<string, unknown>) && typeof (payload as Record<string, unknown>).error === "string") {
                        throw new Error(String((payload as Record<string, unknown>).error));
                    }

                    datasets.set(message.datasetId, buildQueryOptionDataset(message.queryType, payload as WebOptions));
                }

                const dataset = datasets.get(message.datasetId);
                const response: WorkerSuccessResponse = {
                    id: message.id,
                    type: "ensure-dataset",
                    datasetId: message.datasetId,
                    optionCount: dataset?.options.length ?? 0,
                };
                self.postMessage(response);
            })().catch((error) => {
                self.postMessage(toErrorResponse(message.id, error));
            });
            return;
        }

        const dataset = datasets.get(message.datasetId);
        if (!dataset) {
            self.postMessage(toErrorResponse(message.id, `Missing query option dataset: ${message.datasetId}`));
            return;
        }

        const result = searchQueryOptionDataset(message.token, dataset, message.limit);
        const response: WorkerSuccessResponse = {
            id: message.id,
            type: "search-dataset",
            datasetId: message.datasetId,
            options: result.options,
            hasAnyMatch: result.hasAnyMatch,
            hasExactMatch: result.hasExactMatch,
        };
        self.postMessage(response);
    } catch (error) {
        self.postMessage(toErrorResponse(message.id, error));
    }
};
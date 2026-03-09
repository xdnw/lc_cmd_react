import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchBulkMock = vi.fn();

vi.mock("@/lib/BulkQuery", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/BulkQuery")>();
    return {
        ...actual,
        fetchBulk: (args: unknown) => fetchBulkMock(args),
    };
});

class WorkerStub {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    messages: unknown[] = [];

    constructor(_url: URL, _options?: WorkerOptions) {}

    postMessage(message: unknown) {
        this.messages.push(message);
        const typedMessage = message as { id: string; type: string; datasetId: string };
        queueMicrotask(() => {
            this.onmessage?.({
                data: {
                    id: typedMessage.id,
                    type: typedMessage.type,
                    datasetId: typedMessage.datasetId,
                    optionCount: 2,
                },
            } as MessageEvent);
        });
    }
}

describe("queryOptionWorkerClient", () => {
    beforeEach(() => {
        fetchBulkMock.mockReset();
        vi.resetModules();
        vi.stubGlobal("Worker", WorkerStub as unknown as typeof Worker);
    });

    it("hydrates worker datasets through fetchBulk so option fetches stay batched", async () => {
        fetchBulkMock.mockResolvedValue({
            data: {
                text: ["Borg", "Rose"],
                key_string: ["7", "9"],
            },
            error: null,
        });

        const { ensureQueryOptionDataset } = await import("./queryOptionWorkerClient");
        const optionCount = await ensureQueryOptionDataset("query:DBNation", "DBNation");

        expect(optionCount).toBe(2);
        expect(fetchBulkMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: "input_options",
            query: { type: "DBNation" },
            batch_wait_ms: 200,
        }));
    });
});
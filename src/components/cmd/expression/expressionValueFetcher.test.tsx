import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useExpressionValueSources } from "./expressionValueFetcher";
import type { ExpressionValueSourceRef } from "./expressionSchema";

const ensureQueryOptionDatasetMock = vi.fn<(datasetId: string, queryType: string) => Promise<number>>();
const searchQueryOptionDatasetMock = vi.fn<(datasetId: string, token: string, limit?: number) => Promise<{
    options: Array<{ label: string; value: string }>;
    hasAnyMatch: boolean;
    hasExactMatch: boolean;
}>>();

vi.mock("@tanstack/react-query", () => ({
    useQueries: () => [],
}));

vi.mock("../queryOptionWorkerClient", () => ({
    ensureQueryOptionDataset: (datasetId: string, queryType: string) => ensureQueryOptionDatasetMock(datasetId, queryType),
    searchQueryOptionDataset: (datasetId: string, token: string, limit?: number) => searchQueryOptionDatasetMock(datasetId, token, limit),
}));

function Harness({
    requests,
    searchTokensByCacheKey,
}: {
    requests: ExpressionValueSourceRef[];
    searchTokensByCacheKey: Record<string, string>;
}) {
    const registry = useExpressionValueSources(requests, searchTokensByCacheKey, true);
    return <pre data-testid="registry">{JSON.stringify(registry)}</pre>;
}

describe("useExpressionValueSources", () => {
    it("settles worker-backed query options after the intermediate loading render", async () => {
        ensureQueryOptionDatasetMock.mockReset();
        searchQueryOptionDatasetMock.mockReset();

        ensureQueryOptionDatasetMock.mockResolvedValue(14988);
        searchQueryOptionDatasetMock.mockImplementation(async () => {
            await Promise.resolve();
            return {
                options: [{ label: "Borg", value: "7" }],
                hasAnyMatch: true,
                hasExactMatch: false,
            };
        });

        const requests: ExpressionValueSourceRef[] = [{
            kind: "query-options",
            cacheKey: "query:DBNation",
            typeName: "DBNation",
            typeKey: "DBNation",
        }];

        render(
            <Harness
                requests={requests}
                searchTokensByCacheKey={{ "query:DBNation": "Bo" }}
            />,
        );

        await waitFor(() => {
            const registry = JSON.parse(screen.getByTestId("registry").textContent ?? "{}");
            expect(registry["query:DBNation"]).toMatchObject({
                status: "ready",
                optionCount: 14988,
                hasAnyMatch: true,
                hasExactMatch: false,
                options: [{ label: "Borg", value: "7" }],
            });
        });

        expect(ensureQueryOptionDatasetMock).toHaveBeenCalledTimes(1);
        expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "Bo", undefined);
    });

    it("still waits for dataset ensure after a fast token change while optionCount is still zero", async () => {
        ensureQueryOptionDatasetMock.mockReset();
        searchQueryOptionDatasetMock.mockReset();

        let resolveEnsure: ((value: number) => void) | undefined;
        ensureQueryOptionDatasetMock.mockImplementation(() => new Promise<number>((resolve) => {
            resolveEnsure = resolve;
        }));
        searchQueryOptionDatasetMock.mockResolvedValue({
            options: [{ label: "Borg", value: "7" }],
            hasAnyMatch: true,
            hasExactMatch: false,
        });

        const requests: ExpressionValueSourceRef[] = [{
            kind: "query-options",
            cacheKey: "query:DBNation",
            typeName: "DBNation",
            typeKey: "DBNation",
        }];

        const { rerender } = render(
            <Harness
                requests={requests}
                searchTokensByCacheKey={{ "query:DBNation": "" }}
            />,
        );

        rerender(
            <Harness
                requests={requests}
                searchTokensByCacheKey={{ "query:DBNation": "Bo" }}
            />,
        );

        expect(searchQueryOptionDatasetMock).not.toHaveBeenCalled();

        resolveEnsure?.(14988);

        await waitFor(() => {
            const registry = JSON.parse(screen.getByTestId("registry").textContent ?? "{}");
            expect(registry["query:DBNation"]).toMatchObject({
                status: "ready",
                optionCount: 14988,
                options: [{ label: "Borg", value: "7" }],
            });
        });

        expect(ensureQueryOptionDatasetMock).toHaveBeenCalled();
        expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "Bo", undefined);
    });

    it("does not truncate worker-backed results before the panel applies its own search", async () => {
        ensureQueryOptionDatasetMock.mockReset();
        searchQueryOptionDatasetMock.mockReset();

        ensureQueryOptionDatasetMock.mockResolvedValue(14988);
        searchQueryOptionDatasetMock.mockResolvedValue({
            options: Array.from({ length: 600 }, (_, index) => ({
                label: `Nation ${index}`,
                value: `${index}`,
            })),
            hasAnyMatch: true,
            hasExactMatch: false,
        });

        const requests: ExpressionValueSourceRef[] = [{
            kind: "query-options",
            cacheKey: "query:DBNation",
            typeName: "DBNation",
            typeKey: "DBNation",
        }];

        render(
            <Harness
                requests={requests}
                searchTokensByCacheKey={{ "query:DBNation": "" }}
            />,
        );

        await waitFor(() => {
            const registry = JSON.parse(screen.getByTestId("registry").textContent ?? "{}");
            expect(registry["query:DBNation"]).toMatchObject({
                status: "ready",
                optionCount: 14988,
            });
            expect(registry["query:DBNation"].options).toHaveLength(600);
        });

        expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "", undefined);
    });
});
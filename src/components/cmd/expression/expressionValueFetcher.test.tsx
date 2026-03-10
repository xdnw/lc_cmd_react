import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useExpressionValueSources } from "./expressionValueFetcher";
import type { ExpressionValueSourceRef } from "./expressionSchema";

const useQueriesMock = vi.fn();
const ensureQueryOptionDatasetFromPayloadMock = vi.fn<(datasetId: string, queryType: string, payload: unknown) => Promise<number>>();
const searchQueryOptionDatasetMock = vi.fn<(datasetId: string, token: string, limit?: number) => Promise<{
    options: Array<{ label: string; value: string }>;
    hasAnyMatch: boolean;
    hasExactMatch: boolean;
}>>();

vi.mock("@tanstack/react-query", () => ({
    useQueries: (...args: unknown[]) => useQueriesMock(...args),
}));

vi.mock("../queryOptionWorkerClient", () => ({
    ensureQueryOptionDatasetFromPayload: (datasetId: string, queryType: string, payload: unknown) => ensureQueryOptionDatasetFromPayloadMock(datasetId, queryType, payload),
    searchQueryOptionDataset: (datasetId: string, token: string, limit?: number) => searchQueryOptionDatasetMock(datasetId, token, limit),
}));

function makeWebOptions(length: number, prefix: string) {
    return {
        text: Array.from({ length }, (_, index) => `${prefix} ${index}`),
        key_string: Array.from({ length }, (_, index) => `${index}`),
    };
}

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
        useQueriesMock.mockReset();
        ensureQueryOptionDatasetFromPayloadMock.mockReset();
        searchQueryOptionDatasetMock.mockReset();

        const payload = makeWebOptions(14988, "Nation");
        useQueriesMock.mockReturnValue([{ isLoading: false, error: null, data: { data: payload } }]);
        ensureQueryOptionDatasetFromPayloadMock.mockResolvedValue(14988);
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

        expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledTimes(1);
        expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledWith("query:DBNation", "DBNation", payload);
        expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "Bo", undefined);
    });

    it("still waits for dataset ensure after a fast token change while optionCount is still zero", async () => {
        useQueriesMock.mockReset();
        ensureQueryOptionDatasetFromPayloadMock.mockReset();
        searchQueryOptionDatasetMock.mockReset();

        let resolveEnsure: ((value: number) => void) | undefined;
        const payload = makeWebOptions(14988, "Nation");
        useQueriesMock.mockReturnValue([{ isLoading: false, error: null, data: { data: payload } }]);
        ensureQueryOptionDatasetFromPayloadMock.mockImplementation(() => new Promise<number>((resolve) => {
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

        expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledWith("query:DBNation", "DBNation", payload);
        expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "Bo", undefined);
    });

    it("does not truncate worker-backed results before the panel applies its own search", async () => {
        useQueriesMock.mockReset();
        ensureQueryOptionDatasetFromPayloadMock.mockReset();
        searchQueryOptionDatasetMock.mockReset();

        const payload = makeWebOptions(14988, "Nation");
        useQueriesMock.mockReturnValue([{ isLoading: false, error: null, data: { data: payload } }]);
        ensureQueryOptionDatasetFromPayloadMock.mockResolvedValue(14988);
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

    it("uses the worker-backed path for large composite query sources and preserves composite prefixes", async () => {
        useQueriesMock.mockReset();
        ensureQueryOptionDatasetFromPayloadMock.mockReset();
        searchQueryOptionDatasetMock.mockReset();

        const nationPayload = makeWebOptions(3200, "Nation");
        const alliancePayload = makeWebOptions(2800, "Alliance");
        useQueriesMock.mockReturnValue([
            { isLoading: false, error: null, data: { data: nationPayload } },
            { isLoading: false, error: null, data: { data: alliancePayload } },
        ]);
        ensureQueryOptionDatasetFromPayloadMock.mockResolvedValue(3200);
        searchQueryOptionDatasetMock
            .mockResolvedValueOnce({
                options: [{ label: "Borg", value: "7" }],
                hasAnyMatch: true,
                hasExactMatch: false,
            })
            .mockResolvedValueOnce({
                options: [{ label: "Singularity", value: "7" }],
                hasAnyMatch: true,
                hasExactMatch: false,
            });

        const requests: ExpressionValueSourceRef[] = [{
            kind: "composite-query-options",
            cacheKey: "query:DBNationOrAlliance",
            typeName: "NationOrAlliance",
            composite: ["DBNation", "DBAlliance"],
            typeKey: "NationOrAlliance",
        }];

        render(
            <Harness
                requests={requests}
                searchTokensByCacheKey={{ "query:DBNationOrAlliance": "Bo" }}
            />,
        );

        await waitFor(() => {
            const registry = JSON.parse(screen.getByTestId("registry").textContent ?? "{}");
            expect(registry["query:DBNationOrAlliance"]).toMatchObject({
                status: "ready",
                optionCount: 6000,
            });
            expect(registry["query:DBNationOrAlliance"].options).toEqual([
                expect.objectContaining({ label: "nation:Borg", value: "nation:7" }),
                expect.objectContaining({ label: "AA:Singularity", value: "AA:7" }),
            ]);
        });

        expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledWith("query:DBNation", "DBNation", nationPayload);
        expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledWith("query:DBAlliance", "DBAlliance", alliancePayload);
        expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "Bo", undefined);
        expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBAlliance", "Bo", undefined);
    });
});
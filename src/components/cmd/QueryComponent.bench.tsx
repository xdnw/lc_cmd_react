import { act, cleanup, render } from "@testing-library/react";
import { afterEach, bench, describe, vi } from "vitest";

const useQueriesMock = vi.fn();
const ensureQueryOptionDatasetFromPayloadMock = vi.fn().mockResolvedValue(20000);
const searchQueryOptionDatasetMock = vi.fn().mockResolvedValue({
    options: Array.from({ length: 20000 }, (_, index) => {
        const value = `Nation ${String(index).padStart(5, "0")}`;
        return { label: value, value };
    }),
    hasAnyMatch: true,
    hasExactMatch: false,
});

vi.mock("@tanstack/react-query", () => ({
    useQueries: (...args: unknown[]) => useQueriesMock(...args),
}));

vi.mock("./queryOptionWorkerClient", () => ({
    ensureQueryOptionDatasetFromPayload: (...args: unknown[]) => ensureQueryOptionDatasetFromPayloadMock(...args),
    searchQueryOptionDataset: (...args: unknown[]) => searchQueryOptionDatasetMock(...args),
}));

import QueryComponent from "./QueryComponent";

const payload = {
    text: Array.from({ length: 20000 }, (_, index) => `Nation ${index}`),
    key_string: Array.from({ length: 20000 }, (_, index) => `${index}`),
};

afterEach(() => {
    cleanup();
    useQueriesMock.mockReset();
});

describe("query component mount", () => {
    bench("render large query component lazily", async () => {
        useQueriesMock.mockReturnValue([{ isLoading: false, error: null, data: { data: payload } }]);
        await act(async () => {
            render(
                <QueryComponent
                    element="DBNation"
                    multi={false}
                    argName="target"
                    initialValue=""
                    setOutputValue={() => {}}
                />,
            );
            await Promise.resolve();
        });
    });

    bench("render large query component with preload", async () => {
        useQueriesMock.mockReturnValue([{ isLoading: false, error: null, data: { data: payload } }]);
        await act(async () => {
            render(
                <QueryComponent
                    element="DBNation"
                    multi={false}
                    argName="target"
                    initialValue=""
                    preloadOptions
                    setOutputValue={() => {}}
                />,
            );
            await Promise.resolve();
        });
    });
});
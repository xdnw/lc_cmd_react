import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueriesMock = vi.fn();
const listComponentMock = vi.fn(({ options }: { options: Array<{ value: string; label: string }> }) => (
  <div data-testid="list-component">options:{options.map((option) => `${option.label}|${option.value}`).join(",")}</div>
));
const ensureQueryOptionDatasetFromPayloadMock = vi.fn();
const searchQueryOptionDatasetMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueries: (...args: unknown[]) => useQueriesMock(...args),
}));

vi.mock("./ListComponent", () => ({
  default: (props: { options: Array<{ value: string; label: string }> }) => listComponentMock(props),
}));

vi.mock("./queryOptionWorkerClient", () => ({
  ensureQueryOptionDatasetFromPayload: (...args: unknown[]) => ensureQueryOptionDatasetFromPayloadMock(...args),
  searchQueryOptionDataset: (...args: unknown[]) => searchQueryOptionDatasetMock(...args),
}));

import QueryComponent, { CompositeQueryComponent } from "./QueryComponent";

function makeWebOptions(values: Array<{ label: string; value: string }>) {
  return {
    text: values.map((value) => value.label),
    key_string: values.map((value) => value.value),
  };
}

describe("CompositeQueryComponent", () => {
  beforeEach(() => {
    useQueriesMock.mockReset();
    listComponentMock.mockClear();
    ensureQueryOptionDatasetFromPayloadMock.mockReset();
    searchQueryOptionDatasetMock.mockReset();
  });

  it("shows a warning and keeps working options when only some composites fail", () => {
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: {
          data: makeWebOptions([{ label: "Borg", value: "189573" }]),
        },
      },
      {
        isLoading: false,
        error: new Error("TaxBracket requires a guild. Please select a guild."),
      },
    ]);

    render(
      <CompositeQueryComponent
        composites={["DBNation", "TaxBracket"]}
        multi={false}
        argName="target"
        initialValue=""
        setOutputValue={vi.fn()}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain("TaxBracket: TaxBracket requires a guild. Please select a guild.");
    expect(screen.getByTestId("list-component").textContent).toContain("options:nation:Borg|nation:189573");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("defers large composite-query option hydration to the shared worker-backed path", async () => {
    const nationPayload = {
      text: Array.from({ length: 4000 }, (_, index) => `Nation ${index}`),
      key_string: Array.from({ length: 4000 }, (_, index) => `${index}`),
    };
    const alliancePayload = {
      text: Array.from({ length: 3000 }, (_, index) => `Alliance ${index}`),
      key_string: Array.from({ length: 3000 }, (_, index) => `AA:${index}`),
    };
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: { data: nationPayload },
      },
      {
        isLoading: false,
        error: null,
        data: { data: alliancePayload },
      },
    ]);
    ensureQueryOptionDatasetFromPayloadMock.mockResolvedValue(6000);
    searchQueryOptionDatasetMock
      .mockResolvedValueOnce({
        options: [{ label: "Borg", value: "189573" }],
        hasAnyMatch: true,
        hasExactMatch: false,
      })
      .mockResolvedValueOnce({
        options: [{ label: "Singularity", value: "AA:11657" }],
        hasAnyMatch: true,
        hasExactMatch: false,
      });

    render(
      <CompositeQueryComponent
        composites={["DBNation", "DBAlliance"]}
        multi={false}
        argName="target"
        initialValue=""
        preloadOptions
        setOutputValue={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledWith("query:DBNation", "DBNation", nationPayload);
      expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledWith("query:DBAlliance", "DBAlliance", alliancePayload);
    });
    await waitFor(() => {
      expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "");
      expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBAlliance", "");
    });
    expect(screen.getByTestId("list-component").textContent).toContain("options:nation:Borg|nation:189573,AA:Singularity|AA:11657");
  });

  it("prefixes composite options so overlapping source values stay distinct", () => {
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: {
          data: makeWebOptions([{ label: "Borg", value: "7" }]),
        },
      },
      {
        isLoading: false,
        error: null,
        data: {
          data: makeWebOptions([{ label: "Borg", value: "7" }]),
        },
      },
      {
        isLoading: false,
        error: null,
        data: {
          data: makeWebOptions([{ label: "Borg", value: "7" }]),
        },
      },
    ]);

    render(
      <CompositeQueryComponent
        composites={["DBNation", "DBAlliance", "GuildDB"]}
        multi={false}
        argName="target"
        initialValue=""
        setOutputValue={vi.fn()}
      />,
    );

    expect(screen.getByTestId("list-component").textContent).toContain("nation:Borg|nation:7");
    expect(screen.getByTestId("list-component").textContent).toContain("AA:Borg|AA:7");
    expect(screen.getByTestId("list-component").textContent).toContain("guild:Borg|guild:7");
  });

  it("fails hard when every composite source fails", () => {
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: new Error("Nation lookup failed."),
      },
      {
        isLoading: false,
        error: new Error("TaxBracket requires a guild. Please select a guild."),
      },
    ]);

    render(
      <CompositeQueryComponent
        composites={["DBNation", "TaxBracket"]}
        multi={false}
        argName="target"
        initialValue=""
        setOutputValue={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("DBNation: Nation lookup failed. | TaxBracket: TaxBracket requires a guild. Please select a guild.");
    expect(screen.queryByTestId("list-component")).toBeNull();
  });

  it("uses the same shared query path for a single query-backed input", () => {
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: {
          data: makeWebOptions([{ label: "Borg", value: "189573" }]),
        },
      },
    ]);

    render(
      <QueryComponent
        element="DBNation"
        multi={false}
        argName="target"
        initialValue=""
        setOutputValue={vi.fn()}
      />,
    );

    expect(screen.getByTestId("list-component").textContent).toContain("options:Borg|189573");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("defers large single-query option hydration to the shared worker-backed path", async () => {
    const payload = {
      text: Array.from({ length: 6000 }, (_, index) => `Nation ${index}`),
      key_string: Array.from({ length: 6000 }, (_, index) => `${index}`),
    };
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: { data: payload },
      },
    ]);
    ensureQueryOptionDatasetFromPayloadMock.mockResolvedValue(6000);
    searchQueryOptionDatasetMock.mockResolvedValue({
      options: [{ label: "Borg", value: "189573" }],
      hasAnyMatch: true,
      hasExactMatch: false,
    });

    render(
      <QueryComponent
        element="DBNation"
        multi={false}
        argName="target"
        initialValue=""
        preloadOptions
        setOutputValue={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledWith("query:DBNation", "DBNation", payload);
    });
    await waitFor(() => {
      expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "");
    });
    expect(screen.getByTestId("list-component").textContent).toContain("options:Borg|189573");
  });

  it("prewarms deferred large query-backed inputs before focus and activates on demand", async () => {
    const payload = {
      text: Array.from({ length: 6000 }, (_, index) => `Nation ${index}`),
      key_string: Array.from({ length: 6000 }, (_, index) => `${index}`),
    };
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: { data: payload },
      },
    ]);
    ensureQueryOptionDatasetFromPayloadMock.mockResolvedValue(6000);
    searchQueryOptionDatasetMock.mockResolvedValue({
      options: [{ label: "Borg", value: "189573" }],
      hasAnyMatch: true,
      hasExactMatch: false,
    });

    render(
      <QueryComponent
        element="DBNation"
        multi={false}
        argName="target"
        initialValue=""
        setOutputValue={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ensureQueryOptionDatasetFromPayloadMock).toHaveBeenCalledTimes(1);
    });

    expect(searchQueryOptionDatasetMock).not.toHaveBeenCalled();

    fireEvent.focus(screen.getByText(/Focus to open options|Preparing options/i));

    await waitFor(() => {
      expect(searchQueryOptionDatasetMock).toHaveBeenCalledWith("query:DBNation", "");
    });

    await waitFor(() => {
      expect(screen.getByTestId("list-component").textContent).toContain("options:Borg|189573");
    });
  });
});

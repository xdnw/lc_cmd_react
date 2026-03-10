import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueriesMock = vi.fn();
const listComponentMock = vi.fn(({ options }: { options: Array<{ value: string; label: string }> }) => (
  <div data-testid="list-component">options:{options.map((option) => `${option.label}|${option.value}`).join(",")}</div>
));

vi.mock("@tanstack/react-query", () => ({
  useQueries: (...args: unknown[]) => useQueriesMock(...args),
}));

vi.mock("./ListComponent", () => ({
  default: (props: { options: Array<{ value: string; label: string }> }) => listComponentMock(props),
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
});

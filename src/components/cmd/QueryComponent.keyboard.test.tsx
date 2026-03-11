import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const useQueriesMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueries: (...args: unknown[]) => useQueriesMock(...args),
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => React.ReactNode }) => (
    <div>{data.map((item, index) => <div key={index}>{itemContent(index, item)}</div>)}</div>
  ),
}));

vi.mock("../layout/DialogContext", () => ({
  useDialog: () => ({ showDialog: vi.fn() }),
}));

import QueryComponent from "./QueryComponent";

function makeWebOptions(values: Array<{ label: string; value: string }>) {
  return {
    text: values.map((value) => value.label),
    key_string: values.map((value) => value.value),
  };
}

describe("QueryComponent keyboard wrapper", () => {
  beforeEach(() => {
    useQueriesMock.mockReset();
  });

  it("preserves ListComponent keyboard selection behavior for resolved query options", () => {
    const setOutputValue = vi.fn();
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: {
          data: makeWebOptions([
            { label: "Borg", value: "189573" },
            { label: "Rose", value: "11657" },
          ]),
        },
      },
    ]);

    render(
      <QueryComponent
        element="DBNation"
        multi={false}
        argName="target"
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Bo" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(setOutputValue).toHaveBeenCalledWith("target", "189573");
  });

  it("inherits launcher-style active-descendant paging from ListComponent", () => {
    const setOutputValue = vi.fn();
    useQueriesMock.mockReturnValue([
      {
        isLoading: false,
        error: null,
        data: {
          data: makeWebOptions(
            Array.from({ length: 12 }, (_, index) => ({
              label: `Nation ${index + 1}`,
              value: `${index + 1}`,
            })),
          ),
        },
      },
    ]);

    render(
      <QueryComponent
        element="DBNation"
        multi={false}
        argName="target"
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowDown" });

    const options = screen.getAllByRole("option");
    fireEvent.keyDown(input, { key: "PageDown" });
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-activedescendant")).toBe(options[8]?.getAttribute("id") ?? "");

    fireEvent.keyDown(input, { key: "Home" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0]?.getAttribute("id") ?? "");
  });
});
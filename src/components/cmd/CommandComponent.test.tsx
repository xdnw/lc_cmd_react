import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../utils/Command", () => ({
  Argument: class Argument {},
  BaseCommand: class BaseCommand {},
}));

vi.mock("./ArgInput", () => ({
  default: ({ argName }: { argName: string }) => <input aria-label={argName} />,
}));

import CommandComponent from "./CommandComponent";

vi.mock("../layout/DialogContext", () => ({
  useDialog: () => ({
    showDialog: vi.fn(),
  }),
}));

describe("CommandComponent", () => {
  it("renders inputs immediately and reuses cached breakdowns across focus rerenders", () => {
    const getTypeBreakdownSpy = vi.fn(() => ({ element: "String", annotations: null, child: null }));
    const firstArg = {
      name: "first",
      arg: { name: "first", type: "String", optional: false, group: undefined, desc: "" },
      getTypeBreakdown: getTypeBreakdownSpy,
      getExamples: () => [],
      getTypeDesc: () => "",
    };
    const secondArg = {
      name: "second",
      arg: { name: "second", type: "String", optional: false, group: undefined, desc: "" },
      getTypeBreakdown: getTypeBreakdownSpy,
      getExamples: () => [],
      getTypeDesc: () => "",
    };
    const command = {
      name: "perf-regression",
      command: { groups: [], group_descs: [] },
      getArguments: () => [firstArg, secondArg],
    };

    render(
      <CommandComponent
        command={command as never}
        filterArguments={() => true}
        initialValues={{}}
        displayMode="focus-pane"
        setOutput={vi.fn()}
      />,
    );

    expect(getTypeBreakdownSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Loading input...")).toBeNull();

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);

    fireEvent.focus(inputs[0]);

    expect(getTypeBreakdownSpy).toHaveBeenCalledTimes(2);
  });
});
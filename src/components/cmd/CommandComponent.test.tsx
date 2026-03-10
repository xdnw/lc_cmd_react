import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../utils/Command", () => ({
  Argument: class Argument {},
  BaseCommand: class BaseCommand {},
}));

vi.mock("./ArgInput", () => ({
  default: ({ argName }: { argName: string }) => <input aria-label={argName} />,
}));

vi.mock("./argInputWarmup", () => ({
  prefetchArgInputData: vi.fn(),
}));

import CommandComponent from "./CommandComponent";

vi.mock("../layout/DialogContext", () => ({
  useDialog: () => ({
    showDialog: vi.fn(),
  }),
}));

describe("CommandComponent", () => {
  it("caches arg type breakdowns across focus rerenders", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
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
      <QueryClientProvider client={queryClient}>
        <CommandComponent
          command={command as never}
          filterArguments={() => true}
          initialValues={{}}
          displayMode="focus-pane"
          setOutput={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(getTypeBreakdownSpy).toHaveBeenCalledTimes(2);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.focus(inputs[0]);

    expect(getTypeBreakdownSpy).toHaveBeenCalledTimes(2);
  });
});
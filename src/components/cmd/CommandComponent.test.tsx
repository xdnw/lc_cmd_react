import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("resolves arg type breakdowns lazily and reuses cached results across focus rerenders", async () => {
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

    expect(getTypeBreakdownSpy).toHaveBeenCalledTimes(1);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.focus(inputs[0]);

    expect(getTypeBreakdownSpy).toHaveBeenCalledTimes(1);

    const deferredShell = screen.getByText("Loading input...").parentElement;
    if (!deferredShell) {
      throw new Error("Expected deferred input shell");
    }

    fireEvent.focus(deferredShell);

    await waitFor(() => {
      expect(getTypeBreakdownSpy).toHaveBeenCalledTimes(2);
    });
  });
});
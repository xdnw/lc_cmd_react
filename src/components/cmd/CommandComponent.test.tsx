import { useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const argInputMounts = new Map<string, number>();
const allowAllArguments = () => true;

vi.mock("../../utils/Command", () => ({
  Argument: class Argument {},
  BaseCommand: class BaseCommand {},
}));

vi.mock("./ArgInput", () => ({
  default: ({
    argName,
    initialValue,
    setOutputValue,
  }: {
    argName: string;
    initialValue: string;
    setOutputValue: (name: string, value: string) => void;
  }) => {
    useEffect(() => {
      argInputMounts.set(argName, (argInputMounts.get(argName) ?? 0) + 1);
    }, [argName]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setOutputValue(argName, event.currentTarget.value);
    };

    return (
      <input
        aria-label={argName}
        value={initialValue}
        onChange={handleChange}
      />
    );
  },
}));

vi.mock("../layout/DialogContext", () => ({
  useDialog: () => ({
    showDialog: vi.fn(),
  }),
}));

import CommandComponent from "./CommandComponent";

function createArg(name: string) {
  const getTypeBreakdownSpy = vi.fn(() => ({ element: "String", annotations: null, child: null }));
  return {
    name,
    arg: { name, type: "String", optional: false, group: undefined, desc: "" },
    getTypeBreakdown: getTypeBreakdownSpy,
    getExamples: () => [],
    getTypeDesc: () => "",
    getTypeBreakdownSpy,
  };
}

describe("CommandComponent", () => {
  beforeEach(() => {
    argInputMounts.clear();
  });

  it("renders inputs immediately and reuses cached breakdowns across focus rerenders", () => {
    const firstArg = createArg("first");
    const secondArg = createArg("second");
    const command = {
      name: "perf-regression",
      command: { groups: [], group_descs: [] },
      getArguments: () => [firstArg, secondArg],
    };

    render(
      <CommandComponent
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="focus-pane"
        setOutput={vi.fn()}
      />,
    );

    expect(firstArg.getTypeBreakdownSpy).toHaveBeenCalledTimes(1);
    expect(secondArg.getTypeBreakdownSpy).toHaveBeenCalledTimes(1);

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);

    fireEvent.focus(inputs[0]);

    expect(firstArg.getTypeBreakdownSpy).toHaveBeenCalledTimes(1);
    expect(secondArg.getTypeBreakdownSpy).toHaveBeenCalledTimes(1);
  });

  it("preserves parent-owned field values across rerenders without remounting the row", () => {
    const arg = createArg("name");
    const command = {
      name: "stable-row",
      command: { groups: [], group_descs: [] },
      getArguments: () => [arg],
    };
    const setOutput = vi.fn();

    const { rerender } = render(
      <CommandComponent
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="card"
        virtualizationMode="off"
        setOutput={setOutput}
      />,
    );

    const input = screen.getByRole("textbox", { name: "name" });
    fireEvent.change(input, { target: { value: "edited" } });

    expect((screen.getByRole("textbox", { name: "name" }) as HTMLInputElement).value).toBe("edited");
    expect(setOutput).toHaveBeenLastCalledWith("name", "edited");
    expect(argInputMounts.get("name")).toBe(1);

    rerender(
      <CommandComponent
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="focus-pane"
        virtualizationMode="off"
        setOutput={setOutput}
      />,
    );

    expect((screen.getByRole("textbox", { name: "name" }) as HTMLInputElement).value).toBe("edited");
    expect(argInputMounts.get("name")).toBe(1);
  });
});

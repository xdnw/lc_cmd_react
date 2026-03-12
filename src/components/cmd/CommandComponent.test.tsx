import { createRef, useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const argInputMounts = new Map<string, number>();
const allowAllArguments = () => true;
const { scrollToIndexSpy } = vi.hoisted(() => ({
  scrollToIndexSpy: vi.fn(),
}));

vi.mock("react-virtuoso", async () => {
  const React = await import("react");

  const Virtuoso = React.forwardRef(({
    data,
    itemContent,
    rangeChanged,
  }: {
    data: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
    rangeChanged?: (range: { startIndex: number; endIndex: number }) => void;
  }, ref: React.ForwardedRef<{ scrollToIndex: (options: { index: number }) => void }>) => {
    const initialEnd = Math.min(data.length - 1, 9);
    const [visibleRange, setVisibleRange] = React.useState({ startIndex: 0, endIndex: initialEnd });

    React.useEffect(() => {
      rangeChanged?.(visibleRange);
    }, [rangeChanged, visibleRange]);

    React.useImperativeHandle(ref, () => ({
      scrollToIndex: ({ index }: { index: number }) => {
        scrollToIndexSpy(index);
        setVisibleRange({ startIndex: index, endIndex: index });
      },
    }), []);

    return (
      <div data-testid="virtuoso-list">
        {data.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, offset) => (
          <div key={visibleRange.startIndex + offset}>
            {itemContent(visibleRange.startIndex + offset, item)}
          </div>
        ))}
      </div>
    );
  });

  return {
    Virtuoso,
  };
});

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

import CommandComponent, { type CommandComponentHandle } from "./CommandComponent";

function makeClipboardEventPayload(text: string) {
  return {
    clipboardData: {
      getData: (type: string) => (type === "text" ? text : ""),
    },
  };
}

function getCommandRoot() {
  const root = document.querySelector('[data-command-root="true"]');
  if (!(root instanceof HTMLElement)) {
    throw new Error("Expected command root to be rendered");
  }
  return root;
}

function createArg(name: string) {
  return createArgWithOptions(name);
}

function createArgWithOptions(
  name: string,
  options?: { element?: string; optional?: boolean },
) {
  const getTypeBreakdownSpy = vi.fn(() => ({ element: options?.element ?? "String", annotations: null, child: null }));
  return {
    name,
    arg: { name, type: options?.element ?? "String", optional: options?.optional ?? false, group: undefined, desc: "" },
    getTypeBreakdown: getTypeBreakdownSpy,
    getExamples: () => [],
    getTypeDesc: () => "",
    getTypeBreakdownSpy,
  };
}

function createCommand(name: string, args: ReturnType<typeof createArgWithOptions>[]) {
  return {
    name,
    command: { groups: [], group_descs: [] },
    getArguments: () => args,
    getPathString: () => name,
  };
}

describe("CommandComponent", () => {
  beforeEach(() => {
    argInputMounts.clear();
    scrollToIndexSpy.mockReset();
  });

  it("renders inputs immediately and reuses cached breakdowns across focus rerenders", () => {
    const firstArg = createArg("first");
    const secondArg = createArg("second");
    const command = createCommand("perf-regression", [firstArg, secondArg]);

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
    const command = createCommand("stable-row", [arg]);
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

  it("omits false output for optional binary booleans when parsing a pasted command", () => {
    const arg = createArgWithOptions("enabled", { element: "boolean", optional: true });
    const command = createCommand("optional-bool", [arg]);
    const setOutput = vi.fn();

    render(
      <CommandComponent
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="card"
        virtualizationMode="off"
        setOutput={setOutput}
      />,
    );

    fireEvent.paste(getCommandRoot(), makeClipboardEventPayload("/optional-bool enabled:False"));
    expect(setOutput).toHaveBeenLastCalledWith("enabled", "");
  });

  it("keeps false output for required binary booleans when parsing a pasted command", () => {
    const arg = createArgWithOptions("enabled", { element: "boolean", optional: false });
    const command = createCommand("required-bool", [arg]);
    const setOutput = vi.fn();

    render(
      <CommandComponent
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="card"
        virtualizationMode="off"
        setOutput={setOutput}
      />,
    );

    fireEvent.paste(getCommandRoot(), makeClipboardEventPayload("/required-bool enabled:False"));
    expect(setOutput).toHaveBeenLastCalledWith("enabled", "False");
  });

  it("drops neutral tri-state output when parsing a pasted command", () => {
    const arg = createArgWithOptions("state", { element: "Boolean", optional: true });
    const command = createCommand("optional-tristate", [arg]);
    const setOutput = vi.fn();

    render(
      <CommandComponent
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="card"
        virtualizationMode="off"
        setOutput={setOutput}
      />,
    );

    fireEvent.paste(getCommandRoot(), makeClipboardEventPayload("/optional-tristate state:0"));
    expect(setOutput).toHaveBeenLastCalledWith("state", "");

    fireEvent.paste(getCommandRoot(), makeClipboardEventPayload("/optional-tristate state:False"));
    expect(setOutput).toHaveBeenLastCalledWith("state", "False");
  });

  it("exposes argument search and focus through its imperative handle", () => {
    const userArg = createArg("user");
    userArg.arg.desc = "Select a user";
    const noteArg = createArg("note");
    noteArg.arg.desc = "Write a note";
    const command = createCommand("jump-targets", [userArg, noteArg]);
    const ref = createRef<CommandComponentHandle>();

    render(
      <CommandComponent
        ref={ref}
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="card"
        virtualizationMode="off"
        setOutput={vi.fn()}
      />,
    );

    expect(ref.current?.searchArgs("use").bestMatch).toBe("user");
    expect(ref.current?.focusArg("note")).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "note" }));
  });

  it("keeps shell jump search centered on argument identity instead of description text", () => {
    const cityArg = createArg("city");
    cityArg.arg.desc = "Used for sheets or formatted messages";
    const userArg = createArg("user");
    userArg.arg.desc = "A discord user mention";
    const ref = createRef<CommandComponentHandle>();
    const command = createCommand("name-first-jump", [cityArg, userArg]);

    render(
      <CommandComponent
        ref={ref}
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="card"
        virtualizationMode="off"
        setOutput={vi.fn()}
      />,
    );

    const match = ref.current?.searchArgs("u");
    expect(match?.bestMatch).toBe("user");
    expect(match?.matches[0]).toBe("user");
  });

  it("focuses offscreen arguments through the imperative handle when rows are virtualized", async () => {
    const args = Array.from({ length: 35 }, (_, index) => createArg(`arg-${index + 1}`));
    const command = createCommand("virtual-jump", args);
    const ref = createRef<CommandComponentHandle>();

    render(
      <CommandComponent
        ref={ref}
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{}}
        displayMode="card"
        setOutput={vi.fn()}
      />,
    );

    expect(screen.queryByRole("textbox", { name: "arg-35" })).toBeNull();

    expect(ref.current?.focusArg("arg-35")).toBe(true);

    const target = await screen.findByRole("textbox", { name: "arg-35" });
    expect(scrollToIndexSpy).toHaveBeenCalledWith(expect.any(Number));
    expect(document.activeElement).toBe(target);
  });

  it("uses shared edge-arrow checks to move between arguments", () => {
    const firstArg = createArg("first");
    const secondArg = createArg("second");
    const thirdArg = createArg("third");
    const command = {
      name: "edge-arrows",
      command: { groups: [], group_descs: [] },
      getArguments: () => [firstArg, secondArg, thirdArg],
    };

    render(
      <CommandComponent
        command={command as never}
        filterArguments={allowAllArguments}
        initialValues={{ first: "a", second: "b", third: "c" }}
        displayMode="card"
        virtualizationMode="off"
        setOutput={vi.fn()}
      />,
    );

    const firstInput = screen.getByRole("textbox", { name: "first" }) as HTMLInputElement;
    const secondInput = screen.getByRole("textbox", { name: "second" }) as HTMLInputElement;
    const thirdInput = screen.getByRole("textbox", { name: "third" }) as HTMLInputElement;

    firstInput.focus();
    firstInput.setSelectionRange(firstInput.value.length, firstInput.value.length);
    fireEvent.keyDown(firstInput, { key: "ArrowRight" });
    expect(document.activeElement).toBe(secondInput);

    fireEvent.keyDown(secondInput, { key: "ArrowDown" });
    expect(document.activeElement).toBe(thirdInput);

    thirdInput.setSelectionRange(0, 0);
    fireEvent.keyDown(thirdInput, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(secondInput);

    fireEvent.keyDown(secondInput, { key: "ArrowUp" });
    expect(document.activeElement).toBe(firstInput);
  });
});

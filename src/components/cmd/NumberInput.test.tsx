import { useCallback, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NumberInput from "./NumberInput";
import { COMMAND_SINGLE_LINE_ENTRY_ATTR } from "./commandKeyboard";
import { createCommandFieldState, type CommandFieldStateUpdater } from "./field/commandFieldState";

function ControlledNumberInput({
  initialValue = "",
  setOutputValue = vi.fn(),
  isFloat = false,
}: {
  initialValue?: string;
  setOutputValue?: (name: string, value: string) => void;
  isFloat?: boolean;
}) {
  const [fieldState, setFieldState] = useState(() => createCommandFieldState(initialValue));
  const handleFieldState = useCallback((updater: CommandFieldStateUpdater) => {
    setFieldState((previousState) => (typeof updater === "function" ? updater(previousState) : updater));
  }, []);

  return (
    <NumberInput
      argName="amount"
      initialValue={initialValue}
      fieldState={fieldState}
      setFieldState={handleFieldState}
      setOutputValue={setOutputValue}
      isFloat={isFloat}
    />
  );
}

describe("NumberInput", () => {
  it("preserves invalid in-progress text while only committing canonical numeric output", () => {
    const setOutputValue = vi.fn();

    render(<ControlledNumberInput setOutputValue={setOutputValue} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,000" } });

    expect(input.value).toBe("1,000");
    expect(setOutputValue).toHaveBeenLastCalledWith("amount", "1000");

    fireEvent.change(input, { target: { value: "1,000+" } });

    expect(input.value).toBe("1,000+");
    expect(setOutputValue).toHaveBeenLastCalledWith("amount", "1000");
    expect(screen.getByText(/invalid number/i)).toBeTruthy();
  });

  it("sets an input mode that matches integer versus decimal entry", () => {
    const { rerender } = render(<ControlledNumberInput isFloat={false} />);

    expect(screen.getByRole("textbox").getAttribute("inputmode")).toBe("numeric");

    rerender(<ControlledNumberInput isFloat={true} />);

    expect(screen.getByRole("textbox").getAttribute("inputmode")).toBe("decimal");
  });

  it("marks the field as a shared single-line command entry", () => {
    render(<ControlledNumberInput />);

    expect(screen.getByRole("textbox").getAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR)).toBe("true");
  });
});

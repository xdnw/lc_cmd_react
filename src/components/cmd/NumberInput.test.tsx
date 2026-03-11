import { useCallback, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NumberInput from "./NumberInput";
import { createCommandFieldState, type CommandFieldStateUpdater } from "./field/commandFieldState";

function ControlledNumberInput({
  initialValue = "",
  setOutputValue = vi.fn(),
}: {
  initialValue?: string;
  setOutputValue?: (name: string, value: string) => void;
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
      isFloat={false}
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
});

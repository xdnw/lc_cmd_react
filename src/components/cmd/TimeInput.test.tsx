import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { COMMAND_SINGLE_LINE_ENTRY_ATTR } from "./commandKeyboard";
import TimeInput from "./TimeInput";

describe("TimeInput", () => {
  it("renders safely when initialValue is undefined", () => {
    const setOutputValue = vi.fn();

    render(
      <TimeInput
        argName="time"
        initialValue={undefined as unknown as string}
        setOutputValue={setOutputValue}
      />,
    );

    expect((screen.getByTitle(/pick a local date\/time/i) as HTMLInputElement).value).toBe("");
    expect(setOutputValue).not.toHaveBeenCalled();
  });

  it("opts the native datetime control into shared single-line command advance", () => {
    render(
      <TimeInput
        argName="time"
        initialValue=""
        setOutputValue={vi.fn()}
      />,
    );

    expect(screen.getByTitle(/pick a local date\/time/i).getAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR)).toBe("true");
  });

  it("uses a non-tabbable picker button that reopens the picker from the input", () => {
    render(
      <TimeInput
        argName="time"
        initialValue=""
        setOutputValue={vi.fn()}
      />,
    );

    const input = screen.getByTitle(/pick a local date\/time/i) as HTMLInputElement & { showPicker?: () => void };
    const showPicker = vi.fn();
    input.showPicker = showPicker;

    const button = screen.getByRole("button", { name: /open date\/time picker/i });
    expect(button.tabIndex).toBe(-1);

    fireEvent.mouseDown(button);
    fireEvent.click(button);

    expect(document.activeElement).toBe(input);
    expect(showPicker).toHaveBeenCalledTimes(1);
  });
});
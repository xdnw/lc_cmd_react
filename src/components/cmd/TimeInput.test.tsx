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

  it("uses a non-tabbable picker button and opens the clicked input picker", () => {
    render(
      <div>
        <TimeInput
          argName="start"
          initialValue=""
          setOutputValue={vi.fn()}
        />
        <TimeInput
          argName="end"
          initialValue=""
          setOutputValue={vi.fn()}
        />
      </div>,
    );

    const inputs = screen.getAllByTitle(/pick a local date\/time/i) as Array<HTMLInputElement & { showPicker?: () => void }>;
    const firstShowPicker = vi.fn();
    const secondShowPicker = vi.fn();
    inputs[0].showPicker = firstShowPicker;
    inputs[1].showPicker = secondShowPicker;

    const buttons = screen.getAllByRole("button", { name: /open date\/time picker/i });
    expect(buttons[1].tabIndex).toBe(-1);

    fireEvent.mouseDown(buttons[1]);
    fireEvent.click(buttons[1]);

    expect(firstShowPicker).not.toHaveBeenCalled();
    expect(secondShowPicker).toHaveBeenCalledTimes(1);
  });
});
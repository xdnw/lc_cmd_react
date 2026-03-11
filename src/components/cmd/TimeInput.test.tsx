import { render, screen } from "@testing-library/react";
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
});
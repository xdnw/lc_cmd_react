import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
});
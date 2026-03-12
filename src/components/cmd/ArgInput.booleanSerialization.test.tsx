import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";
import ArgInput from "./ArgInput";

vi.mock("./HtmlEditor", () => ({
  default: () => null,
}));

function getRadio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLButtonElement;
}

describe("ArgInput boolean serialization", () => {
  it("omits false output for optional binary booleans", () => {
    const setOutputValue = vi.fn();

    render(
      <ArgInput
        argName="enabled"
        breakdown={getTypeBreakdown(CM, "boolean")}
        initialValue=""
        isOptional={true}
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.click(getRadio("True"));
    expect(setOutputValue).toHaveBeenLastCalledWith("enabled", "True");

    fireEvent.click(getRadio("False"));
    expect(setOutputValue).toHaveBeenLastCalledWith("enabled", "");
  });

  it("keeps false output for required binary booleans", () => {
    const setOutputValue = vi.fn();

    render(
      <ArgInput
        argName="enabled"
        breakdown={getTypeBreakdown(CM, "boolean")}
        initialValue=""
        isOptional={false}
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.click(getRadio("False"));
    expect(setOutputValue).toHaveBeenLastCalledWith("enabled", "False");
  });

  it("serializes tri-state as false-or-empty-or-true", () => {
    const setOutputValue = vi.fn();

    render(
      <ArgInput
        argName="state"
        breakdown={getTypeBreakdown(CM, "Boolean")}
        initialValue=""
        isOptional={true}
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.click(getRadio("False"));
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "False");

    fireEvent.click(getRadio("Any"));
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "");

    fireEvent.click(getRadio("True"));
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "True");
  });
});

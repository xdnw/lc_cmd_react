import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DialogProvider } from "../layout/DialogContext";
import { COMMAND_SINGLE_LINE_ENTRY_ATTR } from "./commandKeyboard";
import CityBuildInput from "./CityBuildInput";

describe("CityBuildInput", () => {
  it("renders safely when initialValue is undefined", () => {
    const setOutputValue = vi.fn();

    render(
      <DialogProvider>
        <CityBuildInput
          argName="cityBuild"
          initialValue={undefined as unknown as string}
          setOutputValue={setOutputValue}
        />,
      </DialogProvider>,
    );

    expect((screen.getByPlaceholderText(/city\/id=123/i) as HTMLInputElement).value).toBe("");
    expect(screen.getByText("No modifiers yet.")).toBeTruthy();
    expect(setOutputValue).not.toHaveBeenCalled();
  });

  it("marks its text-entry fields as shared single-line command inputs", () => {
    render(
      <DialogProvider>
        <CityBuildInput
          argName="cityBuild"
          initialValue=""
          setOutputValue={vi.fn()}
        />
      </DialogProvider>,
    );

    expect(screen.getByPlaceholderText(/city\/id=123/i).getAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR)).toBe("true");
    expect(screen.getByPlaceholderText("1234").getAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR)).toBe("true");
  });
});
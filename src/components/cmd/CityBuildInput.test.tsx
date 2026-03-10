import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DialogProvider } from "../layout/DialogContext";
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
});
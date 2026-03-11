import React, { useCallback } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";

const popupEnabled = { current: false };

function MockArgInput({
  argName,
  initialValue,
  setOutputValue,
}: {
  argName: string;
  initialValue?: string;
  setOutputValue: (name: string, value: string) => void;
}) {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setOutputValue(argName, event.currentTarget.value);
  }, [argName, setOutputValue]);

  const input = <input aria-label={argName} defaultValue={initialValue ?? ""} onChange={handleChange} />;
  return popupEnabled.current ? <div data-command-popup-open="true">{input}</div> : input;
}

vi.mock("./ArgInput", () => ({
  default: MockArgInput,
}));

vi.mock("../layout/DialogContext", () => ({
  useDialog: () => ({ showDialog: vi.fn() }),
}));

import SetInput from "./SetInput";

afterEach(() => {
  popupEnabled.current = false;
});

describe("SetInput keyboard contract", () => {
  it("adds a value on Enter and keeps repeated-entry flow in the same field", () => {
    const setOutputValue = vi.fn();

    render(
      <SetInput
        argName="tags"
        child={getTypeBreakdown(CM, "String")}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const valueInput = screen.getByRole("textbox", { name: "value" });
    valueInput.focus();
    fireEvent.change(valueInput, { target: { value: "alpha" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    expect(setOutputValue).toHaveBeenLastCalledWith("tags", "alpha");
    expect(document.activeElement).toBe(valueInput);
  });

  it("removes the previous item on Backspace from an empty pending field", () => {
    const setOutputValue = vi.fn();

    render(
      <SetInput
        argName="tags"
        child={getTypeBreakdown(CM, "String")}
        initialValue="alpha,beta"
        setOutputValue={setOutputValue}
      />,
    );

    const valueInput = screen.getByRole("textbox", { name: "value" });
    valueInput.focus();
    fireEvent.keyDown(valueInput, { key: "Backspace" });

    expect(setOutputValue).toHaveBeenLastCalledWith("tags", "alpha");
    expect(document.activeElement).toBe(valueInput);
  });

  it("defers Enter handling when the child input is in a popup-open state", () => {
    const setOutputValue = vi.fn();
    popupEnabled.current = true;

    render(
      <SetInput
        argName="tags"
        child={getTypeBreakdown(CM, "String")}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const valueInput = screen.getByRole("textbox", { name: "value" });
    fireEvent.change(valueInput, { target: { value: "alpha" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    expect(setOutputValue).not.toHaveBeenCalledWith("tags", "alpha");
  });
});

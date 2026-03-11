import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BooleanInput from "./BooleanInput";

function getRadios() {
  return screen.getAllByRole("radio") as HTMLButtonElement[];
}

function getCheckedRadio() {
  return getRadios().find((radio) => radio.getAttribute("aria-checked") === "true") ?? null;
}

describe("BooleanInput keyboard contract", () => {
  it("uses a single tab stop and arrow keys to switch values", () => {
    const setOutputValue = vi.fn();

    render(
      <BooleanInput
        argName="enabled"
        initialValue="1"
        setOutputValue={setOutputValue}
      />,
    );

    const radios = getRadios();
    expect(radios).toHaveLength(2);
    expect(radios[0]?.tabIndex).toBe(-1);
    expect(radios[1]?.tabIndex).toBe(0);

    const checkedBefore = getCheckedRadio();
    checkedBefore?.focus();
    fireEvent.keyDown(checkedBefore!, { key: "ArrowLeft" });

    const checked = getCheckedRadio();
    expect(checked?.textContent).toContain("False");
    expect(document.activeElement).toBe(checked);
    expect(setOutputValue).toHaveBeenLastCalledWith("enabled", "False");
  });

  it("supports mnemonic keys and Space toggle", () => {
    const setOutputValue = vi.fn();

    render(
      <BooleanInput
        argName="enabled"
        initialValue="0"
        setOutputValue={setOutputValue}
      />,
    );

    let checked = getCheckedRadio();
    checked?.focus();
    fireEvent.keyDown(checked!, { key: "t" });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("True");
    expect(setOutputValue).toHaveBeenLastCalledWith("enabled", "True");

    fireEvent.keyDown(checked!, { key: " " });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("False");
    expect(setOutputValue).toHaveBeenLastCalledWith("enabled", "False");

    fireEvent.keyDown(checked!, { key: "y" });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("True");
    expect(setOutputValue).toHaveBeenLastCalledWith("enabled", "True");
  });
});

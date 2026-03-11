import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TriStateInput from "./TriStateInput";

function getRadios() {
  return screen.getAllByRole("radio") as HTMLButtonElement[];
}

function getCheckedRadio() {
  return getRadios().find((radio) => radio.getAttribute("aria-checked") === "true") ?? null;
}

describe("TriStateInput keyboard contract", () => {
  it("uses a single tab stop and Home/End plus arrows to move through options", () => {
    const setOutputValue = vi.fn();

    render(
      <TriStateInput
        argName="state"
        initialValue="0"
        setOutputValue={setOutputValue}
      />,
    );

    const radios = getRadios();
    expect(radios).toHaveLength(3);
    expect(radios[0]?.tabIndex).toBe(-1);
    expect(radios[1]?.tabIndex).toBe(0);
    expect(radios[2]?.tabIndex).toBe(-1);

    radios[1]?.focus();
    fireEvent.keyDown(radios[1]!, { key: "End" });

    let checked = getCheckedRadio();
    expect(checked?.textContent).toContain("True");
    expect(document.activeElement).toBe(checked);
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "1");

    fireEvent.keyDown(checked!, { key: "Home" });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("False");
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "-1");

    fireEvent.keyDown(checked!, { key: "ArrowRight" });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("Any");
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "0");
  });

  it("supports mnemonic keys and Space cycling in visible order", () => {
    const setOutputValue = vi.fn();

    render(
      <TriStateInput
        argName="state"
        initialValue="-1"
        setOutputValue={setOutputValue}
      />,
    );

    let checked = getCheckedRadio();
    checked?.focus();
    fireEvent.keyDown(checked!, { key: " " });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("Any");
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "0");

    fireEvent.keyDown(checked!, { key: "t" });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("True");
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "1");

    fireEvent.keyDown(checked!, { key: "a" });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("Any");
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "0");

    fireEvent.keyDown(checked!, { key: "f" });
    checked = getCheckedRadio();
    expect(checked?.textContent).toContain("False");
    expect(setOutputValue).toHaveBeenLastCalledWith("state", "-1");
  });
});

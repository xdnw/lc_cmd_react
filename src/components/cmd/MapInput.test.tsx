import React, { useCallback } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";

const popupArgNames = new Set<string>();

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
  if (popupArgNames.has(argName)) {
    return <div data-command-popup-open="true">{input}</div>;
  }

  return input;
}

afterEach(() => {
  popupArgNames.clear();
});

vi.mock("./ArgInput", () => ({
  default: MockArgInput,
}));

vi.mock("../layout/DialogContext", () => ({
  useDialog: () => ({ showDialog: vi.fn() }),
}));

import MapInput from "./MapInput";

describe("MapInput keyboard contract", () => {
  it("uses unclaimed typing to jump between static map value rows for numeric-like values", () => {
    const setOutputValue = vi.fn();
    const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
    const staticKeys = keyBreakdown.getOptionData().options ?? [];

    render(
      <MapInput
        argName="resources"
        children={[keyBreakdown, getTypeBreakdown(CM, "Double")]}
        initialValue=""
        preferStaticKeyLayout
        setOutputValue={setOutputValue}
      />,
    );

    const uniqueFirstKey = staticKeys.find((candidate) => staticKeys.filter((key) => key.startsWith(candidate[0] ?? "")).length === 1) ?? staticKeys[0] ?? "";
    const uniqueLetter = uniqueFirstKey[0]?.toLowerCase();
    const firstInput = screen.getByRole("textbox", { name: `value-${staticKeys[0]}` });
    firstInput.focus();

    fireEvent.keyDown(firstInput, { key: uniqueLetter });

    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: `value-${uniqueFirstKey}` }));
  });

  it("keeps typed letters local for text-owning static map value rows", () => {
    const setOutputValue = vi.fn();
    const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
    const staticKeys = keyBreakdown.getOptionData().options ?? [];
    const firstInput = `value-${staticKeys[0]}`;

    render(
      <MapInput
        argName="resources"
        children={[keyBreakdown, getTypeBreakdown(CM, "String")]}
        initialValue=""
        preferStaticKeyLayout
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("textbox", { name: firstInput });
    input.focus();
    fireEvent.keyDown(input, { key: "c" });

    expect(document.activeElement).toBe(input);
  });

  it("disables static map typed jumps while a popup-backed value input is open", () => {
    const setOutputValue = vi.fn();
    const keyBreakdown = getTypeBreakdown(CM, "ResourceType");
    const staticKeys = keyBreakdown.getOptionData().options ?? [];
    popupArgNames.add(`value-${staticKeys[0]}`);

    render(
      <MapInput
        argName="resources"
        children={[keyBreakdown, getTypeBreakdown(CM, "Double")]}
        initialValue=""
        preferStaticKeyLayout
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("textbox", { name: `value-${staticKeys[0]}` });
    input.focus();
    fireEvent.keyDown(input, { key: "c" });

    expect(document.activeElement).toBe(input);
  });

  it("moves from key to value on Enter and outer-edge arrows within the row", () => {
    const setOutputValue = vi.fn();

    render(
      <MapInput
        argName="pairs"
        children={[getTypeBreakdown(CM, "String"), getTypeBreakdown(CM, "String")]}
        initialValue=""
        preferStaticKeyLayout={false}
        setOutputValue={setOutputValue}
      />,
    );

    const keyInput = screen.getByRole("textbox", { name: "key" }) as HTMLInputElement;
    const valueInput = screen.getByRole("textbox", { name: "value" }) as HTMLInputElement;

    keyInput.focus();
    keyInput.setSelectionRange(0, 0);
    fireEvent.keyDown(keyInput, { key: "Enter" });
    expect(document.activeElement).toBe(valueInput);

    valueInput.setSelectionRange(0, 0);
    fireEvent.keyDown(valueInput, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(keyInput);

    keyInput.setSelectionRange(0, 0);
    fireEvent.keyDown(keyInput, { key: "ArrowRight" });
    expect(document.activeElement).toBe(valueInput);
  });

  it("adds a key-value pair on Enter from the value field", () => {
    const setOutputValue = vi.fn();

    render(
      <MapInput
        argName="pairs"
        children={[getTypeBreakdown(CM, "String"), getTypeBreakdown(CM, "String")]}
        initialValue=""
        preferStaticKeyLayout={false}
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "key" }), { target: { value: "alpha" } });
    const valueInput = screen.getByRole("textbox", { name: "value" });
    fireEvent.change(valueInput, { target: { value: "beta" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    expect(setOutputValue).toHaveBeenLastCalledWith("pairs", "{alpha=beta}");
  });

  it("removes the previous pair from an empty pending field and keeps remove buttons out of tab order", () => {
    const setOutputValue = vi.fn();

    render(
      <MapInput
        argName="pairs"
        children={[getTypeBreakdown(CM, "String"), getTypeBreakdown(CM, "String")]}
        initialValue="alpha=beta"
        preferStaticKeyLayout={false}
        setOutputValue={setOutputValue}
      />,
    );

    const removeButton = screen.getByRole("button", { name: /remove alpha/i });
    expect(removeButton.tabIndex).toBe(-1);

    const keyInput = screen.getByRole("textbox", { name: "key" });
    keyInput.focus();
    fireEvent.keyDown(keyInput, { key: "Backspace" });

    expect(setOutputValue).toHaveBeenLastCalledWith("pairs", "");
    expect(document.activeElement).toBe(keyInput);
  });

  it("defers Enter handling when a popup-backed child owns the key", () => {
    const setOutputValue = vi.fn();
    popupArgNames.add("value");

    render(
      <MapInput
        argName="pairs"
        children={[getTypeBreakdown(CM, "String"), getTypeBreakdown(CM, "String")]}
        initialValue=""
        preferStaticKeyLayout={false}
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "key" }), { target: { value: "alpha" } });
    const valueInput = screen.getByRole("textbox", { name: "value" });
    fireEvent.change(valueInput, { target: { value: "beta" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    expect(setOutputValue).not.toHaveBeenCalledWith("pairs", "alpha=beta");
  });
});

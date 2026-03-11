import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MmrDoubleInput from "./MmrDoubleInput";

describe("MmrDoubleInput", () => {
  it("moves between slots with edge arrows and Home/End", () => {
    render(
      <MmrDoubleInput
        argName="mmr"
        initialValue="1/2/3/1"
        setOutputValue={vi.fn()}
      />,
    );

    const slot1 = screen.getByRole("textbox", { name: "MMR slot 1" }) as HTMLInputElement;
    const slot2 = screen.getByRole("textbox", { name: "MMR slot 2" }) as HTMLInputElement;
    const slot4 = screen.getByRole("textbox", { name: "MMR slot 4" }) as HTMLInputElement;

    slot2.focus();
    slot2.setSelectionRange(0, 0);
    fireEvent.keyDown(slot2, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(slot1);

    slot1.setSelectionRange(slot1.value.length, slot1.value.length);
    fireEvent.keyDown(slot1, { key: "ArrowRight" });
    expect(document.activeElement).toBe(slot2);

    fireEvent.keyDown(slot2, { key: "End" });
    expect(document.activeElement).toBe(slot4);

    fireEvent.keyDown(slot4, { key: "Home" });
    expect(document.activeElement).toBe(slot1);
  });
});
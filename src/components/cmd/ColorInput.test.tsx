import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { COMMAND_SINGLE_LINE_ENTRY_ATTR } from "./commandKeyboard";
import ColorInput from "./ColorInput";

describe("ColorInput", () => {
  it("marks the text field as a shared single-line command input without changing the native picker", () => {
    const { container } = render(
      <ColorInput
        argName="color"
        initialValue="#123456"
        setOutputValue={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText(/#420420 or red/i).getAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR)).toBe("true");
    const colorPicker = container.querySelector('input[type="color"]');
    expect(colorPicker?.getAttribute("type")).toBe("color");
    expect(colorPicker?.getAttribute(COMMAND_SINGLE_LINE_ENTRY_ATTR)).toBeNull();
  });
});
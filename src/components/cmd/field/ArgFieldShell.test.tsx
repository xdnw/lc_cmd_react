import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ArgFieldShell from "./ArgFieldShell";

describe("ArgFieldShell", () => {
  it("does not steal focus from contenteditable descendants", () => {
    const { getByTestId } = render(
      <ArgFieldShell>
        <div>
          <div
            data-testid="editor"
            contentEditable
            suppressContentEditableWarning
          >
            editable
          </div>
          <button type="button" data-testid="fallback-button">
            fallback
          </button>
        </div>
      </ArgFieldShell>,
    );

    const editor = getByTestId("editor");
    const button = getByTestId("fallback-button") as HTMLButtonElement;
    const buttonFocusSpy = vi.spyOn(button, "focus");

    fireEvent.click(editor);

    expect(buttonFocusSpy).not.toHaveBeenCalled();
  });

  it("prefers text-entry targets over buttons when shell chrome is clicked", () => {
    const { getByTestId } = render(
      <ArgFieldShell>
        <div>
          <div
            data-testid="editor"
            contentEditable
            suppressContentEditableWarning
          >
            editable
          </div>
          <button type="button" data-testid="fallback-button">
            fallback
          </button>
        </div>
      </ArgFieldShell>,
    );

    const shell = getByTestId("editor").closest("div.rounded.border") as HTMLDivElement;
    const editor = getByTestId("editor") as HTMLDivElement;
    const button = getByTestId("fallback-button") as HTMLButtonElement;
    const editorFocusSpy = vi.spyOn(editor, "focus");
    const buttonFocusSpy = vi.spyOn(button, "focus");

    fireEvent.click(shell);

    expect(editorFocusSpy).toHaveBeenCalled();
    expect(buttonFocusSpy).not.toHaveBeenCalled();
  });
});

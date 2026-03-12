import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const editorFocusSpy = vi.fn();
let exposeFocusMethod = true;

vi.mock("suneditor-react", () => {
  function MockSunEditor({ getSunEditorInstance }: { getSunEditorInstance?: (instance: unknown) => void }) {
    const editableRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
      const editable = editableRef.current;
      if (!editable || !getSunEditorInstance) {
        return;
      }

      const instance: {
        focus?: () => void;
        setContents: ReturnType<typeof vi.fn>;
        insertHTML: ReturnType<typeof vi.fn>;
        getContents: () => string;
        core: {
          context: {
            element: {
              wysiwyg: HTMLDivElement;
            };
          };
        };
      } = {
        setContents: vi.fn(),
        insertHTML: vi.fn(),
        getContents: () => editable.innerHTML,
        core: {
          context: {
            element: {
              wysiwyg: editable,
            },
          },
        },
      };

      if (exposeFocusMethod) {
        instance.focus = () => {
          editorFocusSpy();
          editable.focus();
        };
      }

      getSunEditorInstance(instance);
    }, [getSunEditorInstance]);

    return (
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="mock wysiwyg editor"
      />
    );
  }

  return { default: MockSunEditor };
});

import HtmlEditor from "./HtmlEditor";

describe("HtmlEditor keyboard contract", () => {
  afterEach(() => {
    exposeFocusMethod = true;
    editorFocusSpy.mockClear();
  });

  it("keeps mode toggle buttons out of the tab order and advertises local shortcuts", () => {
    const setOutputValue = vi.fn();

    render(
      <HtmlEditor
        argName="body"
        initialValue="<p>Hello</p>"
        setOutputValue={setOutputValue}
      />,
    );

    const wysiwygButton = screen.getByRole("button", { name: "WYSIWYG" });
    const rawButton = screen.getByRole("button", { name: "Raw" });

    expect(wysiwygButton.getAttribute("tabindex")).toBe("-1");
    expect(wysiwygButton.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+W");
    expect(rawButton.getAttribute("tabindex")).toBe("-1");
    expect(rawButton.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+R");
    expect(screen.getByText(/Alt\+Shift\+W for WYSIWYG, Alt\+Shift\+R for raw HTML\./i)).toBeTruthy();
  });

  it("switches editor modes with local Alt+Shift shortcuts", async () => {
    const setOutputValue = vi.fn();

    render(
      <HtmlEditor
        argName="body"
        initialValue="<p>Hello</p>"
        setOutputValue={setOutputValue}
      />,
    );

    const shell = screen.getByRole("button", { name: "Raw" }).closest("div[class]");
    expect(shell).toBeTruthy();

    fireEvent.keyDown(shell as HTMLElement, { key: "R", altKey: true, shiftKey: true });
    expect(screen.getByRole("textbox", { name: /body raw html editor/i })).toBeTruthy();

    const rawEditor = screen.getByRole("textbox", { name: /body raw html editor/i });
    fireEvent.keyDown(rawEditor, { key: "W", altKey: true, shiftKey: true });

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /mock wysiwyg editor/i })).toBeTruthy();
    });

    expect(editorFocusSpy).toHaveBeenCalled();
  });

  it("falls back to focusing the editable surface when the editor instance has no focus method", async () => {
    exposeFocusMethod = false;
    const setOutputValue = vi.fn();

    render(
      <HtmlEditor
        argName="body"
        initialValue="<p>Hello</p>"
        setOutputValue={setOutputValue}
      />,
    );

    const shell = screen.getByRole("button", { name: "Raw" }).closest("div[class]");
    expect(shell).toBeTruthy();

    fireEvent.keyDown(shell as HTMLElement, { key: "R", altKey: true, shiftKey: true });
    const rawEditor = screen.getByRole("textbox", { name: /body raw html editor/i });
    fireEvent.keyDown(rawEditor, { key: "W", altKey: true, shiftKey: true });

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /mock wysiwyg editor/i })).toBeTruthy();
    });

    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /mock wysiwyg editor/i }));
  });
});
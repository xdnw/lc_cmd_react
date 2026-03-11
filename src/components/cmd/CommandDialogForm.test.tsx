import React, { forwardRef, useImperativeHandle, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CommandDialogForm from "./CommandDialogForm";
import { DIALOG_LOCAL_ESCAPE_ATTR } from "@/components/ui/dialog";
import { COMMAND_LOCAL_PRINTABLE_KEYS_ATTR } from "./commandKeyboard";

let commandComponentRenderCount = 0;
let commandActionButtonRenderCount = 0;
let commandActionButtonClickCount = 0;
const searchArgsMock = vi.fn((query: string) => {
  if (query === "u") {
    return { matches: ["user"], bestMatch: "user", exactMatch: null };
  }
  if (query === "user") {
    return { matches: ["user"], bestMatch: "user", exactMatch: "user" };
  }
  return { matches: [], bestMatch: null, exactMatch: null };
});

vi.mock("./CommandComponent", () => ({
  default: forwardRef(({
    setOutput,
    jumpSearchMatches,
    jumpSearchActiveArg,
  }: {
    setOutput: (key: string, value: string) => void;
    jumpSearchMatches?: string[];
    jumpSearchActiveArg?: string | null;
  }, ref: React.ForwardedRef<{ focusArg: (argName: string) => boolean; searchArgs: (query: string) => unknown }>) => {
    commandComponentRenderCount += 1;
    const [popupOpen, setPopupOpen] = useState(false);
    const [boolValue, setBoolValue] = useState("false");

    useImperativeHandle(ref, () => ({
      focusArg: (argName: string) => {
        const field = document.querySelector<HTMLInputElement>(`[data-arg-name="${argName}"]`);
        field?.focus();
        return Boolean(field);
      },
      searchArgs: (query: string) => searchArgsMock(query),
    }));

    return (
      <div data-command-popup-open={popupOpen ? "true" : "false"}>
        <input aria-label="mock input" defaultValue="example" />
        <textarea aria-label="mock textarea" defaultValue="example" />
        <div role="radiogroup" aria-label="mock boolean" {...{ [COMMAND_LOCAL_PRINTABLE_KEYS_ATTR]: "t,f,space" }}>
          <button
            type="button"
            role="radio"
            aria-label="mock false"
            aria-checked={boolValue === "false"}
            onKeyDown={(event) => {
              if (event.key === "t" || event.key === "T") {
                event.preventDefault();
                setBoolValue("true");
              }
              if (event.key === "f" || event.key === "F") {
                event.preventDefault();
                setBoolValue("false");
              }
            }}
          >
            False
          </button>
          <button type="button" role="radio" aria-label="mock true" aria-checked={boolValue === "true"}>True</button>
        </div>
        <input aria-label="user field" data-arg-name="user" />
        <div data-testid="jump-state">{JSON.stringify({ jumpSearchMatches, jumpSearchActiveArg })}</div>
        <button type="button" onClick={() => setPopupOpen((current) => !current)}>toggle popup state</button>
        <button type="button" onClick={() => setOutput("value", "updated")}>mock field update</button>
      </div>
    );
  }),
}));

vi.mock("./CommandActionButton", () => ({
  default: ({
    args,
    label,
    buttonRef,
  }: {
    args: Record<string, string>;
    label?: string;
    buttonRef?: React.Ref<HTMLButtonElement>;
  }) => {
    commandActionButtonRenderCount += 1;

    if (buttonRef && typeof buttonRef !== "function") {
      buttonRef.current = {
        click: () => {
          commandActionButtonClickCount += 1;
        },
      } as HTMLButtonElement;
    }

    return (
      <button
        type="button"
        data-testid="mock-command-action"
        onClick={() => {
          commandActionButtonClickCount += 1;
        }}
      >
        {label}|{JSON.stringify(args)}
      </button>
    );
  },
}));

describe("CommandDialogForm", () => {
  afterEach(() => {
    commandComponentRenderCount = 0;
    commandActionButtonRenderCount = 0;
    commandActionButtonClickCount = 0;
    searchArgsMock.mockClear();
  });

  it("keeps the default form body from rerendering on output updates", () => {
    render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
      />,
    );

    const initialComponentRenderCount = commandComponentRenderCount;
    expect(initialComponentRenderCount).toBeGreaterThanOrEqual(1);
    const initialActionButtonRenderCount = commandActionButtonRenderCount;
    expect(initialActionButtonRenderCount).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: "mock field update" }));

    expect(commandComponentRenderCount).toBe(initialComponentRenderCount);
    expect(commandActionButtonRenderCount).toBeGreaterThan(initialActionButtonRenderCount);
    expect(screen.getByTestId("mock-command-action").textContent).toContain("updated");
  });

  it("submits through the existing action button on Ctrl+Enter and labels the shortcut", () => {
    render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
      />,
    );

    const input = screen.getByRole("textbox", { name: "mock input" });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(commandActionButtonClickCount).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("mock-command-action").textContent).toContain("Ctrl+Enter");
  });

  it("only marks itself as a dialog-local escape owner when back handling is enabled", () => {
    const { container, rerender } = render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
      />,
    );

    expect(container.firstElementChild?.getAttribute(DIALOG_LOCAL_ESCAPE_ATTR)).toBeNull();

    rerender(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    expect(container.firstElementChild?.getAttribute(DIALOG_LOCAL_ESCAPE_ATTR)).toBe("true");
  });

  it("does not submit from multiline textareas on Ctrl+Enter", () => {
    render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "mock textarea" });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    expect(commandActionButtonClickCount).toBe(0);
  });

  it("uses neutral-shell typing to jump to an argument", () => {
    const { container } = render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox", { name: "mock input" });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "u" });

    expect(screen.getByText(/Jump to user/i)).toBeTruthy();
    expect(screen.getByTestId("jump-state").textContent).toContain("user");

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "Enter" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "user field" }));
  });

  it("keeps exact jump matches armed until Enter confirms the jump", () => {
    const { container } = render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox", { name: "mock input" });
    input.focus();

    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "u" });
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "s" });
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "e" });
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "r" });

    expect(document.activeElement).toBe(container.firstElementChild);
    expect(screen.getByText(/Press Enter to jump to user/i)).toBeTruthy();

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "Enter" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "user field" }));
  });

  it("allows RightArrow to confirm an active jump", () => {
    const { container } = render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    const actionButton = screen.getByTestId("mock-command-action");
    actionButton.focus();

    fireEvent.keyDown(actionButton, { key: "u" });
    expect(screen.getByText(/Jump to user/i)).toBeTruthy();

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "user field" }));
  });

  it("still arms local Escape handling when an outer dialog already prevented the default close", () => {
    const onRequestBack = vi.fn();
    const { container } = render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={onRequestBack}
      />,
    );

    const input = screen.getByRole("textbox", { name: "mock input" });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
      }
    });

    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });

    expect(document.activeElement).toBe(container.firstElementChild);
    expect(screen.getByText(/Press Esc again to go back/i)).toBeTruthy();
    expect(onRequestBack).not.toHaveBeenCalled();

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "Escape" });
    expect(onRequestBack).toHaveBeenCalledTimes(1);
  });

  it("allows Space to confirm an active jump after shell jump mode starts", () => {
    const { container } = render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    const falseRadio = screen.getByRole("radio", { name: "mock false" });
    falseRadio.focus();

    fireEvent.keyDown(falseRadio, { key: "u" });
    expect(screen.getByText(/Jump to user/i)).toBeTruthy();

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: " " });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "user field" }));
  });

  it("starts argument jump directly from non-text dialog chrome without requiring Escape", () => {
    render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    const actionButton = screen.getByTestId("mock-command-action");
    actionButton.focus();

    fireEvent.keyDown(actionButton, { key: "u" });

    expect(screen.getByText(/Jump to user/i)).toBeTruthy();
    expect(screen.getByTestId("jump-state").textContent).toContain("user");

    fireEvent.keyDown(actionButton, { key: "Enter" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "user field" }));
  });

  it("preserves local radio mnemonics unless jump mode is explicitly armed", () => {
    const { container } = render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    const falseRadio = screen.getByRole("radio", { name: "mock false" });
    falseRadio.focus();

    fireEvent.keyDown(falseRadio, { key: "t" });
    expect(screen.getByRole("radio", { name: "mock true" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByText(/Jump to user/i)).toBeNull();

    fireEvent.keyDown(falseRadio, { key: "u" });
    expect(screen.getByText(/Jump to user/i)).toBeTruthy();

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "Enter" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "user field" }));
  });

  it("clears the armed escape hint when popup ownership changes", async () => {
    render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
        onRequestBack={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox", { name: "mock input" });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByText(/Press Esc again to go back/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /toggle popup state/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Press Esc again to go back/i)).toBeNull();
    });
  });
});
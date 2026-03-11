import React, { useCallback } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DIALOG_LOCAL_ESCAPE_ATTR: "data-dialog-local-escape",
}));

vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input ref={ref} {...props} />
  )),
}));

vi.mock("@/components/ui/button", () => ({
  Button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
    <button ref={ref} {...props} />
  )),
}));

vi.mock("@/components/ui/badge", () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/cmd/CommandComponent", () => ({
  ArgDescComponent: ({ arg }: { arg: { name: string } }) => <div>{arg.name}</div>,
}));

function MockArgInput({
  argName,
  initialValue,
  setOutputValue,
}: {
  argName: string;
  initialValue: string;
  setOutputValue: (name: string, value: string) => void;
}) {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setOutputValue(argName, event.currentTarget.value);
  }, [argName, setOutputValue]);

  return <input aria-label={argName} defaultValue={initialValue} onChange={handleChange} />;
}

vi.mock("@/components/cmd/ArgInput", () => ({
  default: MockArgInput,
}));

const zeroArgCommand = {
  path: ["alpha"],
  command: { return_type: "String" },
  getPathString: () => "alpha",
  getDescShort: () => "Alpha description",
  getArguments: () => [],
};

const argCommand = {
  path: ["beta"],
  command: { return_type: "String" },
  getPathString: () => "beta",
  getDescShort: () => "Beta description",
  getArguments: () => [
    {
      name: "target",
      arg: { name: "target", type: "String", desc: "Target nation", optional: false, def: "", min: undefined, max: undefined },
      getTypeBreakdown: () => ({ element: "String", annotations: null, child: null }),
      getExamples: () => [],
      getTypeDesc: () => "",
    },
  ],
};

vi.mock("@/utils/Command", () => ({
  CM: {
    placeholders: () => ({
      getCommands: () => [zeroArgCommand, argCommand],
    }),
  },
  placeholderMention: ({ type, command, args }: { type: string; command: string[]; args?: Record<string, string> }) => {
    const path = command.join("/");
    const params = args ? Object.entries(args).map(([key, value]) => `${key}=${value}`).join(",") : "";
    return `${type}:${path}${params ? `(${params})` : ""}`;
  },
}));

import PlaceholderCommandPickerDialog from "./PlaceholderCommandPickerDialog";

describe("PlaceholderCommandPickerDialog keyboard contract", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps focus on search while arrow keys update the active result", () => {
    render(
      <PlaceholderCommandPickerDialog
        open
        onOpenChange={vi.fn()}
        placeholderType="Nation"
        valueType="String"
        onInsert={vi.fn()}
      />,
    );

    const search = screen.getByRole("combobox") as HTMLInputElement;
    const options = screen.getAllByRole("option");
    search.focus();

    expect(search.getAttribute("aria-activedescendant")).toBe(options[0]?.getAttribute("id") ?? "");

    fireEvent.keyDown(search, { key: "ArrowDown" });

    expect(document.activeElement).toBe(search);
    expect(search.getAttribute("aria-activedescendant")).toBe(options[1]?.getAttribute("id") ?? "");
  });

  it("activates the active result from search on Enter", async () => {
    render(
      <PlaceholderCommandPickerDialog
        open
        onOpenChange={vi.fn()}
        placeholderType="Nation"
        valueType="String"
        onInsert={vi.fn()}
      />,
    );

    const search = screen.getByRole("combobox");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "target" }));
  });

  it("clears search first, then arms close, then closes on a second neutral Escape", () => {
    const onOpenChange = vi.fn();

    render(
      <PlaceholderCommandPickerDialog
        open
        onOpenChange={onOpenChange}
        placeholderType="Nation"
        valueType="String"
        onInsert={vi.fn()}
      />,
    );

    const search = screen.getByRole("combobox");
    fireEvent.change(search, { target: { value: "be" } });
    fireEvent.keyDown(search, { key: "Escape" });

    expect((search as HTMLInputElement).value).toBe("");
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.getByText(/Press Esc again to close placeholder picker/i)).toBeTruthy();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("backs from the arg step before closing the picker", async () => {
    const onOpenChange = vi.fn();

    render(
      <PlaceholderCommandPickerDialog
        open
        onOpenChange={onOpenChange}
        placeholderType="Nation"
        valueType="String"
        onInsert={vi.fn()}
      />,
    );

    const search = screen.getByRole("combobox");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    });

    const targetInput = screen.getByRole("textbox", { name: "target" });
    fireEvent.keyDown(targetInput, { key: "Escape" });
    expect(screen.getByText(/Press Esc again to return to search/i)).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("button", { name: "Back" }), { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeTruthy();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

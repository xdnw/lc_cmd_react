import { useCallback, useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const mockCommand = {
  name: "alpha",
  getPathString: () => "alpha",
  getDescShort: () => "Alpha command",
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({ children, headerActions }: { children: React.ReactNode; headerActions?: React.ReactNode }) => <div>{headerActions}{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DIALOG_EXPAND_BUTTON_CLASS_NAME: "dialog-expand",
}));

vi.mock("@/components/cmd/CmdList", () => ({
  default: ({
    state,
    onStateChange,
    onSelectCommand,
    onRequestClose,
  }: {
    state: { query: string; showFilters: boolean; filters: { triFilters: Record<string, string>; hasArgs: string; rolesAny: string; requiredArgs: string } };
    onStateChange: (state: { query: string; showFilters: boolean; filters: { triFilters: Record<string, string>; hasArgs: string; rolesAny: string; requiredArgs: string } }) => void;
    onSelectCommand: (command: typeof mockCommand) => void;
    onRequestClose?: () => void;
  }) => {
    const handleSetQuery = useCallback(() => {
      onStateChange({ ...state, query: "alpha" });
    }, [onStateChange, state]);

    const handleOpenCommand = useCallback(() => {
      onSelectCommand(mockCommand);
    }, [onSelectCommand]);

    const handleRequestClose = useCallback(() => {
      onRequestClose?.();
    }, [onRequestClose]);

    return (
      <div>
        <div data-testid="browser-query">{state.query}</div>
        <button type="button" onClick={handleSetQuery}>set browser query</button>
        <button type="button" onClick={handleOpenCommand}>open command</button>
        <button type="button" onClick={handleRequestClose}>close browser</button>
      </div>
    );
  },
}));

vi.mock("@/components/cmd/CommandDialogForm", () => ({
  default: ({
    onRequestBack,
    onOutputChange,
  }: {
    onRequestBack?: () => void;
    onOutputChange?: (output: Record<string, string | string[]>) => void;
  }) => {
    useEffect(() => {
      onOutputChange?.({ user: "demo" });
    }, [onOutputChange]);

    const handleRequestBack = useCallback(() => {
      onRequestBack?.();
    }, [onRequestBack]);

    return (
      <div>
        <button type="button" onClick={handleRequestBack}>request shell back</button>
      </div>
    );
  },
}));

vi.mock("@/components/cmd/commandLaunchUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/cmd/commandLaunchUtils")>();
  return {
    ...actual,
    isEditableTarget: () => false,
  };
});

vi.mock("@/utils/Command", () => ({
  CM: {
    getCommands: () => [mockCommand],
  },
}));

import CommandLauncher from "./CommandLauncher";

describe("CommandLauncher", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("restores the browser snapshot when the modal back button is used", () => {
    render(<CommandLauncher />);

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /set browser query/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");

    fireEvent.click(screen.getByRole("button", { name: /^open command$/i }));
    expect(screen.getByRole("button", { name: /^Back$/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Back$/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");
  });

  it("ignores the global launcher shortcut while the launcher is already open", () => {
    render(<CommandLauncher />);

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /set browser query/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");

    fireEvent.keyDown(window, { key: "/" });
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");
  });

  it("restores the browser snapshot when the command shell requests back", () => {
    render(<CommandLauncher />);

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /set browser query/i }));
    fireEvent.click(screen.getByRole("button", { name: /^open command$/i }));

    fireEvent.click(screen.getByRole("button", { name: /request shell back/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");
  });
});

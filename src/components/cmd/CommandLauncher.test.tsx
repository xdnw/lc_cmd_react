import { useCallback, useEffect, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routeConfigs } from "@/appRoutes";

const navigateMock = vi.fn();
const useLocationMock = vi.fn(() => ({ pathname: "/command/test" }));
const mockCommand = {
  name: "alpha",
  getPathString: () => "alpha",
  getDescShort: () => "Alpha command",
};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => useLocationMock(),
    Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={typeof to === "string" ? to : "#"} className={className}>{children}</a>,
  };
});

vi.mock("@/components/ui/mode-toggle.tsx", () => ({
  ModeToggle: () => <div>mode-toggle</div>,
}));

vi.mock("@/components/layout/logged-in-dropdown.tsx", () => ({
  default: () => <div>logged-in</div>,
}));

vi.mock("@/components/layout/logged-out-dropdown.tsx", () => ({
  default: () => <div>logged-out</div>,
}));

vi.mock("@/utils/Auth.ts", () => ({
  hasToken: () => false,
}));

vi.mock("@/components/api/SessionContext", () => ({
  useSession: () => ({
    session: null,
    error: null,
    isLoading: false,
    isFetching: false,
    setSession: vi.fn(),
    setError: vi.fn(),
    refetchSession: vi.fn(),
  }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({ children, headerActions }: { children: React.ReactNode; headerActions?: React.ReactNode }) => <div>{headerActions}{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DIALOG_CHROME_BUTTON_CLASS_NAME: "dialog-chrome",
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
import Navbar from "@/components/layout/navbar";
import { CommandLauncherProvider } from "./CommandLauncherContext";

function renderLauncher(children: ReactNode = <CommandLauncher />) {
  return render(
    <CommandLauncherProvider>
      {children}
    </CommandLauncherProvider>,
  );
}

describe("CommandLauncher", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useLocationMock.mockReturnValue({ pathname: "/command/test" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("restores the browser snapshot when the modal back button is used", () => {
    renderLauncher();

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /set browser query/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");

    fireEvent.click(screen.getByRole("button", { name: /^open command$/i }));
    expect(screen.getByRole("button", { name: /return to command list/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /return to command list/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");
  });

  it("ignores the global launcher shortcut while the launcher is already open", () => {
    renderLauncher();

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /set browser query/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");

    fireEvent.keyDown(window, { key: "/" });
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");
  });

  it("focuses the existing command list page search instead of opening the modal", () => {
    useLocationMock.mockReturnValue({ pathname: "/commands" });

    renderLauncher(
      <>
        <div hidden aria-hidden="true">
          <input data-command-browser-search="page" aria-label="Stale command list search" />
        </div>
        <input data-command-browser-search="page" aria-label="Command list search" />
        <CommandLauncher />
      </>,
    );

    const pageSearch = screen.getByRole("textbox", { name: /command list search/i });

    fireEvent.keyDown(window, { key: "/" });

    expect(document.activeElement).toBe(pageSearch);
    expect(screen.queryByTestId("dialog-root")).toBeNull();
  });

  it("restores the browser snapshot when the command shell requests back", () => {
    renderLauncher();

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /set browser query/i }));
    fireEvent.click(screen.getByRole("button", { name: /^open command$/i }));

    fireEvent.click(screen.getByRole("button", { name: /request shell back/i }));
    expect(screen.getByTestId("browser-query").textContent).toBe("alpha");
  });

  it("opens the launcher from the navbar trigger", () => {
    renderLauncher(
      <>
        <Navbar routeConfigs={routeConfigs} showContextBar={false} />
        <CommandLauncher />
      </>,
    );

    fireEvent.pointerDown(screen.getAllByLabelText(/open command launcher/i)[0]!);
    expect(screen.getByTestId("dialog-root")).toBeTruthy();
    expect(screen.getByText(/search commands or pages/i)).toBeTruthy();
  });

  it("navigates when the browser expand action is used", () => {
    renderLauncher();

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /open commands page/i }));

    expect(navigateMock).toHaveBeenCalledWith({ pathname: "/commands", search: "" });
  });

  it("navigates when the command expand action is used", () => {
    renderLauncher();

    fireEvent.keyDown(window, { key: "/" });
    fireEvent.click(screen.getByRole("button", { name: /^open command$/i }));
    fireEvent.click(screen.getByRole("button", { name: /open \/alpha page/i }));

    expect(navigateMock).toHaveBeenCalledWith({ pathname: "/command/alpha", search: "?user=demo" });
  });
});

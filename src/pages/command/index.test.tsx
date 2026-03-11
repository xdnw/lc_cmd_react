import React, { forwardRef, useCallback, useImperativeHandle } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const getTypeBreakdownMock = vi.fn(() => ({ element: "String" }));
const useParamsMock = vi.fn(() => ({ command: "settings info" }));
const useLocationMock = vi.fn(() => ({ key: "page-test" }));
const getQueryParamsMock = vi.fn(() => new URLSearchParams());
const queryParamsToObjectMock = vi.fn(() => ({}));

const searchArgsMock = vi.fn((query: string) => {
  if (query === "u") {
    return { matches: ["user"], bestMatch: "user", exactMatch: null };
  }
  if (query === "user") {
    return { matches: ["user"], bestMatch: "user", exactMatch: "user" };
  }
  return { matches: [], bestMatch: null, exactMatch: null };
});

vi.mock("react-router-dom", () => ({
  useParams: () => useParamsMock(),
  useLocation: () => useLocationMock(),
}));

vi.mock("@/lib/utils.ts", () => ({
  getQueryParams: () => getQueryParamsMock(),
  queryParamsToObject: ((_: URLSearchParams) => ({})) as (_: URLSearchParams) => Record<string, string>,
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
  deepEqual: (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right),
}));

vi.mock("../../lib/utils", () => ({
  getQueryParams: () => getQueryParamsMock(),
  queryParamsToObject: ((_: URLSearchParams) => ({})) as (_: URLSearchParams) => Record<string, string>,
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
  deepEqual: (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right),
}));

vi.mock("@/utils/Command.ts", () => ({
  CM: {
    get: () => getMock(),
    buildTest: vi.fn(),
  },
  getTypeBreakdown: ((_: unknown, __: unknown) => ({ element: "String" })) as (_: unknown, __: unknown) => { element: string },
}));

vi.mock("@/components/cmd/CommandQueryRegistry", () => ({
  CommandQueryRegistryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../components/cmd/CommandComponent", () => ({
  default: forwardRef(({
    setOutput,
    jumpSearchMatches,
    jumpSearchActiveArg,
  }: {
    setOutput: (key: string, value: string) => void;
    jumpSearchMatches?: string[];
    jumpSearchActiveArg?: string | null;
  }, ref: React.ForwardedRef<{ focusArg: (argName: string) => boolean; searchArgs: (query: string) => unknown }>) => {
    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      setOutput("value", event.currentTarget.value);
    }, [setOutput]);

    useImperativeHandle(ref, () => ({
      focusArg: (argName: string) => {
        const field = document.querySelector<HTMLInputElement>(`[data-arg-name="${argName}"]`);
        field?.focus();
        return Boolean(field);
      },
      searchArgs: (query: string) => searchArgsMock(query),
    }));

    return (
      <div>
        <input aria-label="page command input" onChange={handleChange} />
        <input aria-label="page user field" data-arg-name="user" />
        <div data-testid="page-jump-state">{JSON.stringify({ jumpSearchMatches, jumpSearchActiveArg })}</div>
      </div>
    );
  }),
}));

vi.mock("../../components/layout/DialogContext", () => ({
  useDialog: () => ({ showDialog: vi.fn() }),
}));

vi.mock("../../components/ui/MarkupRenderer", () => ({
  Embed: () => null,
}));

import CommandPage from "./index";

describe("CommandPage keyboard shell", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getMock.mockReturnValue({
      name: "Settings Info",
      path: ["settings", "info"],
      getArguments: () => [],
    });
    getTypeBreakdownMock.mockReset();

    fetchMock.mockResolvedValue({
      ok: false,
      statusText: "Mocked",
      body: null,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    searchArgsMock.mockClear();
  });

  it("submits from the page shell on Ctrl+Enter and shows the shortcut label", async () => {
    render(<CommandPage />);

    const input = screen.getByRole("textbox", { name: "page command input" });
    fireEvent.change(input, { target: { value: "demo" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("button", { name: /Run \(/i }).textContent).toMatch(/Run \((Ctrl|Cmd)\+Enter\)/);
  });

  it("uses neutral-shell typing to focus a matching argument", () => {
    const { container } = render(<CommandPage />);

    const input = screen.getByRole("textbox", { name: "page command input" });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "u" });

    expect(screen.getByText(/Jump to user/i)).toBeTruthy();
    expect(screen.getByTestId("page-jump-state").textContent).toContain("user");

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: "Enter" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "page user field" }));
  });

  it("starts argument jump directly from non-text shell chrome without requiring Escape", () => {
    render(<CommandPage />);

    const cardButton = screen.getByRole("button", { name: "Card" });
    cardButton.focus();

    fireEvent.keyDown(cardButton, { key: "u" });

    expect(screen.getByText(/Jump to user/i)).toBeTruthy();
    expect(screen.getByTestId("page-jump-state").textContent).toContain("user");

    fireEvent.keyDown(cardButton, { key: "Enter" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "page user field" }));
  });

});

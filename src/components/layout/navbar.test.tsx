import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routeConfigs } from "@/appRoutes";
import Navbar from "@/components/layout/navbar";
import type { WebSession } from "@/lib/apitypes";

const { hasTokenMock, openBrowserMock, useSessionMock } = vi.hoisted(() => ({
  hasTokenMock: vi.fn(),
  openBrowserMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock("@/utils/Auth", () => ({
  hasToken: hasTokenMock,
}));

vi.mock("@/components/api/SessionContext", () => ({
  useSession: useSessionMock,
}));

vi.mock("@/components/cmd/CommandLauncherContext", () => ({
  useCommandLauncher: () => ({
    openBrowser: openBrowserMock,
  }),
}));

vi.mock("@/components/ui/mode-toggle.tsx", () => ({
  ModeToggle: () => <div data-testid="mode-toggle">mode-toggle</div>,
}));

function buildSession(overrides: Partial<WebSession> = {}): WebSession {
  return {
    user: "123456789",
    user_name: "Test User",
    nation: 7,
    nation_name: "Test Nation",
    alliance: 11,
    alliance_name: "Alpha",
    expires: Date.now() + 60_000,
    guild: "42",
    guild_name: "Guild Forty Two",
    registered: true,
    registered_nation: 7,
    guild_alliances: [11, 22],
    guild_alliances_names: ["Alpha", "Beta"],
    delegates_to: 0,
    fa_server: 0,
    ma_server: 0,
    ...overrides,
  };
}

function mockSessionState({
  session = null,
  error = null,
  isLoading = false,
  isFetching = false,
}: {
  session?: WebSession | null;
  error?: string | null;
  isLoading?: boolean;
  isFetching?: boolean;
}) {
  useSessionMock.mockReturnValue({
    session,
    error,
    isLoading,
    isFetching,
    setSession: vi.fn(),
    setError: vi.fn(),
    refetchSession: vi.fn(),
  });
}

function renderNavbar({
  entry = "/guild_select",
  showContextBar = true,
}: {
  entry?: string;
  showContextBar?: boolean;
} = {}) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Navbar routeConfigs={routeConfigs} showContextBar={showContextBar} />
    </MemoryRouter>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    hasTokenMock.mockReset();
    openBrowserMock.mockReset();
    useSessionMock.mockReset();
    hasTokenMock.mockReturnValue(true);
  });

  it("renders route-aware breadcrumbs with Home instead of the old index link", () => {
    mockSessionState({ session: buildSession() });

    renderNavbar({ entry: "/guild_select" });

    expect(screen.queryByText("[index]")).toBeNull();
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeTruthy();
    expect((screen.getByRole("link", { name: /Home/i }) as HTMLAnchorElement).getAttribute("href")).toBe("/home");
    expect(screen.getByText("Guild Select")).toBeTruthy();
  });

  it("keeps logout reachable from the guild menu without the old session trigger", () => {
    mockSessionState({ session: buildSession() });

    renderNavbar({ entry: "/guild_member" });

    expect(screen.queryByRole("button", { name: /Test Nation/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Guild Forty Two/i }));

    expect((screen.getByRole("link", { name: /Logout/i }) as HTMLAnchorElement).getAttribute("href")).toBe("/logout");
    expect(screen.getByRole("link", { name: /Switch guild/i })).toBeTruthy();
  });

  it("opens the command launcher from the unified header search controls", () => {
    mockSessionState({ session: buildSession() });

    renderNavbar({ entry: "/commands" });

    const searchButton = screen
      .getAllByLabelText(/Open command launcher/i)
      .find((element) => element.tagName === "BUTTON");

    expect(searchButton).toBeTruthy();

    fireEvent.click(searchButton as HTMLElement);

    expect(openBrowserMock).toHaveBeenCalledWith({ query: "" });
  });
});

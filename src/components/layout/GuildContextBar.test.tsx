import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WebSession } from "@/lib/apitypes";
import GuildContextBar, { GuildContextControls } from "@/components/layout/GuildContextBar";

const { hasTokenMock, useSessionMock } = vi.hoisted(() => ({
  hasTokenMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock("@/utils/Auth", () => ({
  hasToken: hasTokenMock,
}));

vi.mock("@/components/api/SessionContext", () => ({
  useSession: useSessionMock,
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

function renderBar() {
  return render(
    <MemoryRouter>
      <GuildContextBar />
    </MemoryRouter>,
  );
}

function renderControls() {
  return render(
    <MemoryRouter>
      <GuildContextControls />
    </MemoryRouter>,
  );
}

describe("GuildContextBar", () => {
  beforeEach(() => {
    hasTokenMock.mockReset();
    useSessionMock.mockReset();
    hasTokenMock.mockReturnValue(true);
  });

  it("stays hidden when no token and no session are present", () => {
    hasTokenMock.mockReturnValue(false);
    mockSessionState({ session: null });

    const { container } = renderBar();

    expect(container.firstChild).toBeNull();
  });

  it("shows a loading state instead of a false empty guild state", () => {
    mockSessionState({ session: null, isLoading: true });

    renderBar();

    expect(screen.getByText("Loading context")).toBeTruthy();
    expect(screen.queryByText("Select guild")).toBeNull();
  });

  it("keeps the ready state compact and free of the old noise", () => {
    mockSessionState({ session: buildSession() });

    renderBar();

    expect(screen.getByRole("button", { name: /Guild Forty Two/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /2 alliances/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Test Nation/i })).toBeNull();
    expect(screen.queryByText("Ready")).toBeNull();
    expect(
      screen.queryByText("Guild context is active and alliance registrations are available to guided pages."),
    ).toBeNull();
    expect(screen.queryByText("Member Overview")).toBeNull();
    expect(screen.queryByText("Server Settings")).toBeNull();
    expect(screen.queryByText("Commands")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Guild Forty Two/i }));

    expect(screen.getByRole("link", { name: /Logout/i })).toBeTruthy();
  });

  it("surfaces only meaningful repair actions when setup is incomplete", () => {
    mockSessionState({
      session: buildSession({
        guild_alliances: [],
        guild_alliances_names: [],
        registered: false,
      }),
    });

    renderBar();

    expect(screen.getByRole("link", { name: /Alliance setup/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Link Discord/i })).toBeTruthy();
    expect(screen.queryByText("Ready")).toBeNull();
  });

  it("keeps hook order stable when auth visibility changes on the mounted controls", () => {
    hasTokenMock.mockReturnValue(true);
    mockSessionState({ session: buildSession() });

    const { rerender, container } = renderControls();

    expect(screen.getByRole("button", { name: /Refresh session/i })).toBeTruthy();

    hasTokenMock.mockReturnValue(false);
    mockSessionState({ session: null, isLoading: false, isFetching: false });

    expect(() => {
      rerender(
        <MemoryRouter>
          <GuildContextControls />
        </MemoryRouter>,
      );
    }).not.toThrow();

    expect(container.firstChild).toBeNull();
  });
});

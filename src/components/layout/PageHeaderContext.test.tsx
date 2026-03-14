import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  PageHeaderProvider,
  useActivePageHeader,
  usePageHeader,
  type PageHeaderConfig,
} from "@/components/layout/PageHeaderContext";

const defaultHeader: PageHeaderConfig = {
  title: "Default header",
};

const settingsHeader: PageHeaderConfig = {
  title: "Settings header",
  sticky: true,
};

function HeaderProbe() {
  const activeHeader = useActivePageHeader();
  return (
    <div>
      <div data-testid="header-title">{typeof activeHeader?.title === "string" ? activeHeader.title : "none"}</div>
      <div data-testid="header-sticky">{activeHeader?.sticky ? "sticky" : "static"}</div>
    </div>
  );
}

function SettingsRoute() {
  const navigate = useNavigate();
  const handleNavigate = useCallback(() => {
    navigate("/balance");
  }, [navigate]);

  usePageHeader(settingsHeader);

  return (
    <button type="button" onClick={handleNavigate}>
      Go to balance
    </button>
  );
}

function BalanceRoute() {
  return <div>Balance page</div>;
}

function HeaderTestShell() {
  return (
    <PageHeaderProvider defaultHeader={defaultHeader}>
      <HeaderProbe />
      <Routes>
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="/balance" element={<BalanceRoute />} />
      </Routes>
    </PageHeaderProvider>
  );
}

describe("PageHeaderProvider", () => {
  it("switches between page-specific and default headers as routes change", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <HeaderTestShell />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("header-title").textContent).toBe("Settings header");
      expect(screen.getByTestId("header-sticky").textContent).toBe("sticky");
    });

    fireEvent.click(screen.getByRole("button", { name: "Go to balance" }));

    await waitFor(() => {
      expect(screen.getByTestId("header-title").textContent).toBe("Default header");
      expect(screen.getByTestId("header-sticky").textContent).toBe("static");
    });
  });
});

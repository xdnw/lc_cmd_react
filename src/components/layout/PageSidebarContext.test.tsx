import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PageSidebarProvider, useActivePageSidebar, usePageSidebar } from "@/components/layout/PageSidebarContext";
import type { SidebarNavConfig } from "@/components/layout/SidebarNav";

const defaultSidebar: SidebarNavConfig = {
  title: "Sections",
  layout: "cards",
  items: [],
};

const settingsSidebar: SidebarNavConfig = {
  title: "Settings map",
  layout: "tree",
  items: [],
};

function SidebarTitleProbe() {
  const activeSidebar = useActivePageSidebar();
  return <div data-testid="sidebar-title">{activeSidebar?.title ?? "none"}</div>;
}

function SettingsRoute() {
  const navigate = useNavigate();
  const handleNavigate = useCallback(() => {
    navigate("/balance");
  }, [navigate]);

  usePageSidebar(settingsSidebar);

  return (
    <button type="button" onClick={handleNavigate}>
      Go to balance
    </button>
  );
}

function BalanceRoute() {
  return <div>Balance page</div>;
}

function SidebarTestShell() {
  return (
    <PageSidebarProvider defaultSidebar={defaultSidebar}>
      <SidebarTitleProbe />
      <Routes>
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="/balance" element={<BalanceRoute />} />
      </Routes>
    </PageSidebarProvider>
  );
}

describe("PageSidebarProvider", () => {
  it("switches between page-specific and default sidebar configs as routes change", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <SidebarTestShell />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-title").textContent).toBe("Settings map");
    });

    fireEvent.click(screen.getByRole("button", { name: "Go to balance" }));

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-title").textContent).toBe("Sections");
    });
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useMemo, useState } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  PageSidebarProvider,
  useActivePageSidebar,
  useDefaultPageSidebar,
  usePageSidebar,
} from "@/components/layout/PageSidebarContext";
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

function ToggleRoute() {
  const defaultSidebarConfig = useDefaultPageSidebar();
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(true);
  const handleToggle = useCallback(() => {
    setShowSettingsSidebar((current) => !current);
  }, []);

  const activeConfig = useMemo(() => {
    if (showSettingsSidebar || !defaultSidebarConfig) {
      return settingsSidebar;
    }

    return {
      ...defaultSidebarConfig,
      title: "Sections copy",
    } satisfies SidebarNavConfig;
  }, [defaultSidebarConfig, showSettingsSidebar]);

  usePageSidebar(activeConfig);

  return (
    <button type="button" onClick={handleToggle}>
      Toggle sidebar
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

  it("lets a page compose the default sidebar while keeping a page-local toggle on the same route", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <PageSidebarProvider defaultSidebar={defaultSidebar}>
          <SidebarTitleProbe />
          <Routes>
            <Route path="/settings" element={<ToggleRoute />} />
          </Routes>
        </PageSidebarProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-title").textContent).toBe("Settings map");
    });

    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-title").textContent).toBe("Sections copy");
    });

    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-title").textContent).toBe("Settings map");
    });
  });
});

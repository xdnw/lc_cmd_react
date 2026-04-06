import { describe, expect, it } from "vitest";

import {
  buildNavbarIconItems,
  buildAppSidebarSections,
  buildSectionHeaderTabs,
  getAppRouteLabel,
  resolveAppRouteConfig,
  routeConfigs,
} from "@/appRoutes";

describe("appRoutes shared header metadata", () => {
  it("uses explicit route labels for canonical, alias, and detail routes", () => {
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/settings"))).toBe("Server Settings");
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/server/roles"))).toBe("Role Management");
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/announcement"))).toBe("Announcements");
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/announcement/123"))).toBe("Announcement");
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/balance/checking"))).toBe("Holdings");
  });

  it("builds member tabs from visible section routes", () => {
    const tabs = buildSectionHeaderTabs(routeConfigs, "/balance/checking");

    expect(tabs.map((tab) => tab.label)).toEqual(["Member Overview", "Announcements", "Holdings"]);
    expect(tabs.find((tab) => tab.active)?.to).toBe("/balance");
  });

  it("reuses canonical tabs for detail routes in the same section", () => {
    const tabs = buildSectionHeaderTabs(routeConfigs, "/temporary-conflicts");

    expect(tabs.map((tab) => tab.label)).toEqual(["Tables", "Conflicts"]);
    expect(tabs.find((tab) => tab.active)?.to).toBe("/conflicts");
  });

  it("builds server tabs from visible server routes", () => {
    const tabs = buildSectionHeaderTabs(routeConfigs, "/coalitions");

    expect(tabs.map((tab) => tab.label)).toEqual(["Server Settings", "Roles", "Coalitions"]);
    expect(tabs.find((tab) => tab.active)?.to).toBe("/coalitions");
  });

  it("builds economy tabs from visible economy routes", () => {
    const tabs = buildSectionHeaderTabs(routeConfigs, "/tax_expenses/by_time");

    expect(tabs.map((tab) => tab.label)).toEqual(["Ledger", "Tax Expenses", "By Time"]);
    expect(tabs.find((tab) => tab.active)?.to).toBe("/tax_expenses/by_time");
  });

  it("keeps the settings route in the recent-page cache", () => {
    expect(resolveAppRouteConfig(routeConfigs, "/settings")?.cachePolicy).toEqual(
      expect.objectContaining({ mode: "recent" }),
    );
  });

  it("exposes status as a shared navbar utility icon", () => {
    const items = buildNavbarIconItems(routeConfigs, "/status");

    expect(items).toEqual([
      expect.objectContaining({
        label: "Status",
        to: "/status",
        iconName: "Activity",
        active: true,
      }),
    ]);
  });

  it("keeps hidden flows and detail pages out of the primary sidebar", () => {
    const sections = buildAppSidebarSections(routeConfigs, "/command/test");
    const labels = sections.flatMap((section) => section.items.map((item) => item.label));

    expect(labels).toEqual([
      "Home",
      "Status",
      "Member Overview",
      "Announcements",
      "Holdings",
      "Ledger",
      "Tax Expenses",
      "By Time",
      "Raid Finder",
      "Tables",
      "Conflicts",
      "Server Settings",
      "Roles",
      "Coalitions",
      "Command Browser",
    ]);
    expect(labels).not.toContain("Guild Select");
    expect(labels).not.toContain("Command");
    expect(labels).not.toContain("Command Preview");
  });
});

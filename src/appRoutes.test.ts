import { describe, expect, it } from "vitest";

import { buildSectionHeaderTabs, getAppRouteLabel, resolveAppRouteConfig, routeConfigs } from "@/appRoutes";

describe("appRoutes shared header metadata", () => {
  it("uses explicit route labels for canonical and detail routes", () => {
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/settings"))).toBe("Server Settings");
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/announcement/123"))).toBe("Announcement");
    expect(getAppRouteLabel(resolveAppRouteConfig(routeConfigs, "/balance/checking"))).toBe("Holdings");
  });

  it("builds deduped same-section tabs for canonical routes", () => {
    const tabs = buildSectionHeaderTabs(routeConfigs, "/records");

    expect(tabs.map((tab) => tab.label)).toEqual(["Holdings", "Ledger"]);
    expect(tabs.find((tab) => tab.active)?.to).toBe("/records");
  });

  it("reuses canonical tabs for detail routes in the same section", () => {
    const tabs = buildSectionHeaderTabs(routeConfigs, "/temporary-conflicts");

    expect(tabs.map((tab) => tab.label)).toEqual(["Tables", "Conflicts", "Status"]);
    expect(tabs.find((tab) => tab.active)?.to).toBe("/conflicts");
  });
});

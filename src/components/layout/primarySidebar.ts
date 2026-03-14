import { buildAppSidebarSections, type AppRouteConfig, type AppSidebarSection } from "@/appRoutes";
import type { SidebarNavConfig, SidebarNavItem } from "@/components/layout/SidebarNav";

function buildPrimarySidebarItems(sections: readonly AppSidebarSection[]): SidebarNavItem[] {
  return sections.flatMap((section) => ([
    {
      id: section.key,
      label: section.label,
      level: 0,
      tone: "section",
      status: section.active ? "set" : "default",
      inActivePath: section.active,
    } satisfies SidebarNavItem,
    ...section.items.map((item) => ({
      id: item.key,
      label: item.label,
      level: 1,
      tone: "item",
      status: item.active ? "set" : "default",
      to: item.to,
      requireGuild: item.requireGuild,
      preserveSearchParams: item.preserveSearchParams,
      additionalSearchParams: item.additionalSearchParams,
      active: item.active,
      inActivePath: item.inActivePath,
    } satisfies SidebarNavItem)),
  ]));
}

export function buildPrimarySidebarConfig(
  routeConfigs: readonly AppRouteConfig[],
  pathname: string,
): SidebarNavConfig | null {
  const sections = buildAppSidebarSections(routeConfigs, pathname);
  if (sections.length === 0) {
    return null;
  }

  const items = buildPrimarySidebarItems(sections);
  const activeItem = sections.flatMap((section) => section.items).find((item) => item.active || item.inActivePath) ?? null;
  const activeSection = sections.find((section) => section.active) ?? null;

  return {
    ariaLabel: "Primary navigation",
    layout: "tree",
    items,
    mobileTriggerLabel: "Navigate",
    mobileTriggerValue: activeItem?.label ?? activeSection?.label ?? "Browse",
    mobileButtonLabel: "Open",
    mobileSheetTitle: "Navigation",
    mobileSheetSubtitle: activeSection?.label ?? "Browse app sections",
  };
}

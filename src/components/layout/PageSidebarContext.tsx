import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import type { SidebarNavConfig } from "@/components/layout/SidebarNav";

interface PageSidebarContextValue {
  activeSidebar: SidebarNavConfig | null;
  registerSidebar: (routeKey: string, config: SidebarNavConfig | null) => void;
  unregisterSidebar: (routeKey: string) => void;
}

const PageSidebarContext = createContext<PageSidebarContextValue | undefined>(undefined);

function buildRouteSidebarKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

function usePageSidebarContext(): PageSidebarContextValue {
  const value = useContext(PageSidebarContext);
  if (!value) {
    throw new Error("Page sidebar hooks must be used within PageSidebarProvider.");
  }
  return value;
}

export function PageSidebarProvider({
  defaultSidebar,
  children,
}: {
  defaultSidebar: SidebarNavConfig | null;
  children: ReactNode;
}) {
  const location = useLocation();
  const [registeredSidebars, setRegisteredSidebars] = useState<Record<string, SidebarNavConfig | null>>({});
  const activeRouteKey = useMemo(
    () => buildRouteSidebarKey(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const registerSidebar = useCallback((routeKey: string, config: SidebarNavConfig | null) => {
    setRegisteredSidebars((current) => {
      if (current[routeKey] === config) {
        return current;
      }
      return {
        ...current,
        [routeKey]: config,
      };
    });
  }, []);

  const unregisterSidebar = useCallback((routeKey: string) => {
    setRegisteredSidebars((current) => {
      if (!(routeKey in current)) {
        return current;
      }

      const next = { ...current };
      delete next[routeKey];
      return next;
    });
  }, []);

  const activeSidebar = registeredSidebars[activeRouteKey] ?? defaultSidebar;
  const value = useMemo<PageSidebarContextValue>(() => ({
    activeSidebar,
    registerSidebar,
    unregisterSidebar,
  }), [activeSidebar, registerSidebar, unregisterSidebar]);

  return <PageSidebarContext.Provider value={value}>{children}</PageSidebarContext.Provider>;
}

export function useActivePageSidebar(): SidebarNavConfig | null {
  return usePageSidebarContext().activeSidebar;
}

export function usePageSidebar(config: SidebarNavConfig | null): void {
  const { registerSidebar, unregisterSidebar } = usePageSidebarContext();
  const location = useLocation();
  const routeKey = useMemo(
    () => buildRouteSidebarKey(location.pathname, location.search),
    [location.pathname, location.search],
  );

  useLayoutEffect(() => {
    if (config) {
      registerSidebar(routeKey, config);
    } else {
      unregisterSidebar(routeKey);
    }

    return () => {
      unregisterSidebar(routeKey);
    };
  }, [config, registerSidebar, routeKey, unregisterSidebar]);
}

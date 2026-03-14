import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export interface PageHeaderConfig {
  sticky?: boolean;
  title?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  content?: ReactNode;
  className?: string;
}

interface PageHeaderContextValue {
  activeHeader: PageHeaderConfig | null;
  registerHeader: (routeKey: string, config: PageHeaderConfig | null) => void;
  unregisterHeader: (routeKey: string) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined);

function buildRouteHeaderKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

function usePageHeaderContext(): PageHeaderContextValue {
  const value = useContext(PageHeaderContext);
  if (!value) {
    throw new Error("Page header hooks must be used within PageHeaderProvider.");
  }
  return value;
}

export function PageHeaderProvider({
  defaultHeader = null,
  children,
}: {
  defaultHeader?: PageHeaderConfig | null;
  children: ReactNode;
}) {
  const location = useLocation();
  const [registeredHeaders, setRegisteredHeaders] = useState<Record<string, PageHeaderConfig | null>>({});
  const activeRouteKey = useMemo(
    () => buildRouteHeaderKey(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const registerHeader = useCallback((routeKey: string, config: PageHeaderConfig | null) => {
    setRegisteredHeaders((current) => {
      if (current[routeKey] === config) {
        return current;
      }

      return {
        ...current,
        [routeKey]: config,
      };
    });
  }, []);

  const unregisterHeader = useCallback((routeKey: string) => {
    setRegisteredHeaders((current) => {
      if (!(routeKey in current)) {
        return current;
      }

      const next = { ...current };
      delete next[routeKey];
      return next;
    });
  }, []);

  const activeHeader = registeredHeaders[activeRouteKey] ?? defaultHeader;
  const value = useMemo<PageHeaderContextValue>(
    () => ({
      activeHeader,
      registerHeader,
      unregisterHeader,
    }),
    [activeHeader, registerHeader, unregisterHeader],
  );

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function useActivePageHeader(): PageHeaderConfig | null {
  return usePageHeaderContext().activeHeader;
}

export function usePageHeader(config: PageHeaderConfig | null): void {
  const { registerHeader, unregisterHeader } = usePageHeaderContext();
  const location = useLocation();
  const routeKey = useMemo(
    () => buildRouteHeaderKey(location.pathname, location.search),
    [location.pathname, location.search],
  );

  useLayoutEffect(() => {
    if (config) {
      registerHeader(routeKey, config);
    } else {
      unregisterHeader(routeKey);
    }

    return () => {
      unregisterHeader(routeKey);
    };
  }, [config, registerHeader, routeKey, unregisterHeader]);
}

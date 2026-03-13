import {
  Activity,
  type ReactElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  matchPath,
  UNSAFE_DataRouterContext,
  UNSAFE_DataRouterStateContext,
  UNSAFE_LocationContext,
  UNSAFE_RouteContext,
  useLocation,
  useOutlet,
} from "react-router";

import type { AppRouteConfig, RecentPageCachePolicy } from "@/App";

const RECENT_PAGE_CACHE_LIMIT = 3;
const GLOBAL_IGNORED_SEARCH_PARAMS = new Set([
  "bench",
  "mount",
  "forcemount",
  "forcemountall",
]);

type CachedRouteSnapshot = {
  dataRouter: React.ContextType<typeof UNSAFE_DataRouterContext>;
  dataRouterState: React.ContextType<typeof UNSAFE_DataRouterStateContext>;
  location: React.ContextType<typeof UNSAFE_LocationContext>;
  route: React.ContextType<typeof UNSAFE_RouteContext>;
};

type CacheEntry = {
  key: string;
  routeKey: string;
  outlet: ReactElement;
  snapshot: CachedRouteSnapshot;
  lastActivatedAt: number;
  scrollX: number;
  scrollY: number;
};

export function normalizeRecentPageSearchParams(search: string, policy?: RecentPageCachePolicy): string {
  if (!search) {
    return "";
  }

  const params = new URLSearchParams(search);
  const ignoredParams = new Set<string>(GLOBAL_IGNORED_SEARCH_PARAMS);
  policy?.ignoredSearchParams?.forEach((param) => ignoredParams.add(param.toLowerCase()));

  const entries = Array.from(params.entries())
    .filter(([key]) => !ignoredParams.has(key.toLowerCase()))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    });

  if (entries.length === 0) {
    return "";
  }

  const normalized = new URLSearchParams();
  entries.forEach(([key, value]) => normalized.append(key, value));
  const serialized = normalized.toString();
  return serialized ? `?${serialized}` : "";
}

function resolveRouteConfig(routeConfigs: readonly AppRouteConfig[], pathname: string): AppRouteConfig | null {
  let bestMatch: { config: AppRouteConfig; score: number } | null = null;

  for (const config of routeConfigs) {
    const match = matchPath({ path: config.path, end: true }, pathname);
    if (!match) {
      continue;
    }

    const score = match.pathname.length;
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { config, score };
    }
  }

  return bestMatch?.config ?? null;
}

export function buildRecentPageCacheKey(pathname: string, search: string, policy?: RecentPageCachePolicy): string {
  return `${pathname}${normalizeRecentPageSearchParams(search, policy)}`;
}

function evictLeastRecentEntries(entries: CacheEntry[], activeKey: string): CacheEntry[] {
  if (entries.length <= RECENT_PAGE_CACHE_LIMIT) {
    return entries;
  }

  const activeEntry = entries.find((entry) => entry.key === activeKey) ?? null;
  const inactiveEntries = entries
    .filter((entry) => entry.key !== activeKey)
    .sort((left, right) => left.lastActivatedAt - right.lastActivatedAt);

  const keepInactiveCount = Math.max(RECENT_PAGE_CACHE_LIMIT - (activeEntry ? 1 : 0), 0);
  const keptInactiveEntries = inactiveEntries.slice(Math.max(inactiveEntries.length - keepInactiveCount, 0));
  const keptKeys = new Set(keptInactiveEntries.map((entry) => entry.key));
  if (activeEntry) {
    keptKeys.add(activeEntry.key);
  }

  return entries.filter((entry) => keptKeys.has(entry.key));
}

function sameSnapshot(left: CachedRouteSnapshot, right: CachedRouteSnapshot): boolean {
  return left.dataRouter === right.dataRouter
    && left.dataRouterState === right.dataRouterState
    && left.location === right.location
    && left.route === right.route;
}

function FrozenCachedRoute({
  entry,
  isActive,
}: {
  entry: CacheEntry;
  isActive: boolean;
}) {
  const shellClassName = isActive ? "w-full" : "hidden w-full";

  return (
    <UNSAFE_DataRouterContext.Provider value={entry.snapshot.dataRouter}>
      <UNSAFE_DataRouterStateContext.Provider value={entry.snapshot.dataRouterState}>
        <UNSAFE_LocationContext.Provider value={entry.snapshot.location}>
          <UNSAFE_RouteContext.Provider value={entry.snapshot.route}>
            <Activity mode={isActive ? "visible" : "hidden"}>
              <div
                className={shellClassName}
                hidden={!isActive}
                aria-hidden={!isActive}
                inert={!isActive ? true : undefined}
                data-recent-page-key={entry.key}
              >
                {entry.outlet}
              </div>
            </Activity>
          </UNSAFE_RouteContext.Provider>
        </UNSAFE_LocationContext.Provider>
      </UNSAFE_DataRouterStateContext.Provider>
    </UNSAFE_DataRouterContext.Provider>
  );
}

export default function RecentPageKeepAlive({
  routeConfigs,
}: {
  routeConfigs: readonly AppRouteConfig[];
}) {
  const outlet = useOutlet();
  const location = useLocation();
  const dataRouterContext = useContext(UNSAFE_DataRouterContext);
  const dataRouterStateContext = useContext(UNSAFE_DataRouterStateContext);
  const locationContext = useContext(UNSAFE_LocationContext);
  const routeContext = useContext(UNSAFE_RouteContext);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const lastActiveCacheKeyRef = useRef<string | null>(null);
  const lastRestoredLocationKeyRef = useRef<string | null>(null);

  const matchedRouteConfig = useMemo(() => resolveRouteConfig(routeConfigs, location.pathname), [location.pathname, routeConfigs]);
  const cachePolicy = matchedRouteConfig?.cachePolicy;
  const isCacheableRoute = Boolean(cachePolicy?.mode === "recent");
  const activeCacheKey = useMemo(() => {
    if (!isCacheableRoute) {
      return null;
    }

    return buildRecentPageCacheKey(location.pathname, location.search, cachePolicy);
  }, [cachePolicy, isCacheableRoute, location.pathname, location.search]);
  const snapshot = useMemo<CachedRouteSnapshot>(() => ({
    dataRouter: dataRouterContext,
    dataRouterState: dataRouterStateContext,
    location: locationContext,
    route: routeContext,
  }), [dataRouterContext, dataRouterStateContext, locationContext, routeContext]);

  useLayoutEffect(() => {
    const previousCacheKey = lastActiveCacheKeyRef.current;
    const nextCacheKey = activeCacheKey;

    if (previousCacheKey && previousCacheKey !== nextCacheKey) {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      setCacheEntries((currentEntries) => currentEntries.map((entry) => (
        entry.key === previousCacheKey
          ? { ...entry, scrollX, scrollY }
          : entry
      )));
    }

    lastActiveCacheKeyRef.current = nextCacheKey;
  }, [activeCacheKey, location.key]);

  useEffect(() => {
    if (!outlet || !activeCacheKey || !matchedRouteConfig) {
      return;
    }

    const now = performance.now();
    setCacheEntries((currentEntries) => {
      const existingIndex = currentEntries.findIndex((entry) => entry.key === activeCacheKey);
      if (existingIndex === -1) {
        return evictLeastRecentEntries([
          ...currentEntries,
          {
            key: activeCacheKey,
            routeKey: matchedRouteConfig.key,
            outlet,
            snapshot,
            lastActivatedAt: now,
            scrollX: 0,
            scrollY: 0,
          },
        ], activeCacheKey);
      }

      const nextEntries = [...currentEntries];
      const existingEntry = nextEntries[existingIndex];
      if (
        existingEntry.outlet === outlet
        && sameSnapshot(existingEntry.snapshot, snapshot)
      ) {
        if (existingEntry.lastActivatedAt === now) {
          return currentEntries;
        }

        nextEntries[existingIndex] = {
          ...existingEntry,
          lastActivatedAt: now,
        };
        return evictLeastRecentEntries(nextEntries, activeCacheKey);
      }

      nextEntries[existingIndex] = {
        ...existingEntry,
        routeKey: matchedRouteConfig.key,
        outlet,
        snapshot,
        lastActivatedAt: now,
      };
      return evictLeastRecentEntries(nextEntries, activeCacheKey);
    });
  }, [activeCacheKey, matchedRouteConfig, outlet, snapshot]);

  useLayoutEffect(() => {
    if (!activeCacheKey) {
      lastRestoredLocationKeyRef.current = null;
      return;
    }

    if (lastRestoredLocationKeyRef.current === location.key) {
      return;
    }

    const activeEntry = cacheEntries.find((entry) => entry.key === activeCacheKey);
    if (!activeEntry) {
      return;
    }

    lastRestoredLocationKeyRef.current = location.key;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(activeEntry.scrollX, activeEntry.scrollY);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeCacheKey, cacheEntries, location.key]);

  if (!outlet) {
    return null;
  }

  return (
    <>
      {cacheEntries.map((entry) => (
        <FrozenCachedRoute key={entry.key} entry={entry} isActive={entry.key === activeCacheKey} />
      ))}
      {!activeCacheKey && outlet}
    </>
  );
}

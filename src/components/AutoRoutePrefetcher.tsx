import { AppRouteConfig } from '@/App';
import { useEffect, useMemo, useRef } from 'react';

// Simplified Default Config
interface SimplePrefetchConfig {
    enabled: boolean;
    persistCache: boolean;
    cacheDuration: number; // in milliseconds
    maxConcurrentPrefetches: number;
    initialDelayMs: number;
    lowPriorityDelayMs: number;
    highPriorityCount: number;
}
const SIMPLE_DEFAULT_CONFIG: SimplePrefetchConfig = {
    enabled: true,
    persistCache: true,
    cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
    maxConcurrentPrefetches: 3,
    initialDelayMs: 1200,
    lowPriorityDelayMs: 7000,
    highPriorityCount: 8,
};

type NavigatorConnection = {
    saveData?: boolean;
    effectiveType?: string;
};

const ROUTE_PREFETCH_PRIORITY: Record<string, number> = {
    home: 200,
    commands: 180,
    command: 170,
    command_detail: 165,
    login: 160,
    guild_select: 145,
    records: 140,
    balance: 140,
    custom_table: 135,
};

function getRoutePriority(route: AppRouteConfig): number {
    const explicit = ROUTE_PREFETCH_PRIORITY[route.key] ?? 0;
    const guestWeight = route.protected ? 0 : 20;
    const viewWeight = route.path.startsWith('/view_') ? 10 : 0;
    return explicit + guestWeight + viewWeight;
}

function getNetworkHints(): { saveData: boolean; slowNetwork: boolean } {
    if (typeof navigator === 'undefined') {
        return { saveData: false, slowNetwork: false };
    }

    const conn = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
    const saveData = conn?.saveData === true;
    const effectiveType = conn?.effectiveType ?? '';
    const slowNetwork = effectiveType.includes('2g') || effectiveType === 'slow-2g';
    return { saveData, slowNetwork };
}

function scheduleWhenIdle(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const win = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (id: number) => void;
    };

    if (win.requestIdleCallback) {
        const id = win.requestIdleCallback(() => cb(), { timeout: 2000 });
        return () => {
            win.cancelIdleCallback?.(id);
        };
    }

    const timeoutId = window.setTimeout(cb, 300);
    return () => window.clearTimeout(timeoutId);
}

export default function AutoRoutePrefetcher({
    // Remove initialPrefetchKeys prop
    routeConfigs = [],
    config = SIMPLE_DEFAULT_CONFIG
}: {
    // Remove initialPrefetchKeys prop type
    routeConfigs: AppRouteConfig[];
    config?: Partial<SimplePrefetchConfig>
}) {
    const mergedConfig = { ...SIMPLE_DEFAULT_CONFIG, ...config };
    const prefetchQueue = useRef<string[]>([]);
    const activePrefetches = useRef<number>(0);
    const prefetchedRoutes = useRef<Set<string>>(new Set());

    const orderedRouteKeys = useMemo(() => {
        return [...routeConfigs]
            .sort((a, b) => getRoutePriority(b) - getRoutePriority(a))
            .map((r) => r.key);
    }, [routeConfigs]);

    // ... (rest of the cache logic) ...

    useEffect(() => {
        if (!mergedConfig.enabled || routeConfigs.length === 0) return;

        let cancelled = false;

        const routeMap = new Map(routeConfigs.map((route) => [route.key, route]));

        const processPrefetchQueue = () => {
            if (cancelled) return;

            while (
                activePrefetches.current < mergedConfig.maxConcurrentPrefetches &&
                prefetchQueue.current.length > 0
            ) {
                const routeKey = prefetchQueue.current.shift();
                if (!routeKey) break;

                const route = routeMap.get(routeKey);
                if (!route) continue;

                activePrefetches.current += 1;

                route.element()
                    .catch(() => {
                        // Ignore prefetch failures; user navigation can still retry naturally.
                    })
                    .finally(() => {
                        activePrefetches.current -= 1;
                        processPrefetchQueue();
                    });
            }
        };

        const queuePrefetch = (keys: string[]) => {
            for (const routeKey of keys) {
                if (prefetchedRoutes.current.has(routeKey)) continue;
                if (prefetchQueue.current.includes(routeKey)) continue;

                prefetchedRoutes.current.add(routeKey);
                prefetchQueue.current.push(routeKey);
            }
            processPrefetchQueue();
        };

        const { saveData, slowNetwork } = getNetworkHints();
        const highPriorityCap = saveData || slowNetwork
            ? Math.min(3, mergedConfig.highPriorityCount)
            : mergedConfig.highPriorityCount;

        const highPriorityKeys = orderedRouteKeys.slice(0, highPriorityCap);
        const lowPriorityKeys = orderedRouteKeys.slice(highPriorityCap);

        const startTimer = window.setTimeout(() => {
            const cancelIdle = scheduleWhenIdle(() => {
                if (cancelled) return;
                queuePrefetch(highPriorityKeys);
            });

            const lowPriorityTimer = window.setTimeout(() => {
                if (cancelled || saveData) return;

                const cancelLowPriorityIdle = scheduleWhenIdle(() => {
                    if (cancelled) return;
                    queuePrefetch(lowPriorityKeys);
                });

                if (cancelled) cancelLowPriorityIdle();
            }, mergedConfig.lowPriorityDelayMs);

            if (cancelled) {
                cancelIdle();
                window.clearTimeout(lowPriorityTimer);
            }
        }, mergedConfig.initialDelayMs);

        return () => {
            cancelled = true;
            window.clearTimeout(startTimer);
        };
    }, [
        mergedConfig.enabled,
        mergedConfig.highPriorityCount,
        mergedConfig.initialDelayMs,
        mergedConfig.lowPriorityDelayMs,
        mergedConfig.maxConcurrentPrefetches,
        orderedRouteKeys,
        routeConfigs,
    ]);

    return null;
}
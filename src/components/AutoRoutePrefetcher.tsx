import { AppRouteConfig } from '@/App';
import { useState, useEffect, useCallback, useRef } from 'react';

// Simplified Default Config
interface SimplePrefetchConfig {
    enabled: boolean;
    persistCache: boolean;
    cacheDuration: number; // in milliseconds
    maxConcurrentPrefetches: number;
}
const SIMPLE_DEFAULT_CONFIG: SimplePrefetchConfig = {
    enabled: true,
    persistCache: true,
    cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
    maxConcurrentPrefetches: 3,
};

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
    const [prefetchedRoutes, setPrefetchedRoutes] = useState<Set<string>>(new Set());
    const prefetchQueue = useRef<string[]>([]);
    const activePrefetches = useRef<number>(0);

    // ... (rest of the cache logic) ...

    const shouldPrefetch = useCallback(() => {
        if (!mergedConfig.enabled) return false;
        return true;
    }, [mergedConfig.enabled]);

    const processPrefetchQueue = useCallback(() => {
        // Use the routeConfigs prop instead of window.appRouteConfigs
        if (routeConfigs.length === 0 || prefetchQueue.current.length === 0 ||
            activePrefetches.current >= mergedConfig.maxConcurrentPrefetches) return;

        const routeKey = prefetchQueue.current.shift();
        if (!routeKey) return;

        // Find route in the prop
        const route = routeConfigs.find(r => r.key === routeKey);
        if (!route) return;

        activePrefetches.current++;

        try {
            // Log the specific route being prefetched
            route.element().finally(() => {
                activePrefetches.current--;
                processPrefetchQueue();
            });
        } catch (e) {
            console.debug('Failed to prefetch route:', route.key);
            activePrefetches.current--;
            processPrefetchQueue();
        }
        // Add routeConfigs to dependency array if its identity could change,
        // though it likely won't if defined statically in App.tsx.
        // If it's static, it can be omitted. Add if ESLint complains.
    }, [mergedConfig.maxConcurrentPrefetches, routeConfigs]); // Added routeConfigs dependency

    const queuePrefetch = useCallback((routeKey: string) => {
        if (prefetchedRoutes.has(routeKey) || prefetchQueue.current.includes(routeKey)) return;

        prefetchQueue.current.push(routeKey);
        setPrefetchedRoutes(prev => new Set(prev).add(routeKey));

        if (activePrefetches.current < mergedConfig.maxConcurrentPrefetches) {
            processPrefetchQueue();
        }
    }, [prefetchedRoutes, processPrefetchQueue, mergedConfig.maxConcurrentPrefetches]);


    useEffect(() => {
        // Use the routeConfigs prop here too
        if (!mergedConfig.enabled || routeConfigs.length === 0 || !shouldPrefetch()) return;

        const timerId = setTimeout(() => {
            // Queue all routes from routeConfigs
            console.log('Queueing all routes for prefetch:', routeConfigs.map(r => r.key));
            routeConfigs.forEach(route => {
                queuePrefetch(route.key);
            });
        }, 500); // Delay initial prefetching slightly

        return () => clearTimeout(timerId);

    }, [
        // Remove initialPrefetchKeys from dependencies
        queuePrefetch,
        mergedConfig.enabled,
        shouldPrefetch,
        routeConfigs // Keep routeConfigs dependency
    ]);

    return null;
}
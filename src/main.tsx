import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider, defaultShouldDehydrateQuery } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { registerSW } from 'virtual:pwa-register'
import { getRecoveryDetail, getRecoverySummary, isLikelyRecoverableAssetError } from '@/lib/deployRecovery'

declare global {
    interface Window {
        __appRecovery?: {
            hideLoader?: () => void;
            markBootMounted?: () => void;
            showBootFailure?: (options: {
                title?: string;
                message?: string;
                detail?: string;
            }) => void;
        };
    }
}

const isDevelopment = import.meta.env.MODE === 'dev' || import.meta.env.MODE === 'dev-test';
const enableStrictModeInDev = import.meta.env.VITE_ENABLE_STRICT_MODE === '1';
const queryClient = new QueryClient();

function showBootFailure(error: unknown, title = 'The app could not start.') {
    window.__appRecovery?.showBootFailure?.({
        title,
        message: getRecoverySummary(error),
        detail: getRecoveryDetail(error),
    });
}

// Create a persister that uses localStorage
const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
});

// Persist queries with a maxAge (e.g., one day)
persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 30,  // 30 days
    buster: 'cache-policy-v2',
    dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
            if (!defaultShouldDehydrateQuery(query)) {
                return false;
            }
            return query.meta?.persist === true;
        },
    },
});

if (import.meta.env.PROD) {
    const updateServiceWorker = registerSW({
        immediate: true,
        onNeedRefresh() {
            // Force activation of the waiting SW and reload to ensure users see the newest deploy.
            void updateServiceWorker(true);
        },
        onRegisteredSW(_swUrl, registration) {
            if (!registration) {
                return;
            }

            // Periodically ask for updates so long-lived tabs don't remain stale.
            window.setInterval(() => {
                void registration.update();
            }, 60_000);
        },
    });

    window.addEventListener('vite:preloadError', (event) => {
        const preloadEvent = event as Event & { payload?: unknown };
        preloadEvent.preventDefault?.();
        showBootFailure(preloadEvent.payload ?? preloadEvent, 'A cached app file is out of date.');
    });
}

try {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        isDevelopment && enableStrictModeInDev ? (
            <React.StrictMode>
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
            </React.StrictMode>
        ) : (
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        )
    )
    window.__appRecovery?.markBootMounted?.();
} catch (error) {
    if (isLikelyRecoverableAssetError(error)) {
        showBootFailure(error, 'A cached app file is out of date.');
    } else {
        showBootFailure(error);
    }
    throw error;
}
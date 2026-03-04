import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider, defaultShouldDehydrateQuery } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { registerSW } from 'virtual:pwa-register'

const isDevelopment = import.meta.env.MODE === 'dev' || import.meta.env.MODE === 'dev-test';
const queryClient = new QueryClient();

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
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    isDevelopment ? (
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
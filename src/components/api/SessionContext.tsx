import { WebSession } from '@/lib/apitypes';
import { SESSION } from '@/lib/endpoints';
import { bulkQueryOptions } from '@/lib/queries';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface SessionContextProps {
    session: WebSession | null;
    error: string | null;
    isLoading: boolean;
    isFetching: boolean;
    setSession: (session: WebSession | null) => void;
    setError: (error: string | null) => void;
    refetchSession: () => void;
}

const SessionContext = createContext<SessionContextProps | undefined>(undefined);

const useSessionDisplay = () => {
    const [manualSession, setManualSession] = useState<WebSession | null>(null);
    const [manualError, setManualError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Use TanStack Query with bulkQueryOptions
    const {
        data: queryResult,
        error: queryError,
        isLoading,
        isFetching,
        refetch
    } = useQuery(bulkQueryOptions(SESSION.endpoint, {}));

    // Determine the session value (prefer manual overrides)
    const session = manualSession || (queryResult?.data || null);

    // Handle errors (prefer manual errors over query errors)
    const error = manualError !== null ?
        manualError :
        (queryError instanceof Error ? queryError.message : null);

    const setSession = (newSession: WebSession | null) => {
        setManualSession(newSession);
    };

    const setError = (newError: string | null) => {
        setManualError(newError);
    };

    const refetchSession = useCallback(() => {
        queryClient.removeQueries({ queryKey: [SESSION.endpoint.name] });
        refetch();
    }, [queryClient, refetch]);

    return { session, error, isLoading, isFetching, setSession, setError, refetchSession };
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const session = useSessionDisplay();
    return (
        <>
            <SessionContext.Provider value={session}>
                {children}
            </SessionContext.Provider>
        </>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};

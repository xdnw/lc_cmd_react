import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_PARAM_NAME = "conflictId";

export function normalizeConflictIdParam(raw: string | null): string | null {
    if (typeof raw !== "string") return null;
    const normalized = raw.trim();
    return normalized.length > 0 ? normalized : null;
}

export function useConflictAutoOpen({
    paramName = DEFAULT_PARAM_NAME,
    cleanupOnSuccess = true,
}: {
    paramName?: string;
    cleanupOnSuccess?: boolean;
} = {}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const targetConflictId = useMemo(() => {
        return normalizeConflictIdParam(searchParams.get(paramName));
    }, [paramName, searchParams]);
    const lastOpenedTargetRef = useRef<string | null>(null);
    const latestSearchParamsRef = useRef(searchParams);

    useEffect(() => {
        latestSearchParamsRef.current = searchParams;
    }, [searchParams]);

    const autoOpenIfAvailable = useCallback((resolveOpen: (targetId: string) => (() => void) | undefined) => {
        if (!targetConflictId) return false;
        if (lastOpenedTargetRef.current === targetConflictId) return false;

        const open = resolveOpen(targetConflictId);
        if (!open) return false;

        open();
        lastOpenedTargetRef.current = targetConflictId;

        if (cleanupOnSuccess) {
            const nextParams = new URLSearchParams(latestSearchParamsRef.current);
            nextParams.delete(paramName);
            setSearchParams(nextParams, { replace: true, preventScrollReset: true });
        }

        return true;
    }, [cleanupOnSuccess, paramName, setSearchParams, targetConflictId]);

    return {
        targetConflictId,
        autoOpenIfAvailable,
    };
}
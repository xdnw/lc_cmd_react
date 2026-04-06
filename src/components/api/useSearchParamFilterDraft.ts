import { useCallback, useEffect, useState } from "react";

type SearchParamSetter = (
  nextSearchParams: URLSearchParams,
  options?: {
    replace?: boolean;
    state?: unknown;
    preventScrollReset?: boolean;
  },
) => void;

export function updateSearchParamDraftValue<T extends object>(
  current: T,
  name: string,
  value: string,
): T {
  const next = { ...(current as Record<string, unknown>) };
  const trimmed = value.trim();
  if (trimmed) {
    next[name] = trimmed;
  } else {
    delete next[name];
  }
  return next as T;
}

export function useSearchParamFilterDraft<T extends object>({
  filters,
  syncKey,
  defaultFilters,
  searchParams,
  setSearchParams,
  writeFilters,
}: {
  filters: T;
  syncKey: string;
  defaultFilters: T;
  searchParams: URLSearchParams;
  setSearchParams: SearchParamSetter;
  writeFilters: (searchParams: URLSearchParams, filters: T) => URLSearchParams;
}) {
  const [draftFilters, setDraftFilters] = useState<T>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters, syncKey]);

  const setDraftValue = useCallback((name: string, value: string) => {
    setDraftFilters((current) => updateSearchParamDraftValue(current, name, value));
  }, []);

  const applyFilters = useCallback(() => {
    const next = writeFilters(searchParams, draftFilters);
    setSearchParams(next, { preventScrollReset: true });
  }, [draftFilters, searchParams, setSearchParams, writeFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(defaultFilters);
    const next = writeFilters(searchParams, defaultFilters);
    setSearchParams(next, { preventScrollReset: true });
  }, [defaultFilters, searchParams, setSearchParams, writeFilters]);

  return {
    draftFilters,
    setDraftFilters,
    setDraftValue,
    applyFilters,
    resetFilters,
  };
}
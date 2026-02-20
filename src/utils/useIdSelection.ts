import { useCallback, useMemo, useState } from "react";

export type IdValue = number | string;

export function serializeIdSet(ids: Set<IdValue>): string {
    return Array.from(ids).map((value) => String(value)).sort((a, b) => a.localeCompare(b)).join(",");
}

export function useIdSelection<T extends IdValue>(initial?: Iterable<T>) {
    const [selectedIds, setSelectedIds] = useState<Set<T>>(() => new Set(initial));

    const has = useCallback((id: T) => selectedIds.has(id), [selectedIds]);

    const toggle = useCallback((id: T) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const setOne = useCallback((id: T, selected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (selected) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const addMany = useCallback((ids: Iterable<T>) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const id of ids) {
                next.add(id);
            }
            return next;
        });
    }, []);

    const removeMany = useCallback((ids: Iterable<T>) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const id of ids) {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const clear = useCallback(() => {
        setSelectedIds(new Set<T>());
    }, []);

    const list = useMemo(() => Array.from(selectedIds), [selectedIds]);

    return {
        selectedIds,
        list,
        count: selectedIds.size,
        has,
        toggle,
        setOne,
        addMany,
        removeMany,
        clear,
        setSelectedIds,
        serialize: () => serializeIdSet(selectedIds as Set<IdValue>),
    };
}

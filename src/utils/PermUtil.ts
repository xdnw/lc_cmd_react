import { AnyCommandPath } from "./Command";
import { useDialog } from "@/components/layout/DialogContext";
import { WebPermission } from "@/lib/apitypes";
import { PERMISSION } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect, useRef } from "react";

export function usePermission<P extends AnyCommandPath>(path: P): { permission?: WebPermission, isFetching: boolean } {
    const { showDialog } = useDialog();
    const shownErrorMessagesRef = useRef<Set<string>>(new Set());
    const { data, isFetching, error } = useQuery({
        ...bulkQueryOptions(PERMISSION.endpoint, {
            command: path.join(" "),
        }),
        retry: false, // Optional: prevent retries if you want
    });

    const errorFinal = useMemo(() => {
        if (error) return error;
        if (data?.error) return new Error(data.error);
        const payload = data?.data as WebPermission | null | undefined;
        if (payload && payload.success === false && payload.message) {
            return new Error(payload.message);
        }
        return null;
    }, [error, data?.error, data?.data]);

    useEffect(() => {
        if (errorFinal) {
            const message = `Failed to fetch permission: ${(errorFinal).message}`;
            if (shownErrorMessagesRef.current.has(message)) {
                return;
            }
            shownErrorMessagesRef.current.add(message);
            showDialog('Permission Error', message);
        }
    }, [errorFinal, showDialog]);

    return { permission: data?.data ?? undefined, isFetching };
}
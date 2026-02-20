import { Link } from "react-router-dom";
import {
    ANNOUNCEMENT_TITLES,
    READ_ANNOUNCEMENT,
    UNREAD_ANNOUNCEMENT,
} from "@/lib/endpoints";
import { PaginatedList } from "@/components/ui/pagination.tsx";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { useDialog } from "../../components/layout/DialogContext";
import { WebAnnouncement, WebAnnouncements, WebSuccess } from "../../lib/apitypes";
import EndpointWrapper from "@/components/api/bulkwrapper";
import { ApiFormInputs } from "@/components/api/apiform";
import { QueryResult } from "@/lib/BulkQuery";
import { useQueryClient } from "@tanstack/react-query";
import LazyIcon from "@/components/ui/LazyIcon";

export default function Announcements() {
    const [currentPage, setCurrentPage] = useState<number>(1);
    const entries = useRef<WebAnnouncement[] | null>(null);

    const renderAnn = useCallback((announcement: WebAnnouncement) => {
        return <tr>
            <td className={`h-6 relative px-1 break-normal text-sm text-gray-900 dark:text-gray-200 ${announcement.active ? "font-bold" : "text-black"}`}>
                <Link className="underline-offset-4 hover:underline active:text-primary/80" to={`${process.env.BASE_PATH}announcement/${announcement.id}`}>
                    {announcement.title}
                </Link>
                {announcement.active ?
                    <Read announcementId={announcement.id} title={announcement.title} /> :
                    <Unread announcementId={announcement.id} title={announcement.title} />}
            </td>
        </tr>
    }, []);

    const renderParent = useCallback(({ children }: { children: React.ReactNode }) => {
        return (
            <table className="min-w-full divide-y">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th className="px-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Title</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-solid dark:bg-gray-900">
                    {children}
                </tbody>
            </table>
        );
    }, []);

    return (
        <>
            <Button variant="outline" size="sm" asChild><Link to={`${process.env.BASE_PATH}guild_member`}><LazyIcon name="ChevronLeft" className="h-4 w-4" />Back</Link></Button>
            <EndpointWrapper endpoint={ANNOUNCEMENT_TITLES} args={{ read: "true" }}>
                {({ data }) => {
                    if (entries.current === null) {
                        entries.current = data.values;
                    }
                    if (entries.current.length === 0) return (<div>No announcements</div>);
                    return (
                        <PaginatedList items={entries.current ?? []} render={renderAnn}
                            parent={renderParent}
                            perPage={4} currentPage={currentPage} onPageChange={setCurrentPage} />
                    )
                }
                }
            </EndpointWrapper>
        </>
    )
}

export function Read({ announcementId, title }: { announcementId: number, title: string }) {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();

    const handleResponse = useCallback((data: QueryResult<WebSuccess>) => {
        showDialog("Marked as read", <>Marked {title} as read</>);
        // Update cache instead of mutating props
        queryClient.setQueryData(
            [ANNOUNCEMENT_TITLES.endpoint.name, { read: "true" }],
            (oldData: QueryResult<WebAnnouncements>) => {
                if (oldData && oldData.data && oldData.data.values) {
                    return new QueryResult({
                        endpoint: oldData.endpoint,
                        query: oldData.query,
                        update_ms: oldData.update_ms,
                        cache: oldData.cache,
                        error: oldData.error,
                        data: {
                            values: oldData.data.values.map((item: WebAnnouncement) =>
                                item.id === announcementId
                                    ? { ...item, active: false }
                                    : item
                            )
                        }
                    });
                }
                return oldData;
            }
        );
    }, [showDialog, title, announcementId, queryClient]);

    return (
        <ApiFormInputs
            endpoint={READ_ANNOUNCEMENT}
            default_values={{ ann_id: announcementId + "" }}
            label="Mark Read"
            classes="absolute top-0 right-0 h-5 mt-0.5 border-0"
            handle_response={handleResponse} />
    );
}

export function Unread({ announcementId, title }: { announcementId: number, title: string }) {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();

    const handleResponse = useCallback((data: QueryResult<WebSuccess>) => {
        showDialog("Marked as unread", <>Marked {title} as unread</>);


        queryClient.setQueryData(
            [ANNOUNCEMENT_TITLES.endpoint.name, { read: "true" }],
            (oldData: QueryResult<WebAnnouncements>) => {
                if (oldData && oldData.data && oldData.data.values) {
                    return new QueryResult({
                        endpoint: oldData.endpoint,
                        query: oldData.query,
                        update_ms: oldData.update_ms,
                        cache: oldData.cache,
                        error: oldData.error,
                        data: {
                            values: oldData.data.values.map((item: WebAnnouncement) =>
                                item.id === announcementId
                                    ? { ...item, active: true }
                                    : item
                            )
                        }
                    });
                }
                return oldData;
            }
        );
    }, [showDialog, title, announcementId, queryClient]);

    return (
        <ApiFormInputs
            endpoint={UNREAD_ANNOUNCEMENT}
            default_values={{ ann_id: announcementId + "" }}
            label="Mark Unread"
            classes="absolute top-0 right-0 h-5 mt-0.5 border-0"
            handle_response={handleResponse}
        />
    );
}
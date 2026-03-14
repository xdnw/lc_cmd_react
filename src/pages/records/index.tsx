import { memo, useRef, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { RECORDS } from "@/lib/endpoints";
import { PaginatedList } from "@/components/ui/pagination.tsx";
import { useLocation, useNavigate } from "react-router-dom";
import EndpointWrapper from "@/components/api/bulkwrapper";

const Records = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const initialPage = parseInt(queryParams.get("page") || "1", 10);
    const [currentPage, setCurrentPage] = useState<number>(initialPage);
    const entries = useRef<string[][] | null>(null);
    const header = useRef<string[] | null>(null);

    useEffect(() => {
        if (queryParams.get("page") !== currentPage.toString()) {
            queryParams.set("page", currentPage.toString());
            navigate({ search: queryParams.toString() });
        }
    }, [currentPage, navigate, queryParams]);

    const renderRow = useCallback((row: string[]) => {
        return (
            <tr>
                {row.map((cell, index) => (
                    <td key={index}>{cell}</td>
                ))}
            </tr>
        );
    }, []);

    const renderParent = useCallback(({ children }: { children: ReactNode }) => {
        return (
            <table className="min-w-full divide-y text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                    {header.current!.map((cell, index) => (
                        <th key={index}>{cell}</th>
                    ))}
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
            <EndpointWrapper endpoint={RECORDS} args={{}}>
                {({data: table}) => {
                    if (entries.current === null) {
                        header.current = table.cells.shift() as string[];
                        entries.current = table.cells;
                    }
                    if (header.current == null || entries.current === null || header.current.length === 0 || entries.current.length === 0) {
                        return <div>No data</div>;
                    }
                    return (
                        <MemoizedPaginatedList
                            top={false}
                            items={entries.current}
                            render={renderRow}
                            parent={renderParent}
                            perPage={50}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    );
                }
                }
            </EndpointWrapper>
        </>
    );
};

const MemoizedPaginatedList = memo(PaginatedList<string[]>);

export default Records;
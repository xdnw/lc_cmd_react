import { memo, useRef, useState, useEffect } from "react";
import { RECORDS } from "@/components/api/endpoints.tsx";
import Loading from "@/components/ui/loading.tsx";
import { PaginatedList } from "@/components/ui/pagination.tsx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const Records = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
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

    return (
        <>
            <Button variant="outline" size="sm" asChild>
                <Link to={`${process.env.BASE_PATH}balance`}>
                    <ChevronLeft className="h-4 w-4" />Back
                </Link>
            </Button>
            {RECORDS.useDisplay({
                args: {},
                render: (table) => {
                    if (entries.current === null) {
                        header.current = table.cells.shift() as string[];
                        entries.current = table.cells;
                    }
                    if (header.current == null || entries.current == null || header.current.length === 0 || entries.current.length === 0) {
                        return <div>No data</div>;
                    }
                    return (
                        <MemoizedPaginatedList
                            top={false}
                            items={entries.current}
                            render={(row: string[]) => (
                                <tr>
                                    {row.map((cell, index) => (
                                        <td key={index}>{cell}</td>
                                    ))}
                                </tr>
                            )}
                            parent={({ children }) => (
                                <table className="min-w-full divide-y text-xs">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        {header.current.map((cell, index) => (
                                            <th key={index}>{cell}</th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-solid dark:bg-gray-900">
                                    {children}
                                    </tbody>
                                </table>
                            )}
                            perPage={50}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    );
                },
                renderLoading: () => <Loading />,
            })}
        </>
    );
};

const MemoizedPaginatedList = memo(PaginatedList);

export default Records;
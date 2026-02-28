import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const pages = [
    { path: "/conflicts", label: "Conflicts" },
    { path: "/temporary-conflicts", label: "Temporary Conflicts" },
] as const;

export default function ConflictPageNav() {
    const location = useLocation();

    return (
        <div className="mb-2 flex flex-wrap items-center gap-2">
            {pages.map((page) => {
                const active = location.pathname === page.path;
                return (
                    <Button key={page.path} asChild variant={active ? "default" : "outline"} size="sm">
                        <Link to={page.path}>{page.label}</Link>
                    </Button>
                );
            })}
        </div>
    );
}

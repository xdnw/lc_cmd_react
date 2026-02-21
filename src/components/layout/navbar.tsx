import { ModeToggle } from "@/components/ui/mode-toggle.tsx";
import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { hasToken } from "@/utils/Auth.ts";
import LoggedInDropdown from "@/components/layout/logged-in-dropdown.tsx";
import LoggedOutDropdown from "@/components/layout/logged-out-dropdown.tsx";
import { Input } from "../ui/input";
import LazyIcon from "../ui/LazyIcon";

const SearchBar = React.memo(() => (
    <div className="w-full p-0 flex items-center">
        <Input
            id="navbar-search"
            className="relative w-full rounded-r-none border-r-0 px-2 h-7"
            type="search"
            placeholder="Search pages..."
            aria-label="Search"
            name="term"
        />
        <button type="submit" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 h-7 rounded-r border border-input border-l-0 flex items-center justify-center">
            <LazyIcon name="Search" size={14} />
        </button>
    </div>
));

export default function Navbar() {
    const location = useLocation();

    // Memoize pathnames array to prevent unnecessary recalculations
    const pathnames = useMemo(() =>
        decodeURI(location.pathname).split('/').filter(x => x),
        [location.pathname]
    );

    // Memoize login status to avoid rechecking on every render
    const isLoggedIn = useMemo(() => hasToken(), []);

    // Memoize breadcrumbs to prevent recreating on every render
    const breadcrumbs = useMemo(() => {
        if (pathnames.length === 0) {
            return <span>Home</span>;
        }

        return (
            <>
                <Link to="/" className="text-primary hover:text-primary/80 underline">[index]</Link>
                {pathnames.map((value, index) => {
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                    return (
                        <React.Fragment key={to}>
                            <span className="mx-1">/</span>
                            <Link to={to} className="text-primary hover:text-primary/80 underline">{value}</Link>
                        </React.Fragment>
                    );
                })}
            </>
        );
    }, [pathnames]);

    // Memoize the user dropdown component
    const userDropdown = useMemo(() =>
        isLoggedIn ? <LoggedInDropdown /> : <LoggedOutDropdown />,
        [isLoggedIn]
    );

    const modeToggle = useMemo(() => <ModeToggle />, []);

    return (
        <nav className="bg-card border-b border-border flex flex-row items-center px-2 py-1 gap-1.5 shadow-sm">
            <div className="flex-none">
                {modeToggle}
            </div>
            <div className="flex-none">
                <div className="inline-flex max-w-[42vw] md:max-w-136 overflow-hidden text-ellipsis text-xs h-7 px-2 bg-muted text-muted-foreground rounded items-center justify-center whitespace-nowrap">
                    {breadcrumbs}
                </div>
            </div>
            <div className="grow">
                <SearchBar />
            </div>
            <div className="flex-none relative">
                {userDropdown}
            </div>
        </nav>
    );
}
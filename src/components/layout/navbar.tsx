import { ModeToggle } from "@/components/ui/mode-toggle.tsx";
import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { hasToken } from "@/utils/Auth.ts";
import LoggedInDropdown from "@/components/layout/logged-in-dropdown.tsx";
import LoggedOutDropdown from "@/components/layout/logged-out-dropdown.tsx";
import { Input } from "../ui/input";
import LazyIcon from "../ui/LazyIcon";
import { useCommandLauncher } from "@/components/cmd/CommandLauncherContext";

const SearchBar = React.memo(function SearchBar() {
    const { openBrowser } = useCommandLauncher();

    const openCommandLauncher = React.useCallback(() => {
        openBrowser({ query: "" });
    }, [openBrowser]);

    const handleInputPointerDown = React.useCallback((event: React.PointerEvent<HTMLInputElement>) => {
        event.preventDefault();
        openCommandLauncher();
    }, [openCommandLauncher]);

    const handleInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter" && event.key !== " " && event.key !== "/") {
            return;
        }

        event.preventDefault();
        openCommandLauncher();
    }, [openCommandLauncher]);

    const handleButtonClick = React.useCallback(() => {
        openCommandLauncher();
    }, [openCommandLauncher]);

    return (
        <div className="flex w-full items-center">
            <Input
                id="navbar-search"
                className="relative h-7 w-full rounded-r-none border-r-0 px-2 text-xs"
                type="search"
                placeholder="Search commands or pages. Press / to focus."
                aria-label="Open command launcher"
                aria-haspopup="dialog"
                readOnly
                value=""
                onPointerDown={handleInputPointerDown}
                onKeyDown={handleInputKeyDown}
            />
            <button
                type="button"
                onClick={handleButtonClick}
                aria-label="Open command launcher"
                className="flex h-7 items-center justify-center rounded-r border border-input border-l-0 bg-secondary px-2 text-secondary-foreground hover:bg-secondary/80"
            >
                <LazyIcon name="Search" size={14} />
            </button>
        </div>
    );
});

export default function Navbar() {
    const location = useLocation();

    // Memoize pathnames array to prevent unnecessary recalculations
    const pathnames = useMemo(() =>
        decodeURI(location.pathname).split('/').filter(x => x),
        [location.pathname]
    );

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

    const userDropdown = hasToken() ? <LoggedInDropdown /> : <LoggedOutDropdown />;

    const modeToggle = useMemo(() => <ModeToggle />, []);

    return (
        <nav className="bg-card border-b border-border flex flex-row items-center gap-1.5 px-2 py-0.5 shadow-sm">
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
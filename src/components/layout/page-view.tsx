import { ReactElement, useMemo } from "react";
import { useLocation } from "react-router-dom";

import {
    buildSectionHeaderTabs,
    resolveAppRouteConfig,
    type AppRouteConfig,
} from "@/appRoutes";
import { SessionProvider } from "@/components/api/SessionContext";
import CommandLauncher from "@/components/cmd/CommandLauncher";
import { CommandLauncherProvider } from "@/components/cmd/CommandLauncherContext";
import Footer from "@/components/layout/footer.tsx";
import { PageHeaderProvider, useActivePageHeader } from "@/components/layout/PageHeaderContext";
import { PageSidebarProvider, useActivePageSidebar } from "@/components/layout/PageSidebarContext";
import { buildPrimarySidebarConfig } from "@/components/layout/primarySidebar";
import SidebarNav, { type SidebarNavConfig } from "@/components/layout/SidebarNav";
import { ThemeProvider } from "../ui/theme-provider";
import Navbar from "@/components/layout/navbar.tsx";
import { DialogProvider } from "./DialogContext";
import RecentPageKeepAlive from "./RecentPageKeepAlive";
import SectionHeader from "./SectionHeader";

function PageScaffold({
    routeConfigs,
    sectionTabs,
}: {
    routeConfigs: readonly AppRouteConfig[];
    sectionTabs: ReturnType<typeof buildSectionHeaderTabs>;
}) {
    const activeSidebar = useActivePageSidebar();
    const activeHeader = useActivePageHeader();

    return (
        <div className="flex min-h-0 grow">
            {activeSidebar ? (
                <aside className="hidden w-62 shrink-0 px-2 py-2 md:block">
                    <div className="sticky top-2">
                        <SidebarNav config={activeSidebar} />
                    </div>
                </aside>
            ) : null}

            <main className="min-w-0 grow">
                <div className="space-y-3 px-2 py-2 md:px-3 md:py-3">
                    {activeSidebar ? <SidebarNav mode="mobile" config={activeSidebar} /> : null}
                    <SectionHeader
                        tabs={sectionTabs}
                        title={activeHeader?.title}
                        summary={activeHeader?.summary}
                        actions={activeHeader?.actions}
                        content={activeHeader?.content}
                        className={activeHeader?.className}
                    />
                    <RecentPageKeepAlive routeConfigs={routeConfigs} />
                </div>
            </main>
        </div>
    );
}

function PageShellContent({
    routeConfigs,
    pathname,
    showPrimaryNav,
    sectionTabs,
}: {
    routeConfigs: readonly AppRouteConfig[];
    pathname: string;
    showPrimaryNav: boolean;
    sectionTabs: ReturnType<typeof buildSectionHeaderTabs>;
}) {
    const defaultSidebar = useMemo(() => {
        if (!showPrimaryNav) {
            return null;
        }

        return buildPrimarySidebarConfig(routeConfigs, pathname);
    }, [pathname, routeConfigs, showPrimaryNav]);

    return (
        <PageSidebarProvider defaultSidebar={defaultSidebar}>
            <PageHeaderProvider>
                <PageScaffold routeConfigs={routeConfigs} sectionTabs={sectionTabs} />
            </PageHeaderProvider>
        </PageSidebarProvider>
    );
}

export default function PageView({ routeConfigs }: { routeConfigs: readonly AppRouteConfig[] }): ReactElement {
    const location = useLocation();
    const matchedRoute = useMemo(
        () => resolveAppRouteConfig(routeConfigs, location.pathname),
        [location.pathname, routeConfigs],
    );
    const sectionTabs = useMemo(
        () => buildSectionHeaderTabs(routeConfigs, location.pathname),
        [location.pathname, routeConfigs],
    );
    const shell = matchedRoute?.shell;
    const showContextBar = shell?.showContextBar !== false;
    const showPrimaryNav = shell?.showPrimaryNav !== false;

    return (
        <DialogProvider>
            <SessionProvider>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <CommandLauncherProvider>
                        <div className="min-h-screen bg-background text-foreground flex flex-col">
                            <Navbar routeConfigs={routeConfigs} showContextBar={showContextBar} />
                            <PageShellContent
                                routeConfigs={routeConfigs}
                                pathname={location.pathname}
                                showPrimaryNav={showPrimaryNav}
                                sectionTabs={sectionTabs}
                            />
                            <Footer />
                            <CommandLauncher />
                        </div>
                    </CommandLauncherProvider>
                </ThemeProvider>
            </SessionProvider>
        </DialogProvider>
    );
}
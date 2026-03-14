import { ReactElement, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { resolveAppRouteConfig, type AppRouteConfig } from '@/appRoutes';
import CommandLauncher from '@/components/cmd/CommandLauncher';
import { CommandLauncherProvider } from '@/components/cmd/CommandLauncherContext';
import { SessionProvider } from '../api/SessionContext';
import Footer from '@/components/layout/footer.tsx';
import GuildContextBar from '@/components/layout/GuildContextBar';
import { ThemeProvider } from '../ui/theme-provider';
import Navbar from "@/components/layout/navbar.tsx";
import { DialogProvider } from "./DialogContext";
import PrimaryNavRail from '@/components/layout/PrimaryNavRail';
import RecentPageKeepAlive from './RecentPageKeepAlive';
import SectionHeader from '@/components/layout/SectionHeader';

export default function PageView({ routeConfigs }: { routeConfigs: readonly AppRouteConfig[] }): ReactElement {
    const location = useLocation();
    const navBar = useMemo(() => {
        return <Navbar />;
    }, []);
    const matchedRoute = useMemo(
        () => resolveAppRouteConfig(routeConfigs, location.pathname),
        [location.pathname, routeConfigs],
    );
    const shell = matchedRoute?.shell;
    const showContextBar = shell?.showContextBar !== false;
    const showPrimaryNav = shell?.showPrimaryNav !== false;
    const sectionHeader = shell?.header;

    return (
        <DialogProvider>
            <SessionProvider>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <CommandLauncherProvider>
                        <div className="min-h-screen bg-background text-foreground flex flex-col">
                            {navBar}
                            {showContextBar ? <GuildContextBar /> : null}
                            <div className="flex min-h-0 grow">
                                {showPrimaryNav ? (
                                    <aside className="hidden w-62 shrink-0 px-2 py-2 md:block">
                                        <div className="sticky top-2">
                                            <PrimaryNavRail activeSection={shell?.section} />
                                        </div>
                                    </aside>
                                ) : null}

                                <main className="min-w-0 grow">
                                    <div className="space-y-3 px-2 py-2 md:px-3 md:py-3">
                                        {showPrimaryNav ? <PrimaryNavRail mode="mobile" activeSection={shell?.section} /> : null}
                                        {sectionHeader ? (
                                            <SectionHeader
                                                eyebrow={shell?.section}
                                                title={sectionHeader.title}
                                                summary={sectionHeader.summary}
                                                badge={sectionHeader.badge}
                                                primaryActions={sectionHeader.primaryActions}
                                                secondaryActions={sectionHeader.secondaryActions}
                                            />
                                        ) : null}
                                        <RecentPageKeepAlive routeConfigs={routeConfigs} />
                                    </div>
                                </main>
                            </div>
                            <Footer />
                            <CommandLauncher />
                        </div>
                    </CommandLauncherProvider>
                </ThemeProvider>
            </SessionProvider>
        </DialogProvider>
    );
}
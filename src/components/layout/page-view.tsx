import { ReactElement, useMemo } from 'react';
import { ThemeProvider } from '../ui/theme-provider';
import Navbar from "@/components/layout/navbar.tsx";
import Footer from "@/components/layout/footer.tsx";
import { DialogProvider } from "./DialogContext";
import { SessionProvider } from '../api/SessionContext';
import type { AppRouteConfig } from '@/App';
import RecentPageKeepAlive from './RecentPageKeepAlive';
import CommandLauncher from '@/components/cmd/CommandLauncher';
import { CommandLauncherProvider } from '@/components/cmd/CommandLauncherContext';

export default function PageView({ routeConfigs }: { routeConfigs: readonly AppRouteConfig[] }): ReactElement {
    const navBar = useMemo(() => {
        return <Navbar />;
    }, []);
    return (
        <DialogProvider>
            <SessionProvider>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <CommandLauncherProvider>
                        <div className="min-h-screen bg-background text-foreground flex flex-col">
                            {navBar}
                            <main className="grow w-full px-2 py-1.5 md:px-3 md:py-2 space-y-1.5">
                                <RecentPageKeepAlive routeConfigs={routeConfigs} />
                            </main>
                            <Footer />
                            <CommandLauncher />
                        </div>
                    </CommandLauncherProvider>
                </ThemeProvider>
            </SessionProvider>
        </DialogProvider>
    );
}
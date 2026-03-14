import { ReactElement, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { APP_PRIMARY_NAV_ITEMS, resolveAppRouteConfig, type AppNavSection, type AppRouteConfig, type AppRouteShellConfig } from "@/appRoutes";
import { useSession, SessionProvider } from "@/components/api/SessionContext";
import CommandLauncher from "@/components/cmd/CommandLauncher";
import { CommandLauncherProvider } from "@/components/cmd/CommandLauncherContext";
import Footer from "@/components/layout/footer.tsx";
import { PageSidebarProvider, useActivePageSidebar } from "@/components/layout/PageSidebarContext";
import SectionHeader from "@/components/layout/SectionHeader";
import SidebarNav, { type SidebarNavConfig } from "@/components/layout/SidebarNav";
import Badge from "@/components/ui/badge";
import { ThemeProvider } from "../ui/theme-provider";
import Navbar from "@/components/layout/navbar.tsx";
import { DialogProvider } from "./DialogContext";
import RecentPageKeepAlive from "./RecentPageKeepAlive";

function buildSectionSidebarConfig({
    activeSection,
    hasGuild,
}: {
    activeSection?: AppNavSection;
    hasGuild: boolean;
}): SidebarNavConfig {
    const activeItem = APP_PRIMARY_NAV_ITEMS.find((item) => item.id === activeSection) ?? null;

    return {
        ariaLabel: "Primary navigation",
        layout: "cards",
        eyebrow: "Navigate",
        title: activeItem?.label ?? "Browse sections",
        subtitle: activeItem?.summary ?? "Move between the app's shared top-level sections without losing orientation.",
        headerMeta: hasGuild ? <Badge variant="secondary">Guild ready</Badge> : <Badge variant="outline">Pick guild</Badge>,
        items: APP_PRIMARY_NAV_ITEMS.map((item) => ({
            id: item.id,
            label: item.label,
            description: item.summary,
            to: item.to,
            iconName: item.iconName,
            requireGuild: item.requireGuild,
            active: item.id === activeSection,
            badgeLabel: item.requireGuild ? "Guild" : undefined,
            badgeVariant: "outline",
        })),
        mobileTriggerLabel: "Section",
        mobileTriggerValue: activeItem?.label ?? "Browse sections",
        mobileButtonLabel: "Sections",
        mobileSheetTitle: "Sections",
        mobileSheetSubtitle: "App navigation",
    };
}

function PageScaffold({
    routeConfigs,
    section,
    sectionHeader,
}: {
    routeConfigs: readonly AppRouteConfig[];
    section: AppNavSection | undefined;
    sectionHeader: AppRouteShellConfig["header"];
}) {
    const activeSidebar = useActivePageSidebar();

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
                    {sectionHeader ? (
                        <SectionHeader
                            eyebrow={section}
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
    );
}

function PageShellContent({
    routeConfigs,
    shell,
    showPrimaryNav,
}: {
    routeConfigs: readonly AppRouteConfig[];
    shell: AppRouteShellConfig | undefined;
    showPrimaryNav: boolean;
}) {
    const { session } = useSession();
    const sectionHeader = shell?.header;
    const defaultSidebar = useMemo(() => {
        if (!showPrimaryNav) {
            return null;
        }

        return buildSectionSidebarConfig({
            activeSection: shell?.section,
            hasGuild: Boolean(session?.guild),
        });
    }, [session?.guild, shell?.section, showPrimaryNav]);

    return (
        <PageSidebarProvider defaultSidebar={defaultSidebar}>
            <PageScaffold routeConfigs={routeConfigs} section={shell?.section} sectionHeader={sectionHeader} />
        </PageSidebarProvider>
    );
}

export default function PageView({ routeConfigs }: { routeConfigs: readonly AppRouteConfig[] }): ReactElement {
    const location = useLocation();
    const matchedRoute = useMemo(
        () => resolveAppRouteConfig(routeConfigs, location.pathname),
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
                            <PageShellContent routeConfigs={routeConfigs} shell={shell} showPrimaryNav={showPrimaryNav} />
                            <Footer />
                            <CommandLauncher />
                        </div>
                    </CommandLauncherProvider>
                </ThemeProvider>
            </SessionProvider>
        </DialogProvider>
    );
}
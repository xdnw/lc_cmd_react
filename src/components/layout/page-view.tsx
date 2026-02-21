import { ReactElement, ReactNode, useMemo } from 'react';
import { ThemeProvider } from '../ui/theme-provider';
import Navbar from "@/components/layout/navbar.tsx";
import Footer from "@/components/layout/footer.tsx";
import { DialogProvider } from "./DialogContext";
import { SessionProvider } from '../api/SessionContext';

export default function PageView({ children }: { children: ReactNode }): ReactElement {
    const navBar = useMemo(() => {
        return <Navbar />;
    }, []);
    return (
        <DialogProvider>
            <SessionProvider>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <div className="min-h-screen bg-background text-foreground flex flex-col">
                        {navBar}
                        <main className="grow w-full px-2 py-1.5 md:px-3 md:py-2 space-y-1.5">
                            {children}
                        </main>
                        <Footer />
                    </div>
                </ThemeProvider>
            </SessionProvider>
        </DialogProvider>
    );
}
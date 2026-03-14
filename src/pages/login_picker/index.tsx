import LoginPicker from "@/components/api/LoginPicker";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";
import { Button } from "@/components/ui/button";
import { hasToken } from "@/utils/Auth";

export default function LoginPickerPage() {
    if (!hasToken()) {
        return <LoginPicker />;
    }

    return (
        <div className="rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">You are already signed in.</span>
                <Button asChild size="sm">
                    <ContextPreservingLink to="/home">Home</ContextPreservingLink>
                </Button>
                <Button asChild variant="outline" size="sm">
                    <ContextPreservingLink to="/unregister">Manage linked account</ContextPreservingLink>
                </Button>
            </div>
        </div>
    );
}
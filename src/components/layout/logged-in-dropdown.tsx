import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { WebSession } from "@/lib/apitypes";
import { useSession } from "@/components/api/SessionContext";
import LoggedOutDropdown from "./logged-out-dropdown";
import Loading from "../ui/loading";
import LazyIcon from "../ui/LazyIcon";
import ContextPreservingLink from "@/components/layout/ContextPreservingLink";

export default function LoggedInDropdown() {
    const { session, isLoading, isFetching } = useSession();

    if (isLoading || isFetching) {
        return <Loading variant="ripple" />;
    }

    if (!session) {
        return <LoggedOutDropdown />
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="iconSm" className="rounded-md [&_svg]:size-3.5 text-muted-foreground hover:text-foreground">
                    <LazyIcon name="Settings" className="h-4 w-4 rotate-0 scale-100 transition-all" />
                    <span className="sr-only">Profile Menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem>
                    <ContextPreservingLink className="w-full" to="/guild_select">{session.guild ?
                        <SwitchGuild session={session} /> : "Select Guild"}</ContextPreservingLink>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <ContextPreservingLink to="/logout" className="w-full">
                        Logout</ContextPreservingLink>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>);
}

export function SwitchGuild({ session }: { session: WebSession }) {
    return <>
        {session.guild_icon && <img src={session.guild_icon} alt={session.guild_name} className="w-4 h-4 inline-block mr-1" />}
        {session.guild_name ? session.guild_name : "guild:" + session.guild}
    </>
}
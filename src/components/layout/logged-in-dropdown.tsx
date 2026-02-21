import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { SESSION } from "@/lib/endpoints";
import { WebSession } from "@/lib/apitypes";
import LoggedOutDropdown from "./logged-out-dropdown";
import { bulkQueryOptions } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import Loading from "../ui/loading";
import LazyIcon from "../ui/LazyIcon";

export default function LoggedInDropdown() {
    const { data, isFetching } = useQuery(bulkQueryOptions(SESSION.endpoint, {}));
    if (isFetching || !data) {
        return <Loading variant="ripple" />;
    }
    if (!data.data) {
        return <LoggedOutDropdown />
    }
    const session = data.data;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="iconSm" className="rounded-md [&_svg]:size-3.5 text-muted-foreground hover:text-foreground">
                    <LazyIcon name="Settings" className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all" />
                    <span className="sr-only">Profile Menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem>
                    <Link className="w-full" to={`${process.env.BASE_PATH}guild_select`}>{session.guild ?
                        <SwitchGuild session={session} /> : "Select Guild"}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Link to={"/logout"} className="w-full">
                        Logout</Link>
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
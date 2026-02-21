import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import LazyIcon from "@/components/ui/LazyIcon";

export default function LoggedOutDropdown() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="iconSm" className="rounded-md [&_svg]:size-3.5 text-muted-foreground hover:text-foreground">
                    <LazyIcon name="Settings" className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all" />
                    <span className="sr-only">Profile menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem>
                    <Link to={"/login"} className="w-full">Login</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CmdList from "@/components/cmd/CmdList";
import {
    parseCmdBrowserStateFromSearchParams,
    type CmdBrowserState,
} from "@/components/cmd/cmdBrowserState";
import {
    COMMAND_BROWSER_DISPLAY_PREFIX,
    createCmdBrowserPageLocation,
} from "@/components/cmd/commandBrowserNavigation";
import { CM } from "@/utils/Command";

export default function CommandsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const commands = useMemo(() => CM.getCommands(), []);
    // The URL is the source of truth for page state, but URL writes stay user-driven.
    // Parsing location.search must not trigger a self-normalizing navigation loop.
    const browserState = useMemo(() => {
        return parseCmdBrowserStateFromSearchParams(new URLSearchParams(location.search));
    }, [location.search]);

    const handleStateChange = useCallback((nextState: CmdBrowserState) => {
        const nextLocation = createCmdBrowserPageLocation(nextState);
        if (nextLocation.search === location.search) {
            return;
        }

        navigate(nextLocation, { replace: true });
    }, [location.search, navigate]);

    return (
        <CmdList
            commands={commands}
            prefix={COMMAND_BROWSER_DISPLAY_PREFIX}
            state={browserState}
            onStateChange={handleStateChange}
            autoFocusSearch={true}
        />
    );
}

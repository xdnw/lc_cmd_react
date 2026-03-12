import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CmdList from "@/components/cmd/CmdList";
import {
    createCmdBrowserSearchParams,
    isCmdBrowserStateEqual,
    parseCmdBrowserStateFromSearchParams,
    type CmdBrowserState,
} from "@/components/cmd/cmdBrowserState";
import { CM } from "@/utils/Command";

export default function CommandsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const commands = useMemo(() => CM.getCommands(), []);
    const browserState = useMemo(() => {
        return parseCmdBrowserStateFromSearchParams(new URLSearchParams(location.search));
    }, [location.search]);

    useEffect(() => {
        const searchParams = createCmdBrowserSearchParams(browserState);
        const nextSearch = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
        if (nextSearch !== location.search) {
            navigate({ pathname: "/commands", search: nextSearch }, { replace: true });
        }
    }, [browserState, location.search, navigate]);

    const handleStateChange = useCallback((nextState: CmdBrowserState) => {
        if (isCmdBrowserStateEqual(nextState, browserState)) {
            return;
        }

        const searchParams = createCmdBrowserSearchParams(nextState);
        navigate({
            pathname: "/commands",
            search: searchParams.size > 0 ? `?${searchParams.toString()}` : "",
        }, { replace: true });
    }, [browserState, navigate]);

    return (
        <CmdList
            commands={commands}
            prefix="/"
            state={browserState}
            onStateChange={handleStateChange}
            autoFocusSearch={true}
        />
    );
}

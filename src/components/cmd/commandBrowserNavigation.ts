import { createCmdBrowserSearchParams, type CmdBrowserState } from "@/components/cmd/cmdBrowserState";

export const COMMAND_BROWSER_PAGE_PATH = "/commands";
export const COMMAND_BROWSER_DISPLAY_PREFIX = "/";

export function createCmdBrowserSearch(state: CmdBrowserState): string {
    const searchParams = createCmdBrowserSearchParams(state);
    return searchParams.size > 0 ? `?${searchParams.toString()}` : "";
}

export function createCmdBrowserPageLocation(state: CmdBrowserState) {
    return {
        pathname: COMMAND_BROWSER_PAGE_PATH,
        search: createCmdBrowserSearch(state),
    };
}
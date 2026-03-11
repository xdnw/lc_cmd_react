import { describe, expect, it } from "vitest";

import {
    createCmdBrowserSearchParams,
    parseCmdBrowserStateFromSearchParams,
    type CmdBrowserState,
} from "@/components/cmd/cmdBrowserState";

describe("cmdBrowserState", () => {
    it("round-trips query and filter state through URLSearchParams", () => {
        const state: CmdBrowserState = {
            query: "who",
            showFilters: true,
            filters: {
                triFilters: {
                    viewable: "1",
                    hasapi: "-1",
                },
                hasArgs: "1",
                rolesAny: "member,admin",
                requiredArgs: "nation,user",
            },
        };

        const serialized = createCmdBrowserSearchParams(state);
        const parsed = parseCmdBrowserStateFromSearchParams(serialized);

        expect(parsed).toEqual(state);
    });

    it("drops neutral filter values from the query string", () => {
        const serialized = createCmdBrowserSearchParams({
            query: "",
            showFilters: false,
            filters: {
                triFilters: {
                    viewable: "0",
                },
                hasArgs: "0",
                rolesAny: "",
                requiredArgs: "",
            },
        });

        expect(serialized.toString()).toBe("");
    });
});

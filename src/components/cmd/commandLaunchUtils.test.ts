import { describe, expect, it } from "vitest";

import { createDefaultCmdBrowserState } from "@/components/cmd/cmdBrowserState";
import {
    buildCommandRouteSearchParams,
    isEditableTarget,
    resolveLaunchableCommand,
} from "@/components/cmd/commandLaunchUtils";
import { CM } from "@/utils/Command";

describe("resolveLaunchableCommand", () => {
    it("resolves an exact pasted command path without requiring arguments", () => {
        const command = CM.getCommands()[0];

        const result = resolveLaunchableCommand(`/${command.getPathString()}`);

        expect(result?.command.getPathString()).toBe(command.getPathString());
        expect(result?.initialValues).toEqual({});
    });

    it("parses named arguments for a valid pasted command", () => {
        const command = CM.getCommands().find((entry) => entry.getArguments().length > 0);
        expect(command).toBeTruthy();

        const argName = command!.getArguments()[0].name;
        const result = resolveLaunchableCommand(`/${command!.getPathString()} ${argName}:demo-value`);

        expect(result?.command.getPathString()).toBe(command!.getPathString());
        expect(result?.initialValues[argName]).toBe("demo-value");
    });

    it("ignores invalid pasted commands", () => {
        const command = CM.getCommands().find((entry) => entry.getArguments().length > 0);
        expect(command).toBeTruthy();

        const result = resolveLaunchableCommand(`/${command!.getPathString()} not_a_real_arg:demo-value`);

        expect(result).toBeNull();
    });
});

describe("buildCommandRouteSearchParams", () => {
    it("serializes string and array outputs", () => {
        const searchParams = buildCommandRouteSearchParams({
            nation: "Borg",
            tags: ["one", "two"],
            empty: "",
        });

        expect(searchParams.get("nation")).toBe("Borg");
        expect(searchParams.getAll("tags")).toEqual(["one", "two"]);
        expect(searchParams.has("empty")).toBe(false);
    });
});

describe("isEditableTarget", () => {
    it("treats text-entry controls as editable", () => {
        const input = document.createElement("input");
        input.type = "text";

        expect(isEditableTarget(input)).toBe(true);
    });

    it("treats contenteditable descendants as editable", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = '<div contenteditable="true"><span id="child">edit me</span></div>';

        const child = wrapper.querySelector("#child");
        expect(isEditableTarget(child)).toBe(true);
    });

    it("allows slash launch from non-text buttons", () => {
        const button = document.createElement("button");

        expect(isEditableTarget(button)).toBe(false);
    });
});

describe("createDefaultCmdBrowserState", () => {
    it("creates stable defaults for the command browser", () => {
        expect(createDefaultCmdBrowserState()).toEqual({
            query: "",
            showFilters: false,
            filters: {
                triFilters: {},
                hasArgs: "0",
                rolesAny: "",
                requiredArgs: "",
            },
        });
    });
});

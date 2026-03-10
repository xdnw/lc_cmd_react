import { cleanup, render } from "@testing-library/react";
import { afterEach, bench, describe, vi } from "vitest";

vi.mock("./ArgInput", () => ({
    default: ({ argName }: { argName: string }) => <input aria-label={argName} />,
}));

vi.mock("../layout/DialogContext", () => ({
    useDialog: () => ({ showDialog: vi.fn() }),
}));

import CommandComponent from "./CommandComponent";

const entries = Array.from({ length: 120 }, (_, index) => ({
    name: `arg-${index}`,
    arg: {
        name: `arg-${index}`,
        type: "String",
        optional: false,
        group: undefined,
        desc: index % 4 === 0
            ? "A single line of text"
            : "A discord guild id. See: <https://en.wikipedia.org/wiki/Template:Discord server#Getting Guild ID>",
    },
    getTypeBreakdown: () => ({ element: "String", annotations: null, child: null }),
    getExamples: () => (index % 3 === 0 ? ["example:value"] : []),
    getTypeDesc: () => (index % 2 === 0 ? "A single line of text" : "Supports https://example.com style links"),
}));

const command = {
    name: "bench-command",
    command: { groups: [], group_descs: [] },
    getArguments: () => entries,
};

afterEach(() => {
    cleanup();
});

describe("command component mount", () => {
    bench("render with deferred mounting", () => {
        render(
            <CommandComponent
                command={command as never}
                filterArguments={() => true}
                initialValues={{}}
                setOutput={() => {}}
            />,
        );
    });

    bench("render with force-mounted inputs", () => {
        render(
            <CommandComponent
                command={command as never}
                filterArguments={() => true}
                initialValues={{}}
                forceMountAll
                setOutput={() => {}}
            />,
        );
    });
});
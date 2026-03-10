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
        desc: "",
    },
    getTypeBreakdown: () => ({ element: "String", annotations: null, child: null }),
    getExamples: () => [],
    getTypeDesc: () => "",
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
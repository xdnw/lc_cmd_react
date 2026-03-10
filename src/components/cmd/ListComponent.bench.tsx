import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, bench, describe } from "vitest";

import ListComponent from "./ListComponent";

const largeOptions = Array.from({ length: 20000 }, (_, index) => {
    const value = `Nation ${String(index).padStart(5, "0")}`;
    return {
        label: value,
        value,
        aliases: [`${index}`],
    };
});

afterEach(() => {
    cleanup();
});

describe("list component interaction", () => {
    bench("render and filter 20k local options", () => {
        render(
            <ListComponent
                argName="target"
                options={largeOptions}
                isMulti={false}
                initialValue=""
                setOutputValue={() => {}}
            />,
        );

        const input = screen.getByRole("textbox") as HTMLInputElement;
        act(() => {
            fireEvent.focus(input);
            fireEvent.change(input, { target: { value: "Nation 019" } });
        });
    });
});
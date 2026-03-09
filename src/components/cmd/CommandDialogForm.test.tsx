import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CommandDialogForm from "./CommandDialogForm";

let commandComponentRenderCount = 0;
let commandActionButtonRenderCount = 0;

vi.mock("./CommandComponent", () => ({
  default: ({ setOutput }: { setOutput: (key: string, value: string) => void }) => {
    commandComponentRenderCount += 1;
    return (
      <button type="button" onClick={() => setOutput("value", "updated")}>mock field update</button>
    );
  },
}));

vi.mock("./CommandActionButton", () => ({
  default: ({ args }: { args: Record<string, string> }) => {
    commandActionButtonRenderCount += 1;
    return <div data-testid="mock-command-action">{JSON.stringify(args)}</div>;
  },
}));

describe("CommandDialogForm", () => {
  afterEach(() => {
    commandComponentRenderCount = 0;
    commandActionButtonRenderCount = 0;
  });

  it("keeps the default form body from rerendering on output updates", () => {
    render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
      />,
    );

    expect(commandComponentRenderCount).toBe(1);
    expect(commandActionButtonRenderCount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "mock field update" }));

    expect(commandComponentRenderCount).toBe(1);
    expect(commandActionButtonRenderCount).toBe(2);
    expect(screen.getByTestId("mock-command-action").textContent).toContain("updated");
  });
});
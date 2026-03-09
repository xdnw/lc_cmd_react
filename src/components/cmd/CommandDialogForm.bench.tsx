import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, bench, describe, vi } from "vitest";

import CommandDialogForm from "./CommandDialogForm";

vi.mock("./CommandComponent", () => ({
  default: ({ setOutput }: { setOutput: (key: string, value: string) => void }) => (
    <button type="button" onClick={() => setOutput("value", "updated")}>mock field update</button>
  ),
}));

vi.mock("./CommandActionButton", () => ({
  default: ({ args }: { args: Record<string, string> }) => (
    <div data-testid="mock-command-action">{JSON.stringify(args)}</div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("command dialog form render path", () => {
  bench("default form output update", () => {
    render(
      <CommandDialogForm
        commandPath={["settings", "info"]}
        initialValues={{ key: "example" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "mock field update" }));
    screen.getByTestId("mock-command-action");
  });
});
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, bench, describe, vi } from "vitest";

import CommandDialogForm from "./CommandDialogForm";

const handleBenchFieldUpdate = (setOutput: (key: string, value: string) => void) => {
  return () => {
    setOutput("value", "updated");
  };
};

vi.mock("./CommandComponent", () => ({
  default: ({ setOutput }: { setOutput: (key: string, value: string) => void }) => {
    const handleClick = handleBenchFieldUpdate(setOutput);
    return <button type="button" onClick={handleClick}>mock field update</button>;
  },
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
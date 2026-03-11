import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCharFrequency } from "@/utils/StringUtil";

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => React.ReactNode }) => (
    <div>{data.map((item, index) => <div key={index}>{itemContent(index, item)}</div>)}</div>
  ),
}));

vi.mock("@/components/ui/copytoclipboard", () => ({
  default: () => null,
}));

import CmdList from "./CmdList";

function createCommand(path: string, description: string) {
  const words = new Set(path.toLowerCase().split(/\s+/).filter(Boolean));
  return {
    name: path,
    command: { annotations: {}, viewable: true },
    getPathString: () => path,
    getDescShort: () => description,
    getArguments: () => [],
    getCharFrequency: () => getCharFrequency(path.toLowerCase()),
    getWordFrequency: () => words,
  };
}

describe("CmdList keyboard navigation", () => {
  it("keeps focus on launcher search while arrow keys change the active result", () => {
    render(
      <CmdList
        commands={[
          createCommand("alpha", "First command"),
          createCommand("beta", "Second command"),
          createCommand("gamma", "Third command"),
        ] as never[]}
        prefix="/"
        onSelectCommand={vi.fn()}
      />,
    );

    const search = screen.getByRole("combobox");
    search.focus();
    fireEvent.keyDown(search, { key: "ArrowDown" });

    const options = screen.getAllByRole("option");
    expect(document.activeElement).toBe(search);
    expect(search.getAttribute("aria-activedescendant")).toBe(options[1]?.getAttribute("id") ?? "");

    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(document.activeElement).toBe(search);
    expect(search.getAttribute("aria-activedescendant")).toBe(options[0]?.getAttribute("id") ?? "");
  });

  it("activates the active result from launcher search on Enter", () => {
    const onSelectCommand = vi.fn();

    render(
      <CmdList
        commands={[
          createCommand("alpha", "First command"),
          createCommand("beta", "Second command"),
        ] as never[]}
        prefix="/"
        onSelectCommand={onSelectCommand}
      />,
    );

    const search = screen.getByRole("combobox");
    search.focus();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(onSelectCommand).toHaveBeenCalledTimes(1);
    expect(onSelectCommand.mock.calls[0]?.[0]?.getPathString()).toBe("beta");
  });

  it("clears search first, then requires a second neutral Escape to close", () => {
    const onRequestClose = vi.fn();

    render(
      <CmdList
        commands={[
          createCommand("alpha", "First command"),
          createCommand("beta", "Second command"),
        ] as never[]}
        prefix="/"
        initialState={{
          query: "alpha",
          showFilters: false,
          filters: {
            triFilters: {},
            hasArgs: "0",
            rolesAny: "",
            requiredArgs: "",
          },
        }}
        onSelectCommand={vi.fn()}
        onRequestClose={onRequestClose}
        modalMode
      />,
    );

    const search = screen.getByRole("combobox");
    expect((search as HTMLInputElement).value).toBe("alpha");

    fireEvent.keyDown(search, { key: "Escape" });
    expect((search as HTMLInputElement).value).toBe("");
    expect(onRequestClose).not.toHaveBeenCalled();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.getByText(/Press Esc again to close the launcher/i)).toBeTruthy();
    expect(onRequestClose).not.toHaveBeenCalled();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});

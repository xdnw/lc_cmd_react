import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => React.ReactNode }) => (
    <div>{data.map((item, index) => <div key={index}>{itemContent(index, item)}</div>)}</div>
  ),
}));

vi.mock("../layout/DialogContext", () => ({
  useDialog: () => ({ showDialog: vi.fn() }),
}));

import ListComponent from "./ListComponent";

function buildOptions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    label: `Option ${index + 1}`,
    value: `option-${index + 1}`,
  }));
}

describe("ListComponent keyboard contract", () => {
  it("syncs a canonical single-select initial value back to the owner", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti={false}
        initialValue="Borg"
        setOutputValue={setOutputValue}
      />,
    );

    expect(setOutputValue).toHaveBeenCalledWith("nation", "borg");
  });

  it("syncs a canonical multi-select initial value order back to the owner", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti
        initialValue="Rose,Borg"
        setOutputValue={setOutputValue}
      />,
    );

    expect(setOutputValue).toHaveBeenCalledWith("nation", "rose,borg");
  });

  it("toggles all selections with Ctrl+A in multiselect when the search input is empty", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "a", ctrlKey: true });
    fireEvent.keyDown(input, { key: "a", ctrlKey: true });

    expect(setOutputValue).toHaveBeenNthCalledWith(1, "nation", "borg,rose");
    expect(setOutputValue).toHaveBeenNthCalledWith(2, "nation", "");
  });

  it("keeps multiselect helper buttons out of the tab order and advertises the shortcut", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti
        initialValue="borg"
        setOutputValue={setOutputValue}
      />,
    );

    const allButton = screen.getByRole("button", { name: /select all options/i });
    const clearButton = screen.getByRole("button", { name: /clear all selected options/i });
    const input = screen.getByRole("combobox");
    const descriptionId = input.getAttribute("aria-describedby");
    const description = descriptionId ? document.getElementById(descriptionId)?.textContent ?? "" : "";

    expect(allButton.getAttribute("tabindex")).toBe("-1");
    expect(allButton.getAttribute("title")).toMatch(/ctrl\+a|cmd\+a/i);
    expect(clearButton.getAttribute("tabindex")).toBe("-1");
    expect(description).toMatch(/ctrl\+a|cmd\+a/i);
  });

  it("keeps selected-chip remove buttons out of the tab order", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti
        initialValue="borg,rose"
        setOutputValue={setOutputValue}
      />,
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove (borg|rose)/i });
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons.every((button) => button.getAttribute("tabindex") === "-1")).toBe(true);
  });

  it("keeps Tab as focus traversal instead of selecting the highlighted option", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Bo" } });
    fireEvent.keyDown(input, { key: "Tab" });

    expect(setOutputValue).not.toHaveBeenCalled();
  });

  it("uses Enter to commit the highlighted option while the popup is open", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Bo" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(setOutputValue).toHaveBeenCalledWith("nation", "borg");
  });

  it("commits freeform values when custom options are allowed and no option matches", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="coalition"
        options={[
          { label: "spyops", value: "spyops" },
          { label: "allies", value: "allies" },
        ]}
        isMulti={false}
        initialValue=""
        allowCustomOption
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "SpyOps-2" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(setOutputValue).toHaveBeenCalledWith("coalition", "SpyOps-2");
  });

  it("waits for deferred-query loading to finish before committing freeform custom values", () => {
    const setOutputValue = vi.fn();
    const { rerender } = render(
      <ListComponent
        argName="coalition"
        options={[]}
        isMulti={false}
        initialValue=""
        allowCustomOption
        optionsArePrefiltered
        loadingOptions
        emptyMessage="Type 1+ characters to search 6,000 options."
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "SpyOps-2" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(setOutputValue).not.toHaveBeenCalled();

    rerender(
      <ListComponent
        argName="coalition"
        options={[]}
        isMulti={false}
        initialValue=""
        allowCustomOption
        optionsArePrefiltered
        loadingOptions={false}
        emptyMessage="No matching options."
        setOutputValue={setOutputValue}
      />,
    );

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });

    expect(setOutputValue).toHaveBeenCalledTimes(1);
    expect(setOutputValue).toHaveBeenCalledWith("coalition", "SpyOps-2");
  });

  it("preserves an initial freeform value when custom options are allowed", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="coalition"
        options={[
          { label: "spyops", value: "spyops" },
          { label: "allies", value: "allies" },
        ]}
        isMulti={false}
        initialValue="SpyOps-2"
        allowCustomOption
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    expect(input.getAttribute("placeholder")).toBe("SpyOps-2");
  });

  it("keeps the popup open while focus is moving into the portaled option list", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);

    const popupOption = screen.getByRole("option", { name: /borg/i });
    const popupShell = input.closest("[data-command-popup-open]");
    expect(popupShell).toBeTruthy();

    fireEvent.blur(popupShell as HTMLElement, { relatedTarget: popupOption });

    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("blurs the input when Escape is pressed after the popup is already closed", async () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
        ]}
        isMulti={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    await act(async () => {
      input.focus();
      fireEvent.keyDown(input, { key: "Escape" });
    });

    expect(input.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      fireEvent.keyDown(input, { key: "Escape" });
    });

    await waitFor(() => {
      expect(document.activeElement).not.toBe(input);
    });
  });

  it("uses active-descendant combobox semantics with Home and End navigation", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={[
          { label: "Borg", value: "borg" },
          { label: "Rose", value: "rose" },
          { label: "Alex", value: "alex" },
        ]}
        isMulti={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "o" } });
    fireEvent.keyDown(input, { key: "End" });

    const options = screen.getAllByRole("option");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[options.length - 1]?.getAttribute("id") ?? "");

    fireEvent.keyDown(input, { key: "Home" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0]?.getAttribute("id") ?? "");
  });

  it("supports PageDown and PageUp popup navigation through active-descendant updates", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="nation"
        options={buildOptions(12)}
        isMulti={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });

    const options = screen.getAllByRole("option");
    expect(input.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(input, { key: "PageDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[9]?.getAttribute("id") ?? "");

    fireEvent.keyDown(input, { key: "PageUp" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1]?.getAttribute("id") ?? "");
  });

  it("renders and searches option subtext when present", () => {
    const setOutputValue = vi.fn();

    render(
      <ListComponent
        argName="role"
        options={[
          { label: "MEMBER", value: "MEMBER", subtext: "Verified member access" },
          { label: "MILCOM", value: "MILCOM", subtext: "Alliance military command access" },
        ]}
        isMulti={false}
        initialValue=""
        setOutputValue={setOutputValue}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);

    expect(screen.getByText("Verified member access")).not.toBeNull();

    fireEvent.change(input, { target: { value: "military command" } });

    expect(screen.getByRole("option", { name: /milcom/i })).not.toBeNull();
    expect(screen.queryByRole("option", { name: /member/i })).toBeNull();
  });
});

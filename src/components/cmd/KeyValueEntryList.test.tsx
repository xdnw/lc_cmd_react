import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import KeyValueEntryList from "./KeyValueEntryList";

describe("KeyValueEntryList", () => {
  it("keeps existing entry removal reachable through the keyboard", () => {
    const onRemove = vi.fn();

    render(
      <KeyValueEntryList
        items={[{ key: "money", value: "12" }]}
        emptyText="No entries"
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByRole("button", { name: /remove money/i });
    expect(removeButton.tabIndex).toBe(0);

    removeButton.focus();
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith("money");
  });
});
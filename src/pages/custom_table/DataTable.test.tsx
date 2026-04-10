import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderTableCellValue, type RenderContext } from "./DataTable";

const showDialogMock = vi.fn();

vi.mock("@/components/layout/DialogContext", () => ({
  useDialog: () => ({
    showDialog: showDialogMock,
  }),
}));

describe("renderTableCellValue", () => {
  beforeEach(() => {
    showDialogMock.mockReset();
  });

  it("opens a copyable cell-value dialog for plain text cells", () => {
    const context: RenderContext = {
      row: ["Alpha Beta"],
      rowIdx: 0,
      column: {
        title: "Name",
        index: 0,
        source: "client",
      },
    };

    render(<>{renderTableCellValue("Alpha Beta", context)}</>);

    fireEvent.click(screen.getByRole("button", { name: /alpha beta/i }));

    expect(showDialogMock).toHaveBeenCalledTimes(1);
    expect(showDialogMock.mock.calls[0]?.[0]).toBe("Cell value");
  });

  it("opens a copyable cell-value dialog for string-valued custom renderers", () => {
    const context: RenderContext = {
      row: ["ignored"],
      rowIdx: 0,
      column: {
        title: "Status",
        index: 0,
        source: "client",
        render: {
          display: () => "Rendered value",
        },
      },
    };

    render(<>{renderTableCellValue("ignored", context)}</>);

    fireEvent.click(screen.getByRole("button", { name: /rendered value/i }));

    expect(showDialogMock).toHaveBeenCalledTimes(1);
    expect(showDialogMock.mock.calls[0]?.[0]).toBe("Cell value");
  });
});

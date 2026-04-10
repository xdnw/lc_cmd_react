/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PreparedDataTable } from "./PreparedDataTable";
import type { ConfigColumns } from "./DataTable";

vi.mock("./table_util", () => ({
  getStableConfigColumnId: (column: { columnId?: string; key?: string; index: number }) => column.columnId ?? column.key ?? `column:${column.index}`,
  ensureConfigColumnIds: (columnsInfo: Array<{ columnId?: string; key?: string; index: number }>) => columnsInfo.map((column) => ({
    ...column,
    columnId: column.columnId ?? column.key ?? `column:${column.index}`,
  })),
  createGenericColumnCustomizationItems: (columnsInfo: Array<{ title: string; key?: string; columnId?: string; index: number; source?: string }>) => columnsInfo.map((column) => ({
    id: column.columnId ?? column.key ?? `column:${column.index}`,
    source: column.source ?? "column",
    title: column.title,
    rawTitle: column.title,
    value: column.key,
    titleEditable: true,
    removable: true,
  })),
  applyGenericColumnCustomization: (
    columnsInfo: Array<{ title: string; key?: string; columnId?: string; index: number }>,
    items: Array<{ id: string; rawTitle?: string; title: string }>,
    availableColumnsInfo?: Array<{ title: string; key?: string; columnId?: string; index: number }>,
  ) => {
    const sourceColumns = availableColumnsInfo ?? columnsInfo;
    const columnsById = new Map(sourceColumns.map((column) => [column.columnId ?? column.key ?? `column:${column.index}`, column]));
    return items
      .map((item) => {
        const column = columnsById.get(item.id);
        return column ? {
          ...column,
          title: (item.rawTitle ?? item.title).trim() || column.title,
        } : null;
      })
      .filter(Boolean);
  },
}));

vi.mock("./DataTable", () => ({
  DataTable: function MockDataTable({
    columnsInfo,
    tableHeight,
  }: {
    columnsInfo: Array<{ title: string }>;
    tableHeight?: string;
  }) {
    return (
      <div data-testid="prepared-columns" data-table-height={tableHeight ?? "default"}>
        {columnsInfo.map((column) => column.title).join("|")}
      </div>
    );
  },
}));

vi.mock("./TableToolbar", () => ({
  TableToolbar: function MockTableToolbar({
    columnCustomization,
    leadingActions,
  }: {
    columnCustomization?: {
      items: Array<{ id: string }>;
      availableItems?: Array<{ id: string }>;
      onApply: (items: Array<{ id: string }>) => void;
    };
    leadingActions?: React.ReactNode;
  }) {
    const handleApply = () => {
      if (!columnCustomization) {
        return;
      }

      columnCustomization.onApply(columnCustomization.items.slice(0, 1));
    };

    const handleAddHiddenColumn = () => {
      if (!columnCustomization?.availableItems) {
        return;
      }

      const visibleIds = new Set(columnCustomization.items.map((item) => item.id));
      const hiddenItem = columnCustomization.availableItems.find((item) => !visibleIds.has(item.id));
      if (!hiddenItem) {
        return;
      }

      columnCustomization.onApply([...columnCustomization.items, hiddenItem]);
    };

    if (!columnCustomization && !leadingActions) {
      return null;
    }

    return (
      <div>
        {leadingActions}
        {columnCustomization ? (
          <button type="button" onClick={handleApply}>
            apply-customization
          </button>
        ) : null}
        {columnCustomization?.availableItems ? (
          <button type="button" onClick={handleAddHiddenColumn}>
            add-hidden-column
          </button>
        ) : null}
      </div>
    );
  },
}));

function createColumns(renderSuffix: string): ConfigColumns[] {
  return [
    {
      title: "First",
      index: 0,
      key: "first",
      source: "client",
      sortable: true,
      editable: false,
      draggable: false,
      render: {
        display: (value) => `${String(value)}-${renderSuffix}`,
      },
    },
    {
      title: "Second",
      index: 1,
      key: "second",
      source: "client",
      sortable: true,
      editable: false,
      draggable: false,
      render: {
        display: (value) => `${String(value)}-${renderSuffix}`,
      },
    },
  ];
}

describe("PreparedDataTable", () => {
  it("preserves customized columns when parent rerenders refresh render-function refs", () => {
    const { rerender } = render(
      <PreparedDataTable
        columnsInfo={createColumns("first")}
        data={[["a", "b"]]}
        showExports={false}
        showCustomize
      />,
    );

    expect(screen.getByTestId("prepared-columns").textContent).toBe("First|Second");

    fireEvent.click(screen.getByRole("button", { name: /apply-customization/i }));
    expect(screen.getByTestId("prepared-columns").textContent).toBe("First");

    rerender(
      <PreparedDataTable
        columnsInfo={createColumns("second")}
        data={[["a", "b"]]}
        showExports={false}
        showCustomize
      />,
    );

    expect(screen.getByTestId("prepared-columns").textContent).toBe("First");
  });

  it("passes toolbar leading actions through to the shared table toolbar", () => {
    render(
      <PreparedDataTable
        columnsInfo={createColumns("first")}
        data={[["a", "b"]]}
        showExports={false}
        showCustomize={false}
        toolbarLeadingActions={<button type="button">Select all rows</button>}
      />,
    );

    expect(screen.getByRole("button", { name: /select all rows/i })).toBeTruthy();
  });

  it("can fill the available height when used inside constrained layouts", () => {
    render(
      <PreparedDataTable
        columnsInfo={createColumns("first")}
        data={[["a", "b"]]}
        fillAvailableHeight
      />,
    );

    expect(screen.getByTestId("prepared-columns").getAttribute("data-table-height")).toBe("100%");
  });

  it("can re-add hidden columns from the shared customization catalog", () => {
    const { rerender } = render(
      <PreparedDataTable
        columnsInfo={createColumns("first")}
        data={[["a", "b"]]}
        showExports={false}
        showCustomize
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /apply-customization/i }));
    expect(screen.getByTestId("prepared-columns").textContent).toBe("First");

    fireEvent.click(screen.getByRole("button", { name: /add-hidden-column/i }));
    expect(screen.getByTestId("prepared-columns").textContent).toBe("First|Second");

    rerender(
      <PreparedDataTable
        columnsInfo={createColumns("second")}
        data={[["a", "b"]]}
        showExports={false}
        showCustomize
      />,
    );

    expect(screen.getByTestId("prepared-columns").textContent).toBe("First|Second");
  });
});

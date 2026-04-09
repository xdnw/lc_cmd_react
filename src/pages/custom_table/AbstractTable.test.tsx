/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useSuspenseQuery } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AbstractTableWithButtons, type TableProps } from "./AbstractTable";
import { BackendError } from "@/lib/queries";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useSuspenseQuery: vi.fn(),
  };
});

vi.mock("@/components/layout/DialogContext", () => ({
  useDialog: () => ({
    showDialog: vi.fn(),
  }),
}));

vi.mock("./table_util", () => {
  const toPlaceholderColumnId = (key: string) => `placeholder:${key}`;
  return {
    getQueryString: () => "type=Conflict",
    createTableInfo: (_table: unknown, sort: TableProps["sort"], columns: Map<string, string | null>) => {
      const entries = Array.from(columns.entries());
      return {
        data: entries.length > 0 ? [entries.map(([key]) => key)] : [],
        visibleColumns: entries.map((_, index) => index),
        searchSet: new Set<number>(),
        columnsInfo: entries.map(([key, alias], index) => ({
          title: alias ?? key,
          index,
          key,
          columnId: toPlaceholderColumnId(key),
          source: "placeholder" as const,
        })),
        errors: [],
        sort,
      };
    },
    toSelAndModifierString: (selection: Record<string, string>) => selection[""] ?? "*",
    formatColName: (value: string) => value,
    normalizePlaceholderColumnExpression: (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return "";
      }

      if (trimmed.includes("{") || trimmed.includes("}")) {
        return trimmed;
      }

      return `{${trimmed}}`;
    },
    remapSortByColumnIds: (sort: TableProps["sort"]) => sort,
    toPlaceholderColumnId,
    getConfigColumnId: (column: { columnId?: string; key?: string }) => column.columnId ?? (column.key ? toPlaceholderColumnId(column.key) : undefined),
  };
});

vi.mock("./DataTable", () => ({
  DataTable: function MockDataTable({ columnsInfo }: { columnsInfo: Array<{ title: string }> }) {
    return <div data-testid="data-table-columns">{columnsInfo.map((column) => column.title).join("|")}</div>;
  },
}));

vi.mock("./TableToolbar", () => ({
  TableToolbar: function MockTableToolbar({ columnCustomization }: { columnCustomization?: { items: Array<unknown>; onApply: (items: unknown[]) => void } }) {
    const handleApply = () => {
      if (!columnCustomization) {
        return;
      }

      columnCustomization.onApply(columnCustomization.items.slice(0, 1));
    };

    return (
      <div>
        {columnCustomization ? (
          <button
            type="button"
            onClick={handleApply}
          >
            apply-customization
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock("./TableWithExports", () => ({
  GoogleSheets: () => null,
}));

const mockedUseSuspenseQuery = vi.mocked(useSuspenseQuery);

function createTableProps({ rowSelection }: { rowSelection?: TableProps["rowSelection"] } = {}): TableProps {
  return {
    type: "Conflict",
    selection: { "": "*" },
    columns: new Map([
      ["{getid}", "ID"],
      ["{getname}", "Name"],
    ]),
    sort: undefined,
    rowSelection,
  };
}

function createRowSelection(tag: string): NonNullable<TableProps["rowSelection"]> {
  return {
    getRowId: () => null,
    selectedIds: new Set(),
    onSelectedIdsChange: () => undefined,
    debugTagPrefix: tag,
  };
}

function renderSubject(getTableProps: () => TableProps = createTableProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AbstractTableWithButtons load getTableProps={getTableProps} />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    ...rendered,
    queryClient,
  };
}

describe("AbstractTableWithButtons", () => {
  beforeEach(() => {
    mockedUseSuspenseQuery.mockImplementation(() => {
      throw new BackendError("manager is null");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    mockedUseSuspenseQuery.mockReset();
    vi.restoreAllMocks();
  });

  it("renders an inline retryable backend error instead of crashing the route", () => {
    renderSubject();

    expect(screen.getByRole("alert").textContent).toContain("BackendError: manager is null");
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
    expect(screen.queryByText(/Reset cached app data/i)).toBeNull();
  });

  it("preserves customized columns when load-mode parents rerender with new chrome props", async () => {
    mockedUseSuspenseQuery.mockReturnValue({
      data: { data: { cells: [], errors: [] } },
    } as never);

    const firstSelection = createRowSelection("first");
    const secondSelection = createRowSelection("second");
    const firstGetTableProps = () => createTableProps({ rowSelection: firstSelection });
    const secondGetTableProps = () => createTableProps({ rowSelection: secondSelection });
    const { queryClient, rerender } = renderSubject(firstGetTableProps);

    expect(screen.getByTestId("data-table-columns").textContent).toBe("ID|Name");

    fireEvent.click(screen.getByRole("button", { name: /apply-customization/i }));
    await waitFor(() => {
      expect(screen.getByTestId("data-table-columns").textContent).toBe("ID");
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AbstractTableWithButtons load getTableProps={secondGetTableProps} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("data-table-columns").textContent).toBe("ID");
    });
  });
});

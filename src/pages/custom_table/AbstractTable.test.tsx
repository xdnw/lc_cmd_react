import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useSuspenseQuery } from "@tanstack/react-query";
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

vi.mock("./table_util", () => ({
  getQueryString: () => "type=Conflict",
  createTableInfo: () => ({
    data: [],
    visibleColumns: [],
    searchSet: new Set<number>(),
    columnsInfo: [],
    errors: [],
    sort: undefined,
  }),
  toSelAndModifierString: () => "*",
}));

vi.mock("./DataTable", () => ({
  DataTable: () => null,
}));

vi.mock("./TableWithExports", () => ({
  GoogleSheets: () => null,
}));

const mockedUseSuspenseQuery = vi.mocked(useSuspenseQuery);

function createTableProps(): TableProps {
  return {
    type: "Conflict",
    selection: { "": "*" },
    columns: new Map([["id", null]]),
    sort: undefined,
  };
}

function renderSubject() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AbstractTableWithButtons load getTableProps={createTableProps} />
    </QueryClientProvider>
  );
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
});

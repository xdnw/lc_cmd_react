import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";
import { getExpressionExample, getExpressionTypeSchema, getExpressionValueSourceRef } from "./expression/expressionSchema";
import type { ExpressionValueSourceRegistry } from "./expression/expressionValueFetcher";
import { getPlaceholderExpressionDescriptor } from "./expression/expressionTypes";
import PlaceholderExpressionInput from "./PlaceholderExpressionInput";
import * as expressionValueFetcher from "./expression/expressionValueFetcher";

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

function mockExpressionSources(registry: ExpressionValueSourceRegistry) {
  vi.spyOn(expressionValueFetcher, "useExpressionValueSources").mockReturnValue(registry);
}

describe("PlaceholderExpressionInput", () => {
  it("builds schema data from generated placeholder metadata", () => {
    const schema = getExpressionTypeSchema("DBNation");

    expect(schema?.selectors.some((selector) => selector.insertText === "nation:")).toBe(true);
    expect(schema?.filterFields.some((field) => field.key === "#vm_turns")).toBe(true);
    expect(schema?.membersByName.getalliance.returnType).toBe("DBAlliance");
  });

  it("derives examples from descriptor and schema metadata", () => {
    const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, "TypedFunction<DBNation,String>"));

    expect(descriptor).not.toBeNull();
    expect(getExpressionExample(descriptor!, getExpressionTypeSchema(descriptor!.rootType))).toContain("{");
  });

  it("replaces mid-text member prefixes with whole-block completions", async () => {
    const setOutputValue = vi.fn();

    await act(async () => {
      renderWithQueryClient(
        <PlaceholderExpressionInput
          argName="value"
          initialValue="prefix {getalliance.getna} suffix"
          setOutputValue={setOutputValue}
          breakdown={getTypeBreakdown(CM, "TypedFunction<DBNation,String>")}
        />,
      );
    });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(
        textarea.value.indexOf("getna") + "getna".length,
        textarea.value.indexOf("getna") + "getna".length,
      );
      fireEvent.select(textarea);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "getname" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("prefix {getalliance.getname} suffix");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "prefix {getalliance.getname} suffix");
  });

  it("completes a missing closing brace when inserting a suggestion", async () => {
    const setOutputValue = vi.fn();

    await act(async () => {
      renderWithQueryClient(
        <PlaceholderExpressionInput
          argName="value"
          initialValue="prefix {getalliance.getna"
          setOutputValue={setOutputValue}
          breakdown={getTypeBreakdown(CM, "TypedFunction<DBNation,String>")}
        />,
      );
    });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      fireEvent.select(textarea);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "getname" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("prefix {getalliance.getname}");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "prefix {getalliance.getname}");
  });

  it("renders metadata-derived placeholder text", () => {
    const setOutputValue = vi.fn();

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue=""
        setOutputValue={setOutputValue}
        breakdown={getTypeBreakdown(CM, "TypedFunction<DBNation,Double>")}
      />,
    );

    expect(screen.getByPlaceholderText(/Example:/)).toBeTruthy();
  });

  it("stays idle for empty values until the field is focused", async () => {
    const useExpressionValueSourcesSpy = vi.spyOn(expressionValueFetcher, "useExpressionValueSources");
    useExpressionValueSourcesSpy.mockReturnValue({});

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue=""
        setOutputValue={vi.fn()}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    expect(useExpressionValueSourcesSpy).toHaveBeenLastCalledWith([], {}, false);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(0, 0);
      fireEvent.select(textarea);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(useExpressionValueSourcesSpy).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ kind: "placeholder" }),
      ]),
      {},
      true,
    );
  });

  it("does not auto-open empty suggestions on focus until the user interacts", async () => {
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: [
          { label: "Borg", value: "Borg" },
        ],
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue=""
        setOutputValue={vi.fn()}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const input = screen.getByRole("textbox") as HTMLInputElement;
    await act(async () => {
      fireEvent.focus(input);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByText(/Accept: Ctrl\+Right \/ Ctrl\+Enter/i)).toBeNull();
    expect(screen.queryByRole("option", { name: "nation:" })).toBeNull();

    await act(async () => {
      fireEvent.click(input);
      input.setSelectionRange(0, 0);
      fireEvent.select(input);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/Accept: Ctrl\+Right \/ Ctrl\+Enter/i)).toBeTruthy();
    expect(screen.getByRole("option", { name: "nation:" })).toBeTruthy();
  });

  it("shows selector completions and query-backed option completions at the root", async () => {
    const setOutputValue = vi.fn();
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: [
          { label: "Borg", value: "Borg", aliases: ["189573"] },
          { label: "Rose", value: "Rose" },
        ],
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:Bo"
        setOutputValue={setOutputValue}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      fireEvent.select(textarea);
    });

    expect(screen.getByRole("option", { name: "Borg" })).toBeTruthy();
    expect(screen.getByText(/Type to match Nation options/i)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "Borg" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("nation:Borg");
  });

  it("accepts the first suggestion on Ctrl+RightArrow without consuming Tab", async () => {
    const setOutputValue = vi.fn();
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: [
          { label: "Borg", value: "Borg", aliases: ["189573"] },
          { label: "Rose", value: "Rose" },
        ],
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:Bo"
        setOutputValue={setOutputValue}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const input = screen.getByRole("textbox") as HTMLInputElement;
    await act(async () => {
      fireEvent.focus(input);
      input.setSelectionRange(input.value.length, input.value.length);
      fireEvent.select(input);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByRole("option", { name: "Borg" })).toBeTruthy();
    expect(screen.getByText(/Accept: Ctrl\+Right \/ Ctrl\+Enter/i)).toBeTruthy();
    expect(screen.queryByText(/receiver: DBNation/i)).toBeNull();

    fireEvent.keyDown(input, { key: "Tab" });
    expect(input.value).toBe("nation:Bo");

    fireEvent.keyDown(input, { key: "ArrowRight", ctrlKey: true });
    expect(input.value).toBe("nation:Borg");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "nation:Borg");
  });

  it("tracks the active suggestion with aria-activedescendant and arrow navigation from the expression field", async () => {
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: [
          { label: "Borg", value: "Borg" },
          { label: "Rose", value: "Rose" },
        ],
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:"
        setOutputValue={vi.fn()}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const input = screen.getByRole("textbox", { name: "" }) as HTMLInputElement;
    await act(async () => {
      fireEvent.focus(input);
      input.setSelectionRange(input.value.length, input.value.length);
      fireEvent.select(input);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-activedescendant")).toContain("option-Borg");
    expect(screen.getByRole("option", { name: "Borg" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(input.getAttribute("aria-activedescendant")).toContain("option-Rose");
    expect(screen.getByRole("option", { name: "Rose" }).getAttribute("aria-selected")).toBe("true");
  });

  it("supports searching large suggestion sets without collapsing the panel", async () => {
    const setOutputValue = vi.fn();
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: Array.from({ length: 120 }, (_, index) => {
          const value = `Nation ${String(index).padStart(3, "0")}`;
          return { label: value, value };
        }),
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:"
        setOutputValue={setOutputValue}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "" }) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      fireEvent.select(textarea);
    });

    const searchInput = screen.getByRole("combobox", { name: "Search suggestions" });

    await act(async () => {
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: "Nation 119" } });
    });

    expect(screen.getByText("1 / 120")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /Nation 119/i }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("nation:Nation 119");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "nation:Nation 119");
  });

  it("closes suggestions on Escape, then blurs the expression input on the next Escape", async () => {
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: [
          { label: "Borg", value: "Borg" },
          { label: "Rose", value: "Rose" },
        ],
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:"
        setOutputValue={vi.fn()}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const input = screen.getByRole("textbox") as HTMLInputElement;
    const popupShell = input.closest("[data-command-popup-open]") as HTMLElement;

    await act(async () => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      fireEvent.select(input);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByRole("option", { name: "Borg" })).toBeTruthy();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("option", { name: "Borg" })).toBeNull();
    expect(popupShell.getAttribute("data-command-popup-open")).toBe("false");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(document.activeElement).not.toBe(input);
  });

  it("dismisses the suggestion-panel search on Escape and returns focus to the expression input", async () => {
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: Array.from({ length: 80 }, (_, index) => {
          const value = `Nation ${String(index).padStart(3, "0")}`;
          return { label: value, value };
        }),
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:"
        setOutputValue={vi.fn()}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const input = screen.getByRole("textbox") as HTMLInputElement;
    await act(async () => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      fireEvent.select(input);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const searchInput = screen.getByRole("combobox", { name: "Search suggestions" }) as HTMLInputElement;
    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: "Escape" });

    expect(screen.queryByRole("combobox", { name: "Search suggestions" })).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it("uses the panel search text as the worker fetch token for lazy query sources", async () => {
    const setOutputValue = vi.fn();
    const useExpressionValueSourcesSpy = vi.spyOn(expressionValueFetcher, "useExpressionValueSources");
    useExpressionValueSourcesSpy.mockImplementation((requests, searchTokensByCacheKey = {}) => {
      const querySource = requests.find((request) => request.kind === "query-options");
      const placeholderSource = requests.find((request) => request.kind === "placeholder");

      return {
        ...(placeholderSource ? {
          [placeholderSource.cacheKey]: {
            status: "ready",
            sourceKind: "placeholder",
            typeLabel: "Nation",
            options: [],
          },
        } : {}),
        ...(querySource ? {
          [querySource.cacheKey]: {
            status: "ready",
            sourceKind: "query-options",
            typeLabel: "Nation",
            options: searchTokensByCacheKey[querySource.cacheKey]
              ? [{ label: searchTokensByCacheKey[querySource.cacheKey], value: searchTokensByCacheKey[querySource.cacheKey] }]
              : [],
            optionCount: 14988,
            workerDatasetId: querySource.cacheKey,
            hasAnyMatch: true,
            hasExactMatch: false,
          },
        } : {}),
      } satisfies ExpressionValueSourceRegistry;
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:b"
        setOutputValue={setOutputValue}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "" }) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      fireEvent.select(textarea);
    });

    const searchInput = screen.getByRole("combobox", { name: "Search suggestions" });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Nation 119" } });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(useExpressionValueSourcesSpy).toHaveBeenLastCalledWith(
      expect.any(Array),
      { "query:DBNation": "Nation 119" },
      true,
    );
    expect(screen.getByRole("option", { name: /Nation 119/i })).toBeTruthy();
  });

  it("shows the lazy search prompt immediately for very large query-backed sources", async () => {
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: [],
        optionCount: 14988,
        workerDatasetId: "query:DBNation",
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="nation:"
        setOutputValue={vi.fn()}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "" }) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      fireEvent.select(textarea);
    });

    expect(screen.getByText(/Type 1\+ characters to search 14,988 options\./i)).toBeTruthy();
  });

  it("shows explicit invalid selector feedback instead of a generic valid hint", async () => {
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "query:DBNation": {
        status: "ready",
        sourceKind: "query-options",
        typeLabel: "Nation",
        options: [
          { label: "Borg", value: "Borg" },
        ],
      },
    });

    renderWithQueryClient(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="totallymadeupselector"
        setOutputValue={vi.fn()}
        breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
      />,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      fireEvent.select(textarea);
    });

    expect(screen.getByText(/Unrecognized selector or option/i)).toBeTruthy();
  });

  it("preserves the closing bracket when completing an empty RHS map key", async () => {
    const setOutputValue = vi.fn();
    const mapKeySource = getExpressionValueSourceRef("Map<ResourceType, Double>");
    mockExpressionSources({
      "placeholder:DBNation": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Nation",
        options: [],
      },
      "placeholder:DBCity": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "City",
        options: [],
      },
      [mapKeySource.cacheKey]: {
        status: "ready",
        sourceKind: "map-key-options",
        typeLabel: "ResourceType key",
        options: [
          { label: "MONEY", value: "MONEY" },
        ],
      },
    });

    await act(async () => {
      renderWithQueryClient(
        <PlaceholderExpressionInput
          argName="value"
          initialValue="*,#score>#getCity(1).getRevenue()[]"
          setOutputValue={setOutputValue}
          breakdown={getTypeBreakdown(CM, "Set<DBNation>")}
        />,
      );
    });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    const cursor = textarea.value.indexOf("]");
    await act(async () => {
      fireEvent.focus(textarea);
      textarea.setSelectionRange(cursor, cursor);
      fireEvent.select(textarea);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "MONEY" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("*,#score>#getCity(1).getRevenue()[MONEY]");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "*,#score>#getCity(1).getRevenue()[MONEY]");
  });
});
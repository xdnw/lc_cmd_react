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
      fireEvent.click(screen.getByRole("button", { name: "getname" }));
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
      fireEvent.click(screen.getByRole("button", { name: "getname" }));
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

    expect(screen.getByRole("button", { name: "Borg" })).toBeTruthy();
    expect(screen.getByText(/Type to match Nation options/i)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Borg" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("nation:Borg");
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
      fireEvent.click(screen.getByRole("button", { name: "MONEY" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("*,#score>#getCity(1).getRevenue()[MONEY]");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "*,#score>#getCity(1).getRevenue()[MONEY]");
  });
});
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";
import { analyzeExpression } from "./expression/expressionAnalysis";
import { getExpressionTypeSchema } from "./expression/expressionSchema";
import { getExpressionInputConfig } from "./expression/expressionTypes";
import PlaceholderExpressionInput from "./PlaceholderExpressionInput";

describe("PlaceholderExpressionInput", () => {
  it("builds schema data from generated placeholder metadata", () => {
    const schema = getExpressionTypeSchema("DBNation");

    expect(schema?.selectors.some((selector) => selector.insertText === "nation:")).toBe(true);
    expect(schema?.filterFields.some((field) => field.key === "#vm_turns")).toBe(true);
    expect(schema?.membersByName.getalliance.returnType).toBe("DBAlliance");
  });

  it("suggests nested placeholder members inside brace expressions", () => {
    const config = getExpressionInputConfig(getTypeBreakdown(CM, "TypedFunction<DBNation,String>"));
    const value = "prefix {getalliance.getna} suffix";
    const cursor = value.indexOf("getna") + "getna".length;
    const analysis = analyzeExpression(config!, value, cursor);

    expect(analysis.suggestions.some((suggestion) => suggestion.label === "getname")).toBe(true);
    expect(analysis.errors).toHaveLength(0);
  });

  it("suggests filter fields within predicate arguments", () => {
    const config = getExpressionInputConfig(getTypeBreakdown(CM, "TypedFunction<DBNation,Double>"));
    const value = "{getactivewarswith(filter:#vm_)}";
    const cursor = value.indexOf("#vm_") + "#vm_".length;
    const analysis = analyzeExpression(config!, value, cursor);

    expect(analysis.suggestions.some((suggestion) => suggestion.label === "#vm_turns")).toBe(true);
    expect(analysis.hint?.meta).toContain("Predicate<DBNation>");
  });

  it("replaces mid-text member prefixes with whole-block completions", async () => {
    const setOutputValue = vi.fn();

    render(
      <PlaceholderExpressionInput
        argName="value"
        initialValue="prefix {getalliance.getna} suffix"
        setOutputValue={setOutputValue}
        breakdown={getTypeBreakdown(CM, "TypedFunction<DBNation,String>")}
      />,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.focus(textarea);
    textarea.setSelectionRange(
      textarea.value.indexOf("getna") + "getna".length,
      textarea.value.indexOf("getna") + "getna".length,
    );
    fireEvent.select(textarea);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "getname" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea.value).toBe("prefix {getalliance.getname} suffix");
    expect(setOutputValue).toHaveBeenLastCalledWith("value", "prefix {getalliance.getname} suffix");
  });
});
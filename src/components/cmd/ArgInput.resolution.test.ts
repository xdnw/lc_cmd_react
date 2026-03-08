import { describe, expect, it } from "vitest";

import { parseMapString } from "@/utils/MapParser";
import { CM, getTypeBreakdown } from "@/utils/Command";
import { resolveArgInput } from "./argInputMetadata";

describe("ArgInput resolution", () => {
  it("treats missing map text as empty input", () => {
    expect(parseMapString(undefined)).toBeNull();
    expect(parseMapString(null)).toBeNull();
    expect(parseMapString("   ")).toBeNull();
  });

  it("keeps List inputs aligned with Set", () => {
    const listBreakdown = getTypeBreakdown(CM, "List<String>");
    const setBreakdown = getTypeBreakdown(CM, "Set<String>");

    expect(listBreakdown.getOptionData().multi).toBe(true);
    expect(resolveArgInput(listBreakdown)).toMatchObject({
      kind: resolveArgInput(setBreakdown).kind,
      componentName: resolveArgInput(setBreakdown).componentName,
    });
  });

  it("routes placeholder expression families to the shared expression input", () => {
    const types = [
      "Set<DBNation>",
      "Predicate<DBNation>",
      "TypedFunction<DBNation,String>",
      "TypedFunction<DBNation,Double>",
    ];

    for (const type of types) {
      expect(resolveArgInput(getTypeBreakdown(CM, type))).toMatchObject({
        kind: "placeholder-expression",
        componentName: "PlaceholderExpressionInput",
      });
    }
  });

  it("keeps static-option sets on static option inputs instead of placeholder expressions", () => {
    expect(resolveArgInput(getTypeBreakdown(CM, "Set<AttackType>"))).toMatchObject({
      kind: "static-options",
      componentName: "ListComponentOptions",
    });
  });
});

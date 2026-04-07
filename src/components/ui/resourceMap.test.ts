import { describe, expect, it } from "vitest";

import { formatResourceMapText, parseResourceMap } from "./resourceMap";

describe("resourceMap", () => {
  it("formats object-backed resource maps", () => {
    expect(formatResourceMapText({ money: 1, food: 2, coal: 0 })).toBe("{money=1,food=2}");
  });

  it("formats array-backed resource maps when resource keys are provided", () => {
    expect(formatResourceMapText([1234, 0, 5678.5], { resourceKeys: ["money", "credits", "food"] })).toBe("{money=1234,food=5678.5}");
  });

  it("parses array-backed resource maps when resource keys are provided", () => {
    expect(parseResourceMap([0, 50, 0, 2], { resourceKeys: ["money", "credits", "food", "coal"] })).toEqual({ credits: 50, coal: 2 });
  });
});

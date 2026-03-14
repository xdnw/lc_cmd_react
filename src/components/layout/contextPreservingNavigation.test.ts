import { describe, expect, it } from "vitest";

import {
  buildContextPreservedTo,
  getSafeReturnTo,
} from "@/components/layout/contextPreservingNavigation";

describe("buildContextPreservedTo", () => {
  it("preserves only the requested search params when the target does not already define them", () => {
    const result = buildContextPreservedTo({
      to: "/records?view=compact",
      currentSearch: "?page=3&scope=all&ignored=nope",
      preserveSearchParams: ["page", "scope"],
      hasGuild: true,
    });

    expect(result).toEqual({
      pathname: "/records",
      search: "?view=compact&page=3&scope=all",
    });
  });

  it("lets explicit target and additional params override preserved values", () => {
    const result = buildContextPreservedTo({
      to: "/commands?q=existing",
      currentSearch: "?q=current&scope=all",
      preserveSearchParams: ["q", "scope"],
      additionalSearchParams: {
        q: "replacement",
        scope: ["guild", "alliance"],
      },
      hasGuild: true,
    });

    expect(result).toEqual({
      pathname: "/commands",
      search: "?q=replacement&scope=guild&scope=alliance",
    });
  });

  it("routes through guild select when a guild is required but missing", () => {
    const result = buildContextPreservedTo({
      to: "/balance?tab=summary",
      currentSearch: "?scope=all",
      preserveSearchParams: ["scope"],
      requireGuild: true,
      hasGuild: false,
    });

    expect(result).toEqual({
      pathname: "/guild_select",
      search: "?returnTo=%2Fbalance%3Ftab%3Dsummary%26scope%3Dall",
    });
  });
});

describe("getSafeReturnTo", () => {
  it("accepts internal absolute paths", () => {
    expect(getSafeReturnTo("/records?page=2")).toBe("/records?page=2");
  });

  it("rejects protocol-relative or external destinations", () => {
    expect(getSafeReturnTo("//example.com")).toBeNull();
    expect(getSafeReturnTo("https://example.com")).toBeNull();
    expect(getSafeReturnTo("records?page=2")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { CMD_BROWSER_SEARCH_PARAM_KEYS } from "@/components/cmd/cmdBrowserState";

import { buildRecentPageCacheKey } from "./RecentPageKeepAlive";

describe("buildRecentPageCacheKey", () => {
  const commandBrowserPolicy = {
    mode: "recent" as const,
    ignoredSearchParams: CMD_BROWSER_SEARCH_PARAM_KEYS,
  };

  it("treats command browser url state as the same cached page", () => {
    expect(buildRecentPageCacheKey("/commands", "", commandBrowserPolicy)).toBe(
      buildRecentPageCacheKey(
        "/commands",
        "?q=alpha&filters=1&hasArgs=1&roles=member&requiredArgs=user&tri_role=1",
        commandBrowserPolicy,
      ),
    );
  });

  it("still includes unrelated search params in the cache identity", () => {
    expect(buildRecentPageCacheKey("/commands", "", commandBrowserPolicy)).not.toBe(
      buildRecentPageCacheKey("/commands", "?view=compact", commandBrowserPolicy),
    );
  });
});
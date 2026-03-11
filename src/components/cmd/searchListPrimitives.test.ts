import { describe, expect, it } from "vitest";

import { getSearchListKeyboardAction } from "./searchListPrimitives";

describe("getSearchListKeyboardAction", () => {
  it("wraps ArrowUp from the first item when enabled", () => {
    expect(getSearchListKeyboardAction({
      key: "ArrowUp",
      itemCount: 3,
      activeIndex: 0,
      hasQuery: false,
      pageSize: 10,
      wrapArrowUp: true,
    })).toEqual({ type: "move", nextIndex: 2, align: "end" });
  });

  it("wraps ArrowDown from the last item when enabled", () => {
    expect(getSearchListKeyboardAction({
      key: "ArrowDown",
      itemCount: 3,
      activeIndex: 2,
      hasQuery: false,
      pageSize: 10,
      wrapArrowDown: true,
    })).toEqual({ type: "move", nextIndex: 0, align: "start" });
  });
});
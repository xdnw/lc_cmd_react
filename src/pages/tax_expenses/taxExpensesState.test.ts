import { describe, expect, it } from "vitest";

import {
  TAX_EXPENSE_DEFAULT_START,
  TAX_EXPENSE_TIME_DEFAULT_FILTERS,
  applySeriesTransform,
  buildSummaryEndpointArgs,
  buildSummaryFilterBadges,
  buildTaxExpenseTimeGraph,
  buildTimeFilterBadges,
  detectTaxExpenseTimeFormat,
  formatBracketMeta,
  formatBracketTitle,
  formatResourceCopyMap,
  parseTaxExpenseSummaryFilters,
  parseTaxExpenseTimeFilters,
  writeTaxExpenseSummaryFilters,
  writeTaxExpenseTimeFilters,
} from "./taxExpensesState";

describe("taxExpensesState", () => {
  it("defaults start to 30d when the route leaves it unset", () => {
    expect(parseTaxExpenseSummaryFilters(new URLSearchParams())).toEqual({
      start: TAX_EXPENSE_DEFAULT_START,
    });

    expect(parseTaxExpenseTimeFilters(new URLSearchParams())).toEqual({
      ...TAX_EXPENSE_TIME_DEFAULT_FILTERS,
    });
  });

  it("parses summary filters from route search params", () => {
    const searchParams = new URLSearchParams("start=2026-04-01&end=2026-04-05&nationList=AA%3ARose&dontRequireTagged=1&includeDeposits=1");

    expect(parseTaxExpenseSummaryFilters(searchParams)).toEqual({
      start: "2026-04-01",
      end: "2026-04-05",
      nationList: "AA:Rose",
      dontRequireTagged: "1",
      includeDeposits: "1",
    });
  });

  it("writes summary filters without leaving stale alternate selector keys", () => {
    const searchParams = new URLSearchParams("nationFilter=old");
    const next = writeTaxExpenseSummaryFilters(searchParams, {
      start: TAX_EXPENSE_DEFAULT_START,
      end: "2026-04-05",
      nationList: "AA:Rose",
      dontRequireGrant: "True",
      dontRequireExpiry: "1",
    });

    expect(next.toString()).toBe("end=2026-04-05&nationList=AA%3ARose&dontRequireGrant=True&dontRequireExpiry=1");
  });

  it("keeps summary endpoint args in their serialized endpoint format", () => {
    expect(buildSummaryEndpointArgs({
      start: "timestamp:1775001600000",
      end: "timestamp:1775433599999",
      nationList: "AA:Rose",
      dontRequireTagged: "True",
      includeDeposits: "True",
    })).toEqual({
      start: "timestamp:1775001600000",
      end: "timestamp:1775433599999",
      nationList: "AA:Rose",
      dontRequireTagged: "True",
      includeDeposits: "True",
    });
  });

  it("parses and writes by-time filters with chart settings", () => {
    const parsed = parseTaxExpenseTimeFilters(new URLSearchParams("nationList=%2A&chartMode=moving-average&movingAverageWindow=9"));
    expect(parsed).toEqual({
      ...TAX_EXPENSE_TIME_DEFAULT_FILTERS,
      nationFilter: "*",
      chartMode: "moving-average",
      movingAverageWindow: 9,
    });

    const next = writeTaxExpenseTimeFilters(new URLSearchParams("nationFilter=old"), parsed);
    expect(next.toString()).toBe("nationList=*&chartMode=moving-average&movingAverageWindow=9");
  });

  it("computes cumulative and moving-average series client-side", () => {
    const base = [[1, 2, 3], [6, 3, 0]];

    expect(applySeriesTransform(base, "moving-average", 1)).toEqual(base);
    expect(applySeriesTransform(base, "cumulative", 3)).toEqual([[1, 3, 6], [6, 9, 9]]);
    expect(applySeriesTransform(base, "moving-average", 2)).toEqual([[1, 1.5, 2.5], [6, 4.5, 1.5]]);
  });

  it("omits redundant window badges and keeps filter badges concise", () => {
    expect(buildSummaryFilterBadges({
      start: "2026-04-01",
      end: "2026-04-05",
      nationList: "AA:Rose",
      includeDeposits: "1",
    })).toEqual(["Scope AA:Rose", "Include deposits"]);

    expect(buildTimeFilterBadges({
      ...TAX_EXPENSE_TIME_DEFAULT_FILTERS,
      nationFilter: "AA:Rose",
      chartMode: "moving-average",
      movingAverageWindow: 7,
    })).toEqual(["Scope AA:Rose", "Moving avg 7"]);
  });

  it("formats bracket titles and rates without repeating the tax id", () => {
    expect(formatBracketTitle(21223, {
      taxId: 21223,
      dateFetched: 0,
      allianceId: 9,
      name: "Default",
      moneyRate: 35,
      rssRate: 35,
    })).toBe("Default");

    expect(formatBracketMeta({
      taxId: 21223,
      dateFetched: 0,
      allianceId: 9,
      name: "Default",
      moneyRate: 35,
      rssRate: 35,
    })).toBe("35/35");
  });

  it("detects turn-based timestamps and builds graphs with the correct time format", () => {
    expect(detectTaxExpenseTimeFormat([12, 24, 36])).toBe("TURN_TO_DATE");

    expect(buildTaxExpenseTimeGraph({
      title: "Total",
      timestamps: [12, 24, 36],
      categories: [{ name: "Food", expense: false }],
      series: [[1, 2, 3]],
      mode: "cumulative",
      movingAverageWindow: 1,
    })).toEqual(expect.objectContaining({
      time_format: "TURN_TO_DATE",
    }));
  });

  it("formats raw resource copy maps without zero-value entries", () => {
    expect(formatResourceCopyMap([1234, 0, 5678.5])).toBe("{money=1234,food=5678.5}");
  });
});

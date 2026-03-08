/* eslint-disable */
// @ts-nocheck
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { describe, expect, it } from "vitest";

import { CM, getTypeBreakdown } from "@/utils/Command";
import { analyzeExpression, parseExpressionCursorContext } from "./expression/expressionAnalysis";
import { getPlaceholderExpressionDescriptor } from "./expression/expressionTypes";
import type { ExpressionValueSourceRegistry } from "./expression/expressionValueFetcher";

type ReportStatus = "pass" | "fail";

type ReportEntry = {
  name: string;
  type: string;
  value: string;
  cursorToken: string;
  expectedSuggestion: string;
  status: ReportStatus;
  mode: string;
  receiverType: string;
  sourceKind?: string;
  suggestions: string[];
  hintTitle?: string;
  hintMeta?: string;
  errors: string[];
};

type Report = {
  generatedAt: string;
  summary: {
    total: number;
    passing: number;
    failing: number;
  };
  entries: ReportEntry[];
};

const REPORT_PATH = resolve("test-results", "placeholder-expression.report.json");
const REPORT_MD_PATH = resolve("test-results", "placeholder-expression.report.md");
const FIXED_GENERATED_AT = "2026-03-08T12:00:00.000Z";

const CASES = [
  {
    name: "set selector suggestions",
    type: "Set<DBNation>",
    value: "nat",
    cursorToken: "nat",
    expectedSuggestion: "nation:",
    registry: {},
  },
  {
    name: "predicate filter suggestions",
    type: "Predicate<DBNation>",
    value: "nation:Borg,#vm_",
    cursorToken: "#vm_",
    expectedSuggestion: "#vm_turns",
    registry: {},
  },
  {
    name: "function string member suggestions",
    type: "TypedFunction<DBNation,String>",
    value: "prefix {getalliance.getna} suffix",
    cursorToken: "getna",
    expectedSuggestion: "getname",
    registry: {
      "placeholder:DBAlliance": {
        status: "ready",
        sourceKind: "placeholder",
        typeLabel: "Alliance",
        options: [],
      },
    } satisfies ExpressionValueSourceRegistry,
  },
  {
    name: "function numeric map key suggestions",
    type: "TypedFunction<DBCity,Double>",
    value: "{getrevenue.fo}",
    cursorToken: "fo",
    expectedSuggestion: "FOOD",
    registryFactory: (cacheKey: string) => ({
      [cacheKey]: {
        status: "ready",
        sourceKind: "map-key-options",
        typeLabel: "ResourceType key",
        options: [
          { label: "FOOD", value: "FOOD", aliases: ["food"] },
          { label: "COAL", value: "COAL", aliases: ["coal"] },
        ],
      },
    }),
  },
] as const;

function toMarkdownReport(report: Report): string {
  const lines = [
    "# Placeholder Expression Report",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    `- Total: ${report.summary.total}`,
    `- Passing: ${report.summary.passing}`,
    `- Failing: ${report.summary.failing}`,
    "",
    "| Case | Type | Status | Expected | Suggestions | Mode | Receiver |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  report.entries.forEach((entry) => {
    lines.push(
      `| ${entry.name} | ${entry.type} | ${entry.status} | ${entry.expectedSuggestion} | ${entry.suggestions.join(", ") || "(none)"} | ${entry.mode} | ${entry.receiverType} |`,
    );
  });

  lines.push("", "## Details", "");
  report.entries.forEach((entry) => {
    lines.push(`### ${entry.name}`);
    lines.push(`- Value: \`${entry.value}\``);
    lines.push(`- Expected suggestion: \`${entry.expectedSuggestion}\``);
    lines.push(`- Suggestions: ${entry.suggestions.join(", ") || "(none)"}`);
    lines.push(`- Hint: ${entry.hintTitle ?? "(none)"}`);
    lines.push(`- Meta: ${entry.hintMeta ?? "(none)"}`);
    lines.push(`- Errors: ${entry.errors.join(" | ") || "(none)"}`);
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
}

describe("PlaceholderExpressionInput examples", () => {
  it("generates a deterministic placeholder expression report", () => {
    const entries: ReportEntry[] = CASES.map((testCase) => {
      const descriptor = getPlaceholderExpressionDescriptor(getTypeBreakdown(CM, testCase.type));
      expect(descriptor).not.toBeNull();

      const cursor = testCase.value.indexOf(testCase.cursorToken) + testCase.cursorToken.length;
      const context = parseExpressionCursorContext(descriptor!, testCase.value, cursor);
      const registry = testCase.registryFactory
        ? testCase.registryFactory(context.activeSourceRef?.cacheKey ?? context.requiredSources[0]?.cacheKey ?? "")
        : testCase.registry;
      const analysis = analyzeExpression(descriptor!, testCase.value, cursor, registry ?? {});
      const suggestions = analysis.suggestions.map((suggestion) => suggestion.label);
      const status: ReportStatus = suggestions.includes(testCase.expectedSuggestion) ? "pass" : "fail";

      return {
        name: testCase.name,
        type: testCase.type,
        value: testCase.value,
        cursorToken: testCase.cursorToken,
        expectedSuggestion: testCase.expectedSuggestion,
        status,
        mode: context.mode,
        receiverType: context.receiverType,
        sourceKind: context.activeSourceRef?.kind,
        suggestions,
        hintTitle: analysis.hint?.title,
        hintMeta: analysis.hint?.meta,
        errors: analysis.errors,
      };
    });

    const report: Report = {
      generatedAt: FIXED_GENERATED_AT,
      summary: {
        total: entries.length,
        passing: entries.filter((entry) => entry.status === "pass").length,
        failing: entries.filter((entry) => entry.status === "fail").length,
      },
      entries,
    };

    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(REPORT_MD_PATH, toMarkdownReport(report), "utf8");

    expect(report.summary.failing).toBe(0);
  });
});

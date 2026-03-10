/* eslint-disable */
// @ts-nocheck
import React from "react";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchSingle } from "@/lib/BulkQuery";
import { INPUT_OPTIONS } from "@/lib/endpoints";
import { bootstrapBackendSessionFromEnv } from "@/test/backendSession";

vi.mock("./QueryComponent", () => ({
  default: ({ element, multi }: { element: string; multi: boolean }) => (
    <div data-testid="query-component">query:{element}:{multi ? "multi" : "single"}</div>
  ),
  CompositeQueryComponent: ({ composites, multi }: { composites: string[]; multi: boolean }) => (
    <div data-testid="composite-query-component">
      composite:{composites.join(",")}:{multi ? "multi" : "single"}
    </div>
  ),
}));

vi.mock("./HtmlEditor", () => ({
  default: HtmlEditorMock,
}));

vi.mock("./TypedInput", () => ({
  default: TypedInputMock,
}));

import inputExamples from "../../../input-examples.json";
import { DialogProvider } from "../layout/DialogContext";
import ArgInput, { getArgInputComponentName, getArgInputSupport } from "./ArgInput";
import { buildStaticOptions, isIntegerListType, isPlaceholderClass, resolveArgInput } from "./argInputMetadata";
import { validateNumberInput } from "./field/argValidation";
import { REGEX_PATTERN } from "@/lib/regex-patterns";
import { normalizeTimediffValue, normalizeTimeValue } from "@/lib/temporal";
import { parseMapString } from "@/utils/MapParser";
import { CM, getTypeBreakdown, type TypeBreakdown } from "@/utils/Command";
import { normalizeMapEntries, normalizeSetValues, parseSetString, serializeMapEntries } from "./collectionInputNormalization";
import { formatCityBuildCityId, parseCityBuildInput, serializeCityBuildValue } from "./cityBuildInputUtils";
import { normalizeBooleanValue, normalizeTriStateValue } from "./scalarInputNormalization";
import { resolveQueryOptionsPayload } from "./queryOptionUtils";
import {
  resolveInitialSelection,
  resolveSelectionInput,
  serializeSelection,
  summarizeOptions,
  type SelectOption,
} from "./selectValueUtils";

type ExampleMap = Record<string, string[]>;
type Status = "pass" | "fail" | "unsupported" | "query-backed" | "uncheckable" | "render-error";
type ControlKind =
  | "text"
  | "textarea"
  | "html"
  | "boolean"
  | "tri-state"
  | "time"
  | "timediff"
  | "select"
  | "set"
  | "map"
  | "city-build"
  | "city-ranges"
  | "tax-rate"
  | "mmr"
  | "mmr-double"
  | "color"
  | "font"
  | "query"
  | "unknown";

type CheckResult = {
  status: Status;
  detail: string;
  actualOutput?: string;
};

type ExampleReportEntry = {
  type: string;
  example: string;
  controlKind: ControlKind;
  componentName: string;
  querySource?: string;
  supported: boolean;
  render: CheckResult;
  defaultValue: CheckResult;
  paste: CheckResult;
};

type ExampleReportSummary = {
  totalExamples: number;
  supportedExamples: number;
  unsupportedExamples: number;
  renderStatuses: Record<Status, number>;
  defaultStatuses: Record<Status, number>;
  pasteStatuses: Record<Status, number>;
};

type ExampleReport = {
  generatedAt: string;
  summary: ExampleReportSummary;
  entries: ExampleReportEntry[];
};

const ARG_NAME = "value";
const REPORT_PATH = resolve("test-results", "arg-input-examples.report.json");
const REPORT_MD_PATH = resolve("test-results", "arg-input-examples.report.md");
const FIXED_NOW_MS = Date.parse("2026-03-08T12:00:00.000Z");

const STATUS_KEYS: Status[] = [
  "pass",
  "fail",
  "unsupported",
  "query-backed",
  "uncheckable",
  "render-error",
];

let restoreDateNow: (() => void) | undefined;

function HtmlEditorMock({
  argName,
  initialValue,
  setOutputValue,
}: {
  argName: string;
  initialValue: string;
  setOutputValue: (name: string, value: string) => void;
}) {
  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setOutputValue(argName, event.currentTarget.value);
  }

  return (
    <textarea
      aria-label={`${argName} html editor`}
      data-testid="mock-html-editor"
      defaultValue={initialValue}
      onChange={handleChange}
    />
  );
}

function TypedInputMock({
  argName,
  initialValue,
  setOutputValue,
}: {
  argName: string;
  initialValue: string;
  setOutputValue: (name: string, value: string) => void;
}) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setOutputValue(argName, event.currentTarget.value);
  }

  return (
    <input
      aria-label={`${argName} typed input`}
      data-testid="mock-typed-input"
      defaultValue={initialValue}
      onChange={handleChange}
    />
  );
}

beforeAll(() => {
  const spy = vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
  restoreDateNow = () => spy.mockRestore();
});

beforeAll(async () => {
  await bootstrapBackendSessionFromEnv();
});

afterAll(() => {
  restoreDateNow?.();
});


function isQueryBacked(breakdown: TypeBreakdown): boolean {
  const resolution = resolveArgInput(breakdown);
  return resolution.kind === "query" || resolution.kind === "composite-query";
}

function createEmptyStatusMap(): Record<Status, number> {
  return Object.fromEntries(STATUS_KEYS.map((status) => [status, 0])) as Record<Status, number>;
}

type BackendOptionsResult = {
  options: SelectOption[];
  source: string;
  error?: string;
  warning?: string;
};

const backendOptionsCache = new Map<string, Promise<BackendOptionsResult>>();

async function fetchBackendOptionsForType(type: string): Promise<BackendOptionsResult> {
  const cacheKey = `single:${type}`;
  const cached = backendOptionsCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const payload = await fetchSingle<unknown>(INPUT_OPTIONS.endpoint.name, { type }, undefined);
      const resolved = resolveQueryOptionsPayload(type, payload);
      return { options: resolved.options, source: type, error: resolved.error };
    } catch (error) {
      return {
        options: [],
        source: type,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })();

  backendOptionsCache.set(cacheKey, promise);
  return promise;
}

async function fetchBackendOptionsForBreakdown(breakdown: TypeBreakdown): Promise<BackendOptionsResult> {
  const resolution = resolveArgInput(breakdown);
  const optionData = resolution.optionData;
  if (optionData.composite.length > 0) {
    const cacheKey = `composite:${optionData.composite.join(",")}`;
    const cached = backendOptionsCache.get(cacheKey);
    if (cached) return cached;

    const promise = (async () => {
      const results = await Promise.all(optionData.composite.map((type) => fetchBackendOptionsForType(type)));
      const options = results.flatMap((result) => result.options);
      const warnings = results
        .filter((result) => result.error)
        .map((result) => `${result.source}: ${result.error}`);

      return {
        options,
        source: optionData.composite.join(", "),
        error: options.length === 0 && warnings.length > 0 ? warnings.join(" | ") : undefined,
        warning: options.length > 0 && warnings.length > 0 ? warnings.join(" | ") : undefined,
      };
    })();

    backendOptionsCache.set(cacheKey, promise);
    return promise;
  }

  return fetchBackendOptionsForType(optionData.typeKey);
}

function describeBackendResolution(example: string, options: SelectOption[], isMulti: boolean): CheckResult {
  const resolution = resolveSelectionInput(example, options, isMulti);
  const actualOutput = serializeSelection(resolution.selection, isMulti);

  if (resolution.unmatchedTokens.length > 0 || resolution.selection.length === 0) {
    return {
      status: "fail",
      detail: `No backend match for ${JSON.stringify(example)}. Unmatched: ${resolution.unmatchedTokens.join(", ") || "(none)"}. Backend options (${options.length}): ${summarizeOptions(options)}.`,
      actualOutput,
    };
  }

  return {
    status: "pass",
    detail: `Resolved against backend options (${options.length}) to ${actualOutput || "(empty)"}.`,
    actualOutput,
  };
}

function withBackendWarning(result: CheckResult, backend: BackendOptionsResult): CheckResult {
  if (!backend.warning) {
    return result;
  }

  return {
    ...result,
    detail: `${result.detail} Warning: ${backend.warning}`,
  };
}

function getRegexPatternForBreakdown(breakdown: TypeBreakdown): string | null {
  const lower = breakdown.element.toLowerCase();

  if (isIntegerListType(breakdown)) return REGEX_PATTERN.NUMBER_LIST;
  if (lower === "spreadsheet" || lower === "transfersheet") return REGEX_PATTERN.SPREADSHEET;
  if (lower === "googledoc") return REGEX_PATTERN.GOOGLE_DOC;
  if (lower === "dbwar") return REGEX_PATTERN.WAR;
  if (lower === "dbcity") return REGEX_PATTERN.CITY;
  if (lower === "message") return REGEX_PATTERN.CHANNEL;
  if (lower === "uuid") return REGEX_PATTERN.UUID;

  return null;
}

function matchesBreakdownRegex(breakdown: TypeBreakdown, example: string): boolean | null {
  const pattern = getRegexPatternForBreakdown(breakdown);
  if (!pattern) return null;
  return new RegExp(pattern, "i").test(example);
}

function getControlKind(breakdown: TypeBreakdown): ControlKind {
  const resolution = resolveArgInput(breakdown);

  switch (resolution.kind) {
    case "query":
    case "composite-query":
      return "query";
    case "wysiwyg":
      return "html";
    case "textarea":
      return "textarea";
    case "font-options":
      return "font";
    case "static-options":
    case "placeholder-class":
      return "select";
    case "set":
      return "set";
    case "map":
      return "map";
    case "citybuild":
      return "city-build";
    case "boolean":
      return breakdown.element === "Boolean" ? "tri-state" : "boolean";
    case "color":
      return "color";
    case "cityranges":
      return "city-ranges";
    case "taxrate":
      return "tax-rate";
    case "mmr":
      return "mmr";
    case "mmr-double":
      return "mmr-double";
    case "time":
      return "time";
    case "timediff":
      return "timediff";
    default:
      return "text";
  }
}

function findSectionRoot(container: HTMLElement, markerText: string): HTMLElement {
  const candidate = Array.from(container.querySelectorAll("div")).find((element) =>
    element.textContent?.includes(markerText),
  );
  return (candidate as HTMLElement) ?? container;
}

function getInputs(container: HTMLElement): Array<HTMLInputElement | HTMLTextAreaElement> {
  return Array.from(container.querySelectorAll("input, textarea")) as Array<HTMLInputElement | HTMLTextAreaElement>;
}

function getPrimaryInput(container: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  return getInputs(container)[0] ?? null;
}

function getOutputValueText(actualOutput: string | undefined): string {
  return actualOutput == null || actualOutput === "" ? "(empty)" : actualOutput;
}

function makeClipboardEventPayload(text: string) {
  return {
    clipboardData: {
      getData: (kind: string) => (kind === "text" || kind === "text/plain" ? text : ""),
    },
  };
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
}

function renderHarness(type: string, initialValue: string) {
  const breakdown = getTypeBreakdown(CM, type);
  const emitted: string[] = [];
  function handleSetOutput(_key: string, value: string) {
    emitted.push(value);
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <DialogProvider>
        <ArgInput
          argName={ARG_NAME}
          breakdown={breakdown}
          min={undefined}
          max={undefined}
          initialValue={initialValue}
          setOutputValue={handleSetOutput}
        />
      </DialogProvider>
    </QueryClientProvider>,
  );

  return {
    ...view,
    breakdown,
    getLastOutput: () => emitted.length > 0 ? emitted[emitted.length - 1] : undefined,
  };
}

async function inspectDefaultState(type: string, example: string, breakdown: TypeBreakdown, container: HTMLElement): Promise<CheckResult> {
  if (isQueryBacked(breakdown)) {
    const backend = await fetchBackendOptionsForBreakdown(breakdown);
    if (backend.error) {
      return { status: "fail", detail: `Backend request failed for ${backend.source}: ${backend.error}` };
    }
    if (backend.options.length === 0) {
      return { status: "fail", detail: `Backend returned 0 options for ${backend.source}.` };
    }
    return withBackendWarning(
      describeBackendResolution(example, backend.options, breakdown.getOptionData().multi),
      backend,
    );
  }

  const regexMatch = matchesBreakdownRegex(breakdown, example);
  const controlKind = getControlKind(breakdown);

  if (regexMatch === false) {
    return { status: "fail", detail: "Example does not match the current client-side validation pattern." };
  }

  if (controlKind === "boolean") {
    const expected = normalizeBooleanValue(example) === "1";
    const trueButton = container.querySelector('button[aria-pressed="true"]');
    if (!trueButton) {
      return { status: "fail", detail: "Boolean input did not expose an active state." };
    }
    const actual = trueButton.textContent?.trim() === "True";
    return actual === expected
      ? { status: "pass", detail: `Default selected ${actual ? "True" : "False"} as expected.` }
      : { status: "fail", detail: `Expected ${expected ? "True" : "False"} to be selected by default.` };
  }

  if (controlKind === "tri-state") {
    const expected = normalizeTriStateValue(example);
    const active = container.querySelector('[role="radio"][aria-checked="true"]');
    const actual = active?.getAttribute("aria-label");
    const expectedLabel = expected === "1" ? "Yes" : expected === "-1" ? "No" : "Any";
    return actual === expectedLabel
      ? { status: "pass", detail: `Default selected ${expectedLabel} as expected.` }
      : { status: "fail", detail: `Expected ${expectedLabel} to be selected by default, but got ${actual ?? "nothing"}.` };
  }

  if (controlKind === "select") {
    const options = buildStaticOptions(breakdown);
    if (!options) {
      return { status: "uncheckable", detail: "Static select options were not available for inspection." };
    }

    const isMulti = breakdown.getOptionData().multi;
    const expectedSelection = resolveSelectionInput(example, options, isMulti).selection;
    if (isMulti) {
      const selectedChipButtons = Array.from(container.querySelectorAll("button"))
        .filter((button) => button.textContent?.trim() === "×");
      return selectedChipButtons.length === expectedSelection.length
        ? { status: "pass", detail: `Default resolved ${expectedSelection.length} selected option(s).` }
        : { status: "fail", detail: `Expected ${expectedSelection.length} selected option(s), rendered ${selectedChipButtons.length}.` };
    }

    const input = container.querySelector("input[type='text']") as HTMLInputElement | null;
    const actualPlaceholder = input?.getAttribute("placeholder") ?? "";
    const expectedPlaceholder = expectedSelection[0]?.label ?? expectedSelection[0]?.value ?? "";

    if (!expectedPlaceholder) {
      return { status: "fail", detail: "Example could not be resolved to a static option." };
    }

    return actualPlaceholder === expectedPlaceholder
      ? { status: "pass", detail: `Default resolved to ${expectedPlaceholder}.` }
      : { status: "fail", detail: `Expected placeholder ${expectedPlaceholder}, got ${actualPlaceholder || "(empty)"}.` };
  }

  if (controlKind === "set") {
    const expectedValues = normalizeSetValues(parseSetString(example), breakdown.child![0]).values;
    const removeButtons = Array.from(container.querySelectorAll("button")).filter((button) => button.textContent?.trim() === "Remove");
    return removeButtons.length === expectedValues.length
      ? { status: "pass", detail: `Default parsed ${removeButtons.length} set value(s).` }
      : { status: "fail", detail: `Expected ${expectedValues.length} set value(s), rendered ${removeButtons.length}.` };
  }

  if (controlKind === "map") {
    const expectedEntries = normalizeMapEntries(parseMapString(example) ?? [], breakdown.child![0], breakdown.child![1]).entries;
    const removeButtons = Array.from(container.querySelectorAll("button")).filter((button) => button.textContent?.trim() === "Remove");
    return removeButtons.length === expectedEntries.length
      ? { status: "pass", detail: `Default parsed ${removeButtons.length} map entr${removeButtons.length === 1 ? "y" : "ies"}.` }
      : { status: "fail", detail: `Expected ${expectedEntries.length} map entr${expectedEntries.length === 1 ? "y" : "ies"}, rendered ${removeButtons.length}.` };
  }

  if (controlKind === "city-build") {
    const parsed = parseCityBuildInput(example);
    if (parsed.error) {
      return { status: "fail", detail: parsed.error };
    }

    const values = getInputs(container).map((input) => input.value);
    const expectedCity = formatCityBuildCityId(parsed.cityId);
    const removeButtons = Array.from(container.querySelectorAll("button")).filter((button) => button.textContent?.trim() === "Remove");
    return values[0] === expectedCity && removeButtons.length === parsed.modifiers.length
      ? { status: "pass", detail: `Default parsed city ${expectedCity || "(none)"} and ${parsed.modifiers.length} modifier entr${parsed.modifiers.length === 1 ? "y" : "ies"}.` }
      : { status: "fail", detail: `Expected city ${expectedCity || "(empty)"} with ${parsed.modifiers.length} modifier entr${parsed.modifiers.length === 1 ? "y" : "ies"}, got city ${values[0] || "(empty)"} and ${removeButtons.length} modifier rows.` };
  }

  if (controlKind === "city-ranges") {
    const match = example.trim().match(/^c?(\d+)(?:-(\d+)|\+)$/i);
    const values = getInputs(container).map((input) => input.value);
    if (!match) {
      return { status: "fail", detail: "CityRanges example did not match the supported cX-Y format." };
    }
    const expectedRight = match[2] ?? "";
    return values[0] === match[1] && values[1] === expectedRight
      ? { status: "pass", detail: `Default split into ${values[0]} and ${values[1] || "+"}.` }
      : { status: "fail", detail: `Expected split ${match[1]} / ${expectedRight || "+"}, got ${values.join(" / ") || "(empty)"}.` };
  }

  if (controlKind === "tax-rate") {
    const match = example.trim().match(/^(\d+)\/(\d+)$/);
    const values = getInputs(container).map((input) => input.value);
    if (!match) {
      return { status: "fail", detail: "TaxRate example did not match the supported X/Y format." };
    }
    return values[0] === match[1] && values[1] === match[2]
      ? { status: "pass", detail: `Default split into ${values[0]} and ${values[1]}.` }
      : { status: "fail", detail: `Expected split ${match[1]} / ${match[2]}, got ${values.join(" / ") || "(empty)"}.` };
  }

  if (controlKind === "mmr-double") {
    const isValid = /^(?:\d{4}|(?:5(?:\.0+)?|[0-4](?:\.\d+)?)(?:\/(?:5(?:\.0+)?|[0-4](?:\.\d+)?)){3})$/.test(example.trim());
    const values = getInputs(container).map((input) => input.value).filter(Boolean);
    return isValid && values.length === 4
      ? { status: "pass", detail: "Default parsed all four MMRDouble segments." }
      : { status: "fail", detail: `Expected a four-segment MMRDouble value; rendered ${values.length} populated segment(s).` };
  }

  if (controlKind === "mmr") {
    const allowWildcard = breakdown.element === "MMRMatcher";
    const pattern = allowWildcard ? /^(?:[0-9X]{4}|[0-9X](?:\/[0-9X]){3})$/i : /^(?:\d{4}|\d(?:\/\d){3})$/;
    return pattern.test(example.trim())
      ? { status: "pass", detail: "Example matches the MMR input format." }
      : { status: "fail", detail: "Example does not match the current MMR input format." };
  }

  if (controlKind === "time") {
    const normalized = normalizeTimeValue(example, FIXED_NOW_MS);
    const input = container.querySelector("input") as HTMLInputElement | null;
    const actualValue = input?.value ?? "";
    const hasExpectedValue = normalized.displayValue !== "";
    return hasExpectedValue
      ? (actualValue !== ""
        ? { status: "pass", detail: `Default produced a normalized timestamp input value (${actualValue}).` }
        : { status: "fail", detail: "Expected a normalized timestamp input value, but the field stayed empty." })
      : { status: "fail", detail: "Example did not parse into a supported timestamp value." };
  }

  if (controlKind === "timediff") {
    const normalized = normalizeTimediffValue(example, FIXED_NOW_MS);
    const input = container.querySelector("input") as HTMLInputElement | null;
    const actualValue = input?.value ?? "";
    const hasExpectedValue = normalized.displayValue !== "";
    return hasExpectedValue
      ? (actualValue !== ""
        ? { status: "pass", detail: `Default produced a normalized timediff value (${actualValue}).` }
        : { status: "fail", detail: "Expected a normalized timediff value, but the field stayed empty." })
      : { status: "fail", detail: "Example did not parse into a supported timediff value." };
  }

  if (controlKind === "font") {
    const buttons = Array.from(container.querySelectorAll("button"));
    const boldActive = buttons.some((button) => button.textContent?.trim() === "B" && button.getAttribute("aria-pressed") === "true");
    const italicActive = buttons.some((button) => button.textContent?.includes("I") && button.getAttribute("aria-pressed") === "true");
    const expectsBold = /\bbold\b/i.test(example);
    const expectsItalic = /\bitalic\b/i.test(example);
    return boldActive === expectsBold && italicActive === expectsItalic
      ? { status: "pass", detail: `Font modifiers resolved to bold=${boldActive}, italic=${italicActive}.` }
      : { status: "fail", detail: `Expected font modifiers bold=${expectsBold}, italic=${expectsItalic}; got bold=${boldActive}, italic=${italicActive}.` };
  }

  const input = getPrimaryInput(container);
  if (!input) {
    return { status: "uncheckable", detail: "No primary editable field was found for inspection." };
  }

  if (controlKind === "color") {
    return input.value === example
      ? { status: "pass", detail: `Default color is ${example}.` }
      : { status: "fail", detail: `Expected color ${example}, got ${input.value || "(empty)"}.` };
  }

  return input.value === example
    ? { status: "pass", detail: "Default field value matched the example." }
    : { status: "fail", detail: `Expected default field value ${example}, got ${input.value || "(empty)"}.` };
}

async function applyPasteAndCheck(type: string, example: string, breakdown: TypeBreakdown, container: HTMLElement, getLastOutput: () => string | undefined): Promise<CheckResult> {
  if (isQueryBacked(breakdown)) {
    const backend = await fetchBackendOptionsForBreakdown(breakdown);
    if (backend.error) {
      return { status: "fail", detail: `Backend request failed for ${backend.source}: ${backend.error}` };
    }
    if (backend.options.length === 0) {
      return { status: "fail", detail: `Backend returned 0 options for ${backend.source}.` };
    }
    return withBackendWarning(
      describeBackendResolution(example, backend.options, breakdown.getOptionData().multi),
      backend,
    );
  }

  const controlKind = getControlKind(breakdown);
  const regexMatch = matchesBreakdownRegex(breakdown, example);
  if (regexMatch === false) {
    return { status: "fail", detail: "Example does not match the current client-side validation pattern." };
  }

  const textInput = getPrimaryInput(container);

  if (controlKind === "boolean" || controlKind === "tri-state" || controlKind === "city-ranges" || controlKind === "tax-rate") {
    fireEvent.paste(container.firstElementChild ?? container, makeClipboardEventPayload(example));
    const actual = getLastOutput() ?? "";
    return actual !== ""
      ? { status: "pass", detail: `Paste emitted ${actual}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted output for ${controlKind}, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (controlKind === "color") {
    const input = container.querySelector('input[type="text"]') as HTMLInputElement | null;
    if (!input) return { status: "uncheckable", detail: "No color text input was found for paste inspection." };
    fireEvent.paste(input, makeClipboardEventPayload(example));
    const actual = getLastOutput() ?? "";
    return actual !== ""
      ? { status: "pass", detail: `Paste emitted ${actual}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted color output, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (controlKind === "map") {
    fireEvent.paste(findSectionRoot(container, "Map entries"), makeClipboardEventPayload(example));
    const expected = serializeMapEntries(normalizeMapEntries(parseMapString(example) ?? [], breakdown.child![0], breakdown.child![1]).entries);
    const actual = getLastOutput() ?? "";
    return actual === expected
      ? { status: "pass", detail: `Paste emitted ${expected || "(empty)"}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted map output ${expected || "(empty)"}, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (controlKind === "city-build") {
    const parsed = parseCityBuildInput(example);
    if (parsed.error) {
      return { status: "fail", detail: parsed.error };
    }

    fireEvent.paste(container.firstElementChild ?? container, makeClipboardEventPayload(example));
    const expected = serializeCityBuildValue(parsed.cityId, parsed.modifiers);
    const actual = getLastOutput() ?? "";
    return actual === expected
      ? { status: "pass", detail: `Paste emitted ${expected || "(empty)"}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted CityBuild output ${expected || "(empty)"}, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (controlKind === "set") {
    fireEvent.paste(findSectionRoot(container, "Set values"), makeClipboardEventPayload(example));
    const expected = normalizeSetValues(parseSetString(example), breakdown.child![0]).values.join(",");
    const actual = getLastOutput() ?? "";
    return actual === expected
      ? { status: "pass", detail: `Paste emitted ${expected || "(empty)"}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted set output ${expected || "(empty)"}, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (controlKind === "select") {
    const options = buildStaticOptions(breakdown);
    const input = container.querySelector("input[type='text']") as HTMLInputElement | null;
    if (!options || !input) {
      return { status: "uncheckable", detail: "Static select input was not available for paste inspection." };
    }

    fireEvent.paste(input, makeClipboardEventPayload(example));
    const resolution = resolveSelectionInput(example, options, breakdown.getOptionData().multi);
    const expected = serializeSelection(resolution.selection, breakdown.getOptionData().multi);
    const actual = getLastOutput() ?? "";
    return actual === expected
      ? { status: "pass", detail: `Paste emitted ${expected || "(empty)"}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted select output ${expected || "(empty)"}, got ${getOutputValueText(actual)}. Unmatched: ${resolution.unmatchedTokens.join(", ") || "(none)"}. Options: ${summarizeOptions(options)}.`, actualOutput: actual };
  }

  if (controlKind === "time") {
    if (!textInput) return { status: "uncheckable", detail: "No time input was found for paste inspection." };
    fireEvent.paste(textInput, makeClipboardEventPayload(example));
    const expected = normalizeTimeValue(example, FIXED_NOW_MS).outputValue;
    const actual = getLastOutput() ?? "";
    if (!expected) {
      return actual === ""
        ? { status: "pass", detail: "Paste correctly rejected the unsupported timestamp example.", actualOutput: actual }
        : { status: "fail", detail: `Expected no pasted time output, got ${getOutputValueText(actual)}.`, actualOutput: actual };
    }
    return actual !== ""
      ? { status: "pass", detail: `Paste emitted a timestamp value (${actual}).`, actualOutput: actual }
      : { status: "fail", detail: "Expected a pasted time output, but nothing was emitted.", actualOutput: actual };
  }

  if (controlKind === "timediff") {
    if (!textInput) return { status: "uncheckable", detail: "No timediff input was found for paste inspection." };
    fireEvent.paste(textInput, makeClipboardEventPayload(example));
    const expected = normalizeTimediffValue(example, FIXED_NOW_MS).outputValue;
    const actual = getLastOutput() ?? "";
    if (!expected) {
      return actual === ""
        ? { status: "pass", detail: "Paste correctly rejected the unsupported timediff example.", actualOutput: actual }
        : { status: "fail", detail: `Expected no pasted timediff output, got ${getOutputValueText(actual)}.`, actualOutput: actual };
    }
    return actual !== ""
      ? { status: "pass", detail: `Paste emitted a timediff value (${actual}).`, actualOutput: actual }
      : { status: "fail", detail: "Expected a pasted timediff output, but nothing was emitted.", actualOutput: actual };
  }

  if (controlKind === "mmr-double") {
    fireEvent.paste(container.firstElementChild ?? container, makeClipboardEventPayload(example));
    const actual = getLastOutput() ?? "";
    return actual !== ""
      ? { status: "pass", detail: `Paste emitted ${actual}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted MMRDouble output, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (controlKind === "mmr") {
    fireEvent.paste(container.firstElementChild ?? container, makeClipboardEventPayload(example));
    const actual = getLastOutput() ?? "";
    return actual !== ""
      ? { status: "pass", detail: `Paste emitted ${actual}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted MMR output, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (controlKind === "font") {
    fireEvent.paste(container.firstElementChild ?? container, makeClipboardEventPayload(example));
    const actual = getLastOutput() ?? "";
    return actual !== ""
      ? { status: "pass", detail: `Paste emitted ${actual}.`, actualOutput: actual }
      : { status: "fail", detail: `Expected pasted font output, got ${getOutputValueText(actual)}.`, actualOutput: actual };
  }

  if (!textInput) {
    return { status: "uncheckable", detail: "No editable field was found for paste inspection." };
  }

  setNativeValue(textInput, example);
  fireEvent.input(textInput, { target: { value: example } });
  fireEvent.change(textInput, { target: { value: example } });

  let expected = example;
  if (["int", "integer", "long"].includes(breakdown.element.toLowerCase()) && !breakdown.annotations?.includes("Timestamp") && !breakdown.annotations?.includes("Timediff")) {
    expected = validateNumberInput(example, { isFloat: false }).normalizedValue;
  } else if (["double", "number"].includes(breakdown.element.toLowerCase())) {
    expected = validateNumberInput(example, { isFloat: true }).normalizedValue;
  }

  const actual = getLastOutput() ?? "";
  return actual === expected
    ? { status: "pass", detail: `Paste emitted ${expected || "(empty)"}.`, actualOutput: actual }
    : { status: "fail", detail: `Expected pasted output ${expected || "(empty)"}, got ${getOutputValueText(actual)}.`, actualOutput: actual };
}

async function buildExampleReport(): Promise<ExampleReport> {
  const entries: ExampleReportEntry[] = [];
  const examples = inputExamples as ExampleMap;

  for (const [type, values] of Object.entries(examples)) {
    for (const example of values) {
      const breakdown = getTypeBreakdown(CM, type);
      const supported = getArgInputSupport(breakdown).supported;
      const componentResolution = getArgInputComponentName(breakdown);
      const controlKind = getControlKind(breakdown);

      let renderResult: CheckResult = { status: supported ? "pass" : "unsupported", detail: supported ? "Rendered successfully." : "Type is not currently supported by ArgInput." };
      let defaultResult: CheckResult = supported ? { status: "uncheckable", detail: "Default state was not inspected." } : { status: "unsupported", detail: "Type is not currently supported by ArgInput." };
      let pasteResult: CheckResult = supported ? { status: "uncheckable", detail: "Paste state was not inspected." } : { status: "unsupported", detail: "Type is not currently supported by ArgInput." };

      if (supported) {
        try {
          const defaultHarness = renderHarness(type, example);
          defaultResult = await inspectDefaultState(type, example, breakdown, defaultHarness.container);
          defaultHarness.unmount();

          const pasteHarness = renderHarness(type, "");
          pasteResult = await applyPasteAndCheck(type, example, breakdown, pasteHarness.container, pasteHarness.getLastOutput);
          pasteHarness.unmount();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          renderResult = { status: "render-error", detail: message };
          defaultResult = { status: "render-error", detail: message };
          pasteResult = { status: "render-error", detail: message };
        }
      }

      entries.push({
        type,
        example,
        controlKind,
        componentName: componentResolution.componentName,
        querySource: componentResolution.querySource,
        supported,
        render: renderResult,
        defaultValue: defaultResult,
        paste: pasteResult,
      });
    }
  }

  const summary: ExampleReportSummary = {
    totalExamples: entries.length,
    supportedExamples: entries.filter((entry) => entry.supported).length,
    unsupportedExamples: entries.filter((entry) => !entry.supported).length,
    renderStatuses: createEmptyStatusMap(),
    defaultStatuses: createEmptyStatusMap(),
    pasteStatuses: createEmptyStatusMap(),
  };

  for (const entry of entries) {
    summary.renderStatuses[entry.render.status] += 1;
    summary.defaultStatuses[entry.defaultValue.status] += 1;
    summary.pasteStatuses[entry.paste.status] += 1;
  }

  return {
    generatedAt: new Date(FIXED_NOW_MS).toISOString(),
    summary,
    entries,
  };
}

function toMarkdownReport(report: ExampleReport): string {
  const failingDefaults = report.entries.filter((entry) => entry.defaultValue.status === "fail");
  const failingPaste = report.entries.filter((entry) => entry.paste.status === "fail");
  const unsupported = report.entries.filter((entry) => !entry.supported || entry.paste.status === "unsupported" || entry.defaultValue.status === "unsupported");

  const lines = [
    "# ArgInput Example Report",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total examples: ${report.summary.totalExamples}`,
    `- Supported examples: ${report.summary.supportedExamples}`,
    `- Unsupported examples: ${report.summary.unsupportedExamples}`,
    `- Default failures: ${failingDefaults.length}`,
    `- Paste failures: ${failingPaste.length}`,
    `- Unsupported or paste-unfriendly cases: ${unsupported.length}`,
    "",
    "## Default Failures",
    "",
  ];

  if (failingDefaults.length === 0) {
    lines.push("- None");
  } else {
    for (const entry of failingDefaults) {
      lines.push(`- ${entry.type} | ${JSON.stringify(entry.example)} | ${entry.componentName}${entry.querySource ? ` [${entry.querySource}]` : ""} | ${entry.defaultValue.detail}`);
    }
  }

  lines.push("", "## Paste Failures", "");

  if (failingPaste.length === 0) {
    lines.push("- None");
  } else {
    for (const entry of failingPaste) {
      lines.push(`- ${entry.type} | ${JSON.stringify(entry.example)} | ${entry.componentName}${entry.querySource ? ` [${entry.querySource}]` : ""} | ${entry.paste.detail}`);
    }
  }

  lines.push("", "## Unsupported Or Skipped", "");

  if (unsupported.length === 0) {
    lines.push("- None");
  } else {
    for (const entry of unsupported) {
      const reasons = [entry.render, entry.defaultValue, entry.paste]
        .filter((result) => result.status !== "pass")
        .map((result) => `${result.status}: ${result.detail}`)
        .join(" | ");
      lines.push(`- ${entry.type} | ${JSON.stringify(entry.example)} | ${entry.componentName}${entry.querySource ? ` [${entry.querySource}]` : ""} | ${reasons}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function writeReport(report: ExampleReport): void {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(REPORT_MD_PATH, toMarkdownReport(report), "utf8");
}

describe("ArgInput example harness", () => {
  it("generates a render/default/paste report for input-examples.json", async () => {
    const report = await buildExampleReport();
    writeReport(report);

    expect(report.summary.totalExamples).toBeGreaterThan(0);
    expect(report.entries.some((entry) => entry.render.status === "pass")).toBe(true);
  });

  it("parses map defaults using the same parser as paste handling", () => {
    const type = "Map<CityRanges,Set<BeigeReason>>";
    const example = "c1-9:*\nc10+:INACTIVE,VACATION_MODE,APPLICANT";
    const { container, unmount } = renderHarness(type, example);
    const removeButtons = Array.from(container.querySelectorAll("button")).filter((button) => button.textContent?.trim() === "Remove");

    expect(removeButtons).toHaveLength(2);
    unmount();
  });

  it("normalizes boolean-like defaults for binary and tri-state controls", () => {
    const booleanHarness = renderHarness("boolean", "yes");
    const activeBoolean = booleanHarness.container.querySelector('button[aria-pressed="true"]');
    expect(activeBoolean?.textContent?.trim()).toMatch(/^(Yes|True)$/);
    booleanHarness.unmount();

    const triHarness = renderHarness("Boolean", "no");
    const activeTriState = triHarness.container.querySelector('[role="radio"][aria-checked="true"]');
    expect(activeTriState?.getAttribute("aria-label")).toMatch(/^(No|False)$/);
    triHarness.unmount();
  });

  it("accepts root-level paste for parsed feedback wrappers", () => {
    const triHarness = renderHarness("Boolean", "");
    fireEvent.paste(
      triHarness.container.firstElementChild ?? triHarness.container,
      makeClipboardEventPayload("yes"),
    );
    expect(triHarness.getLastOutput()).toBe("1");
    triHarness.unmount();

    const mmrDoubleHarness = renderHarness("MMRDouble", "");
    fireEvent.paste(
      mmrDoubleHarness.container.firstElementChild ?? mmrDoubleHarness.container,
      makeClipboardEventPayload("5553"),
    );
    expect(mmrDoubleHarness.getLastOutput()).toBe("5/5/5/3");
    mmrDoubleHarness.unmount();
  });

  it("accepts multi-select paste for single and comma-separated static options", () => {
    const singleHarness = renderHarness("Set<AllianceMetric>", "");
    fireEvent.paste(
      getPrimaryInput(singleHarness.container) ?? singleHarness.container.firstElementChild ?? singleHarness.container,
      makeClipboardEventPayload("SOLDIER"),
    );
    expect(singleHarness.getLastOutput()).toBe("SOLDIER");
    singleHarness.unmount();

    const multiHarness = renderHarness("Set<AttackType>", "");
    const multiInput = getPrimaryInput(multiHarness.container);
    expect(multiInput).not.toBeNull();
    fireEvent.paste(
      multiInput!,
      makeClipboardEventPayload("GROUND,VICTORY"),
    );
    expect(multiHarness.getLastOutput()).toBe("GROUND,VICTORY");
    multiHarness.unmount();
  });
});

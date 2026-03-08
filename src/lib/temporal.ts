export type ParsedTemporal =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "timestamp"; timestampMs: number }
  | { kind: "timediff"; diffMs: number };

export type NormalizedTemporalValue = {
  displayValue: string;
  outputValue: string;
  resolvedTimestampMs?: number;
  resolvedDiffMs?: number;
};

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const DURATION_UNIT_MS = {
  y: YEAR_MS,
  w: WEEK_MS,
  d: DAY_MS,
  h: HOUR_MS,
  m: MINUTE_MS,
  s: SECOND_MS,
} as const;

// Includes seconds. If you only want minute precision, remove ":ss".
export function formatDatetimeLocal(date: Date): string {
  const pad = (num: number) => num.toString().padStart(2, "0");

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

export function formatHumanDatetime(date: Date): string {
  return formatDatetimeLocal(date).replace("T", " ");
}

function parseEpochMs(rawNumeric: string, allowShortBareNumber: boolean): number | null {
  if (!/^[+-]?\d+$/.test(rawNumeric)) {
    return null;
  }

  const digits = rawNumeric.replace(/^[+-]/, "").length;

  // Bare numeric timestamps are only accepted if they look like real unix timestamps.
  // This avoids weird cases like "30" becoming 1970-01-01.
  if (!allowShortBareNumber && digits < 9) {
    return null;
  }

  const value = Number(rawNumeric);
  if (!Number.isFinite(value)) {
    return null;
  }

  // 10 digits or fewer => seconds, otherwise milliseconds.
  return digits <= 10 ? value * 1000 : value;
}

export function parseTimestampMs(raw: string, nowMs: number = Date.now()): number | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }

  if (/^now$/i.test(trimmed)) {
    return nowMs;
  }

  if (/^%epoch%$/i.test(trimmed)) {
    return nowMs;
  }

  if (/^timestamp:/i.test(trimmed)) {
    return parseEpochMs(trimmed.slice("timestamp:".length).trim(), true);
  }

  const bareEpoch = parseEpochMs(trimmed, false);
  if (bareEpoch !== null) {
    return bareEpoch;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const timestampMs = new Date(`${trimmed}T00:00:00`).getTime();
    return Number.isFinite(timestampMs) ? timestampMs : null;
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const timestampMs = new Date(trimmed.replace(" ", "T")).getTime();
    return Number.isFinite(timestampMs) ? timestampMs : null;
  }

  const dayMonthYear = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dayMonthYear) {
    const [, day, month, year, hours = "00", minutes = "00", seconds = "00"] = dayMonthYear;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    if (date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)) {
      return date.getTime();
    }
  }

  // Friendly fallback for pasted ISO/RFC-like strings.
  if (/[-a-z,]/i.test(trimmed)) {
    const timestampMs = new Date(trimmed).getTime();
    return Number.isFinite(timestampMs) ? timestampMs : null;
  }

  return null;
}

// Positive timediff = "ago".
// Negative timediff = "future".
export function parseTimediffMs(raw: string): number | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }

  // Let plain "0" behave as zero diff.
  if (/^[+-]?0+$/.test(trimmed)) {
    return 0;
  }

  if (/^timediff:/i.test(trimmed)) {
    const value = Number(trimmed.slice("timediff:".length).trim());
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  let working = trimmed.toLowerCase();
  let sign = 1;

  working = working.replace(/[\s,]+/g, "");

  if (working.startsWith("+")) {
    working = working.slice(1);
  } else if (working.startsWith("-")) {
    sign *= -1;
    working = working.slice(1);
  }

  if (!working) {
    return null;
  }

  let total = 0;
  let consumed = 0;
  const tokenRe = /(\d+(?:\.\d+)?)(y|w|d|h|m|s)/g;

  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(working)) !== null) {
    if (match.index !== consumed) {
      return null;
    }

    const amount = Number(match[1]);
    const unit = match[2] as keyof typeof DURATION_UNIT_MS;

    if (!Number.isFinite(amount)) {
      return null;
    }

    total += amount * DURATION_UNIT_MS[unit];
    consumed += match[0].length;
  }

  if (consumed !== working.length) {
    return null;
  }

  return Math.round(sign * total);
}

export function formatTimediff(diffMs: number): string {
  if (!Number.isFinite(diffMs)) {
    return "";
  }

  if (diffMs === 0) {
    return "0s";
  }

  const sign = diffMs < 0 ? "-" : "";
  const absoluteMs = Math.abs(diffMs);

  if (absoluteMs < SECOND_MS) {
    return `${sign}${Math.trunc(absoluteMs)}ms`;
  }

  let remaining = Math.round(absoluteMs / SECOND_MS) * SECOND_MS;
  const parts: string[] = [];

  const orderedUnits: ReadonlyArray<readonly [unit: "y" | "w" | "d" | "h" | "m" | "s", size: number]> = [
    ["y", YEAR_MS],
    ["w", WEEK_MS],
    ["d", DAY_MS],
    ["h", HOUR_MS],
    ["m", MINUTE_MS],
    ["s", SECOND_MS],
  ];

  for (const [unit, size] of orderedUnits) {
    const amount = Math.floor(remaining / size);
    if (amount <= 0) {
      continue;
    }

    parts.push(`${amount}${unit}`);
    remaining -= amount * size;
  }

  return `${sign}${parts.join("") || "0s"}`;
}

export function parseTemporalInput(raw: string, nowMs: number = Date.now()): ParsedTemporal {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { kind: "empty" };
  }

  const diffMs = parseTimediffMs(trimmed);
  if (diffMs !== null) {
    return { kind: "timediff", diffMs };
  }

  const timestampMs = parseTimestampMs(trimmed, nowMs);
  if (timestampMs !== null) {
    return { kind: "timestamp", timestampMs };
  }

  return { kind: "invalid" };
}

export function normalizeTimeValue(raw: string, nowMs: number = Date.now()): NormalizedTemporalValue {
  const parsed = parseTemporalInput(raw, nowMs);

  if (parsed.kind === "empty" || parsed.kind === "invalid") {
    return { displayValue: "", outputValue: "" };
  }

  const timestampMs =
    parsed.kind === "timestamp"
      ? parsed.timestampMs
      : nowMs - parsed.diffMs;

  const date = new Date(timestampMs);
  if (!Number.isFinite(date.getTime())) {
    return { displayValue: "", outputValue: "" };
  }

  return {
    displayValue: formatDatetimeLocal(date),
    outputValue: `timestamp:${Math.trunc(timestampMs)}`,
    resolvedTimestampMs: timestampMs,
    resolvedDiffMs: nowMs - timestampMs,
  };
}

export function normalizeTimediffValue(raw: string, nowMs: number = Date.now()): NormalizedTemporalValue {
  const parsed = parseTemporalInput(raw, nowMs);

  if (parsed.kind === "empty" || parsed.kind === "invalid") {
    return { displayValue: "", outputValue: "" };
  }

  const diffMs =
    parsed.kind === "timediff"
      ? parsed.diffMs
      : nowMs - parsed.timestampMs;

  return {
    displayValue: formatTimediff(diffMs),
    outputValue: `timediff:${Math.trunc(diffMs)}`,
    resolvedTimestampMs: nowMs - diffMs,
    resolvedDiffMs: diffMs,
  };
}
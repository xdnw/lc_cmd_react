import { formatDuration } from "@/utils/StringUtil";

export type TransactionNoteBadgeTone = "neutral" | "info" | "success" | "warning";

export type ParsedTransactionNoteBadge = {
  key: string;
  rawKey: string;
  rawValue: string | null;
  label: string;
  value?: string;
  displayLabel: string;
  title: string;
  tone: TransactionNoteBadgeTone;
  nationId?: number;
};

export type ParsedTransactionNote = {
  raw: string;
  badges: ParsedTransactionNoteBadge[];
};

const NOTE_TEXT_DECODER = new TextDecoder();
const NOTE_TAG_PATTERN = /(^|\s)(#[^=\s]+)(?:=([^\s]+))?/g;
const COMPACT_VALUELESS_KEYS = new Set(["grant", "deposit", "tax", "loan", "upkeep"]);
const LOW_SIGNAL_VALUES = /^(?:alliance_id|guild_id|tx_id|transaction_id|true|false|null)$/i;

function toTransactionNoteBytes(note: string | readonly number[] | Uint8Array | null | undefined): Uint8Array | null {
  if (note == null) {
    return null;
  }

  if (note instanceof Uint8Array) {
    return note;
  }

  if (Array.isArray(note)) {
    return Uint8Array.from(note);
  }

  return null;
}

export function decodeTransactionNoteText(note: string | readonly number[] | Uint8Array | null | undefined): string {
  if (typeof note === "string") {
    return note;
  }

  const bytes = toTransactionNoteBytes(note);
  return bytes ? NOTE_TEXT_DECODER.decode(bytes) : "";
}

function trimNoteWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeKey(rawKey: string): string {
  return rawKey.replace(/^#+/, "").trim().toLowerCase();
}

function normalizeValue(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBankerNationId(rawValue: string | null): number | undefined {
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function formatDecayValue(rawValue: string | null, nowMs: number): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  const timestampMatch = rawValue.match(/^(?:timestamp|time|ms):(-?\d+)$/i);
  const parsedTimestamp = timestampMatch ? Number(timestampMatch[1]) : Number(rawValue);
  if (!Number.isFinite(parsedTimestamp)) {
    return undefined;
  }

  const remainingSeconds = Math.max(0, Math.round((parsedTimestamp - nowMs) / 1000));
  if (remainingSeconds <= 0) {
    return "expired";
  }

  return formatDuration(remainingSeconds, 1) || "soon";
}

function formatGenericCompactValue(key: string, rawValue: string | null, nowMs: number): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  if (key === "decay") {
    return formatDecayValue(rawValue, nowMs);
  }

  if (COMPACT_VALUELESS_KEYS.has(key) || LOW_SIGNAL_VALUES.test(rawValue)) {
    return undefined;
  }

  const timestampMatch = rawValue.match(/^(?:timestamp|time|ms):(-?\d+)$/i);
  if (timestampMatch) {
    return formatDecayValue(rawValue, nowMs);
  }

  if (/^\d{7,}$/.test(rawValue)) {
    return undefined;
  }

  const compactValue = rawValue
    .replace(/^(?:nation|leader|alliance|timestamp|time|ms):/i, "")
    .replace(/_/g, " ")
    .trim();

  if (compactValue.length === 0) {
    return undefined;
  }

  return compactValue.length > 18 ? `${compactValue.slice(0, 18)}...` : compactValue;
}

function createBadge(rawKey: string, rawValue: string | null, compact: boolean, nowMs: number): ParsedTransactionNoteBadge {
  const key = normalizeKey(rawKey);
  const title = rawValue ? `${rawKey}=${rawValue}` : rawKey;

  if (!compact) {
    const value = rawValue ?? undefined;
    return {
      key,
      rawKey,
      rawValue,
      label: key,
      value,
      displayLabel: value ? `${key}:${value}` : key,
      title,
      tone: key === "grant" ? "success" : key === "decay" ? "warning" : "info",
      nationId: key === "banker" ? parseBankerNationId(rawValue) : undefined,
    };
  }

  if (key === "banker") {
    const nationId = parseBankerNationId(rawValue);
    const value = rawValue ?? undefined;
    return {
      key,
      rawKey,
      rawValue,
      label: "banker",
      value,
      displayLabel: value ? `banker:${value}` : "banker",
      title,
      tone: "info",
      nationId,
    };
  }

  if (key === "grant") {
    return {
      key,
      rawKey,
      rawValue,
      label: "grant",
      displayLabel: "grant",
      title,
      tone: "success",
    };
  }

  if (key === "decay") {
    const value = formatDecayValue(rawValue, nowMs);
    return {
      key,
      rawKey,
      rawValue,
      label: "decay",
      value,
      displayLabel: value ? `decay:${value}` : "decay",
      title,
      tone: "warning",
    };
  }

  const value = formatGenericCompactValue(key, rawValue, nowMs);
  return {
    key,
    rawKey,
    rawValue,
    label: key,
    value,
    displayLabel: value ? `${key}:${value}` : key,
    title,
    tone: "neutral",
  };
}

function extractResidualText(note: string): string[] {
  const withoutTags = note.replace(NOTE_TAG_PATTERN, " ");
  return withoutTags
    .split(/[|;,]+/)
    .map((part) => trimNoteWhitespace(part))
    .filter((part) => part.length > 0)
    .map((part) => (part.length > 28 ? `${part.slice(0, 28)}...` : part));
}

export function parseTransactionNote(note: string | readonly number[] | Uint8Array | null | undefined, options?: { compact?: boolean; nowMs?: number }): ParsedTransactionNote {
  const raw = trimNoteWhitespace(decodeTransactionNoteText(note));
  if (raw.length === 0) {
    return { raw: "", badges: [] };
  }

  const compact = options?.compact ?? false;
  const nowMs = options?.nowMs ?? Date.now();
  const badges: ParsedTransactionNoteBadge[] = [];
  const seenKeys = new Set<string>();

  for (const match of raw.matchAll(NOTE_TAG_PATTERN)) {
    const rawKey = match[2];
    if (!rawKey) {
      continue;
    }

    const rawValue = normalizeValue(match[3]);
    const key = `${normalizeKey(rawKey)}=${rawValue ?? ""}`;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    badges.push(createBadge(rawKey, rawValue, compact, nowMs));
  }

  for (const text of extractResidualText(raw)) {
    badges.push({
      key: "text",
      rawKey: text,
      rawValue: null,
      label: text,
      displayLabel: text,
      title: text,
      tone: "neutral",
    });
  }

  return { raw, badges };
}

export function collectTransactionNoteNationIds(notes: readonly ParsedTransactionNote[]): number[] {
  const ids = new Set<number>();
  for (const note of notes) {
    for (const badge of note.badges) {
      if (typeof badge.nationId === "number" && badge.nationId > 0) {
        ids.add(badge.nationId);
      }
    }
  }
  return [...ids];
}

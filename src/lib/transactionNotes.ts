import { formatDuration } from "@/utils/StringUtil";

import {
  TRANSACTION_NOTE_DEPOSIT_TYPE_KEYS,
  TRANSACTION_NOTE_NATION_META_NAMES,
  TRANSACTION_NOTE_PROJECT_NAMES_BY_ID,
  type TransactionNoteDepositTypeKey,
} from "./transactionNoteMetadata";

export type TransactionNoteInput = string | readonly number[] | Uint8Array | null | undefined;

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

const NOTE_TAG_PATTERN = /(^|\s)(#[^=\s]+)(?:=([^\s]+))?/g;
const COMPACT_VALUELESS_KEYS = new Set(["grant", "deposit", "tax", "loan", "upkeep"]);
const LOW_SIGNAL_VALUES = /^(?:alliance_id|guild_id|tx_id|transaction_id|true|false|null)$/i;
const DEPOSIT_TYPE_KEYS = TRANSACTION_NOTE_DEPOSIT_TYPE_KEYS;

type StructuredDepositTypeKey = TransactionNoteDepositTypeKey;
type StructuredNoteScalar = number | string;
type StructuredNoteValue = StructuredNoteScalar | StructuredNoteScalar[];
type StructuredNoteEntry = {
  ordinal: number;
  key: StructuredDepositTypeKey;
  value: StructuredNoteValue | null;
};

const PROJECT_NAMES_BY_ID = TRANSACTION_NOTE_PROJECT_NAMES_BY_ID;

const NATION_META_NAMES = TRANSACTION_NOTE_NATION_META_NAMES;

const TIMESTAMP_VALUE_KEYS = new Set<StructuredDepositTypeKey>(["expire", "decay"]);

function maskBits(count: number): bigint {
  if (count <= 0) {
    return 0n;
  }
  return (1n << BigInt(count)) - 1n;
}

class StructuredNoteBitReader {
  private buffer = 0n;
  private bitsInBuffer = 0;
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  private fillBuffer(): void {
    let next = 0n;
    for (let i = 0; i < 8; i += 1) {
      const byte = this.bytes[this.offset + i] ?? 0;
      next |= BigInt(byte) << BigInt(i * 8);
    }
    this.buffer = next;
    this.bitsInBuffer = 64;
    this.offset += 8;
  }

  readBits(count: number): bigint {
    if (count <= 0) {
      return 0n;
    }

    if (count <= this.bitsInBuffer) {
      const value = this.buffer & maskBits(count);
      this.buffer >>= BigInt(count);
      this.bitsInBuffer -= count;
      return value;
    }

    const lowerCount = this.bitsInBuffer;
    const lower = this.buffer & maskBits(lowerCount);
    const remaining = count - lowerCount;
    this.fillBuffer();
    const upper = this.buffer & maskBits(remaining);
    this.buffer >>= BigInt(remaining);
    this.bitsInBuffer = 64 - remaining;
    return lower | (upper << BigInt(lowerCount));
  }

  readBit(): boolean {
    return this.readBits(1) === 1n;
  }

  readBitsNumber(count: number): number {
    return Number(this.readBits(count));
  }

  readByte(): number {
    return this.readBitsNumber(8);
  }

  readVarInt(): number {
    let value = 0;
    let shift = 0;
    let current = 0;

    do {
      current = this.readByte();
      value |= (current & 0x7f) << shift;
      shift += 7;
      if (shift > 35) {
        throw new Error("VarInt too big");
      }
    } while ((current & 0x80) !== 0);

    return value;
  }

  readVarLong(): number {
    let value = 0n;
    let shift = 0n;
    let current = 0;

    do {
      current = this.readByte();
      value |= BigInt(current & 0x7f) << shift;
      shift += 7n;
      if (shift > 63n) {
        throw new Error("VarLong too big");
      }
    } while ((current & 0x80) !== 0);

    return Number(value);
  }

  readFloat64(): number {
    const bits = this.readBits(64);
    const lower = Number(bits & 0xffff_ffffn);
    const upper = Number((bits >> 32n) & 0xffff_ffffn);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, lower, true);
    view.setUint32(4, upper, true);
    return view.getFloat64(0, true);
  }
}

function toTransactionNoteBytes(note: TransactionNoteInput): Uint8Array | null {
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

function readStructuredNoteValue(reader: StructuredNoteBitReader, key: StructuredDepositTypeKey): StructuredNoteValue | null {
  switch (key) {
    case "city": {
      const size = reader.readVarInt();
      if (size <= 0) {
        return null;
      }
      if (size === 1) {
        return reader.readVarInt();
      }
      const values: number[] = [];
      for (let i = 0; i < size; i += 1) {
        values.push(reader.readVarInt());
      }
      return values;
    }
    case "project": {
      const projectId = reader.readByte();
      const projectName = PROJECT_NAMES_BY_ID[projectId];
      if (!projectName) {
        throw new Error(
          `Unsupported transaction note project id ${projectId}. Update PROJECT_OPTION_INDEX_BY_TRANSACTION_NOTE_ID or legacy ids in src/lib/transactionNoteMetadata.ts.`,
        );
      }
      return projectName;
    }
    case "infra":
    case "land":
    case "cash":
      return reader.readFloat64();
    case "expire":
    case "decay":
      return reader.readVarLong();
    case "incentive": {
      const nationMetaOrdinal = reader.readByte();
      return NATION_META_NAMES[nationMetaOrdinal] ?? String(nationMetaOrdinal);
    }
    default:
      return reader.readVarLong();
  }
}

function decodeStructuredNoteEntries(noteBytes: Uint8Array): StructuredNoteEntry[] {
  const reader = new StructuredNoteBitReader(noteBytes);
  if (!reader.readBit()) {
    return [];
  }

  const size = reader.readBitsNumber(5);
  const entries: StructuredNoteEntry[] = [];
  for (let i = 0; i < size; i += 1) {
    const ordinal = reader.readBitsNumber(5);
    const key = DEPOSIT_TYPE_KEYS[ordinal];
    if (!key) {
      throw new Error(`Unsupported transaction note deposit type ordinal ${ordinal}`);
    }
    const hasValue = reader.readBit();
    entries.push({
      ordinal,
      key,
      value: hasValue ? readStructuredNoteValue(reader, key) : null,
    });
  }

  entries.sort((left, right) => left.ordinal - right.ordinal);
  return entries;
}

function formatStructuredScalar(key: StructuredDepositTypeKey, value: StructuredNoteScalar): string {
  if (typeof value === "number") {
    if (TIMESTAMP_VALUE_KEYS.has(key)) {
      return `timestamp:${Math.trunc(value)}`;
    }
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return value;
}

function formatStructuredValue(key: StructuredDepositTypeKey, value: StructuredNoteValue | null): string | null {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    const formatted = value.map((entry) => formatStructuredScalar(key, entry)).sort((left, right) => left.localeCompare(right));
    return formatted.join(",");
  }

  return formatStructuredScalar(key, value);
}

function decodeStructuredTransactionNoteText(noteBytes: Uint8Array): string {
  try {
    const entries = decodeStructuredNoteEntries(noteBytes);
    return entries.map((entry) => {
      const formattedValue = formatStructuredValue(entry.key, entry.value);
      return formattedValue == null ? `#${entry.key}` : `#${entry.key}=${formattedValue}`;
    }).join(" ");
  } catch {
    return "";
  }
}

export function decodeTransactionNoteText(note: TransactionNoteInput): string {
  if (typeof note === "string") {
    return note;
  }

  const bytes = toTransactionNoteBytes(note);
  return bytes ? decodeStructuredTransactionNoteText(bytes) : "";
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

export function parseTransactionNote(note: TransactionNoteInput, options?: { compact?: boolean; nowMs?: number }): ParsedTransactionNote {
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

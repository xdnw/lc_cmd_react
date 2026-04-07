import { describe, expect, it } from "vitest";

import { collectTransactionNoteNationIds, decodeTransactionNoteText, parseTransactionNote } from "./transactionNotes";

function maskBits(count: number): bigint {
  if (count <= 0) {
    return 0n;
  }
  return (1n << BigInt(count)) - 1n;
}

class TestBitWriter {
  private buffer = 0n;
  private bitsInBuffer = 0;
  private readonly bytes: number[] = [];

  private flush(): void {
    for (let i = 0; i < 8; i += 1) {
      this.bytes.push(Number((this.buffer >> BigInt(i * 8)) & 0xffn));
    }
    this.buffer = 0n;
    this.bitsInBuffer = 0;
  }

  writeBits(value: number | bigint, count: number): void {
    const next = BigInt(value);
    const remainingBits = 64 - this.bitsInBuffer;

    if (count <= remainingBits) {
      this.buffer |= (next & maskBits(count)) << BigInt(this.bitsInBuffer);
      this.bitsInBuffer += count;
      if (this.bitsInBuffer === 64) {
        this.flush();
      }
      return;
    }

    this.buffer |= (next & maskBits(remainingBits)) << BigInt(this.bitsInBuffer);
    this.flush();

    const remainingCount = count - remainingBits;
    this.buffer |= (next >> BigInt(remainingBits)) & maskBits(remainingCount);
    this.bitsInBuffer = remainingCount;
  }

  writeBit(value: boolean): void {
    this.writeBits(value ? 1 : 0, 1);
  }

  writeByte(value: number): void {
    this.writeBits(value, 8);
  }

  writeVarInt(value: number): void {
    let current = value;
    while ((current & -128) !== 0) {
      this.writeByte((current & 127) | 128);
      current >>>= 7;
    }
    this.writeByte(current);
  }

  writeVarLong(value: number): void {
    let current = BigInt(value);
    while ((current & ~0x7fn) !== 0n) {
      this.writeByte(Number((current & 0x7fn) | 0x80n));
      current >>= 7n;
    }
    this.writeByte(Number(current));
  }

  finish(): number[] {
    const written = [...this.bytes];
    const pendingBytes = Math.ceil(this.bitsInBuffer / 8);
    let pending = this.buffer;
    for (let i = 0; i < pendingBytes; i += 1) {
      written.push(Number(pending & 0xffn));
      pending >>= 8n;
    }
    return written;
  }
}

function encodeStructuredNote(entries: Array<{ ordinal: number; hasValue: boolean; writeValue?: (writer: TestBitWriter) => void }>): number[] {
  const writer = new TestBitWriter();
  writer.writeBit(true);
  writer.writeBits(entries.length, 5);
  for (const entry of entries) {
    writer.writeBits(entry.ordinal, 5);
    writer.writeBit(entry.hasValue);
    entry.writeValue?.(writer);
  }
  return writer.finish();
}

describe("transactionNotes", () => {
  it("compacts known tax transaction tags into concise badges", () => {
    const parsed = parseTransactionNote(
      "#grant=ALLIANCE_ID #decay=timestamp:259200000 #banker=1234 manual transfer",
      { compact: true, nowMs: 0 },
    );

    expect(parsed.badges.map((badge) => badge.displayLabel)).toEqual([
      "grant",
      "decay:3d",
      "banker:1234",
      "manual transfer",
    ]);
  });

  it("keeps full values when compact mode is disabled", () => {
    const parsed = parseTransactionNote("#banker=1234 #grant=ALLIANCE_ID", { compact: false, nowMs: 0 });

    expect(parsed.badges.map((badge) => badge.displayLabel)).toEqual([
      "banker:1234",
      "grant:ALLIANCE_ID",
    ]);
  });

  it("collects unique nation ids referenced by note badges", () => {
    const notes = [
      parseTransactionNote("#banker=1234 #grant=ALLIANCE_ID", { compact: true, nowMs: 0 }),
      parseTransactionNote("#banker=1234 #banker=9876", { compact: true, nowMs: 0 }),
    ];

    expect(collectTransactionNoteNationIds(notes)).toEqual([1234, 9876]);
  });

  it("decodes byte notes before parsing badges", () => {
    const noteBytes = encodeStructuredNote([
      { ordinal: 24, hasValue: true, writeValue: (writer) => writer.writeVarLong(1234) },
      { ordinal: 3, hasValue: false },
    ]);

    expect(decodeTransactionNoteText(noteBytes)).toBe("#grant #banker=1234");
    expect(parseTransactionNote(noteBytes, { compact: true, nowMs: 0 }).badges.map((badge) => badge.displayLabel)).toEqual([
      "grant",
      "banker:1234",
    ]);
  });

  it("decodes structured project and incentive ids through shared metadata", () => {
    const noteBytes = encodeStructuredNote([
      { ordinal: 7, hasValue: true, writeValue: (writer) => writer.writeByte(14) },
      { ordinal: 17, hasValue: true, writeValue: (writer) => writer.writeByte(14) },
    ]);

    expect(decodeTransactionNoteText(noteBytes)).toBe("#project=urban_planning #incentive=LAST_PROJECT_GRANT");
  });

  it("uses the shared project option name without frontend overrides", () => {
    const noteBytes = encodeStructuredNote([
      { ordinal: 7, hasValue: true, writeValue: (writer) => writer.writeByte(10) },
    ]);

    expect(decodeTransactionNoteText(noteBytes)).toBe("#project=intelligence_agency");
  });
});

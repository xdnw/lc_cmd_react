import { describe, expect, it } from "vitest";

import { collectTransactionNoteNationIds, decodeTransactionNoteText, parseTransactionNote } from "./transactionNotes";

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
    const noteBytes = Array.from(new TextEncoder().encode("#banker=1234 manual transfer"));

    expect(decodeTransactionNoteText(noteBytes)).toBe("#banker=1234 manual transfer");
    expect(parseTransactionNote(noteBytes, { compact: true, nowMs: 0 }).badges.map((badge) => badge.displayLabel)).toEqual([
      "banker:1234",
      "manual transfer",
    ]);
  });
});

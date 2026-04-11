import type { JSONValue } from "@/lib/internaltypes";
import { describe, expect, it } from "vitest";

import { compareConflictsByEndDateDesc, isConflictActionFrontendUngated } from "./conflictsPageRules";

function createConflictRow({
    id,
    start,
    end,
}: {
    id: number;
    start: number;
    end: number;
}): JSONValue[] {
    return [id, `Conflict ${id}`, "", start, end, "", "", "", "", ""];
}

describe("compareConflictsByEndDateDesc", () => {
    it("keeps ongoing conflicts ahead of ended conflicts", () => {
        const rows = [
            createConflictRow({ id: 2, start: 80, end: 120 }),
            createConflictRow({ id: 1, start: 100, end: -1 }),
            createConflictRow({ id: 3, start: 90, end: 60 }),
        ];

        const sortedIds = rows.slice().sort(compareConflictsByEndDateDesc).map((row) => row[0]);

        expect(sortedIds).toEqual([1, 2, 3]);
    });

    it("sorts ended conflicts by descending end date", () => {
        const rows = [
            createConflictRow({ id: 1, start: 10, end: 50 }),
            createConflictRow({ id: 2, start: 20, end: 120 }),
            createConflictRow({ id: 3, start: 30, end: 80 }),
        ];

        const sortedIds = rows.slice().sort(compareConflictsByEndDateDesc).map((row) => row[0]);

        expect(sortedIds).toEqual([2, 3, 1]);
    });

    it("breaks ongoing ties by newer start date", () => {
        const rows = [
            createConflictRow({ id: 1, start: 20, end: -1 }),
            createConflictRow({ id: 2, start: 40, end: -1 }),
            createConflictRow({ id: 3, start: 10, end: -1 }),
        ];

        const sortedIds = rows.slice().sort(compareConflictsByEndDateDesc).map((row) => row[0]);

        expect(sortedIds).toEqual([2, 1, 3]);
    });
});

describe("isConflictActionFrontendUngated", () => {
    it("allows the requested ungated actions only", () => {
        expect(isConflictActionFrontendUngated("sync-selected")).toBe(true);
        expect(isConflictActionFrontendUngated("sync-single")).toBe(true);
        expect(isConflictActionFrontendUngated("alliance-add")).toBe(true);
        expect(isConflictActionFrontendUngated("alliance-remove")).toBe(false);
        expect(isConflictActionFrontendUngated("edit-status")).toBe(false);
    });
});
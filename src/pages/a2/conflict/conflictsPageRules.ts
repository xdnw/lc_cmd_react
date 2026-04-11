import type { JSONValue } from "@/lib/internaltypes";

const FRONTEND_UNGATED_CONFLICT_ACTION_IDS = new Set([
    "sync-selected",
    "sync-single",
    "alliance-add",
]);

// Keep these indices local so the page rules stay testable without importing
// the full conflict table schema module and its layout side effects.
const CONFLICT_ID_INDEX = 0;
const CONFLICT_START_INDEX = 3;
const CONFLICT_END_INDEX = 4;

function toFiniteNumber(value: JSONValue): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function isConflictActionFrontendUngated(actionId: string): boolean {
    return FRONTEND_UNGATED_CONFLICT_ACTION_IDS.has(actionId);
}

export function compareConflictsByEndDateDesc(left: JSONValue[], right: JSONValue[]): number {
    const leftEnd = toFiniteNumber(left[CONFLICT_END_INDEX]);
    const rightEnd = toFiniteNumber(right[CONFLICT_END_INDEX]);
    const leftOngoing = leftEnd !== null && leftEnd < 0;
    const rightOngoing = rightEnd !== null && rightEnd < 0;

    if (leftOngoing !== rightOngoing) {
        return leftOngoing ? -1 : 1;
    }

    const normalizedLeftEnd = leftEnd ?? Number.NEGATIVE_INFINITY;
    const normalizedRightEnd = rightEnd ?? Number.NEGATIVE_INFINITY;
    if (normalizedLeftEnd !== normalizedRightEnd) {
        return normalizedRightEnd - normalizedLeftEnd;
    }

    const leftStart = toFiniteNumber(left[CONFLICT_START_INDEX]) ?? Number.NEGATIVE_INFINITY;
    const rightStart = toFiniteNumber(right[CONFLICT_START_INDEX]) ?? Number.NEGATIVE_INFINITY;
    if (leftStart !== rightStart) {
        return rightStart - leftStart;
    }

    const leftId = toFiniteNumber(left[CONFLICT_ID_INDEX]) ?? Number.NEGATIVE_INFINITY;
    const rightId = toFiniteNumber(right[CONFLICT_ID_INDEX]) ?? Number.NEGATIVE_INFINITY;
    return rightId - leftId;
}
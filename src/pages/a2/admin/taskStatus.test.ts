import { describe, expect, it } from "vitest";

import type { TaskSummary } from "@/lib/apitypes";

import { TaskOutcome, getTaskStatus } from "./taskStatus";

function createTaskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
    return {
        id: 7,
        name: "task-7",
        createdAtMs: 1_000,
        intervalMs: 30_000,
        running: false,
        currentRunStartMs: 0,
        lastRunStartMs: 100_000,
        lastRunEndMs: 110_000,
        lastRunDurationMs: 2_500,
        lastOutcome: TaskOutcome.SUCCESS,
        totalRuns: 12,
        totalSuccess: 12,
        totalErrors: 0,
        totalInterrupts: 0,
        consecutiveFailures: 0,
        lastSuccessAtMs: 110_000,
        lastFailureAtMs: 0,
        lastErrorClass: "",
        lastErrorMessage: "",
        ...overrides,
    };
}

describe("getTaskStatus", () => {
    it("keeps recovered failures visible even after a later success", () => {
        const recovered = createTaskSummary({
            lastOutcome: TaskOutcome.SUCCESS,
            totalSuccess: 18,
            totalErrors: 4,
            totalInterrupts: 1,
            lastFailureAtMs: 150_000,
            lastSuccessAtMs: 180_000,
            lastErrorClass: "TaskFailure",
            lastErrorMessage: "Transient upstream error.",
        });
        const clean = createTaskSummary({
            id: 8,
            name: "task-8",
            lastSuccessAtMs: 180_000,
        });

        const recoveredStatus = getTaskStatus(recovered, 200_000);
        const cleanStatus = getTaskStatus(clean, 200_000);

        expect(recoveredStatus.health.health).toBe("OK");
        expect(recoveredStatus.history.state).toBe("RECOVERED");
        expect(recoveredStatus.history.totalFailures).toBe(5);
        expect(recoveredStatus.sortSeverity).toBeLessThan(cleanStatus.sortSeverity);
    });

    it("marks unresolved failures as active when the last failure is newer than the last success", () => {
        const task = createTaskSummary({
            lastOutcome: TaskOutcome.SUCCESS,
            totalErrors: 2,
            lastFailureAtMs: 190_000,
            lastSuccessAtMs: 120_000,
        });

        const status = getTaskStatus(task, 200_000);

        expect(status.health.health).toBe("OK");
        expect(status.history.state).toBe("ACTIVE");
        expect(status.sortSeverity).toBe(4);
    });

    it("keeps the current health states for live failures and stale tasks", () => {
        const failing = createTaskSummary({
            lastOutcome: TaskOutcome.ERROR,
            totalErrors: 3,
            lastFailureAtMs: 190_000,
            lastSuccessAtMs: 120_000,
            lastErrorMessage: "boom",
        });
        const stale = createTaskSummary({
            id: 9,
            name: "task-9",
            lastRunEndMs: 20_000,
            lastSuccessAtMs: 20_000,
        });

        const failingStatus = getTaskStatus(failing, 200_000);
        const staleStatus = getTaskStatus(stale, 200_000);

        expect(failingStatus.health).toMatchObject({ health: "ERROR", reason: "boom" });
        expect(failingStatus.history.state).toBe("ACTIVE");
        expect(staleStatus.health.health).toBe("STALE");
    });

    it("marks never-run tasks without failure signals as clean", () => {
        const task = createTaskSummary({
            totalRuns: 0,
            lastOutcome: TaskOutcome.EMPTY,
            totalSuccess: 0,
            lastRunEndMs: 0,
            lastSuccessAtMs: 0,
        });

        const status = getTaskStatus(task, 200_000);

        expect(status.health.health).toBe("NEVER");
        expect(status.history.state).toBe("CLEAN");
        expect(status.sortSeverity).toBe(6);
    });
});

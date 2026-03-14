import type { TaskSummary } from "@/lib/apitypes";

export const TaskOutcome = {
    EMPTY: 0,
    SUCCESS: 1,
    ERROR: 2,
    INTERRUPTED: 3,
} as const;

export type TaskHealth = "OK" | "ERROR" | "INTERRUPTED" | "STALE" | "STUCK" | "NEVER";
export type TaskHistoryState = "CLEAN" | "RECOVERED" | "ACTIVE";

export type TaskHealthInfo = {
    health: TaskHealth;
    reason?: string;
};

export type TaskHistoryInfo = {
    state: TaskHistoryState;
    totalFailures: number;
    totalErrors: number;
    totalInterrupts: number;
    lastFailureAtMs: number;
    lastSuccessAtMs: number;
};

export type TaskStatusInfo = {
    health: TaskHealthInfo;
    history: TaskHistoryInfo;
    sortSeverity: number; // smaller => earlier in the dashboard
};

function fmtMs(ms?: number) {
    if (ms === undefined || ms < 0) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
    return `${(ms / 3_600_000).toFixed(1)}h`;
}

function clampNonNegative(value: number | undefined) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value ?? 0);
}

export function getTaskHealth(task: TaskSummary, now?: number): TaskHealthInfo {
    if (task.totalRuns <= 0 || task.lastOutcome === TaskOutcome.EMPTY) {
        return { health: "NEVER" };
    }

    const interval = Math.max(1, task.intervalMs);

    if (now && task.running && task.currentRunStartMs > 0) {
        const runningFor = now - task.currentRunStartMs;
        const stuckMs = Math.max(interval * 5, 60_000);
        if (runningFor > stuckMs) {
            return { health: "STUCK", reason: `running for ${fmtMs(runningFor)}` };
        }
    }

    if (task.lastOutcome === TaskOutcome.ERROR) {
        return { health: "ERROR", reason: task.lastErrorMessage || undefined };
    }

    if (task.lastOutcome === TaskOutcome.INTERRUPTED) {
        return { health: "INTERRUPTED", reason: "interrupted" };
    }

    if (now && task.lastRunEndMs > 0) {
        const sinceEnd = now - task.lastRunEndMs;
        const staleMs = Math.max(interval * 3, 60_000);
        if (sinceEnd > staleMs) {
            return { health: "STALE", reason: `last end ${fmtMs(sinceEnd)} ago` };
        }
    }

    return { health: "OK" };
}

export function getTaskHistory(task: TaskSummary): TaskHistoryInfo {
    const totalErrors = clampNonNegative(task.totalErrors);
    const totalInterrupts = clampNonNegative(task.totalInterrupts);
    const totalFailures = totalErrors + totalInterrupts;
    const lastFailureAtMs = clampNonNegative(task.lastFailureAtMs);
    const lastSuccessAtMs = clampNonNegative(task.lastSuccessAtMs);
    const hasFailureSignals =
        totalFailures > 0 ||
        lastFailureAtMs > 0 ||
        task.consecutiveFailures > 0 ||
        task.lastOutcome === TaskOutcome.ERROR ||
        task.lastOutcome === TaskOutcome.INTERRUPTED;

    if (!hasFailureSignals) {
        return {
            state: "CLEAN",
            totalFailures,
            totalErrors,
            totalInterrupts,
            lastFailureAtMs,
            lastSuccessAtMs,
        };
    }

    const failureIsLatestTerminalEvent =
        lastFailureAtMs > 0 && (lastSuccessAtMs <= 0 || lastFailureAtMs >= lastSuccessAtMs);
    const isActiveFailure =
        task.consecutiveFailures > 0 ||
        task.lastOutcome === TaskOutcome.ERROR ||
        task.lastOutcome === TaskOutcome.INTERRUPTED ||
        failureIsLatestTerminalEvent;

    return {
        state: isActiveFailure ? "ACTIVE" : "RECOVERED",
        totalFailures,
        totalErrors,
        totalInterrupts,
        lastFailureAtMs,
        lastSuccessAtMs,
    };
}

function taskSortSeverity(health: TaskHealthInfo, history: TaskHistoryInfo) {
    if (health.health === "STUCK") return 0;
    if (health.health === "ERROR") return 1;
    if (health.health === "INTERRUPTED") return 2;
    if (health.health === "STALE") return 3;
    if (history.state === "ACTIVE") return 4;
    if (history.state === "RECOVERED") return 5;
    if (health.health === "NEVER") return 6;
    return 7;
}

export function getTaskStatus(task: TaskSummary, now?: number): TaskStatusInfo {
    const health = getTaskHealth(task, now);
    const history = getTaskHistory(task);

    return {
        health,
        history,
        sortSeverity: taskSortSeverity(health, history),
    };
}

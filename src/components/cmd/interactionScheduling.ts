import { startTransition } from "react";

type IdleQueueTask = {
    id: number;
    callback: () => void;
};

let nextIdleTaskId = 0;
let idleQueue: IdleQueueTask[] = [];
let idleHandle: number | null = null;
let idleHandleType: "idle" | "timeout" | null = null;

function clearScheduledIdleHandle(): void {
    if (typeof window === "undefined" || idleHandle == null) {
        idleHandle = null;
        idleHandleType = null;
        return;
    }

    const win = window as Window & {
        cancelIdleCallback?: (id: number) => void;
    };

    if (idleHandleType === "idle") {
        win.cancelIdleCallback?.(idleHandle);
    } else {
        window.clearTimeout(idleHandle);
    }

    idleHandle = null;
    idleHandleType = null;
}

function flushIdleQueue(deadline?: IdleDeadline): void {
    clearScheduledIdleHandle();

    if (idleQueue.length === 0) {
        return;
    }

    const startTime = typeof performance !== "undefined" ? performance.now() : 0;
    let processedCount = 0;

    while (idleQueue.length > 0) {
        if (deadline) {
            if (processedCount > 0 && !deadline.didTimeout && deadline.timeRemaining() <= 3) {
                break;
            }
        } else if (processedCount > 0 && typeof performance !== "undefined" && performance.now() - startTime >= 8) {
            break;
        }

        const task = idleQueue.shift();
        if (!task) {
            break;
        }

        task.callback();
        processedCount += 1;
    }

    if (idleQueue.length > 0) {
        scheduleIdleFlush();
    }
}

function scheduleIdleFlush(timeout = 2000): void {
    if (typeof window === "undefined" || idleHandle != null) {
        return;
    }

    const win = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    };

    if (win.requestIdleCallback) {
        idleHandleType = "idle";
        idleHandle = win.requestIdleCallback((deadline) => flushIdleQueue(deadline), { timeout });
        return;
    }

    idleHandleType = "timeout";
    idleHandle = window.setTimeout(() => flushIdleQueue(), Math.min(timeout, 50));
}

export function scheduleInteractionTransition(callback: () => void): () => void {
    if (typeof window === "undefined") {
        startTransition(callback);
        return () => undefined;
    }

    let frameId: number | null = window.requestAnimationFrame(() => {
        frameId = null;
        startTransition(callback);
    });

    return () => {
        if (frameId != null) {
            window.cancelAnimationFrame(frameId);
        }
    };
}

export function scheduleWhenIdle(callback: () => void, timeout = 2000): () => void {
    if (typeof window === "undefined") {
        callback();
        return () => undefined;
    }

    nextIdleTaskId += 1;
    const taskId = nextIdleTaskId;
    idleQueue.push({ id: taskId, callback });
    scheduleIdleFlush(timeout);

    return () => {
        idleQueue = idleQueue.filter((task) => task.id !== taskId);
        if (idleQueue.length === 0) {
            clearScheduledIdleHandle();
        }
    };
}
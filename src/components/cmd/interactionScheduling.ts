import { startTransition } from "react";

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

    const win = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (id: number) => void;
    };

    if (win.requestIdleCallback) {
        const id = win.requestIdleCallback(() => callback(), { timeout });
        return () => {
            win.cancelIdleCallback?.(id);
        };
    }

    const timeoutId = window.setTimeout(callback, Math.min(timeout, 300));
    return () => window.clearTimeout(timeoutId);
}
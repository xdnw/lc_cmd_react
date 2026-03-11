import { createRoot } from "react-dom/client";
import { useCallback, useRef, useState } from "react";

import { UNPACKR } from "@/lib/msgpack";
import type { ShowDialogFn } from "@/lib/dialog";
import { DiscordEmbed, Embed } from "@/components/ui/MarkupRenderer";
import { getCommandAndBehavior } from "@/utils/Command";

export type CommandMessage = { [key: string]: string | object | object[] | number | number[] | string[] };
type Msg = CommandMessage;

export type CommandResponseStatus = "success" | "error" | "action";

export type CommandActionResult = {
    status: CommandResponseStatus;
    message?: string;
    raw: CommandMessage;
};

export function getCommandResponseStatus(json: CommandMessage): CommandResponseStatus {
    if (json.error != null) return "error";
    if (typeof json.action === "string") return "action";
    return "success";
}

export function getCommandResponseSummary(json: CommandMessage): string | undefined {
    if (json.error != null) {
        if (typeof json.error === "string") return json.error;
        return json.title as string | undefined;
    }
    if (typeof json.action === "string") return json.action;
    if (typeof json.title === "string") return json.title;
    return undefined;
}

export function normalizeCommandActionResult(raw: CommandMessage): CommandActionResult {
    return {
        status: getCommandResponseStatus(raw),
        message: getCommandResponseSummary(raw),
        raw,
    };
}

export function runCommand({
    command,
    values,
    onResponse,
    onDone,
}: {
    command: string;
    values: { [key: string]: string | string[] };
    onResponse: (json: Msg) => void;
    onDone?: () => void;
}) {
    const url = new URL(`${process.env.BACKEND_URL}sse/${command}`);
    for (const [key, value] of Object.entries(values)) {
        if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
        else url.searchParams.append(key, value);
    }

    const controller = new AbortController();

    (async () => {
        const res = await fetch(url.toString(), {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
            headers: { Accept: "application/x-msgpack" },
        });

        if (!res.ok || !res.body) {
            onResponse({ error: res.statusText, title: "Error Fetching" });
            onDone?.();
            return;
        }

        const reader = res.body.getReader();
        let buf = new Uint8Array(64 * 1024);
        let view = new DataView(buf.buffer);
        let readOffset = 0;
        let writeOffset = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!value?.length) continue;

                if (buf.length - writeOffset < value.length) {
                    if (readOffset > 0) {
                        buf.copyWithin(0, readOffset, writeOffset);
                        writeOffset -= readOffset;
                        readOffset = 0;
                    }
                    if (buf.length - writeOffset < value.length) {
                        const bigger = new Uint8Array(Math.max(buf.length * 2, writeOffset + value.length));
                        bigger.set(buf.subarray(0, writeOffset));
                        buf = bigger;
                        view = new DataView(buf.buffer);
                    }
                }

                buf.set(value, writeOffset);
                writeOffset += value.length;

                while (writeOffset - readOffset >= 4) {
                    const len = view.getUint32(readOffset, false);
                    if (len > 50 * 1024 * 1024) {
                        throw new Error(`Frame too large: ${len} bytes`);
                    }
                    if (writeOffset - readOffset < 4 + len) {
                        break;
                    }

                    const payload = buf.subarray(readOffset + 4, readOffset + 4 + len);
                    onResponse(UNPACKR.decode(payload) as Msg);
                    readOffset += 4 + len;
                }

                if (readOffset === writeOffset) {
                    readOffset = 0;
                    writeOffset = 0;
                }
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                console.error("Stream error:", error);
                onResponse({ error: String(error), title: "Stream Error" });
                controller.abort();
            }
        } finally {
            try {
                await reader.cancel();
            } catch {
                // Ignore cancellation errors when the stream is already closed.
            }
            onDone?.();
        }
    })().catch((error) => {
        if (!controller.signal.aborted) {
            onResponse({ error: String(error), title: "Fetch Error" });
        }
        onDone?.();
    });

    return { abort: () => controller.abort() };
}

function handleDialog({
    json,
    responseRef,
    showDialog,
}: {
    json: Msg;
    responseRef?: React.RefObject<HTMLDivElement | null>;
    showDialog: ShowDialogFn;
}): boolean {
    if (json.error && json.title) {
        showDialog(json.title as string, JSON.stringify(json.error));
        return true;
    }

    const action = json.action as string | undefined;
    if (!action) {
        return false;
    }

    if (action === "deleteByIds") {
        const ids = json.value as string[];
        if (responseRef?.current) {
            ids.forEach((id) => {
                const element = responseRef.current?.querySelector(`[id="${id}"]`);
                element?.remove();
            });
        }
        return true;
    }

    if (action === "redirect") {
        const value = json.value as string;
        showDialog("Redirecting", `Redirecting to ${value}`);
        setTimeout(() => {
            window.location.href = value;
        }, 2000);
        return true;
    }

    showDialog("Unknown action", `Unknown action: ${action}`);
    return true;
}

export function handleResponse({
    json,
    responseRef,
    showDialog,
}: {
    json: CommandMessage;
    responseRef: React.RefObject<HTMLDivElement | null>;
    showDialog: ShowDialogFn;
}) {
    if (handleDialog({ json, responseRef, showDialog })) {
        return;
    }

    if (!responseRef.current) {
        return;
    }

    const container = document.createElement("div");
    responseRef.current.appendChild(container);
    const root = createRoot(container);
    root.render(<Embed json={json as unknown as DiscordEmbed} responseRef={responseRef} showDialog={showDialog} />);
}

export function RenderResponse({
    jsonArr,
    showDialog,
}: {
    jsonArr: CommandMessage[];
    showDialog: ShowDialogFn;
}) {
    const responseRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={responseRef}>
            {jsonArr.map((json, index) => {
                if (handleDialog({ json, showDialog })) {
                    return <div key={index} />;
                }

                return (
                    <div key={index}>
                        <Embed json={json as unknown as DiscordEmbed} responseRef={responseRef} showDialog={showDialog} />
                    </div>
                );
            })}
        </div>
    );
}

export function commandButtonAction({
    name,
    command,
    responseRef,
    showDialog,
}: {
    name: string;
    command: string;
    responseRef: React.RefObject<HTMLDivElement | null>;
    showDialog: ShowDialogFn;
}) {
    const cmdInfo = getCommandAndBehavior(command);

    switch (cmdInfo.behavior) {
        case "DELETE_MESSAGE":
            if (responseRef.current) {
                responseRef.current.innerHTML = "";
            }
            break;
        case "EPHEMERAL":
        case "UNPRESS":
            break;
        case "DELETE_BUTTONS":
            if (responseRef.current) {
                const buttons = responseRef.current.querySelectorAll("button");
                buttons.forEach((button) => button.remove());
            }
            break;
        case "DELETE_PRESSED_BUTTON":
            if (responseRef.current) {
                const buttons = responseRef.current.querySelectorAll(`button[data-label="${name}"]`);
                buttons.forEach((button) => button.remove());
            }
            break;
    }

    runCommand({
        command: cmdInfo.command,
        values: cmdInfo.args,
        onResponse: (json) => handleResponse({ json, responseRef, showDialog }),
    });
}

export function useCommandExecution({
    command,
    values,
    onStart,
    onResult,
    onSuccess,
    onError,
    onComplete,
}: {
    command: string;
    values: { [key: string]: string | string[] };
    onStart?: () => void;
    onResult?: (result: CommandActionResult) => void;
    onSuccess?: (result: CommandActionResult) => void;
    onError?: (result: CommandActionResult) => void;
    onComplete?: (result?: CommandActionResult) => void;
}) {
    const [isPending, setIsPending] = useState(false);
    const [messages, setMessages] = useState<CommandMessage[]>([]);
    const [latestResult, setLatestResult] = useState<CommandActionResult | undefined>(undefined);
    const latestResultRef = useRef<CommandActionResult | undefined>(undefined);

    const clear = useCallback(() => {
        latestResultRef.current = undefined;
        setLatestResult(undefined);
        setMessages([]);
    }, []);

    const run = useCallback(() => {
        if (isPending) {
            return;
        }

        clear();
        setIsPending(true);
        onStart?.();

        runCommand({
            command,
            values,
            onResponse: (raw) => {
                const result = normalizeCommandActionResult(raw);
                latestResultRef.current = result;
                setLatestResult(result);
                setMessages((currentMessages) => [...currentMessages, raw]);
                onResult?.(result);
                if (result.status === "success") {
                    onSuccess?.(result);
                } else {
                    onError?.(result);
                }
            },
            onDone: () => {
                setIsPending(false);
                onComplete?.(latestResultRef.current);
            },
        });
    }, [clear, command, isPending, onComplete, onError, onResult, onStart, onSuccess, values]);

    return {
        run,
        clear,
        isPending,
        messages,
        latestResult,
    };
}

import React, { startTransition, useCallback, useMemo, useRef, useState } from 'react';
import CommandComponent from '../../components/cmd/CommandComponent'; // Import CommandComponent
import CommandStringPreview from '@/components/cmd/CommandStringPreview';
import { CommandQueryRegistryProvider } from '@/components/cmd/CommandQueryRegistry';
import { CommandStoreType } from '@/utils/StateUtil.ts';
import { Command, CM, AnyCommandPath, CommandPath, getTypeBreakdown } from '@/utils/Command.ts';
import { useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { getQueryParams } from "@/lib/utils.ts";
import { UNPACKR } from "@/lib/msgpack";
import { createRoot } from "react-dom/client";
import { useDialog } from "../../components/layout/DialogContext";
import { DiscordEmbed, Embed } from "../../components/ui/MarkupRenderer";
import { getCommandAndBehavior } from "../../utils/Command";
import { queryParamsToObject } from "../../lib/utils";
import { createCommandStoreWithDef } from "../../utils/StateUtil";
import { COMMANDS } from '@/lib/commands';
import type { CommandInputDisplayMode } from '@/components/cmd/field/fieldTypes';
import type { ShowDialogFn } from '@/lib/dialog';
import { formatCommandString } from '@/utils/CommandParser';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { deepEqual } from '@/lib/utils';

export default function CommandPage() {
    const { command } = useParams();
    const location = useLocation();
    const queryParams = useMemo(() => getQueryParams(), [location.key]);
    const forceMountAll = queryParams.get("mount") === "all" || queryParams.get("forceMount") === "all" || queryParams.get("forceMountAll") === "1";
    const benchMode = queryParams.get("bench") === "1";
    const cmdObj = useMemo(() => {
        if (command === "test") {
            return CM.buildTest();
        }

        return CM.get(command?.split(" ") as AnyCommandPath);
    }, [command]);
    const pathJoined = useMemo(() => cmdObj?.path.join(" ") ?? "", [cmdObj]);
    const [displayMode, setDisplayMode] = useState<CommandInputDisplayMode>("card");
    const setCardDisplayMode = useCallback(() => {
        startTransition(() => setDisplayMode("card"));
    }, []);
    const setFocusPaneDisplayMode = useCallback(() => {
        startTransition(() => setDisplayMode("focus-pane"));
    }, []);

    const initialValues = useMemo<{ [key: string]: string }>(() => {
        const nextValues = queryParamsToObject(queryParams) as { [key: string]: string };
        delete nextValues.bench;
        delete nextValues.mount;
        delete nextValues.forceMount;
        delete nextValues.forceMountAll;
        return nextValues;
    }, [queryParams]);
    const commandStore = useMemo(() => createCommandStoreWithDef(initialValues), [initialValues]);
    const queryBreakdowns = useMemo(() => {
        const uniqueTypes = new Set(cmdObj.getArguments().map((arg) => arg.arg.type));
        return Array.from(uniqueTypes, (type) => getTypeBreakdown(CM, type));
    }, [cmdObj]);

    React.useEffect(() => {
        if (!benchMode) {
            return;
        }

        const benchStart = performance.now();
        const longTasks: Array<{ name: string; duration: number; startTime: number }> = [];
        const publishBench = () => {
            (window as Window & { __lcCommandBench?: unknown }).__lcCommandBench = {
                command: pathJoined,
                forceMountAll,
                displayMode,
                elapsedMs: performance.now() - benchStart,
                inputCount: document.querySelectorAll("input, textarea, [role='textbox']").length,
                buttonCount: document.querySelectorAll("button").length,
                scrollHeight: document.documentElement.scrollHeight,
                longTasks: [...longTasks],
                refresh: publishBench,
            };
        };
        const perfObserver = typeof PerformanceObserver !== "undefined"
            ? new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    longTasks.push({
                        name: entry.name,
                        duration: entry.duration,
                        startTime: entry.startTime,
                    });
                });
                publishBench();
            })
            : null;

        try {
            perfObserver?.observe({ entryTypes: ["longtask"] });
        } catch {
            // Long task observers are not always available in every environment.
        }

        const rafOne = window.requestAnimationFrame(() => {
            const rafTwo = window.requestAnimationFrame(() => {
                publishBench();
            });
            (window as Window & { __lcCommandBenchRafTwo?: number }).__lcCommandBenchRafTwo = rafTwo;
        });

        return () => {
            perfObserver?.disconnect();
            window.cancelAnimationFrame(rafOne);
            const rafTwo = (window as Window & { __lcCommandBenchRafTwo?: number }).__lcCommandBenchRafTwo;
            if (rafTwo != null) {
                window.cancelAnimationFrame(rafTwo);
            }
            publishBench();
        };
    }, [benchMode, displayMode, forceMountAll, pathJoined]);

    if (!cmdObj) {
        console.log("Not command");
        return <div>No command found</div>; // or some loading spinner
    }

    const alwaysTrue = useCallback(() => true, []);

    return (
        <>
            <div className="mb-2 flex items-center gap-1">
                <Button size="sm" variant={displayMode === "card" ? "default" : "outline"} onClick={setCardDisplayMode} tabIndex={-1}>Card</Button>
                <Button size="sm" variant={displayMode === "focus-pane" ? "default" : "outline"} onClick={setFocusPaneDisplayMode} tabIndex={-1}>Focus Pane</Button>
            </div>
            <CommandQueryRegistryProvider breakdowns={queryBreakdowns}>
                <CommandComponent key={cmdObj.name} command={cmdObj} filterArguments={alwaysTrue} initialValues={initialValues}
                    displayMode={displayMode}
                    forceMountAll={forceMountAll}
                    setOutput={commandStore((state) => state.setOutput)}
                />
            </CommandQueryRegistryProvider>
            <OutputValuesDisplay name={pathJoined} store={commandStore} />
        </>
    );
}

export function commandButtonAction({ name, command, responseRef, showDialog }: {
    name: string,
    command: string,
    responseRef: React.RefObject<HTMLDivElement | null>,
    showDialog: ShowDialogFn
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
            // do nothing
            break;
        case "DELETE_BUTTONS":
            if (responseRef.current) {
                const buttons = responseRef.current.querySelectorAll('button');
                buttons.forEach(button => button.remove());
            }
            break;
        case "DELETE_PRESSED_BUTTON":
            if (responseRef.current) {
                const buttons = responseRef.current.querySelectorAll(`button[data-label="${name}"]`);
                buttons.forEach(button => button.remove());
            }
            break;
    }

    runCommand({
        command: cmdInfo.command,
        values: cmdInfo.args,
        onResponse: (json) => handleResponse({ json, responseRef, showDialog })
    });
}

export type CommandMessage = { [key: string]: string | object | object[] | number | number[] | string[] };
type Msg = CommandMessage;

export type CommandResponseStatus = "success" | "error" | "action";

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
    for (const [k, v] of Object.entries(values)) {
        if (Array.isArray(v)) v.forEach(x => url.searchParams.append(k, x));
        else url.searchParams.append(k, v);
    }

    const controller = new AbortController();

    (async () => {
        const res = await fetch(url.toString(), {
            method: "GET",
            credentials: "include", // Important since you are using cookies (lc_guild)
            signal: controller.signal,
            headers: { Accept: "application/x-msgpack" },
        });

        if (!res.ok || !res.body) {
            onResponse({ error: res.statusText, title: "Error Fetching" });
            onDone?.();
            return;
        }

        const reader = res.body.getReader();

        // 64KB initial buffer
        let buf = new Uint8Array(64 * 1024);
        let view = new DataView(buf.buffer);
        let r = 0, w = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!value?.length) continue;

                // Ensure capacity
                if (buf.length - w < value.length) {
                    // Compact: move unread bytes to start
                    if (r > 0) {
                        buf.copyWithin(0, r, w);
                        w -= r;
                        r = 0;
                    }
                    // Grow: if still not enough space, resize
                    if (buf.length - w < value.length) {
                        const bigger = new Uint8Array(Math.max(buf.length * 2, w + value.length));
                        bigger.set(buf.subarray(0, w));
                        buf = bigger;
                        view = new DataView(buf.buffer);
                    }
                }

                buf.set(value, w);
                w += value.length;

                // Parse frames (Loop until we don't have enough bytes for the next frame)
                while (w - r >= 4) {
                    const len = view.getUint32(r, false); // Big-Endian (matches server)

                    // Safety: Sanity check to prevent OOM on corrupted streams
                    if (len > 50 * 1024 * 1024) {
                        throw new Error(`Frame too large: ${len} bytes`);
                    }

                    // If we don't have the full body yet, stop parsing and wait for next chunk
                    if (w - r < 4 + len) break;

                    const payload = buf.subarray(r + 4, r + 4 + len);

                    // Decode
                    const msg = UNPACKR.decode(payload) as Msg;
                    onResponse(msg);

                    r += 4 + len;
                }

                // Reset pointers if buffer is fully consumed to keep indices low
                if (r === w) { r = 0; w = 0; }
            }
        } catch (e) {
            if (!controller.signal.aborted) {
                console.error("Stream error:", e);
                onResponse({ error: String(e), title: "Stream Error" });
                controller.abort(); // Ensure connection closes
            }
        } finally {
            try { await reader.cancel(); } catch { /* ignore cancellation errors */ }
            onDone?.();
        }
    })().catch(e => {
        // Handle fetch setup errors
        if (!controller.signal.aborted) {
            onResponse({ error: String(e), title: "Fetch Error" });
        }
        onDone?.();
    });

    // Return the abort handle to the React component/Caller
    return { abort: () => controller.abort() };
}

function handleDialog({ json, responseRef, showDialog }: {
    json: Msg,
    responseRef?: React.RefObject<HTMLDivElement | null>,
    showDialog: ShowDialogFn
}): boolean {
    if (json['error'] && json['title']) {
        showDialog(json['title'] as string, JSON.stringify(json['error']));
        return true;
    }
    const action = json['action'] as string | undefined;
    if (action) {
        if (action === "deleteByIds") {
            const ids: string[] = json['value'] as string[];
            if (responseRef && responseRef.current) {
                ids.forEach(id => {
                    const element = responseRef.current?.querySelector(`[id="${id}"]`);
                    if (element) {
                        element.remove();
                    }
                });
            }
            return true;
        }
        if (action === "redirect") {
            const value: string = json['value'] as string;
            showDialog("Redirecting", `Redirecting to ${value}`);
            setTimeout(() => {
                window.location.href = value;
            }, 2000);
            return true;
        }

        showDialog("Unknown action", `Unknown action: ${action}`);
        return true;
    }
    return false;
}

export function handleResponse(
    { json, responseRef, showDialog }: {
        json: { [key: string]: string | object | object[] | number | number[] | string[] },
        responseRef: React.RefObject<HTMLDivElement | null>,
        showDialog: ShowDialogFn
    }) {
    if (handleDialog({ json, responseRef, showDialog })) {
        return;
    }
    if (responseRef.current) {
        const container = document.createElement('div');
        responseRef.current.appendChild(container);
        const root = createRoot(container);
        root.render(<Embed json={json as unknown as DiscordEmbed} responseRef={responseRef} showDialog={showDialog} />);
    }
}

export function RenderResponse({ jsonArr, showDialog }: {
    jsonArr: { [key: string]: string | object | object[] | number | number[] | string[] }[],
    showDialog: ShowDialogFn
}) {
    const responseRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={responseRef}>
            {
                jsonArr.map((json, i) => {
                    if (handleDialog({ json, showDialog })) {
                        return <div key={i}></div>;
                    }
                    return (
                        <div key={i}>
                            <Embed json={json as unknown as DiscordEmbed} responseRef={responseRef} showDialog={showDialog} />
                        </div>
                    );
                })
            }
        </div>
    );
}

export function OutputValuesDisplay({ name, store }: { name: string, store: CommandStoreType }) {
    const output = useStoreWithEqualityFn(store, (state) => state.output, deepEqual);
    const deferredOutput = React.useDeferredValue(output);
    const textRef = useRef<HTMLParagraphElement>(null);
    const responseRef = useRef<HTMLDivElement>(null);
    const { showDialog } = useDialog();

    const runCommandCallback = useCallback(() => {
        runCommand({ command: name, values: output, onResponse: (json) => handleResponse({ json, responseRef, showDialog }) });
    }, [name, output, responseRef, showDialog]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                runCommandCallback();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [runCommandCallback]);

    const clearOutput = useCallback(() => {
        if (responseRef.current) {
            responseRef.current.innerHTML = "";
        }
    }, [responseRef]);

    const commandString = useMemo(() => formatCommandString(name, deferredOutput), [name, deferredOutput]);

    const getText = useCallback(() => {
        return formatCommandString(name, store.getState().output);
    }, [name, store]);

    return (
        <div className="relative">
            <CommandStringPreview text={commandString} getText={getText} className="mb-1" />
            <Button variant="outline" size="sm" onClick={runCommandCallback} tabIndex={-1}>Run Ctrl ↩</Button>
            <Button variant="outline" size="sm" className="ms-1" onClick={clearOutput} tabIndex={-1}>Clear</Button>
            <div ref={responseRef}></div>
        </div>
    );
}
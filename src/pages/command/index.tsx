import React, { useCallback, useMemo, useRef, useState } from 'react';
import CommandComponent from '../../components/cmd/CommandComponent'; // Import CommandComponent
import { CommandStoreType } from '@/utils/StateUtil.ts';
import { Command, CM, AnyCommandPath, CommandPath, BaseCommand } from '@/utils/Command.ts';
import { useParams } from "react-router-dom";
import { BlockCopyButton } from "@/components/ui/block-copy-button.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { Button } from "../../components/ui/button";
import { UNPACKR, getQueryParams } from "@/lib/utils.ts";
import { createRoot } from "react-dom/client";
import { useDialog } from "../../components/layout/DialogContext";
import { DiscordEmbed, Embed } from "../../components/ui/MarkupRenderer";
import { getCommandAndBehavior } from "../../utils/Command";
import { queryParamsToObject } from "../../lib/utils";
import { createCommandStoreWithDef } from "../../utils/StateUtil";
import { COMMANDS } from '@/lib/commands';

export default function CommandPage() {
    const { command } = useParams();
    const [cmdObj, setCmdObj] = useState<BaseCommand | null>(command !== "test" ? CM.get(command?.split(" ") as AnyCommandPath) : CM.buildTest());
    const pathJoined = useMemo(() => cmdObj?.path.join(" ") ?? "", [cmdObj]);

    const [initialValues, setInitialValues] = useState<{ [key: string]: string }>(queryParamsToObject(getQueryParams()) as { [key: string]: string });
    const commandStore = useMemo(() => createCommandStoreWithDef(initialValues), [initialValues]);

    if (!cmdObj) {
        console.log("Not command");
        return <div>No command found</div>; // or some loading spinner
    }

    const alwaysTrue = useCallback(() => true, []);

    return (
        <>
            <CommandComponent key={cmdObj.name} command={cmdObj} filterArguments={alwaysTrue} initialValues={initialValues}
                setOutput={commandStore((state) => state.setOutput)}
            />
            <OutputValuesDisplay name={pathJoined} store={commandStore} />
        </>
    );
}

export function commandButtonAction({ name, command, responseRef, showDialog }: {
    name: string,
    command: string,
    responseRef: React.RefObject<HTMLDivElement | null>,
    showDialog: (title: string, message: React.ReactNode, quote?: (boolean | undefined)) => void
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

type Msg = { [key: string]: string | object | object[] | number | number[] | string[] };

export function runCommand({
    command,
    values,
    onResponse,
}: {
    command: string;
    values: { [key: string]: string | string[] };
    onResponse: (json: Msg) => void;
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
            try { await reader.cancel(); } catch {}
        }
    })().catch(e => {
        // Handle fetch setup errors
        if (!controller.signal.aborted) {
            onResponse({ error: String(e), title: "Fetch Error" });
        }
    });

    // Return the abort handle to the React component/Caller
    return { abort: () => controller.abort() };
}

function handleDialog({ json, responseRef, showDialog }: {
    json: Msg,
    responseRef?: React.RefObject<HTMLDivElement | null>,
    showDialog: (title: string, message: React.ReactNode, quote?: (boolean | undefined)) => void
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
        showDialog: (title: string, message: React.ReactNode, quote?: (boolean | undefined)) => void
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
    showDialog: (title: string, message: React.ReactNode, quote?: (boolean | undefined)) => void
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
    const output = store((state) => state.output);
    const textRef = useRef<HTMLParagraphElement>(null);
    const responseRef = useRef<HTMLDivElement>(null);
    const { showDialog } = useDialog();

    const runCommandCallback = useCallback(() => {
        runCommand({ command: name, values: output, onResponse: (json) => handleResponse({ json, responseRef, showDialog }) });
    }, [name, output, responseRef, showDialog]);

    const clearOutput = useCallback(() => {
        if (responseRef.current) {
            responseRef.current.innerHTML = "";
        }
    }, [responseRef]);

    const getText = useCallback(() => {
        if (textRef.current) {
            return textRef.current.textContent ?? "";
        }
        return '';
    }, [textRef]);

    return (
        <div className="relative">
            <div className='flex items-center'>
                <TooltipProvider>
                    <BlockCopyButton className="rounded-[5px] [&_svg]:size-3.5 mr-1 mb-1" size="sm" left={true} getText={getText} />
                </TooltipProvider>
                <p className="w-full rounded h-6 pl-1 mb-1 bg-accent border border-slate-500 border-opacity-50" ref={textRef}>/{name}&nbsp;
                    {
                        Object.entries(output).map(([name, value]) => (
                            <span key={name} className="me-1">
                                {name}: {value}
                            </span>
                        ))
                    }
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={runCommandCallback}>Run Command</Button>
            <Button variant="outline" size="sm" className="ms-1" onClick={clearOutput}>Clear</Button>
            <div ref={responseRef}></div>
        </div>
    );
}
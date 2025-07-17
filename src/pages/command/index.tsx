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
    const [cmdObj, setCmdObj] = useState<BaseCommand | null>(CM.get(command?.split(" ") as CommandPath<typeof COMMANDS.commands>) ?? CM.buildTest());
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

function runCommand({ command, values, onResponse }: {
    command: string,
    values: { [key: string]: string | string[] },
    onResponse: (json: { [key: string]: string | object | object[] | number | number[] | string[] }) => void
}) {
    const url = new URL(`${process.env.BACKEND_URL}sse/${command}`);

    console.log("URL is", url.toString());

    Object.entries(values).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach(val => url.searchParams.append(key, val));
        } else {
            url.searchParams.append(key, value);
        }
    });

    console.log("runCommand", command, values);

    fetch(url.toString(), {
        method: 'GET',
        credentials: 'include', // Ensure cookies are included
        headers: {
            'Accept': 'text/event-stream'
        }
    }).then(response => {
        if (!response.ok) {
            onResponse({ error: response.statusText, title: "Error Fetching" });
            return;
        }
        const reader = response.body?.getReader();
        function readStream() {
            reader?.read().then(({ done, value }) => {
                if (done) {
                    console.log("Stream closed");
                    return;
                }
                const json: { [key: string]: string | object | object[] | number | number[] | string[] } = UNPACKR.decode(value);
                console.log("Message from server:", json);
                onResponse(json);
                readStream();
            }).catch(error => {
                onResponse({ error: error.toString(), title: "Error Reading Stream" });
            });
        }

        readStream();
    }).catch(error => {
        onResponse({ error: error.toString(), title: "Error Fetching" });
    });
}

function handleDialog({ json, responseRef, showDialog }: {
    json: { [key: string]: string | object | object[] | number | number[] | string[] },
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
                    const element = responseRef.current?.querySelector(`#${id}`);
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
import { COMMAND } from "../../lib/endpoints";
import { useDialog } from "../../components/layout/DialogContext";
import React, { useMemo } from "react";
import { RenderResponse } from "./index";
import { WebViewCommand } from "../../lib/apitypes";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import CopyToClipboard from "../../components/ui/copytoclipboard";
import { AnyCommandPath, CommandArguments, CommandPath } from "../../utils/Command";
import { COMMANDS } from "../../lib/commands";
import CommandsPage from "../commands";
import EndpointWrapper from "@/components/api/bulkwrapper";

function toMap(searchParams: URLSearchParams): { [key: string]: string } {
    const map: { [key: string]: string } = {};
    searchParams.forEach((value, key) => {
        map[key] = value;
    });
    return map;
}

export default function ViewCommandPage() {
    const { command } = useParams<{ command: string }>();
    // useSearchParams();
    const [searchParams] = useSearchParams();
    if (!command) {
        return <CommandsPage />
    }
    // search params to object {[key: string]: string}
    return <ViewCommand command={command.split(" ") as AnyCommandPath} args={toMap(searchParams)} />;
}

export function ViewCommand<P extends AnyCommandPath>(
    { command, args, className }: {
        command: P,
        args: Partial<CommandArguments<typeof COMMANDS.commands, P>>,
        className?: string
    }) {
    const { showDialog } = useDialog();

    return <>
        <Button variant="outline" size="sm" asChild>
            <Link to={`${process.env.BASE_PATH}command/${command.join(" ")}?${new URLSearchParams(args as { [key: string]: string }).toString()}`}>Edit</Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="ms-1">
            <CopyToClipboard text="Copy Command" copy={`/${command.join(" ")} ${Object.entries(args).map(([key, value]) => `${key}:${value as string}`).join(" ")}`}
                className="no-underline" />
        </Button>
        <EndpointWrapper endpoint={COMMAND} args={{ data: { "": command.join(" "), ...args } as unknown as string }}>
            {({ data }) => {
                return (<div className={className}>
                    <MemoizedRenderResponse data={data} showDialog={showDialog} />
                </div>);
            }}
        </EndpointWrapper>
    </>;
}

export function MemoizedRenderResponse({ data, showDialog }: { data: WebViewCommand, showDialog: (title: string, message: React.ReactNode, quote?: (boolean | undefined)) => void }) {
    return useMemo(() => {
        return <RenderResponse jsonArr={data.data as { [key: string]: string | object | object[] | number | number[] | string[] }[]} showDialog={showDialog} />;
    }, [data.data, showDialog]);
}
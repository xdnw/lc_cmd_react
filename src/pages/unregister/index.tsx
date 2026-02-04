import SessionInfo from "@/components/api/session.tsx";
import { Link } from "react-router-dom";
import { getDiscordAuthUrl } from "@/utils/Auth.ts";
import { Button } from "@/components/ui/button.tsx";
import CopyToClipboard from "@/components/ui/copytoclipboard.tsx";
import { SESSION, UNREGISTER } from "@/lib/endpoints";
import { useDialog } from "../../components/layout/DialogContext";
import { WebSession } from "../../lib/apitypes";
import EndpointWrapper from "@/components/api/bulkwrapper";
import { ApiFormInputs } from "@/components/api/apiform";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export default function Unregister() {
    return (
        <>
            <div className="bg-light/10 border border-light/10 p-2 relative rounded mb-4">
                <EndpointWrapper endpoint={SESSION} args={{}}>
                    {({ data: session }) => {
                        return <UnregisterComponent session={session} />
                    }}
                </EndpointWrapper>
            </div>
            <SessionInfo />
        </>);
}

export function UnregisterComponent({ session }: { session: WebSession }) {
    if (session.nation && session.user) {
        if (session.registered) {
            if (session.registered_nation ?? 0 === session.nation) {
                return <UnregisterValid />
            } else {
                return <UnregisterInvalid session={session} />
            }
        } else {
            return <RegisterComponent />
        }
    } else {
        return <div>
            <h1 className="text-2xl font-bold">You are not registered</h1>
            <Button variant="outline" size="sm" className="border-slate-600" asChild>
                <Link
                    to={(session.nation ? getDiscordAuthUrl() : process.env.BASE_PATH + "nation_picker")}>
                    {session.nation ? "Add Discord" : "Add Nation"}
                </Link>
            </Button>
        </div>
    }
}

export function RegisterComponent() {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();
    const handle_response = useCallback(() => {
        queryClient.removeQueries({ queryKey: [SESSION.endpoint.name] });
        showDialog("Registered", "Successfully registered your discord and nation.", false);
    }, [queryClient, showDialog]);

    return <div>
        <ApiFormInputs
            endpoint={UNREGISTER}
            label="Link Accounts"
            message={<>
                <h1 className="text-2xl font-bold">Link Accounts?</h1>
                <p>
                    Your discord and nation accounts are not linked. Would you like to register them?
                </p>
            </>}
            handle_response={handle_response}
        />
    </div>
}

export function UnregisterValid() {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();
    const handle_response = useCallback(() => {
        queryClient.removeQueries({ queryKey: [SESSION.endpoint.name] });
        showDialog("Unregistered", "Successfully unlinked your discord and nation. It is recommended to logout and log back in to register a new user or nation.", false);
    }, [queryClient, showDialog]);
    return <div>
        <ApiFormInputs
            endpoint={UNREGISTER}
            label="Unlink Accounts"
            message={<>
                <h1 className="text-2xl font-bold">Already Registered</h1>
                You may unlink your nation from your discord user. It is recommended to logout and log back in to
                register a
                new user or nation.
            </>} handle_response={handle_response} />
    </div>
}

export function UnregisterInvalid({ session }: { session: WebSession }) {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();

    const handle_response = useCallback(() => {
        queryClient.removeQueries({ queryKey: [SESSION.endpoint.name] });
        showDialog("Unregistered", "Successfully unlinked your discord and nation. It is recommended to logout and log back in to register a new user or nation.", false);
    }
        , [queryClient, showDialog]);

    return <div>
        <ApiFormInputs
            endpoint={UNREGISTER}
            label="Unlink Accounts"
            message={<>
                <h1 className="text-2xl font-bold">Invalid Registration</h1>
                <p>
                    Your discord is registered to the nation <CopyToClipboard text={`${session.registered_nation}`} />
                    but you are logged in as <CopyToClipboard text={`${session.nation_name}/${session.nation}`} />
                </p>
                <p>
                    It is recommended to either unlink your current accounts, or sign out and log back in with the
                    correct accounts.
                </p>
            </>} handle_response={handle_response} />
        <Button variant="outline" size="sm" className='border-slate-600' asChild>
            <Link to={`${process.env.BASE_PATH}logout`}>Logout</Link></Button>
    </div>
}
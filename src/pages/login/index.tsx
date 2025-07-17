import { Link, useParams } from "react-router-dom";


import Cookies from 'js-cookie';
import { Button } from "@/components/ui/button.tsx";
import { SESSION, SET_TOKEN } from "@/lib/endpoints";
import { CopyToClipboardTextArea } from "../../components/ui/copytoclipboard";
import { useDialog } from "@/components/layout/DialogContext";
import { useCallback, useEffect, useState } from "react";
import EndpointWrapper from "@/components/api/bulkwrapper";
import { useSession } from "@/components/api/SessionContext";
import { useQueryClient } from "@tanstack/react-query";

export function LoginComponent() {
    const { token } = useParams<{ token: string }>();
    const { showDialog } = useDialog();
    const { refetchSession } = useSession();
    const [loggedIn, setLoggedIn] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (loggedIn) {
            Cookies.set('lc_token_exists', Math.random().toString(36).substring(2));
            queryClient.removeQueries({ queryKey: [SESSION.endpoint.name] });
            refetchSession();
        }

    }, [loggedIn, refetchSession, queryClient]);

    const handleError = useCallback((error: Error) => {
        showDialog("Login Failed", <>
            Failed to set login token. Please try again, try a different login method, or contact support.
            <div className="relative overflow-auto">
                <CopyToClipboardTextArea text={error.message} />
            </div>
        </>, false);
    }, [showDialog]);

    return <EndpointWrapper endpoint={SET_TOKEN} args={{ token: token ?? "" }} handle_error={handleError}>
        {({ data }) => {
            setLoggedIn(true);
            return <>Logged in Successfully!<br />
                <Button variant="outline" size="sm" className='border-slate-600' asChild>
                    <Link to={`${process.env.BASE_PATH}home`}>Return Home</Link></Button></>
        }}
    </EndpointWrapper>;
}

export default function LoginPage() {
    return (
        <LoginComponent />
    );
}
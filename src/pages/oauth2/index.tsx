

import Cookies from 'js-cookie';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { SESSION, SET_OAUTH_CODE } from "@/lib/endpoints";
import { CopyToClipboardTextArea } from "../../components/ui/copytoclipboard";
import { useDialog } from "../../components/layout/DialogContext";
import { useCallback, useEffect, useState } from "react";
import EndpointWrapper from '@/components/api/bulkwrapper';
import { useSession } from '@/components/api/SessionContext';
import { useQueryClient } from '@tanstack/react-query';

export function OAuth2Component() {
    const fullUrl = window.location.href;
    const queryString = fullUrl.split('#')[0].split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const code = params.get("code");
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
        showDialog("Login Failed", <>Failed to set login OAuth2 Code. Please try again, try a different login method, or contact support.
            <div className="relative overflow-auto">
                <CopyToClipboardTextArea text={error.message} />
            </div>
        </>, false);
    }, [showDialog]);

    return <EndpointWrapper endpoint={SET_OAUTH_CODE} args={{ code: code ?? "" }} handle_error={handleError}>
        {({ data }) => {
            setLoggedIn(true);
            return <>Logged in Successfully via OAuth2!<br />
                <Button variant="outline" size="sm" className='border-slate-600' asChild>
                    <Link to={`${process.env.BASE_PATH}home`}>Return Home</Link></Button></>
        }
        }</EndpointWrapper>;
}

export default function OAuth2Page() {
    return (
        <OAuth2Component />
    );
}
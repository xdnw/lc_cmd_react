

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { LOGOUT } from "@/lib/endpoints";
import { CopyToClipboardTextArea } from "../../components/ui/copytoclipboard";
import { useDialog } from "../../components/layout/DialogContext";
import EndpointWrapper from "@/components/api/bulkwrapper";

export function LogoutComponent() {
    const { showDialog } = useDialog();
    const [shouldClearCookies, setShouldClearCookies] = useState(false);

    // Effect to handle cookie clearing
    useEffect(() => {
        if (shouldClearCookies) {
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            setShouldClearCookies(false);
        }
    }, [shouldClearCookies]);

    const logoutCallback = useCallback(() => {
        console.log("Logging out");
        // Clear localStorage
        window.localStorage.clear();
        // Trigger cookie clearing via effect
        setShouldClearCookies(true);
    }, []);

    const handleError = useCallback((error: Error) => {
        console.log("Logout failed");
        logoutCallback();
        showDialog("Logout Failed", <>
            Failed to logout. Please try again, try a different login method, or contact support.
            <div className="relative overflow-auto">
                <CopyToClipboardTextArea text={error.message} />
            </div>
        </>, false);
    }, [logoutCallback, showDialog]);

    return <EndpointWrapper endpoint={LOGOUT} args={{}} handle_error={handleError}>
        {({ data }) => {
            console.log("Logout successful");
            logoutCallback();
            return <>Logged out Successfully!<br />
                <Button variant="outline" size="sm" className='border-slate-600' asChild>
                    <Link to={`${process.env.BASE_PATH}home`}>Return Home</Link></Button></>
        }}
    </EndpointWrapper>
}

export default function LogoutPage() {
    return (
        <LogoutComponent />
    );
}
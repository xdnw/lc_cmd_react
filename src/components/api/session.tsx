import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../ui/card';
import { useDialog } from '../layout/DialogContext';
import { Button } from '../ui/button';
import CopyToClipboard from '../ui/copytoclipboard';
import { Link } from 'react-router-dom';
import LazyIcon from '../ui/LazyIcon';
import { getDiscordAuthUrl } from '@/utils/Auth';
import React, { useCallback, useMemo } from 'react';
import { WebSession } from '@/lib/apitypes';
import { QueryResult } from '@/lib/BulkQuery';
import { SESSION } from '@/lib/endpoints';
import { bulkQueryOptions } from '@/lib/queries';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import Timestamp from '../ui/timestamp';

export function LoginPicker() {
    const { showDialog } = useDialog();

    const discordMessage = useMemo(
        () => (
            <div className="space-y-3">
                <p className="text-sm text-foreground">
                    <strong>Login (OAuth)</strong>: Clicking <em>Login with Discord</em> opens the OAuth flow in your browser to link your account immediately.
                </p>

                <p className="text-sm text-foreground">
                    <strong>Request a web link</strong>:
                    Use <CopyToClipboard text="/web" /> in a channel with the Locutus bot to request a web login link (the bot will DM you a link).
                </p>

                <div className="mt-2">
                    <Button variant="outline" size="sm" asChild>
                        <a href="https://discord.com/download" target="_blank" rel="noreferrer">Download Discord</a>
                    </Button>
                </div>
            </div>
        ),
        []
    );

    const mailMessage = useMemo(
        () => (
            <div className="space-y-2">
                <h3 className="font-semibold text-foreground">How to authenticate</h3>
                <ol className="list-decimal list-inside text-sm text-foreground">
                    <li>Select your nation</li>
                    <li>Open your in-game mail</li>
                    <li>Click the authentication link</li>
                </ol>
            </div>
        ),
        []
    );

    const openDiscordInfo = useCallback(
        () => showDialog("Discord: Login vs `/web`", discordMessage),
        [showDialog, discordMessage]
    );

    const openMailInfo = useCallback(
        () => showDialog("In-Game Mail Authentication", mailMessage),
        [showDialog, mailMessage]
    );

    return (
        <div className="bg-light/10 border border-light/10 rounded p-2 mt-4">
            <div className="pb-3 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Sign in to access web features</h1>
                    {/* <CardTitle>Sign in to access web features</CardTitle> */}
                    <div className="text-sm text-foreground">Link your Discord or in-game nation.</div>
                </div>
                <LazyIcon name="KeyRound" size={28} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="rounded border p-4">
                    <div className="mb-2 font-semibold text-lg flex items-center gap-2 text-foreground">
                        <LazyIcon name="KeyRound" size={18} /> Login with Discord
                    </div>

                    <div className="text-sm mb-4 text-foreground">
                        Click <strong>Login with Discord</strong> to open the OAuth flow and link your account.
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={getDiscordAuthUrl()} aria-label="Login via Discord">
                                <LazyIcon name="KeyRound" size={14} />&nbsp;Login with Discord
                            </a>
                        </Button>
                        <Button variant="secondary" size="sm" onClick={openDiscordInfo}>What is Discord?</Button>
                    </div>
                </Card>

                <Card className="rounded border p-4">
                    <div className="mb-2 font-semibold text-lg flex items-center gap-2 text-foreground">
                        <LazyIcon name="Mail" size={18} /> Authenticate via In-Game Mail
                    </div>

                    <div className="text-sm text-foreground mb-4 leading-relaxed">
                        You will receive a login link via in-game mail.
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link to={`${process.env.BASE_PATH}nation_picker`}>Choose Nation</Link>
                        </Button>
                        <Button variant="secondary" size="sm" onClick={openMailInfo}>Help</Button>
                    </div>
                </Card>
            </div>

            {/* Footer: kept your copy + CopyToClipboard button */}
            <div className="mt-3 text-sm text-foreground flex items-center gap-3">
                <span>You can use a login link on Discord by using the command:</span>
                <CopyToClipboard text="/web" /> <span className="text-foreground">(the bot will DM you a link)</span>
            </div>
        </div>
    );
}
export function LoginPickerOld() {
    return (
        <div className="themeDiv p-2 ">
            <Tabs defaultValue="discord">
                <TabsList className='w-full'>
                    <TabsTrigger value="discord" className='w-full'>
                        <i className="bi bi-discord"></i> Discord OAuth
                    </TabsTrigger>
                    <TabsTrigger value="mail" className="w-full">
                        <i className="bi bi-envelope-fill"></i> Politics & War Mail
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="discord">
                    <div>
                        <p>On discord, use the Locutus command <CopyToClipboard text="/web" /></p>
                        <hr className="my-2" />
                        <Button variant="outline" size="sm" className='border-red-800/70' asChild><Link to={getDiscordAuthUrl()}><LazyIcon name="KeyRound" size={16} />&nbsp;Login via Discord OAuth</Link></Button>
                        <hr className="my-2" />
                        <b><u>What is discord?</u></b>
                        <p>Discord is a voice, video, and text chat app that's used to communicate and hang out with communities and friends.</p>
                        <p>Discord can be opened in browser or installed on your computer and mobile device.</p>
                        <Button variant="outline" size="sm" className='border-red-800/70' asChild><Link to="https://discord.com/download"><LazyIcon name="ExternalLink" size={16} />&nbsp;Download Discord</Link></Button>
                    </div>
                </TabsContent>
                <TabsContent value="mail">
                    <div>
                        <Button variant="outline" size="sm" className='border-red-800/70' asChild><Link className='' to={`${process.env.BASE_PATH}nation_picker`}>
                            <LazyIcon name="Mail" size={16} />
                            &nbsp;Send In-Game Mail</Link></Button>
                        <hr className="my-2" />
                        <h2 className='text-lg font-extrabold'>Here's what you need to do:</h2>
                        <ul className="list-decimal list-inside bg-secondary p-3 rounded">
                            <li>Click login and select your nation</li>
                            <li>You will be redirected to your in-game mail</li>
                            <li>Click the authentication link you were sent</li>
                        </ul>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function SessionInfo() {
    const { data, error } = useQuery<QueryResult<WebSession>>(bulkQueryOptions(SESSION.endpoint, {}, true));
    console.log("Session data:", data);


    if (!data?.data || data.error) {
        return <>
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error:&nbsp;</strong>
                <span className="block sm:inline">Could not fetch login data. {error?.message ?? data?.error ?? "Unknown Error"}</span>
            </div>
            <LoginPicker />
        </>
    }
    const session = data.data;
    return <div className="bg-light/10 border border-light/10 p-2 rounded relative">
        <table className="table-auto w-full border-separate border-spacing-y-1">
            <tbody>
                <tr className="bg-secondary">
                    <td className="px-1 py-1 bg-secondary">User</td>
                    <td className="px-1 py-1 bg-secondary">
                        {session.user_icon && <img src={session.user_icon} alt={session.user_name}
                            className="w-4 h-4 inline-block mr-1" />}
                        {session.user_name ? session.user_name + " | " : ""}
                        {session.user ? session.user : "N/A"}
                    </td>
                </tr>
                <tr className="bg-secondary">
                    <td className="p-1">Nation</td>
                    <td className="p-1">
                        <div className="relative">
                            {session.nation ? <Link className="text-blue-600 hover:text-blue-800 underline"
                                to={`https://politicsandwar.com/nation/id=${session.nation}`}>
                                {session.nation_name ? session.nation_name : session.nation}
                            </Link> : "N/A"}
                            {session.alliance && " | "}
                            {session.alliance ? <Link className="text-blue-600 hover:text-blue-800 underline"
                                to={`https://politicsandwar.com/alliance/id=${session.alliance}`}>
                                {session.alliance_name ? session.alliance_name : session.alliance}
                            </Link> : ""}
                            {(session.nation && session.user) &&
                                <Button variant="outline" size="sm"
                                    className='border-slate-600 absolute top-0 right-0'
                                    asChild>
                                    <Link to={`${process.env.BASE_PATH}unregister`}>
                                        {session.registered ? session.registered_nation == session.nation ? "Unlink" : "!! Fix Invalid Registration !!" : "Link to Discord"}
                                    </Link>
                                </Button>
                            }
                        </div>
                    </td>
                </tr>
                <tr className="bg-secondary">
                    <td className="p-1">Expires</td>
                    <td className="p-1">
                        <div className="relative">
                            {/* add 30 days */}
                            {session.expires ? <Timestamp millis={session.expires} /> : "N/A"}
                            <Button variant="outline" size="sm" className='border-slate-600 absolute top-0 right-0'
                                asChild>
                                <Link to={`${process.env.BASE_PATH}logout`}>Logout</Link></Button>
                        </div>
                    </td>
                </tr>
                <tr className="bg-secondary">
                    <td className="p-1">Guild</td>
                    <td className="p-1">
                        <div className="relative">
                            {session.guild_icon && <img src={session.guild_icon} alt={session.guild_name}
                                className="w-4 h-4 inline-block mr-1" />}
                            {session.guild_name ? session.guild_name + " | " : ""}
                            {session.guild ? session.guild : "N/A"}
                            <Button variant="outline" size="sm" className='border-slate-600 absolute top-0 right-0'
                                asChild>
                                <Link
                                    to={`${process.env.BASE_PATH}guild_select`}>{session.guild ? "Switch" : "Select"}</Link></Button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        {session.guild && true &&
            <Button variant="link" className='hover:text-blue-500 underline text-lg'
                asChild>
                <Link
                    to={`${process.env.BASE_PATH}guild_member`}>View Guild Member
                    Homepage<LazyIcon name="ChevronRight" /></Link></Button>
        }
    </div>
}
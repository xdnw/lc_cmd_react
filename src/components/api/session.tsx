import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../ui/card';
import { useDialog } from '../layout/DialogContext';
import { Button } from '../ui/button';
import CopyToClipboard from '../ui/copytoclipboard';
import { Link } from 'react-router-dom';
import LazyIcon from '../ui/LazyIcon';
import { getDiscordAuthUrl } from '@/utils/Auth';
import React, { useCallback, useMemo } from 'react';
import { WebError, WebSession } from '@/lib/apitypes';
import { QueryResult } from '@/lib/BulkQuery';
import { SESSION } from '@/lib/endpoints';
import { bulkQueryOptions } from '@/lib/queries';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import Timestamp from '../ui/timestamp';
import Loading from '../ui/loading';

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
    const {
        data: queryResult,
        error,
        isLoading,
        isFetching,
        refetch,
    } = useQuery<QueryResult<WebSession>>(bulkQueryOptions(SESSION.endpoint, {}, true));

    const session = queryResult?.data ?? null;
    const errorOrNull = session as unknown as WebError;
    const backendError =
        errorOrNull?.error ?? queryResult?.error ?? (error instanceof Error ? error.message : null);

    const basePath = process.env.BASE_PATH ?? "/";

    if (isLoading) {
        return (
            <Card className="bg-light/10 border border-light/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LazyIcon name="User" size={18} />
                        Session
                    </CardTitle>
                    <CardDescription>Loading your login details…</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Loading variant="ripple" />
                        Fetching session…
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!session || backendError) {
        return (
            <>
                <Card className="border border-destructive/40 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LazyIcon name="TriangleAlert" size={18} />
                            Could not load session
                        </CardTitle>
                        <CardDescription>
                            {String(backendError ?? "Unknown error")}
                        </CardDescription>
                    </CardHeader>
                </Card>

                <LoginPicker />
            </>
        );
    }

    const nationUrl = session.nation ? `https://politicsandwar.com/nation/id=${session.nation}` : null;
    const allianceUrl = session.alliance ? `https://politicsandwar.com/alliance/id=${session.alliance}` : null;

    const linkLabel = session.registered
        ? (session.registered_nation == session.nation ? "Unlink" : "Fix invalid registration")
        : "Link to Discord";

    const linkHintClass =
        session.registered && session.registered_nation != session.nation
            ? "border-destructive/60 text-destructive hover:text-destructive"
            : "";

    const refetchCallback = useCallback(() => refetch(), [refetch]);

    return (
        <Card className="bg-light/10 border border-light/10">
            <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                            <LazyIcon name="User" size={18} />
                            Session
                            {isFetching ? (
                                <span className="ml-2 text-xs text-muted-foreground">Refreshing…</span>
                            ) : null}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Signed in as {session.user_name || session.user || "N/A"}
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={refetchCallback}
                            disabled={isFetching}
                        >
                            <LazyIcon name="RotateCcw" className={isFetching ? "animate-spin" : ""} />
                            <span className="ml-2">Refresh</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border bg-background/20 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Identity
                        </div>

                        <div className="mt-3 space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-muted-foreground">User</div>
                                <div className="flex items-center gap-2 min-w-0">
                                    {session.user_icon ? (
                                        <img
                                            src={session.user_icon}
                                            alt={session.user_name || "User"}
                                            className="h-6 w-6 rounded-sm"
                                        />
                                    ) : null}
                                    <div className="truncate">
                                        {session.user_name ? `${session.user_name} | ` : ""}
                                        {session.user || "N/A"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="text-muted-foreground">Nation</div>
                                <div className="min-w-0 truncate text-right">
                                    {nationUrl ? (
                                        <a
                                            href={nationUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline underline-offset-4 hover:text-blue-500"
                                        >
                                            {session.nation_name || session.nation}
                                        </a>
                                    ) : (
                                        "N/A"
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="text-muted-foreground">Alliance</div>
                                <div className="min-w-0 truncate text-right">
                                    {allianceUrl ? (
                                        <a
                                            href={allianceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline underline-offset-4 hover:text-blue-500"
                                        >
                                            {session.alliance_name || session.alliance}
                                        </a>
                                    ) : (
                                        "N/A"
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-md border bg-background/20 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Session
                        </div>

                        <div className="mt-3 space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-muted-foreground">Expires</div>
                                <div className="text-right">
                                    {session.expires ? <Timestamp millis={session.expires} /> : "N/A"}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="text-muted-foreground">Discord link</div>
                                <div className="text-right">
                                    {session.registered ? "Linked" : "Not linked"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guild: make it the primary / centered panel */}
                <div className="rounded-md border bg-background/20 p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                        <div className="flex items-center gap-2">
                            <LazyIcon name="Users" size={18} />
                            <div className="text-base font-semibold">Guild context</div>
                        </div>

                        {session.guild ? (
                            <>
                                <div className="flex items-center gap-2">
                                    {session.guild_icon ? (
                                        <img
                                            src={session.guild_icon}
                                            alt={session.guild_name || "Guild"}
                                            className="h-8 w-8 rounded-sm"
                                        />
                                    ) : null}
                                    <div className="text-sm">
                                        <span className="font-medium">
                                            {session.guild_name || "Guild"}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {" "}
                                            | {session.guild}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-sm text-muted-foreground max-w-xl">
                                    Your selected guild determines which member pages and guild-specific features you can access.
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 pt-1">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link to={`${basePath}guild_select`}>Switch guild</Link>
                                    </Button>
                                    <Button variant="secondary" size="sm" asChild>
                                        <Link to={`${basePath}guild_member`}>
                                            View guild member homepage
                                            <span className="ml-1">
                                                <LazyIcon name="ChevronRight" />
                                            </span>
                                        </Link>
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-sm text-muted-foreground max-w-xl">
                                    Select a guild to unlock guild-specific pages (member home, permissions-based tools, and anything that depends on a guild context).
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 pt-1">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link to={`${basePath}guild_select`}>Select a guild</Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {session.nation && session.user ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className={linkHintClass}
                            asChild
                        >
                            <Link to={`${basePath}unregister`}>{linkLabel}</Link>
                        </Button>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link to={`${basePath}logout`}>Logout</Link>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
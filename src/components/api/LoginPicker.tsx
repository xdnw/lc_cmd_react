import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import { useDialog } from "@/components/layout/DialogContext";
import { Button } from "@/components/ui/button";
import CopyToClipboard from "@/components/ui/copytoclipboard";
import LazyIcon from "@/components/ui/LazyIcon";
import { Card } from "@/components/ui/card";
import { getDiscordAuthUrl } from "@/utils/Auth";

export default function LoginPicker() {
  const { showDialog } = useDialog();
  const webActionButtonClass = "border-primary/45 bg-card text-foreground hover:bg-primary/12 hover:text-foreground";

  const discordMessage = useMemo(
    () => (
      <div className="space-y-3">
        <p className="text-sm text-foreground">
          <strong>Login (OAuth)</strong>: Clicking <em>Login with Discord</em> opens the OAuth flow in your browser to
          link your account immediately.
        </p>

        <p className="text-sm text-foreground">
          <strong>Request a web link</strong>: Use <CopyToClipboard text="/web" /> in a channel with the Locutus bot to
          request a web login link.
        </p>

        <div className="mt-2">
          <Button variant="outline" size="sm" asChild>
            <a href="https://discord.com/download" target="_blank" rel="noreferrer">
              Download Discord
            </a>
          </Button>
        </div>
      </div>
    ),
    [],
  );

  const mailMessage = useMemo(
    () => (
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">How to authenticate</h3>
        <ol className="list-inside list-decimal text-sm text-foreground">
          <li>Select your nation</li>
          <li>Open your in-game mail</li>
          <li>Click the authentication link</li>
        </ol>
      </div>
    ),
    [],
  );

  const openDiscordInfo = useCallback(() => {
    showDialog("Discord: Login vs `/web`", discordMessage);
  }, [discordMessage, showDialog]);

  const openMailInfo = useCallback(() => {
    showDialog("In-Game Mail Authentication", mailMessage);
  }, [mailMessage, showDialog]);

  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-2xl font-bold">Sign in to access web features</h1>
          <div className="mt-1 text-sm text-muted-foreground">Link your Discord or in-game nation.</div>
        </div>
        <LazyIcon name="KeyRound" size={32} className="text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="rounded-lg border border-border p-3 transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <LazyIcon name="KeyRound" size={20} className="text-primary" />
            Login with Discord
          </div>

          <div className="mb-3 text-sm text-muted-foreground">
            Click <strong>Login with Discord</strong> to open the OAuth flow and link your account.
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className={webActionButtonClass} asChild>
              <a href={getDiscordAuthUrl()} aria-label="Login via Discord">
                <LazyIcon name="KeyRound" size={16} className="mr-2" />
                Login with Discord
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={openDiscordInfo}>
              What is Discord?
            </Button>
          </div>
        </Card>

        <Card className="rounded-lg border border-border p-3 transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <LazyIcon name="Mail" size={20} className="text-primary" />
            Authenticate via In-Game Mail
          </div>

          <div className="mb-3 text-sm leading-relaxed text-muted-foreground">
            You will receive a login link via in-game mail.
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className={webActionButtonClass} asChild>
              <Link to={`${process.env.BASE_PATH}nation_picker`}>Choose Nation</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={openMailInfo}>
              Help
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-sm text-muted-foreground">
        <span>Need a login link on Discord?</span>
        <CopyToClipboard text="/web" />
      </div>
    </div>
  );
}

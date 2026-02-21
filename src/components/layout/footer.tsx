import React, { memo } from "react";
import LazyIcon, { IconPlaceholder } from "../ui/LazyIcon";

const ListItem = memo(
  ({
    href,
    iconName,
    label,
  }: {
    href: string;
    iconName: string;
    label: string;
  }) => {
    return (
      <li className="mb-2">
        <a
          href={href}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm"
        >
          <LazyIcon name={iconName} size={16} fallback={IconPlaceholder} />
          {label}
        </a>
      </li>
    );
  }
);

export default function Footer() {
  return (
    <footer className="border-t border-border mt-2 py-3 bg-card text-card-foreground">
      <div className="w-full px-2 md:px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src="https://cdn.discordapp.com/avatars/672237266940198960/0d78b819d401a8f983ab16242de195da.webp"
                className="rounded-full"
                alt="Logo"
                width="24"
                height="24"
              />
              <h5 className="font-semibold text-sm mb-3">{process.env.APPLICATION}</h5>
            </div>
            <ul className="list-none space-y-2">
              <ListItem
                href={process.env.REPOSITORY_URL!}
                iconName="GitPullRequest"
                label="Source Code"
              />
              <ListItem
                href={process.env.WIKI_URL!}
                iconName="BookOpenText"
                label="Wiki"
              />
              <ListItem
                href="https://locutus.link:8443/job/locutus/"
                iconName="Infinity"
                label="Jenkins"
              />
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-sm mb-2">Get in Touch</h5>
            <ul className="list-none space-y-2">
              <ListItem
                href={`${process.env.REPOSITORY_URL}/issues`}
                iconName="Github"
                label="Issue Tracker"
              />
              <ListItem
                href={`https://discord.gg/${process.env.DISCORD_INVITE}`}
                iconName="MessageSquareText"
                label="Discord Server"
              />
              <ListItem
                href={`discord://discord.com/users/${process.env.ADMIN_ID}`}
                iconName="CircleUserRound"
                label="Discord User"
              />
              <ListItem
                href={`https://politicsandwar.com/nation/id=${process.env.ADMIN_NATION}`}
                iconName="Joystick"
                label="In-Game"
              />
              <ListItem
                href={`mailto:${process.env.EMAIL}`}
                iconName="AtSign"
                label="Email"
              />
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-sm mb-2">Legal</h5>
            <ul className="list-none space-y-2">
              <ListItem
                href="https://github.com/xdnw/locutus/blob/master/LICENSE"
                iconName="ListX"
                label="License"
              />
              <ListItem
                href="https://github.com/xdnw/locutus/blob/master/ToS.MD"
                iconName="ListChecks"
                label="Terms Of Service"
              />
              <ListItem
                href="https://github.com/xdnw/locutus/blob/master/PRIVACY.MD"
                iconName="EyeOff"
                label="Privacy Policy"
              />
              <ListItem
                href="https://github.com/xdnw/locutus/blob/master/SECURITY.md"
                iconName="Bug"
                label="Vulnerability Disclosure"
              />
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
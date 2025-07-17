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
          className="text-blue-600 hover:text-blue-800 underline flex items-center"
        >
          <LazyIcon name={iconName} size={22} fallback={IconPlaceholder} />
          {label}
        </a>
      </li>
    );
  }
);

export default function Footer() {
  return (
    <footer className="border-top border-red-500 mt-0 pt-3 bg-secondary">
      <div className="container mx-auto">
        <div className="flex flex-wrap mx-4">
          <div className="w-full md:w-1/3 px-4">
            <img
              src="https://cdn.discordapp.com/avatars/672237266940198960/0d78b819d401a8f983ab16242de195da.webp"
              className="absolute"
              alt="Logo"
              width="18"
              height="18"
            />
            <h5 className="font-medium ml-4">{process.env.APPLICATION}</h5>
            <hr className="my-2" />
            <ul className="list-none">
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
          <div className="w-full md:w-1/3 px-4">
            <h5 className="font-medium m-0">Get in Touch</h5>
            <hr className="my-2" />
            <ul className="list-none">
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
          <div className="w-full md:w-1/3 px-4">
            <h5 className="font-medium m-0">Legal</h5>
            <hr className="my-2" />
            <ul className="list-none">
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
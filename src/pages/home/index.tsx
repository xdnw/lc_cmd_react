import LoginPickerPage from "@/pages/login_picker";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { buildWarsConflictsUrl } from "@/lib/warsFrontend";
import versusImage from '@/assets/versus.jpg';
import sheetImage from '@/assets/sheet.jpg';
import graphImage from '@/assets/graph.png';
import chestImage from '@/assets/chest.png';
import mediaImage from '@/assets/media2.png';
import React from "react";

const _cardTemplates: {
    [key: string]: {
        ad: boolean;
        svg: string;
        desc: string;
        subtitle: string;
        invite: string;
        label: string;
        bg: string;
    };
} = {
    "wars": {
        svg: versusImage,
        ad: false,
        desc: "Browse a variety of tables and graphs for our featured set of ongoing and historical alliance conflicts. Data is available to download in CSV format.",
        subtitle: "Alliance Conflicts",
        invite: buildWarsConflictsUrl(),
        label: "View Conflicts",
        bg: "#BB66CC",
    },
    "tables": {
        svg: sheetImage,
        ad: false,
        desc: "Browse templates or create your custom table from a variety of game data. Share or export options available.",
        subtitle: "Table Builder",
        invite: "/custom_table",
        label: "Open Editor",
        bg: "#FFC929",
    },
    "charts": {
        svg: graphImage,
        ad: false,
        desc: "Browse templates or create your custom chart from a variety of game data. Share or export options available.",
        subtitle: "Chart Viewer",
        invite: "/edit_graph",
        label: "View Charts",
        bg: "#FFC929",
    },
    "raid": {
        svg: chestImage,
        ad: false,
        desc: "Find raidable nations in your score range",
        subtitle: "Raid Finder",
        invite: "/raid",
        label: "Raid Finder",
        bg: "#FFC929",
    },
    "status": {
        svg: `<svg viewBox="0 0 320 160" role="img"><rect width="320" height="160" fill="#162038"/><polygon points="32,56 56,56 1056,1056 1032,1056" fill="#0a1222"/><polygon points="68,48 238,48 1238,1048 1068,1048" fill="#0a1222"/><polygon points="68,64 188,64 1188,1064 1068,1064" fill="#0a1222"/><circle cx="44" cy="56" r="12" fill="#22c55e"/><rect x="68" y="48" width="170" height="8" rx="4" fill="#e5e7eb"/><rect x="68" y="64" width="120" height="7" rx="3.5" fill="#22c55e"/></svg>`,
        ad: false,
        desc: "Check live system health, incidents, and component uptime.",
        subtitle: "Service Status",
        invite: "/status",
        label: "Open Status",
        bg: "#0f172a",
    },
    "commands": {
        svg: `<svg viewBox="0 0 320 160" role="img"><rect width="320" height="160" fill="#142033"/><rect x="44" y="50" width="244" height="72" rx="12" fill="#0b1220" transform="translate(9 9)"/><rect x="44" y="50" width="244" height="72" rx="12" fill="#0f172a" stroke="#334155"/><path d="M78 68l20 18-20 18" fill="none" stroke="#0b1220" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" transform="translate(8 8)"/><path d="M78 68l20 18-20 18" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><rect x="122" y="99" width="88" height="8" rx="4" fill="#0b1220" transform="translate(8 8)"/><rect x="122" y="99" width="88" height="8" rx="4" fill="#22c55e"/><rect x="122" y="61" width="130" height="10" rx="5" fill="#e2e8f0"/></svg>`,
        ad: false,
        desc: "Run and explore available bot commands from the web UI.",
        subtitle: "Commands",
        invite: "/commands",
        label: "Open Commands",
        bg: "#0f172a",
    },
    "multi_v2": {
        svg: `<svg viewBox="0 0 320 160" role="img"><rect width="320" height="160" fill="#132337"/><g fill="#091426" transform="translate(9 9)"><circle cx="104" cy="80" r="24"/><circle cx="228" cy="80" r="24"/></g><line x1="130" y1="80" x2="202" y2="80" stroke="#091426" stroke-width="10" stroke-linecap="round" transform="translate(9 9)"/><circle cx="104" cy="80" r="24" fill="#1e293b" stroke="#93c5fd" stroke-width="4"/><circle cx="228" cy="80" r="24" fill="#1e293b" stroke="#93c5fd" stroke-width="4"/><line x1="130" y1="80" x2="202" y2="80" stroke="#22c55e" stroke-width="10" stroke-linecap="round"/><circle cx="166" cy="80" r="8" fill="#22c55e"/></svg>`,
        ad: false,
        desc: "Inspect the newer multi-check flow for a selected nation.",
        subtitle: "Multi Checker v2",
        invite: "/multi_v2/",
        label: "Open Multi v2",
        bg: "#0f172a",
    },
    "1244684694956675113": {
        svg: mediaImage,
        ad: true,
        desc: "Get breaking news about ongoing conflicts and share in their discussions. Available on the Media discord server.",
        subtitle: "Updates & Discussions",
        invite: "https://discord.gg/aNg9DnzqWG",
        label: "Join Now!",
        bg: "#111",
    },
    // // loading image
    // "0": {
    //     img: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    //     ad: false,
    //     desc: "Loading...",
    //     subtitle: "Loading...",
    //     invite: "#",
    //     bg: "#EEE",
    // },
};

export default function Home() {
    const isInlineSvg = (value: string) => value.trimStart().startsWith("<svg");

    return <>
        <LoginPickerPage />
        <div className="bg-card border border-border rounded-lg p-3 mt-2 shadow-sm">
            <h1 className="text-lg font-bold mb-2">Featured Content</h1>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,16rem))] justify-center gap-2">
                {Object.keys(_cardTemplates).map((key) => {
                    const template = _cardTemplates[key];
                    const inlineSvg = isInlineSvg(template.svg);
                    return (
                        <Card key={key} className="w-full max-w-[16rem] flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative">
                                {inlineSvg ? (
                                    <div
                                        style={{ background: template.bg }}
                                        className="h-32 w-full"
                                        dangerouslySetInnerHTML={{ __html: template.svg }}
                                    />
                                ) : (
                                    <img
                                        src={template.svg}
                                        style={{ background: template.bg }}
                                        className="h-32 w-full object-cover"
                                        alt={template.subtitle}
                                    />
                                )}
                                {template.ad && <span className="bg-blue-500/80 text-white text-xs font-medium rounded px-2 py-1 absolute top-2 right-2 backdrop-blur-sm">Ad</span>}
                            </div>
                            <CardHeader>
                                <CardTitle>
                                    {template.subtitle}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grow">
                                <CardDescription>{template.desc}</CardDescription>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="outline" className="w-full" asChild>
                                    <Link to={template.invite}>{template.label}</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    </>
}
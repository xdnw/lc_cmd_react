import LoginPickerPage from "@/pages/login_picker";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import versusImage from '@/assets/versus.jpg';
import sheetImage from '@/assets/sheet.jpg';
import graphImage from '@/assets/graph.png';
import chestImage from '@/assets/chest.png';
import mediaImage from '@/assets/media2.png';
import React from "react";

const _cardTemplates: {
    [key: string]: {
        ad: boolean;
        img: string;
        desc: string;
        subtitle: string;
        invite: string;
        label: string;
        bg: string;
    };
} = {
    "wars": {
        img: versusImage,
        ad: false,
        desc: "Browse a variety of tables and graphs for our featured set of ongoing and historical alliance conflicts. Data is available to download in CSV format.",
        subtitle: "Alliance Conflicts",
        invite: "https://wars.locutus.link/conflicts",
        label: "View Conflicts",
        bg: "#BB66CC",
    },
    "tables": {
        img: sheetImage,
        ad: false,
        desc: "Browse templates or create your custom table from a variety of game data. Share or export options available.",
        subtitle: "Table Builder",
        invite: "/custom_table",
        label: "Open Editor",
        bg: "#FFC929",
    },
    "charts": {
        img: graphImage,
        ad: false,
        desc: "Browse templates or create your custom chart from a variety of game data. Share or export options available.",
        subtitle: "Chart Viewer",
        invite: "/edit_graph",
        label: "View Charts",
        bg: "#FFC929",
    },
    "raid": {
        img: chestImage,
        ad: false,
        desc: "Find raidable nations in your score range",
        subtitle: "Raid Finder",
        invite: "/raid",
        label: "Raid Finder",
        bg: "#FFC929",
    },
    "1244684694956675113": {
        img: mediaImage,
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
    return <>
        <LoginPickerPage />
        <div className="bg-card border border-border rounded-lg p-3 mt-3 shadow-sm">
            <h1 className="text-2xl font-bold mb-3">Featured Content</h1>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,18rem))] justify-center gap-3">
                {Object.keys(_cardTemplates).map((key) => {
                    const template = _cardTemplates[key];
                    return (
                        <Card key={key} className="w-full max-w-[18rem] flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative">
                                <img
                                    src={template.img}
                                    style={{ background: template.bg }}
                                    className="h-48 w-full object-cover"
                                    alt={template.subtitle}
                                />
                                {template.ad && <span className="bg-blue-500/80 text-white text-xs font-medium rounded px-2 py-1 absolute top-2 right-2 backdrop-blur-sm">Ad</span>}
                            </div>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {template.subtitle}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grow">
                                <CardDescription className="text-sm">{template.desc}</CardDescription>
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
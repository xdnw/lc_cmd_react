import { useCallback } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type LocalSidebarMode = "local" | "main";

export default function LocalSidebarModeTabs({
    localLabel,
    mode,
    isRefreshing,
    onModeChange,
}: {
    localLabel: string;
    mode: LocalSidebarMode;
    isRefreshing: boolean;
    onModeChange: (mode: LocalSidebarMode) => void;
}) {
    const handleValueChange = useCallback((nextValue: string) => {
        if (nextValue === "local" || nextValue === "main") {
            onModeChange(nextValue);
        }
    }, [onModeChange]);

    return (
        <div className="space-y-1">
            <Tabs value={mode} onValueChange={handleValueChange}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="local">{localLabel}</TabsTrigger>
                    <TabsTrigger value="main">App nav</TabsTrigger>
                </TabsList>
            </Tabs>
            {isRefreshing ? <div className="text-[10px] text-muted-foreground">Refreshing</div> : null}
        </div>
    );
}

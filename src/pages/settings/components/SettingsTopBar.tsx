import Badge from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnsupportedInputIssue } from "../settingsDomain";

export default function SettingsTopBar({
    invalidCount,
    unsupportedIssues,
    showUnavailable,
    setShowUnavailable,
}: {
    invalidCount: number;
    unsupportedIssues: UnsupportedInputIssue[];
    showUnavailable: boolean;
    setShowUnavailable: (value: boolean) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Guild settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={invalidCount > 0 ? "destructive" : "secondary"}>Invalid values: {invalidCount}</Badge>
                    <Badge variant={unsupportedIssues.length > 0 ? "destructive" : "secondary"}>
                        Unsupported inputs: {unsupportedIssues.length}
                    </Badge>
                    <label className="ms-auto flex items-center gap-2 text-xs text-muted-foreground">
                        <Input
                            type="checkbox"
                            checked={showUnavailable}
                            onChange={(event) => setShowUnavailable(event.target.checked)}
                        />
                        Show unavailable settings
                    </label>
                </div>

                {unsupportedIssues.length > 0 && (
                    <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs">
                        <div className="mb-1 font-medium text-destructive">Unsupported web inputs need follow-up fixes</div>
                        <ul className="space-y-1 text-muted-foreground">
                            {unsupportedIssues.slice(0, 8).map((issue) => (
                                <li key={issue.settingKey}>
                                    {issue.settingKey}: {issue.reason}
                                </li>
                            ))}
                            {unsupportedIssues.length > 8 && <li>…and {unsupportedIssues.length - 8} more</li>}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

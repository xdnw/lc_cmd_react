import ConfirmCommandActionButton from "@/components/cmd/ConfirmCommandActionButton";
import { Button } from "@/components/ui/button";
import type { ConflictPosts, WebVirtualConflict } from "@/lib/apitypes.d.ts";
import type { TableActionArgs } from "@/pages/custom_table/actions/models";
import { useCallback, useMemo, useState } from "react";
import type { ConflictCommandPath } from "./conflictActions";

export type ParsedAllianceEntry = {
    allianceId: number;
    coalition: 0 | 1;
};

export type ParsedForumPost = {
    id: string;
    key: string;
    href: string;
};

const FORUM_BASE_URL = "https://forum.politicsandwar.com/index.php?/topic/";

function coalitionLabel(side: 0 | 1 | null, coalitionOneName: string, coalitionTwoName: string): string {
    if (side === 0) return coalitionOneName || "Coalition 1";
    if (side === 1) return coalitionTwoName || "Coalition 2";
    return "Unassigned";
}

export function parseConflictAllianceEntries(conflictAllianceLists: number[][] | undefined): ParsedAllianceEntry[] {
    if (!conflictAllianceLists) return [];

    const coalitionOne = conflictAllianceLists[0] ?? [];
    const coalitionTwo = conflictAllianceLists[1] ?? [];

    const normalizeIds = (ids: number[]): number[] => {
        return ids.filter((id) => Number.isFinite(id) && id > 0);
    };

    const entries: ParsedAllianceEntry[] = [];
    normalizeIds(coalitionOne).forEach((allianceId) => {
        entries.push({ allianceId, coalition: 0 });
    });
    normalizeIds(coalitionTwo).forEach((allianceId) => {
        entries.push({ allianceId, coalition: 1 });
    });

    const deduped = new Map<string, ParsedAllianceEntry>();
    entries.forEach((entry) => {
        deduped.set(`${entry.coalition}-${entry.allianceId}`, entry);
    });

    return Array.from(deduped.values());
}

export function parseConflictPosts(postsData: ConflictPosts | undefined, conflictId: number | string): ParsedForumPost[] {
    const conflictPosts = postsData?.posts?.[String(conflictId)];
    if (!conflictPosts) return [];
    return Object.entries(conflictPosts).map(([key, meta]) => {
        const id = Array.isArray(meta) && meta.length > 0 ? String(meta[0] ?? "") : "";
        return {
            id,
            key,
            href: `${FORUM_BASE_URL}${id}-${key}`,
        };
    });
}

export function parseVirtualConflictAllianceData(info: WebVirtualConflict | undefined): {
    entries: ParsedAllianceEntry[];
    allianceNames: Record<number, string>;
} {
    if (!info?.alliances) {
        return { entries: [], allianceNames: {} };
    }

    const conflictAlliances = info.alliances.conflict_alliances;
    const listForConflict = conflictAlliances?.[String(info.id)]
        ?? Object.values(conflictAlliances ?? {})[0];

    return {
        entries: parseConflictAllianceEntries(listForConflict),
        allianceNames: info.alliances.alliance_names ?? {},
    };
}

export function parseVirtualConflictPosts(info: WebVirtualConflict | undefined): ParsedForumPost[] {
    if (!info?.posts) return [];

    const rawPosts = info.posts[String(info.id)] ?? Object.values(info.posts)[0];
    if (!rawPosts) return [];

    if (Array.isArray(rawPosts)) {
        return rawPosts
            .map((value, index) => {
                if (Array.isArray(value)) {
                    const id = String(value[0] ?? "");
                    const key = String(value[1] ?? value[0] ?? index);
                    return {
                        id,
                        key,
                        href: `${FORUM_BASE_URL}${id}-${key}`,
                    };
                }
                return null;
            })
            .filter((value): value is ParsedForumPost => Boolean(value));
    }

    if (typeof rawPosts === "object") {
        return Object.entries(rawPosts as Record<string, unknown>).map(([key, value]) => {
            const id = Array.isArray(value) && value.length > 0
                ? String(value[0] ?? "")
                : String(value ?? "");
            return {
                id,
                key,
                href: `${FORUM_BASE_URL}${id}-${key}`,
            };
        });
    }

    return [];
}

export function ConflictForumPostsSection({
    canEdit,
    onActionSuccess,
    posts,
    openAddForumPostDialog,
    forumPostRemoveAction,
    buildForumPostRemoveArgs,
    isLoading,
    error,
}: {
    canEdit: boolean;
    onActionSuccess: () => void;
    posts: ParsedForumPost[];
    openAddForumPostDialog?: () => void;
    forumPostRemoveAction?: { command: ConflictCommandPath };
    buildForumPostRemoveArgs: (post: ParsedForumPost) => TableActionArgs<ConflictCommandPath>;
    isLoading?: boolean;
    error?: string;
}) {
    const [pendingRemovalUrl, setPendingRemovalUrl] = useState<string | null>(null);

    const onConfirmRemoveComplete = useCallback((result?: { status?: "success" | "error" | "action" }) => {
        if (result?.status === "error") return;
        onActionSuccess();
    }, [onActionSuccess]);

    const forumPostConfirmHandlers = useMemo(
        () => Object.fromEntries(posts.map((post) => [
            post.key,
            (next: boolean) => setPendingRemovalUrl(next ? post.key : null),
        ])) as Record<string, (next: boolean) => void>,
        [posts],
    );

    return (
        <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-2">Forum Posts</h3>
            {error && (
                <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    Failed to load forum posts: {error}
                </div>
            )}
            {isLoading && <div className="mb-2 text-xs text-muted-foreground">Loading forum posts...</div>}
            <div className="flex flex-wrap gap-2 mb-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={openAddForumPostDialog}
                    disabled={!canEdit || !openAddForumPostDialog}
                >
                    Add Forum Post
                </Button>
            </div>
            {posts.length === 0 && !isLoading && (
                <div className="text-xs text-muted-foreground py-1">No forum posts added.</div>
            )}
            {posts.length > 0 && (
                <div className="space-y-1">
                    {posts.map((post) => {
                        const isConfirming = pendingRemovalUrl === post.key;
                        const removeArgs = buildForumPostRemoveArgs(post);
                        return (
                            <div
                                key={post.key}
                                className="flex items-start gap-2 rounded border border-border px-2 py-1 hover:bg-muted"
                            >
                                <a
                                    href={post.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-w-0 flex-1 text-xs text-primary underline break-all"
                                >
                                    {post.href}
                                </a>
                                {forumPostRemoveAction && (
                                    <ConfirmCommandActionButton
                                        command={forumPostRemoveAction.command}
                                        args={removeArgs}
                                        label="Remove"
                                        disabled={!canEdit}
                                        showResultDialog
                                        onComplete={onConfirmRemoveComplete}
                                        isConfirming={isConfirming}
                                        onConfirmingChange={forumPostConfirmHandlers[post.key]}
                                        resetOnComplete="non-error"
                                        buttonVariant="destructive"
                                        buttonSize="sm"
                                        buttonClassName="h-6 px-2 text-[11px]"
                                        classes="!m-0 !h-6 !px-2 !w-auto"
                                        cancelSize="sm"
                                        cancelClassName="h-6 px-2 text-[11px]"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function ConflictAllianceSection({
    canEdit,
    onActionSuccess,
    coalitionOneName,
    coalitionTwoName,
    entries,
    allianceNames,
    openAddAllianceDialog,
    openAddAllForNationDialog,
    allianceRemoveAction,
    buildAllianceRemoveArgs,
    isLoading,
    error,
}: {
    canEdit: boolean;
    onActionSuccess: () => void;
    coalitionOneName: string;
    coalitionTwoName: string;
    entries: ParsedAllianceEntry[];
    allianceNames: Record<number, string>;
    openAddAllianceDialog?: () => void;
    openAddAllForNationDialog?: () => void;
    allianceRemoveAction?: { command: ConflictCommandPath };
    buildAllianceRemoveArgs: (entry: ParsedAllianceEntry) => TableActionArgs<ConflictCommandPath>;
    isLoading?: boolean;
    error?: string;
}) {
    const [pendingRemovalKey, setPendingRemovalKey] = useState<string | null>(null);

    const entriesByCoalition = useMemo(() => {
        const grouped = new Map<0 | 1, ParsedAllianceEntry[]>();
        for (const entry of entries) {
            const bucket = grouped.get(entry.coalition) ?? [];
            bucket.push(entry);
            grouped.set(entry.coalition, bucket);
        }
        return grouped;
    }, [entries]);

    const coalitionSections = useMemo(() => {
        return ([0, 1] as const).map((coalition) => ({
            coalition,
            entries: entriesByCoalition.get(coalition) ?? [],
        }));
    }, [entriesByCoalition]);

    const onConfirmRemoveComplete = useCallback((result?: { status?: "success" | "error" | "action" }) => {
        if (result?.status === "error") return;
        onActionSuccess();
    }, [onActionSuccess]);

    const allianceConfirmHandlers = useMemo(
        () => Object.fromEntries(entries.map((entry) => {
            const key = `${entry.coalition}-${entry.allianceId}`;
            return [key, (next: boolean) => setPendingRemovalKey(next ? key : null)];
        })) as Record<string, (next: boolean) => void>,
        [entries],
    );

    return (
        <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-2">Alliances</h3>
            {error && (
                <div className="mb-2 rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    Failed to load alliances: {error}
                </div>
            )}
            {isLoading && <div className="mb-2 text-xs text-muted-foreground">Loading alliances...</div>}
            <div className="flex flex-wrap gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={openAddAllianceDialog} disabled={!canEdit || !openAddAllianceDialog}>Add Alliance</Button>
                <Button variant="outline" size="sm" onClick={openAddAllForNationDialog} disabled={!canEdit || !openAddAllForNationDialog}>Add All for Nation</Button>
            </div>

            <div className="mb-2">
                {entries.length === 0 && !isLoading && <div className="text-xs text-muted-foreground py-1">No alliances added.</div>}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {coalitionSections.map(({ coalition, entries: coalitionEntries }) => (
                        <div key={`coalition-${coalition}`} className="rounded border border-border px-2 py-1">
                            <div className="text-[11px] font-medium text-muted-foreground mb-1">
                                {coalitionLabel(coalition, coalitionOneName, coalitionTwoName)} ({coalitionEntries.length})
                            </div>
                            <div className="space-y-1">
                                {coalitionEntries
                                    .slice()
                                    .sort((left, right) => {
                                        const leftName = allianceNames[left.allianceId] || `Alliance ${left.allianceId}`;
                                        const rightName = allianceNames[right.allianceId] || `Alliance ${right.allianceId}`;
                                        return leftName.localeCompare(rightName);
                                    })
                                    .map((entry) => {
                                        const name = allianceNames[entry.allianceId] || `Alliance ${entry.allianceId}`;
                                        const key = `${entry.coalition}-${entry.allianceId}`;
                                        const isConfirming = pendingRemovalKey === key;
                                        const removeArgs = buildAllianceRemoveArgs(entry);
                                        return (
                                            <div key={key} className="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted">
                                                <div className="min-w-0 flex-1 text-xs truncate">{name}</div>
                                                {allianceRemoveAction && (
                                                    <ConfirmCommandActionButton
                                                        command={allianceRemoveAction.command}
                                                        args={removeArgs}
                                                        label="Remove"
                                                        disabled={!canEdit}
                                                        showResultDialog
                                                        onComplete={onConfirmRemoveComplete}
                                                        isConfirming={isConfirming}
                                                        onConfirmingChange={allianceConfirmHandlers[key]}
                                                        resetOnComplete="non-error"
                                                        buttonVariant="destructive"
                                                        buttonSize="sm"
                                                        buttonClassName="h-6 px-2 text-[11px]"
                                                        classes="!m-0 !h-6 !px-2 !w-auto"
                                                        cancelSize="sm"
                                                        cancelClassName="h-6 px-2 text-[11px]"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

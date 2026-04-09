import CommandActionButton from "@/components/cmd/CommandActionButton";
import { useDialog } from "@/components/layout/DialogContext";
import { Button } from "@/components/ui/button";
import type { ConflictAlliances, ConflictPosts } from "@/lib/apitypes.d.ts";
import { CONFLICTALLIANCES, CONFLICTPOSTS } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import { buildWarsConflictUrl } from "@/lib/warsFrontend";
import type { ConfigColumns } from "@/pages/custom_table/DataTable";
import CommandActionDialogContent from "@/pages/custom_table/actions/CommandActionDialogContent";
import RowActionsDetailDialog from "@/pages/custom_table/actions/RowActionsDetailDialog";
import { isActionVisible } from "@/pages/custom_table/actions/models";
import {
    type ConflictRow,
    renderConflictCell,
    toPlainString,
} from "@/pages/a2/conflict/conflictTableSchema";
import {
    buildConflictAllianceRemoveArgs,
    buildConflictForumPostRemoveArgs,
    buildConflictDetailFields,
    getConflictAllianceAddAction,
    getConflictAllianceAddForNationAction,
    getConflictAllianceRemoveAction,
    getConflictFooterActions,
    getConflictForumPostAddAction,
    getConflictForumPostRemoveAction,
    getConflictHeaderSyncAction,
    withConflictDialogArgs,
    type ConflictFormattedValues,
    type ConflictRowAction,
} from "./conflictActions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
    ConflictAllianceSection,
    ConflictForumPostsSection,
    parseConflictAllianceEntries,
    parseConflictPosts,
} from "./ConflictAssociationSections";
import { buildActionDialogMaps, toRowActionsDetailFields } from "./conflictDialogWiring";

function ForumPostsSubMenu({
    conflict,
    canEdit,
    onActionSuccess,
    openAddForumPostDialog,
    forumPostRemoveAction,
}: {
    conflict: ConflictRow;
    canEdit: boolean;
    onActionSuccess: () => void;
    openAddForumPostDialog?: () => void;
    forumPostRemoveAction?: ConflictRowAction;
}) {
    const { data, isFetching, isError, error } = useQuery(
        bulkQueryOptions(CONFLICTPOSTS.endpoint, { conflicts: String(conflict.id) }),
    );

    const postsData = (data?.data ?? undefined) as ConflictPosts | undefined;
    const posts = useMemo(() => parseConflictPosts(postsData, conflict.id), [postsData, conflict.id]);

    const onPostsActionSuccess = useCallback(() => {
        onActionSuccess();
    }, [onActionSuccess]);
    const buildForumPostRemoveArgs = useCallback((post: { key: string }) => {
        return buildConflictForumPostRemoveArgs(conflict.id, post.key);
    }, [conflict.id]);

    return (
        <ConflictForumPostsSection
            canEdit={canEdit}
            onActionSuccess={onPostsActionSuccess}
            posts={posts}
            openAddForumPostDialog={openAddForumPostDialog}
            forumPostRemoveAction={forumPostRemoveAction}
            buildForumPostRemoveArgs={buildForumPostRemoveArgs}
            isLoading={isFetching}
            error={isError ? String(error) : undefined}
        />
    );
}

function AllianceSubMenu({
    conflict,
    canEdit,
    onActionSuccess,
    coalitionOneName,
    coalitionTwoName,
    openAddAllianceDialog,
    openAddAllForNationDialog,
    allianceRemoveAction,
}: {
    conflict: ConflictRow;
    canEdit: boolean;
    onActionSuccess: () => void;
    coalitionOneName: string;
    coalitionTwoName: string;
    openAddAllianceDialog?: () => void;
    openAddAllForNationDialog?: () => void;
    allianceRemoveAction?: ConflictRowAction;
}) {
    const { data, isFetching, isError, error } = useQuery(bulkQueryOptions(CONFLICTALLIANCES.endpoint, { conflicts: String(conflict.id) }));

    const conflictAlliancesData = (data?.data ?? undefined) as ConflictAlliances | undefined;

    const alliancesMap = useMemo<{ [key: number]: string }>(() => {
        return conflictAlliancesData?.alliance_names ?? {};
    }, [conflictAlliancesData?.alliance_names]);

    const conflictAllianceLists = useMemo(() => {
        return conflictAlliancesData?.conflict_alliances?.[String(conflict.id)];
    }, [conflict.id, conflictAlliancesData?.conflict_alliances]);

    const entries = useMemo(() => parseConflictAllianceEntries(conflictAllianceLists), [conflictAllianceLists]);
    const onAllianceRemoveSuccess = useCallback(() => {
        onActionSuccess();
    }, [onActionSuccess]);
    const buildAllianceRemoveArgs = useCallback((entry: { allianceId: number }) => {
        return buildConflictAllianceRemoveArgs(conflict.id, entry.allianceId);
    }, [conflict.id]);

    return (
        <ConflictAllianceSection
            canEdit={canEdit}
            onActionSuccess={onAllianceRemoveSuccess}
            coalitionOneName={coalitionOneName}
            coalitionTwoName={coalitionTwoName}
            entries={entries}
            allianceNames={alliancesMap}
            openAddAllianceDialog={openAddAllianceDialog}
            openAddAllForNationDialog={openAddAllForNationDialog}
            allianceRemoveAction={allianceRemoveAction}
            buildAllianceRemoveArgs={buildAllianceRemoveArgs}
            isLoading={isFetching}
            error={isError ? String(error) : undefined}
        />
    );
}

export default function ConflictActionsDialogButton({
    row,
    rowLabel,
    selectedIds,
    actions,
    canRunAction,
    canEdit,
    onActionSuccess,
    columnsInfo,
    getColumnsInfo,
    onOpenReady,
}: {
    row: ConflictRow;
    rowLabel: string;
    selectedIds: Set<number>;
    actions: readonly ConflictRowAction[];
    canRunAction: (action: ConflictRowAction) => boolean;
    canEdit: boolean;
    onActionSuccess?: (actionId: string) => void;
    columnsInfo?: ConfigColumns[];
    getColumnsInfo?: () => ConfigColumns[] | undefined;
    onOpenReady?: (rowId: number, open: (() => void) | null) => void;
}) {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();

    const onPopupActionSuccess = useCallback((actionId: string) => {
        onActionSuccess?.(actionId);
        void Promise.all([
            queryClient.invalidateQueries({
                queryKey: [CONFLICTPOSTS.endpoint.name, { conflicts: String(row.id) }],
                exact: true,
            }),
            queryClient.invalidateQueries({
                queryKey: [CONFLICTALLIANCES.endpoint.name, { conflicts: String(row.id) }],
                exact: true,
            }),
        ]);
    }, [onActionSuccess, queryClient, row.id]);

    const visibleActions = useMemo(() => {
        return actions.filter((action) => isActionVisible(action, { row, selectedIds }));
    }, [actions, row, selectedIds]);

    const onAllianceActionSuccess = useCallback(() => {
        onPopupActionSuccess("");
    }, [onPopupActionSuccess]);

    const resolveColumnsInfo = useCallback(() => {
        const liveColumns = getColumnsInfo?.();
        if (liveColumns && liveColumns.length > 0) return liveColumns;
        return columnsInfo;
    }, [columnsInfo, getColumnsInfo]);

    const openDetailsClick = useCallback(() => {
        const runtimeColumnsInfo = resolveColumnsInfo();
        const runtimeFormattedValues: ConflictFormattedValues = {
            category: renderConflictCell(row, "category", runtimeColumnsInfo),
            start: renderConflictCell(row, "start", runtimeColumnsInfo),
            end: renderConflictCell(row, "end", runtimeColumnsInfo),
            c1Name: renderConflictCell(row, "c1Name", runtimeColumnsInfo),
            c2Name: renderConflictCell(row, "c2Name", runtimeColumnsInfo),
        };

        const openActionDialog = (action: ConflictRowAction) => {
            const actionWithPrefill = withConflictDialogArgs(action, {
                row,
                selectedIds,
                formatted: runtimeFormattedValues,
                columnsInfo: runtimeColumnsInfo,
            });

            const context = { row, selectedIds };
            showDialog(action.label, (
                actionWithPrefill.renderDialog
                    ? actionWithPrefill.renderDialog(context)
                    : (
                        <CommandActionDialogContent
                            action={actionWithPrefill}
                            context={context}
                            onSuccess={onPopupActionSuccess}
                            displayMode="focus-pane"
                        />
                    )
            ), { openInNewTab: true, focusNewTab: true, replaceActive: false });
        };

        const { openDialogByActionId, onSuccessByActionId } = buildActionDialogMaps(
            visibleActions,
            openActionDialog,
            onPopupActionSuccess,
        );

        const editableFields = buildConflictDetailFields(visibleActions, {
            row,
            formatted: runtimeFormattedValues,
            columnsInfo: runtimeColumnsInfo,
        });
        const syncAction = getConflictHeaderSyncAction(visibleActions);
        const footerActions = getConflictFooterActions(visibleActions);
        const allianceAddAction = getConflictAllianceAddAction(visibleActions);
        const allianceAddForNationAction = getConflictAllianceAddForNationAction(visibleActions);
        const allianceRemoveAction = getConflictAllianceRemoveAction(visibleActions);
        const forumPostAddAction = getConflictForumPostAddAction(visibleActions);
        const forumPostRemoveAction = getConflictForumPostRemoveAction(visibleActions);

        const detailFields = toRowActionsDetailFields(editableFields, canRunAction, openDialogByActionId);
        const warsConflictUrl = buildWarsConflictUrl(row.id);
        const headerActions = [
            ...(syncAction ? [{
                key: syncAction.id,
                label: "Sync",
                onClick: openDialogByActionId.get(syncAction.id),
                disabled: !canRunAction(syncAction),
            }] : []),
            {
                key: "wars-frontend",
                content: (
                    <a
                        href={warsConflictUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-6 items-center text-sm text-primary underline-offset-4 hover:underline"
                    >
                        View in wars
                    </a>
                ),
            },
        ];

        const noPermission = visibleActions.length > 0 && visibleActions.every((a) => !canRunAction(a));

        const permissionBanner = noPermission && (
            <p className="mb-3 rounded border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                You don\u2019t have permission to edit this conflict. Actions are disabled.
            </p>
        );

        const openDetailsContent = (
            <>
                {permissionBanner}
                <RowActionsDetailDialog
                    headerActions={headerActions}
                    fields={detailFields}
                    footerActions={footerActions.map((action) => {
                        const disabled = !canRunAction(action);
                        if (action.requiresDialog) {
                            return {
                                key: action.id,
                                label: action.label,
                                onClick: openDialogByActionId.get(action.id),
                                disabled,
                                variant: action.detailRole === "danger" ? "destructive" : "outline",
                            } as const;
                        }

                        return {
                            key: action.id,
                            content: (
                                <CommandActionButton
                                    command={action.command}
                                    args={action.buildArgs({ row, selectedIds })}
                                    label={action.label}
                                    classes="!ms-0"
                                    disabled={disabled}
                                    showResultDialog={true}
                                    onSuccess={onSuccessByActionId.get(action.id)}
                                />
                            ),
                        } as const;
                    })}
                    extraSections={[
                        <AllianceSubMenu
                            key="alliances"
                            conflict={row}
                            canEdit={canEdit}
                            onActionSuccess={onAllianceActionSuccess}
                            coalitionOneName={toPlainString(runtimeFormattedValues.c1Name) ?? row.c1Name}
                            coalitionTwoName={toPlainString(runtimeFormattedValues.c2Name) ?? row.c2Name}
                            openAddAllianceDialog={allianceAddAction ? openDialogByActionId.get(allianceAddAction.id) : undefined}
                            openAddAllForNationDialog={allianceAddForNationAction ? openDialogByActionId.get(allianceAddForNationAction.id) : undefined}
                            allianceRemoveAction={allianceRemoveAction}
                        />,
                        <ForumPostsSubMenu
                            key="posts"
                            conflict={row}
                            canEdit={canEdit}
                            onActionSuccess={onAllianceActionSuccess}
                            openAddForumPostDialog={forumPostAddAction ? openDialogByActionId.get(forumPostAddAction.id) : undefined}
                            forumPostRemoveAction={forumPostRemoveAction}
                        />,
                    ]}
                />
            </>
        );

        showDialog(`Conflict: ${row.name}`, openDetailsContent, { openInNewTab: true, focusNewTab: true, replaceActive: false });
    }, [
        canEdit,
        canRunAction,
        onAllianceActionSuccess,
        onPopupActionSuccess,
        resolveColumnsInfo,
        row,
        selectedIds,
        showDialog,
        visibleActions,
    ]);

    const openDetailsClickRef = useRef(openDetailsClick);
    useEffect(() => {
        openDetailsClickRef.current = openDetailsClick;
    }, [openDetailsClick]);

    const openDetailsFromRegistry = useCallback(() => {
        openDetailsClickRef.current();
    }, []);

    useEffect(() => {
        onOpenReady?.(row.id, openDetailsFromRegistry);
        return () => onOpenReady?.(row.id, null);
    }, [onOpenReady, openDetailsFromRegistry, row.id]);

    return (
        <Button variant="outline" size="sm" className="max-w-55 truncate justify-start" onClick={openDetailsClick}>
            {rowLabel}
        </Button>
    );
}

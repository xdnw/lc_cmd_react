import CommandActionButton from "@/components/cmd/CommandActionButton";
import { useDialog } from "@/components/layout/DialogContext";
import { Button } from "@/components/ui/button";
import type { WebVirtualConflict } from "@/lib/apitypes.d.ts";
import { VIRTUALCONFLICTINFO } from "@/lib/endpoints";
import { bulkQueryOptions } from "@/lib/queries";
import CommandActionDialogContent from "@/pages/custom_table/actions/CommandActionDialogContent";
import { isActionVisible } from "@/pages/custom_table/actions/models";
import RowActionsDetailDialog from "@/pages/custom_table/actions/RowActionsDetailDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
    ConflictAllianceSection,
    ConflictForumPostsSection,
    parseVirtualConflictAllianceData,
    parseVirtualConflictPosts,
} from "./ConflictAssociationSections";
import { buildActionDialogMaps, toRowActionsDetailFields } from "./conflictDialogWiring";
import {
    buildTemporaryConflictAllianceRemoveArgs,
    buildTemporaryConflictDetailFields,
    buildTemporaryConflictForumPostRemoveArgs,
    getTemporaryConflictAllianceAddAction,
    getTemporaryConflictAllianceAddForNationAction,
    getTemporaryConflictAllianceRemoveAction,
    getTemporaryConflictFooterActions,
    getTemporaryConflictForumPostAddAction,
    getTemporaryConflictForumPostRemoveAction,
    getTemporaryConflictHeaderSyncAction,
    withTemporaryConflictDialogArgs,
    type TemporaryConflictRowAction,
} from "./temporaryConflictActions";
import type { TemporaryConflictRow } from "./temporaryConflictTableSchema";

function VirtualConflictInfoSection({
    row,
    info,
    isFetching,
    error,
    canEdit,
    onActionSuccess,
    openAddAllianceDialog,
    openAddAllForNationDialog,
    allianceRemoveAction,
    openAddForumPostDialog,
    forumPostRemoveAction,
}: {
    row: TemporaryConflictRow;
    info?: WebVirtualConflict;
    isFetching: boolean;
    error?: string;
    canEdit: boolean;
    onActionSuccess: () => void;
    openAddAllianceDialog?: () => void;
    openAddAllForNationDialog?: () => void;
    allianceRemoveAction?: TemporaryConflictRowAction;
    openAddForumPostDialog?: () => void;
    forumPostRemoveAction?: TemporaryConflictRowAction;
}) {
    const allianceData = useMemo(() => parseVirtualConflictAllianceData(info), [info]);
    const posts = useMemo(() => parseVirtualConflictPosts(info), [info]);
    const coalitionOneName = "Coalition 1";
    const coalitionTwoName = "Coalition 2";
    const buildAllianceRemoveArgs = useCallback((entry: { allianceId: number }) => {
        return buildTemporaryConflictAllianceRemoveArgs(row.commandConflictRef, entry.allianceId);
    }, [row.commandConflictRef]);
    const buildForumPostRemoveArgs = useCallback((post: { key: string }) => {
        return buildTemporaryConflictForumPostRemoveArgs(row.commandConflictRef, post.key);
    }, [row.commandConflictRef]);

    return (
        <>
            <ConflictAllianceSection
                canEdit={canEdit}
                onActionSuccess={onActionSuccess}
                coalitionOneName={coalitionOneName}
                coalitionTwoName={coalitionTwoName}
                entries={allianceData.entries}
                allianceNames={allianceData.allianceNames}
                openAddAllianceDialog={openAddAllianceDialog}
                openAddAllForNationDialog={openAddAllForNationDialog}
                allianceRemoveAction={allianceRemoveAction}
                buildAllianceRemoveArgs={buildAllianceRemoveArgs}
                isLoading={isFetching}
                error={error}
            />

            <ConflictForumPostsSection
                canEdit={canEdit}
                onActionSuccess={onActionSuccess}
                posts={posts}
                openAddForumPostDialog={openAddForumPostDialog}
                forumPostRemoveAction={forumPostRemoveAction}
                buildForumPostRemoveArgs={buildForumPostRemoveArgs}
                isLoading={isFetching}
                error={error}
            />
        </>
    );
}

function TemporaryConflictDetailsDialogContent({
    row,
    selectedIds,
    actions,
    canRunAction,
    canEdit,
    onPopupActionSuccess,
}: {
    row: TemporaryConflictRow;
    selectedIds: Set<string>;
    actions: readonly TemporaryConflictRowAction[];
    canRunAction: (action: TemporaryConflictRowAction) => boolean;
    canEdit: boolean;
    onPopupActionSuccess: (actionId: string) => void;
}) {
    const { showDialog } = useDialog();

    const { data: infoQueryData, isFetching: isInfoFetching, error: infoError } = useQuery(
        bulkQueryOptions(VIRTUALCONFLICTINFO.endpoint, { conflict: row.commandConflictRef }),
    );

    const info = (infoQueryData?.data ?? undefined) as WebVirtualConflict | undefined;
    const infoErrorText = infoError ? String(infoError) : undefined;

    const visibleActions = useMemo(() => {
        return actions.filter((action) => isActionVisible(action, { row, selectedIds }));
    }, [actions, row, selectedIds]);

    const onAssociationActionSuccess = useCallback(() => {
        onPopupActionSuccess("");
    }, [onPopupActionSuccess]);

    const openActionDialog = useCallback((action: TemporaryConflictRowAction) => {
        const actionWithPrefill = withTemporaryConflictDialogArgs(action, {
            row,
            selectedIds,
            info,
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
    }, [info, onPopupActionSuccess, row, selectedIds, showDialog]);

    const { openDialogByActionId, onSuccessByActionId } = buildActionDialogMaps(
        visibleActions,
        openActionDialog,
        onPopupActionSuccess,
    );

    const editableFields = buildTemporaryConflictDetailFields(visibleActions, { row, info });
    const syncAction = getTemporaryConflictHeaderSyncAction(visibleActions);
    const footerActions = getTemporaryConflictFooterActions(visibleActions);
    const allianceAddAction = getTemporaryConflictAllianceAddAction(visibleActions);
    const allianceAddForNationAction = getTemporaryConflictAllianceAddForNationAction(visibleActions);
    const allianceRemoveAction = getTemporaryConflictAllianceRemoveAction(visibleActions);
    const forumPostAddAction = getTemporaryConflictForumPostAddAction(visibleActions);
    const forumPostRemoveAction = getTemporaryConflictForumPostRemoveAction(visibleActions);

    const detailFields = toRowActionsDetailFields(editableFields, canRunAction, openDialogByActionId);

    return (
        <RowActionsDetailDialog
            headerActions={syncAction ? [{
                key: syncAction.id,
                label: "Sync",
                onClick: openDialogByActionId.get(syncAction.id),
                disabled: !canRunAction(syncAction),
            }] : undefined}
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
                <VirtualConflictInfoSection
                    key="details"
                    row={row}
                    info={info}
                    isFetching={isInfoFetching}
                    error={infoErrorText}
                    canEdit={canEdit}
                    onActionSuccess={onAssociationActionSuccess}
                    openAddAllianceDialog={allianceAddAction ? openDialogByActionId.get(allianceAddAction.id) : undefined}
                    openAddAllForNationDialog={allianceAddForNationAction ? openDialogByActionId.get(allianceAddForNationAction.id) : undefined}
                    allianceRemoveAction={allianceRemoveAction}
                    openAddForumPostDialog={forumPostAddAction ? openDialogByActionId.get(forumPostAddAction.id) : undefined}
                    forumPostRemoveAction={forumPostRemoveAction}
                />,
            ]}
        />
    );
}

export default function TemporaryConflictActionsDialogButton({
    row,
    rowLabel,
    selectedIds,
    actions,
    canRunAction,
    canEdit,
    onActionSuccess,
    onOpenReady,
}: {
    row: TemporaryConflictRow;
    rowLabel: string;
    selectedIds: Set<string>;
    actions: readonly TemporaryConflictRowAction[];
    canRunAction: (action: TemporaryConflictRowAction) => boolean;
    canEdit: boolean;
    onActionSuccess?: (actionId: string) => void;
    onOpenReady?: (keys: readonly string[], open: (() => void) | null) => void;
}) {
    const { showDialog } = useDialog();
    const queryClient = useQueryClient();
    const onPopupActionSuccess = useCallback((actionId: string) => {
        onActionSuccess?.(actionId);
        void queryClient.invalidateQueries({
            queryKey: [VIRTUALCONFLICTINFO.endpoint.name, { conflict: row.commandConflictRef }],
            exact: true,
        });
    }, [onActionSuccess, queryClient, row.commandConflictRef]);

    const onAssociationActionSuccess = useCallback(() => {
        onPopupActionSuccess("");
    }, [onPopupActionSuccess]);

    const openDetailsClick = useCallback(() => {
        showDialog(
            `Temporary Conflict: ${row.name}`,
            <TemporaryConflictDetailsDialogContent
                row={row}
                selectedIds={selectedIds}
                actions={actions}
                canRunAction={canRunAction}
                canEdit={canEdit}
                onPopupActionSuccess={onPopupActionSuccess}
            />,
            { openInNewTab: true, focusNewTab: true, replaceActive: false },
        );
    }, [actions, canEdit, canRunAction, onPopupActionSuccess, row, selectedIds, showDialog]);

    const openDetailsClickRef = useRef(openDetailsClick);
    useEffect(() => {
        openDetailsClickRef.current = openDetailsClick;
    }, [openDetailsClick]);

    const openDetailsFromRegistry = useCallback(() => {
        openDetailsClickRef.current();
    }, []);

    useEffect(() => {
        onOpenReady?.([row.key, row.meta.uuid], openDetailsFromRegistry);
        return () => onOpenReady?.([row.key, row.meta.uuid], null);
    }, [onOpenReady, openDetailsFromRegistry, row.key, row.meta.uuid]);

    return (
        <Button variant="outline" size="sm" className="max-w-55 truncate justify-start" onClick={openDetailsClick}>
            {rowLabel}
        </Button>
    );
}

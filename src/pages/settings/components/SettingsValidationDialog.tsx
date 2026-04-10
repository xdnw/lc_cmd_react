import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Loading from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import MarkupRenderer from "@/components/ui/MarkupRenderer";
import { extractBackendError } from "@/lib/BulkQuery";
import type { WebSettingValidationCheapness, WebSettingValidationErrors } from "@/lib/apitypes";
import { SETTINGS_VALIDATION_CHEAPNESS, SETTINGS_VALIDATION_ERRORS } from "@/lib/endpoints";
import type { JSONValue } from "@/lib/internaltypes";
import { PreparedDataTable } from "@/pages/custom_table/PreparedDataTable";
import type { ConfigColumns, TableRowSelection, TableRowSelectionId } from "@/pages/custom_table/DataTable";
import type { TableColumnCustomization, TableColumnCustomizationItem, TableSourceSelectionCopy } from "@/pages/custom_table/TableToolbar";
import { applyGenericColumnCustomization, createGenericColumnCustomizationItems, normalizeGenericColumnCustomizationItems } from "@/pages/custom_table/table_util";

import {
    getGuildSettingKeyByOrdinal,
    getGuildSettingOrdinal,
    hasVisibleSettingsSubgroup,
    type SettingKey,
    type SettingRow,
} from "../settingsDomain";

type ValidationCellState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success" }
    | { status: "error"; message: string };

type ValidationStateByKey = Partial<Record<SettingKey, ValidationCellState>>;

type ValidationEndpoint = {
    endpoint: {
        call: (params: { [key: string]: string }) => Promise<unknown>;
    };
};

const IDLE_VALIDATION_STATE: ValidationCellState = { status: "idle" };
const LOADING_VALIDATION_STATE: ValidationCellState = { status: "loading" };
const SUCCESS_VALIDATION_STATE: ValidationCellState = { status: "success" };

const SETTING_KEY_INDEX = 0;
const SETTING_CATEGORY_INDEX = 1;
const SETTING_SUBGROUP_INDEX = 2;
const SETTING_VALUE_INDEX = 3;
const SETTING_RESULT_INDEX = 4;

const VALIDATION_SETTING_COLUMN_ID = "settings-validation:setting";
const VALIDATION_CATEGORY_COLUMN_ID = "settings-validation:category";
const VALIDATION_SUBGROUP_COLUMN_ID = "settings-validation:subgroup";
const VALIDATION_VALUE_COLUMN_ID = "settings-validation:value";
const VALIDATION_RESULT_COLUMN_ID = "settings-validation:result";

const DEFAULT_VISIBLE_VALIDATION_COLUMN_IDS = new Set<string>([
    VALIDATION_SETTING_COLUMN_ID,
    VALIDATION_VALUE_COLUMN_ID,
    VALIDATION_RESULT_COLUMN_ID,
]);

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    return "Unknown error";
}

function sortSettingKeysByOrdinal(settingKeys: readonly SettingKey[]): SettingKey[] {
    const dedupedKeys = Array.from(new Set(settingKeys));
    return dedupedKeys.sort((left, right) => {
        const leftOrdinal = getGuildSettingOrdinal(left) ?? Number.MAX_SAFE_INTEGER;
        const rightOrdinal = getGuildSettingOrdinal(right) ?? Number.MAX_SAFE_INTEGER;
        return leftOrdinal - rightOrdinal || left.localeCompare(right);
    });
}

function serializeSettingKeys(settingKeys: readonly SettingKey[]): string {
    return sortSettingKeysByOrdinal(settingKeys).join(",");
}

function formatSettingValue(row: SettingRow): string {
    return row.value.displayText || row.value.rawText || "(blank)";
}

function formatSettingSubgroup(row: SettingRow): string {
    return hasVisibleSettingsSubgroup(row.metadata.subgroup) ? row.metadata.subgroup : "";
}

async function callSettingsValidationEndpoint<T>(endpoint: ValidationEndpoint, settingKeys: readonly SettingKey[]): Promise<T> {
    const response = await endpoint.endpoint.call({
        settings: serializeSettingKeys(settingKeys),
    });
    const backendError = extractBackendError(response);
    if (backendError) {
        throw new Error(backendError);
    }
    return response as T;
}

function normalizeCheapnessBySettingKey(payload: WebSettingValidationCheapness): Map<SettingKey, boolean> {
    const normalized = new Map<SettingKey, boolean>();

    Object.entries(payload.is_cheap ?? {}).forEach(([ordinalKey, isCheap]) => {
        const ordinal = Number.parseInt(ordinalKey, 10);
        if (!Number.isFinite(ordinal)) {
            return;
        }

        const settingKey = getGuildSettingKeyByOrdinal(ordinal);
        if (!settingKey) {
            return;
        }

        normalized.set(settingKey, Boolean(isCheap));
    });

    return normalized;
}

function normalizeErrorsBySettingKey(payload: WebSettingValidationErrors): Map<SettingKey, string> {
    const normalized = new Map<SettingKey, string>();

    Object.entries(payload.errors ?? {}).forEach(([ordinalKey, message]) => {
        const ordinal = Number.parseInt(ordinalKey, 10);
        if (!Number.isFinite(ordinal) || typeof message !== "string" || !message.trim()) {
            return;
        }

        const settingKey = getGuildSettingKeyByOrdinal(ordinal);
        if (!settingKey) {
            return;
        }

        normalized.set(settingKey, message);
    });

    return normalized;
}

function buildValidationRows(rows: SettingRow[]): SettingRow[] {
    return [...rows].sort((left, right) => (
        left.metadata.category.localeCompare(right.metadata.category)
        || left.metadata.subgroup.localeCompare(right.metadata.subgroup)
        || left.settingKey.localeCompare(right.settingKey)
    ));
}

function ValidationStatusCell({ state }: { state: ValidationCellState }) {
    if (state.status === "loading") {
        return (
            <div className="inline-flex items-center gap-2 text-muted-foreground">
                <Loading size={3} variant="ripple" />
                <span>Running</span>
            </div>
        );
    }

    if (state.status === "success") {
        return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Success</span>;
    }

    if (state.status === "error") {
        return (
            <span
                className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-destructive"
                title={state.message}
            >
                Failed: {state.message}
            </span>
        );
    }

    return <span className="text-xs text-muted-foreground">Not run</span>;
}

function ValidationRunAlert({
    message,
    onDismiss,
}: {
    message: string;
    onDismiss: () => void;
}) {
    return (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 wrap-break-word text-xs">
                    <MarkupRenderer content={message} />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
                    Dismiss
                </Button>
            </div>
        </div>
    );
}

export default function SettingsValidationDialog({
    open,
    onOpenChange,
    rows,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rows: SettingRow[];
}) {
    const validationRows = useMemo(() => buildValidationRows(rows), [rows]);
    const sourceSelection = useMemo<TableSourceSelectionCopy | undefined>(() => {
        if (validationRows.length === 0) {
            return undefined;
        }

        return {
            value: serializeSettingKeys(validationRows.map((row) => row.settingKey)),
            label: "Copy listed settings",
        };
    }, [validationRows]);
    const [selectedIds, setSelectedIds] = useState<Set<SettingKey>>(() => new Set(validationRows.map((row) => row.settingKey)));
    const [statusByKey, setStatusByKey] = useState<ValidationStateByKey>({});
    const [runError, setRunError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const wasOpenRef = useRef(false);
    const activeRunIdRef = useRef(0);
    const cancelRequestedRef = useRef(false);

    useEffect(() => {
        const openedNow = open && !wasOpenRef.current;
        wasOpenRef.current = open;
        if (!openedNow) {
            return;
        }

        setSelectedIds(new Set(validationRows.map((row) => row.settingKey)));
        setStatusByKey({});
        setRunError(null);
        setIsCancelling(false);
        cancelRequestedRef.current = false;
    }, [open, validationRows]);

    useEffect(() => {
        const availableKeys = new Set(validationRows.map((row) => row.settingKey));

        setSelectedIds((current) => {
            const next = new Set(Array.from(current).filter((settingKey) => availableKeys.has(settingKey)));
            return next.size === current.size ? current : next;
        });

        setStatusByKey((current) => {
            let changed = false;
            const next: ValidationStateByKey = {};

            Object.entries(current).forEach(([settingKey, status]) => {
                if (!status || !availableKeys.has(settingKey as SettingKey)) {
                    if (status) {
                        changed = true;
                    }
                    return;
                }

                next[settingKey as SettingKey] = status;
            });

            return changed ? next : current;
        });
    }, [validationRows]);

    const selectedRows = useMemo(
        () => validationRows.filter((row) => selectedIds.has(row.settingKey)),
        [selectedIds, validationRows],
    );

    const allColumns = useMemo<ConfigColumns[]>(() => [
        {
            title: "Setting",
            columnId: VALIDATION_SETTING_COLUMN_ID,
            index: SETTING_KEY_INDEX,
            source: "client",
            sortable: true,
            editable: false,
            draggable: false,
            width: 220,
            cellClassName: "font-mono text-xs",
        },
        {
            title: "Category",
            columnId: VALIDATION_CATEGORY_COLUMN_ID,
            index: SETTING_CATEGORY_INDEX,
            source: "client",
            sortable: true,
            editable: false,
            draggable: false,
            width: 180,
            cellClassName: "text-xs",
        },
        {
            title: "Subgroup",
            columnId: VALIDATION_SUBGROUP_COLUMN_ID,
            index: SETTING_SUBGROUP_INDEX,
            source: "client",
            sortable: true,
            editable: false,
            draggable: false,
            width: 180,
            cellClassName: "text-xs",
        },
        {
            title: "Current value",
            columnId: VALIDATION_VALUE_COLUMN_ID,
            index: SETTING_VALUE_INDEX,
            source: "client",
            sortable: false,
            editable: false,
            draggable: false,
            width: 420,
            cellClassName: "text-xs",
        },
        {
            title: "Result",
            columnId: VALIDATION_RESULT_COLUMN_ID,
            index: SETTING_RESULT_INDEX,
            source: "client",
            sortable: false,
            editable: false,
            draggable: false,
            width: 460,
            render: {
                display: (_value, context) => {
                    const settingKey = typeof context?.row?.[SETTING_KEY_INDEX] === "string"
                        ? context.row[SETTING_KEY_INDEX] as SettingKey
                        : null;
                    const state = settingKey ? statusByKey[settingKey] ?? IDLE_VALIDATION_STATE : IDLE_VALIDATION_STATE;
                    return <ValidationStatusCell state={state} />;
                },
            },
        },
    ], [statusByKey]);
    const defaultVisibleColumns = useMemo(
        () => allColumns.filter((column) => column.columnId && DEFAULT_VISIBLE_VALIDATION_COLUMN_IDS.has(column.columnId)),
        [allColumns],
    );
    const defaultCustomizationItems = useMemo(
        () => createGenericColumnCustomizationItems(defaultVisibleColumns),
        [defaultVisibleColumns],
    );
    const [columnCustomizationItems, setColumnCustomizationItems] = useState<TableColumnCustomizationItem[]>(() => defaultCustomizationItems);
    const handleApplyColumnCustomization = useCallback((nextItems: TableColumnCustomizationItem[]) => {
        setColumnCustomizationItems(normalizeGenericColumnCustomizationItems(nextItems, allColumns, defaultCustomizationItems));
    }, [allColumns, defaultCustomizationItems]);
    const columnCustomization = useMemo<TableColumnCustomization>(() => ({
        items: columnCustomizationItems,
        availableItems: createGenericColumnCustomizationItems(allColumns),
        onApply: handleApplyColumnCustomization,
    }), [allColumns, columnCustomizationItems, handleApplyColumnCustomization]);
    const displayedColumns = useMemo(
        () => applyGenericColumnCustomization(allColumns, columnCustomizationItems, allColumns),
        [allColumns, columnCustomizationItems],
    );

    const allSelected = validationRows.length > 0 && selectedIds.size === validationRows.length;

    const tableData = useMemo<JSONValue[][]>(() => validationRows.map((row) => [
        row.settingKey,
        row.metadata.category,
        formatSettingSubgroup(row),
        formatSettingValue(row),
        row.settingKey,
    ]), [validationRows]);

    const setStatuses = useCallback((settingKeys: readonly SettingKey[], nextState: ValidationCellState) => {
        if (settingKeys.length === 0) {
            return;
        }

        setStatusByKey((current) => {
            const next: ValidationStateByKey = { ...current };
            settingKeys.forEach((settingKey) => {
                next[settingKey] = nextState;
            });
            return next;
        });
    }, []);

    const applyValidationPayload = useCallback((settingKeys: readonly SettingKey[], payload: WebSettingValidationErrors) => {
        const errorsByKey = normalizeErrorsBySettingKey(payload);

        setStatusByKey((current) => {
            const next: ValidationStateByKey = { ...current };
            settingKeys.forEach((settingKey) => {
                const errorMessage = errorsByKey.get(settingKey);
                next[settingKey] = errorMessage
                    ? { status: "error", message: errorMessage }
                    : SUCCESS_VALIDATION_STATE;
            });
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (isValidating) {
            return;
        }

        setSelectedIds(new Set(validationRows.map((row) => row.settingKey)));
    }, [isValidating, validationRows]);

    const handleUnselectAll = useCallback(() => {
        if (isValidating) {
            return;
        }

        setSelectedIds(new Set());
    }, [isValidating]);

    const handleCancel = useCallback(() => {
        cancelRequestedRef.current = true;
        setIsCancelling(true);
    }, []);

    const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
        if (!nextOpen && isValidating) {
            return;
        }

        onOpenChange(nextOpen);
    }, [isValidating, onOpenChange]);

    const handleClose = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    const handleDismissRunError = useCallback(() => {
        setRunError(null);
    }, []);

    const rowSelection = useMemo<TableRowSelection>(() => ({
        getRowId: (row: JSONValue[]) => {
            return typeof row[SETTING_KEY_INDEX] === "string"
                ? row[SETTING_KEY_INDEX] as SettingKey
                : null;
        },
        selectedIds,
        onSelectedIdsChange: (nextSelectedIds: Set<TableRowSelectionId>) => {
            if (isValidating) {
                return;
            }

            setSelectedIds(new Set(
                Array.from(nextSelectedIds).filter((settingKey): settingKey is SettingKey => typeof settingKey === "string"),
            ));
        },
        getLabel: (settingKey) => typeof settingKey === "string" && selectedIds.has(settingKey as SettingKey)
            ? `Deselect ${settingKey}`
            : `Select ${settingKey}`,
        copySelection: {
            label: "Copy selected settings",
            serialize: (nextSelectedIds) => serializeSettingKeys(
                Array.from(nextSelectedIds).filter((settingKey): settingKey is SettingKey => typeof settingKey === "string"),
            ),
        },
        showRowNumber: false,
        debugTagPrefix: "settings-validation-select",
    }), [isValidating, selectedIds]);

    const toolbarLeadingActions = useMemo(() => (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isValidating || allSelected || validationRows.length === 0}
            >
                Select all
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUnselectAll}
                disabled={isValidating || selectedIds.size === 0}
            >
                Unselect all
            </Button>
        </>
    ), [allSelected, handleSelectAll, handleUnselectAll, isValidating, selectedIds.size, validationRows.length]);

    const handleRunValidation = useCallback(async () => {
        const selectedSettingKeys = selectedRows.map((row) => row.settingKey);
        if (selectedSettingKeys.length === 0 || isValidating) {
            return;
        }

        const runId = activeRunIdRef.current + 1;
        activeRunIdRef.current = runId;
        cancelRequestedRef.current = false;
        setIsCancelling(false);
        setIsValidating(true);
        setRunError(null);
        setStatusByKey((current) => {
            const next: ValidationStateByKey = { ...current };
            selectedSettingKeys.forEach((settingKey) => {
                next[settingKey] = IDLE_VALIDATION_STATE;
            });
            return next;
        });

        const isActiveRun = () => activeRunIdRef.current === runId;

        try {
            const cheapnessPayload = await callSettingsValidationEndpoint<WebSettingValidationCheapness>(
                SETTINGS_VALIDATION_CHEAPNESS,
                selectedSettingKeys,
            );
            if (!isActiveRun()) {
                return;
            }

            const cheapnessByKey = normalizeCheapnessBySettingKey(cheapnessPayload);
            const cheapKeys = selectedSettingKeys.filter((settingKey) => cheapnessByKey.get(settingKey) === true);
            const expensiveKeys = selectedSettingKeys.filter((settingKey) => cheapnessByKey.get(settingKey) !== true);

            if (cheapKeys.length > 0) {
                setStatuses(cheapKeys, LOADING_VALIDATION_STATE);

                try {
                    const cheapValidationPayload = await callSettingsValidationEndpoint<WebSettingValidationErrors>(
                        SETTINGS_VALIDATION_ERRORS,
                        cheapKeys,
                    );
                    if (!isActiveRun()) {
                        return;
                    }

                    applyValidationPayload(cheapKeys, cheapValidationPayload);
                } catch (error) {
                    if (!isActiveRun()) {
                        return;
                    }

                    const message = getErrorMessage(error);
                    setStatuses(cheapKeys, { status: "error", message });
                    setRunError(`Failed to validate the cheap settings batch: ${message}`);
                    return;
                }
            }

            for (const settingKey of expensiveKeys) {
                if (!isActiveRun() || cancelRequestedRef.current) {
                    break;
                }

                setStatuses([settingKey], LOADING_VALIDATION_STATE);

                try {
                    const expensiveValidationPayload = await callSettingsValidationEndpoint<WebSettingValidationErrors>(
                        SETTINGS_VALIDATION_ERRORS,
                        [settingKey],
                    );
                    if (!isActiveRun()) {
                        return;
                    }

                    applyValidationPayload([settingKey], expensiveValidationPayload);
                } catch (error) {
                    if (!isActiveRun()) {
                        return;
                    }

                    const message = getErrorMessage(error);
                    setStatuses([settingKey], { status: "error", message });
                    setRunError(`Validation stopped while checking ${settingKey}: ${message}`);
                    return;
                }
            }
        } catch (error) {
            if (!isActiveRun()) {
                return;
            }

            setRunError(`Failed to determine validation cheapness: ${getErrorMessage(error)}`);
        } finally {
            if (isActiveRun()) {
                setIsValidating(false);
                setIsCancelling(false);
            }
        }
    }, [applyValidationPayload, isValidating, selectedRows, setStatuses]);

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
            <DialogContent className="grid h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-2 p-2 sm:h-[85vh] sm:max-h-[85vh] sm:gap-3 sm:p-3" showCloseButton={!isValidating}>
                <DialogHeader className="space-y-1 pr-10 text-left">
                    <DialogTitle className="text-left text-base font-semibold tracking-tight">Validate set settings</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex flex-col gap-3 overflow-hidden">
                    {runError ? <ValidationRunAlert message={runError} onDismiss={handleDismissRunError} /> : null}

                    <div className="min-h-0 flex-1">
                        {validationRows.length > 0 ? (
                            <PreparedDataTable
                                columnsInfo={displayedColumns}
                                data={tableData}
                                rowSelection={rowSelection}
                                sourceSelection={sourceSelection}
                                columnCustomization={columnCustomization}
                                toolbarLeadingActions={toolbarLeadingActions}
                                fillAvailableHeight
                            />
                        ) : (
                            <div className="flex h-full items-center rounded border border-border/60 bg-muted/15 px-3 py-4 text-sm text-muted-foreground">
                                No settings with current values are available for validation.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {isValidating ? (
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                {isCancelling ? "Cancelling..." : "Cancel"}
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isValidating}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            onClick={handleRunValidation}
                            disabled={isValidating || selectedIds.size === 0}
                        >
                            Run validation
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

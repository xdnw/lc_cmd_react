/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingRow } from "../settingsDomain";
import SettingsValidationDialog from "./SettingsValidationDialog";

const cheapnessCallMock = vi.hoisted(() => vi.fn());
const errorsCallMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/dialog", () => ({
    Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div>{children}</div> : null,
    DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock("@/components/ui/loading", () => ({
    default: () => <span>loading</span>,
}));

vi.mock("@/pages/custom_table/PreparedDataTable", () => ({
    PreparedDataTable: ({
        columnsInfo,
        data,
        rowSelection,
        sourceSelection,
        columnCustomization,
        toolbarLeadingActions,
    }: {
        columnsInfo: Array<{ title: string; index: number; render?: { display?: (value: unknown, context?: { row: unknown[]; rowIdx: number; column: unknown }) => React.ReactNode } }>;
        data: unknown[][];
        rowSelection?: {
            getRowId: (row: unknown[], rowIdx: number) => string | number | null | undefined;
            selectedIds: ReadonlySet<string | number>;
            onSelectedIdsChange: (selectedIds: Set<string | number>) => void;
            copySelection?: {
                label?: string;
                serialize: (selectedIds: ReadonlySet<string | number>) => string;
            };
        };
        sourceSelection?: {
            value: string;
            label?: string;
        };
        columnCustomization?: {
            availableItems?: Array<{ title: string }>;
        };
        toolbarLeadingActions?: ReactNode;
    }) => {
        const resultColumn = columnsInfo.find((column) => column.title === "Result") ?? columnsInfo[columnsInfo.length - 1];

        return (
            <div>
                <div>{toolbarLeadingActions}</div>
                {sourceSelection ? <div data-testid="source-selection">{sourceSelection.label}:{sourceSelection.value}</div> : null}
                {rowSelection?.copySelection ? (
                    <div data-testid="selected-copy-selection">
                        {rowSelection.copySelection.label}:{rowSelection.copySelection.serialize(rowSelection.selectedIds)}
                    </div>
                ) : null}
                {columnCustomization?.availableItems ? (
                    <div data-testid="available-column-titles">
                        {columnCustomization.availableItems.map((item) => item.title).join("|")}
                    </div>
                ) : null}
                <table>
                    <tbody>
                        {data.map((row, rowIdx) => {
                            const rowId = rowSelection?.getRowId(row, rowIdx);
                            const checked = rowId != null && rowSelection ? rowSelection.selectedIds.has(rowId) : false;

                            return (
                                <tr key={String(rowId ?? rowIdx)}>
                                    <td>
                                        {rowId != null && rowSelection ? (
                                            <input
                                                type="checkbox"
                                                aria-label={`Toggle ${rowId}`}
                                                checked={checked}
                                                onChange={(event) => {
                                                    const nextSelectedIds = new Set(rowSelection.selectedIds);
                                                    if (event.target.checked) {
                                                        nextSelectedIds.add(rowId);
                                                    } else {
                                                        nextSelectedIds.delete(rowId);
                                                    }
                                                    rowSelection.onSelectedIdsChange(nextSelectedIds);
                                                }}
                                            />
                                        ) : null}
                                    </td>
                                    {columnsInfo.map((column) => (
                                        <td key={`${String(rowId ?? rowIdx)}-${column.title}`}>
                                            {column.render?.display
                                                ? column.render.display(row[column.index], {
                                                    row,
                                                    rowIdx,
                                                    column,
                                                })
                                                : String(row[column.index])}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    },
}));

vi.mock("@/lib/endpoints", () => ({
    SETTINGS_VALIDATION_CHEAPNESS: {
        endpoint: {
            call: cheapnessCallMock,
        },
    },
    SETTINGS_VALIDATION_ERRORS: {
        endpoint: {
            call: errorsCallMock,
        },
    },
}));

function createDeferred<T>() {
    let resolve: (value: T) => void = () => undefined;
    const promise = new Promise<T>((innerResolve, innerReject) => {
        resolve = innerResolve;
        void innerReject;
    });
    return { promise, resolve };
}

function createSettingRow(settingKey: string, value = "configured"): SettingRow {
    return {
        settingKey: settingKey as never,
        metadata: {
            argType: "text",
            category: "Admin" as never,
            subgroup: "Alerts" as never,
            helpShort: `${settingKey} help`,
            helpFull: `${settingKey} help`,
        },
        value: {
            displayText: value,
            rawText: value,
            hasValue: true,
        },
        flags: {
            invalid: false,
            isChannelType: false,
            isAllowed: true,
        },
        editor: {
            breakdown: null,
            inputSupport: { supported: true },
            initialValue: value,
        },
        rowParseErrors: [],
        rawRow: [],
    };
}

describe("SettingsValidationDialog", () => {
    beforeEach(() => {
        cheapnessCallMock.mockReset();
        errorsCallMock.mockReset();
    });

    it("selects all rows by default and supports select all and unselect all", () => {
        render(
            <SettingsValidationDialog
                open
                onOpenChange={vi.fn()}
                rows={[
                    createSettingRow("ALLIANCE_ID", "Rose"),
                    createSettingRow("API_KEY", "token"),
                ]}
            />,
        );

        expect(screen.getByTestId("selected-copy-selection").textContent).toContain("Copy selected settings:ALLIANCE_ID,API_KEY");

        fireEvent.click(screen.getByRole("button", { name: /^Unselect all$/i }));
        expect(screen.getByTestId("selected-copy-selection").textContent).toBe("Copy selected settings:");

        fireEvent.click(screen.getByRole("button", { name: /^Select all$/i }));
        expect(screen.getByTestId("selected-copy-selection").textContent).toContain("Copy selected settings:ALLIANCE_ID,API_KEY");
    });

    it("passes shared copy and customization inputs to the table layer", () => {
        render(
            <SettingsValidationDialog
                open
                onOpenChange={vi.fn()}
                rows={[
                    createSettingRow("ALLIANCE_ID", "Rose"),
                    createSettingRow("API_KEY", "token"),
                ]}
            />,
        );

        expect(screen.getByTestId("source-selection").textContent).toContain("ALLIANCE_ID,API_KEY");
        expect(screen.getByTestId("selected-copy-selection").textContent).toContain("Copy selected settings:ALLIANCE_ID,API_KEY");
        expect(screen.getByTestId("available-column-titles").textContent).toContain("Category");
        expect(screen.getByTestId("available-column-titles").textContent).toContain("Subgroup");
    });

    it("runs cheap validations in bulk and expensive validations one at a time", async () => {
        cheapnessCallMock.mockResolvedValue({
            is_cheap: {
                "0": true,
                "1": false,
            },
        });
        errorsCallMock.mockImplementation(async ({ settings }: { settings: string }) => {
            if (settings === "ALLIANCE_ID") {
                return { errors: {} };
            }

            if (settings === "API_KEY") {
                return { errors: { "1": "Remote validation failed" } };
            }

            throw new Error(`Unexpected settings payload: ${settings}`);
        });

        render(
            <SettingsValidationDialog
                open
                onOpenChange={vi.fn()}
                rows={[
                    createSettingRow("ALLIANCE_ID", "Rose"),
                    createSettingRow("API_KEY", "token"),
                ]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /run validation/i }));

        await waitFor(() => {
            expect(cheapnessCallMock).toHaveBeenCalledWith({
                settings: "ALLIANCE_ID,API_KEY",
            });
        });

        await waitFor(() => {
            expect(errorsCallMock).toHaveBeenNthCalledWith(1, {
                settings: "ALLIANCE_ID",
            });
            expect(errorsCallMock).toHaveBeenNthCalledWith(2, {
                settings: "API_KEY",
            });
        });

        await waitFor(() => {
            expect(screen.getByText("Success")).toBeTruthy();
            expect(screen.getByText(/Failed: Remote validation failed/i)).toBeTruthy();
        });
    });

    it("lets the user dismiss transient run errors", async () => {
        cheapnessCallMock.mockRejectedValue(new Error("Cheapness endpoint offline"));

        render(
            <SettingsValidationDialog
                open
                onOpenChange={vi.fn()}
                rows={[
                    createSettingRow("ALLIANCE_ID", "Rose"),
                ]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /run validation/i }));

        await waitFor(() => {
            expect(screen.getByRole("alert").textContent).toContain("Failed to determine validation cheapness");
        });

        fireEvent.click(screen.getByRole("button", { name: /^Dismiss$/i }));
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows cancel while running and stops before the next expensive setting", async () => {
        const firstValidation = createDeferred<{ errors: Record<string, string> }>();

        cheapnessCallMock.mockResolvedValue({
            is_cheap: {
                "0": false,
                "1": false,
            },
        });
        errorsCallMock.mockImplementation(({ settings }: { settings: string }) => {
            if (settings === "ALLIANCE_ID") {
                return firstValidation.promise;
            }

            return Promise.resolve({ errors: {} });
        });

        render(
            <SettingsValidationDialog
                open
                onOpenChange={vi.fn()}
                rows={[
                    createSettingRow("ALLIANCE_ID", "Rose"),
                    createSettingRow("API_KEY", "token"),
                ]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /run validation/i }));

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
        });

        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        firstValidation.resolve({ errors: {} });

        await waitFor(() => {
            expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
        });

        expect(errorsCallMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Success")).toBeTruthy();
        expect(screen.getAllByText("Not run").length).toBeGreaterThan(0);
    });
});

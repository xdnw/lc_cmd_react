import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingRow } from "./settingsDomain";
import SettingsPage from "./index";
import SettingRowComponent from "./components/SettingRow";

const useGuildSettingsDataMock = vi.hoisted(() => vi.fn());
const useGuildSettingDialogsMock = vi.hoisted(() => vi.fn());

vi.mock("./useGuildSettingsData", () => ({
    useGuildSettingsData: useGuildSettingsDataMock,
}));

vi.mock("./useGuildSettingDialogs", () => ({
    useGuildSettingDialogs: useGuildSettingDialogsMock,
}));

vi.mock("@/components/layout/PageHeaderContext", () => ({
    usePageHeader: vi.fn(),
}));

vi.mock("@/components/layout/PageSidebarContext", () => ({
    useDefaultPageSidebar: vi.fn(() => null),
    usePageSidebar: vi.fn(),
}));

function createSettingRow(overrides?: Partial<SettingRow>): SettingRow {
    return {
        settingKey: "alerts.channel" as never,
        metadata: {
            argType: "text",
            category: "Admin" as never,
            subgroup: "Alerts" as never,
            helpShort: "See **Alert Docs** at https://example.com/docs",
            helpFull: "See **Alert Docs** at https://example.com/docs\nExtra help.",
            ...overrides?.metadata,
        },
        value: {
            displayText: "#alerts",
            rawText: "#alerts",
            inputText: "#alerts",
            hasValue: true,
            ...overrides?.value,
        },
        flags: {
            invalid: false,
            isChannelType: true,
            isAllowed: false,
            availabilityReason: "Visit https://example.com/errors for **details**",
            ...overrides?.flags,
        },
        editor: {
            breakdown: null,
            inputSupport: { supported: true },
            initialValue: "#alerts",
            ...overrides?.editor,
        },
        rowParseErrors: [],
        rawRow: [],
        ...overrides,
    };
}

describe("settings markup rendering", () => {
    beforeEach(() => {
        useGuildSettingDialogsMock.mockReturnValue({
            openEditDialog: vi.fn(),
            openHelpDialog: vi.fn(),
        });
    });

    it("renders setting descriptions and inline error notes through MarkupRenderer", () => {
        const row = createSettingRow();

        render(
            <SettingRowComponent
                row={row}
                subgroupPosition="only"
                onEdit={vi.fn()}
                onShowHelp={vi.fn()}
                onRefreshSetting={vi.fn()}
            />,
        );

        expect(screen.getByText("Alert Docs").tagName).toBe("STRONG");

        const detailsLink = screen.getByRole("link", { name: "https://example.com/errors" });
        expect(detailsLink.getAttribute("href")).toBe("https://example.com/errors");
    });

    it("renders settings page load errors through MarkupRenderer", () => {
        useGuildSettingsDataMock.mockReturnValue({
            hasGuild: true,
            listQuery: {
                isLoading: false,
                isFetching: false,
                error: new Error("See **status** at https://example.com/status"),
            },
            normalized: {
                rows: [],
                schemaErrors: [],
                rowParseErrors: [],
                unsupportedInputRows: [],
            },
            refetchAll: vi.fn(),
            refreshSingleSetting: vi.fn(),
            viewTableTo: "/view_table",
        });

        render(
            <MemoryRouter initialEntries={["/settings"]}>
                <SettingsPage />
            </MemoryRouter>,
        );

        expect(screen.getByText("status").tagName).toBe("STRONG");

        const statusLink = screen.getByRole("link", { name: "https://example.com/status" });
        expect(statusLink.getAttribute("href")).toBe("https://example.com/status");
    });
});
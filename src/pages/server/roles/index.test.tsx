import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SidebarNavConfig } from "@/components/layout/SidebarNav";
import type { SettingRow } from "@/pages/settings/settingsDomain";
import { LOCUTUS_ROLE_DESCRIPTIONS } from "./rolesDomain";

import RoleManagementPage from "./index";

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());
const useSessionMock = vi.hoisted(() => vi.fn());
const useDialogMock = vi.hoisted(() => vi.fn());
const usePageHeaderMock = vi.hoisted(() => vi.fn());
const usePageSidebarMock = vi.hoisted(() => vi.fn());
const useDefaultPageSidebarMock = vi.hoisted(() => vi.fn());
const usePermissionMock = vi.hoisted(() => vi.fn());
const useGuildSettingsDataMock = vi.hoisted(() => vi.fn());
const useGuildSettingDialogsMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
    useQuery: useQueryMock,
    useMutation: useMutationMock,
    useQueryClient: useQueryClientMock,
}));

vi.mock("@/components/api/SessionContext", () => ({
    useSession: useSessionMock,
}));

vi.mock("@/components/layout/DialogContext", () => ({
    useDialog: useDialogMock,
}));

vi.mock("@/components/layout/PageHeaderContext", () => ({
    usePageHeader: usePageHeaderMock,
}));

vi.mock("@/components/layout/PageSidebarContext", () => ({
    useDefaultPageSidebar: useDefaultPageSidebarMock,
    usePageSidebar: usePageSidebarMock,
}));

vi.mock("@/utils/PermUtil", () => ({
    usePermission: usePermissionMock,
}));

vi.mock("@/pages/settings/useGuildSettingsData", () => ({
    useGuildSettingsData: useGuildSettingsDataMock,
}));

vi.mock("@/pages/settings/useGuildSettingDialogs", () => ({
    useGuildSettingDialogs: useGuildSettingDialogsMock,
}));

vi.mock("@/components/api/apiform", () => ({
    ApiFormInputs: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/components/cmd/ArgInput", () => ({
    default: () => <div>ArgInput</div>,
}));

vi.mock("@/components/cmd/CommandDialogForm", () => ({
    default: () => <div>CommandDialogForm</div>,
}));

vi.mock("@/components/cmd/ConfirmCommandActionButton", () => ({
    default: ({ children }: { children?: ReactNode }) => <div>{children ?? "Confirm"}</div>,
}));

function createSettingRow(settingKey: string, overrides?: Partial<SettingRow>): SettingRow {
    return {
        settingKey: settingKey as never,
        metadata: {
            argType: "text",
            category: "Admin" as never,
            subgroup: "Roles" as never,
            helpShort: `${settingKey} help`,
            helpFull: `${settingKey} full help`,
            ...overrides?.metadata,
        },
        value: {
            displayText: settingKey,
            rawText: settingKey,
            inputText: settingKey,
            hasValue: true,
            ...overrides?.value,
        },
        flags: {
            invalid: false,
            isChannelType: false,
            isAllowed: true,
            ...overrides?.flags,
        },
        editor: {
            breakdown: null,
            inputSupport: { supported: true },
            initialValue: settingKey,
            ...overrides?.editor,
        },
        rowParseErrors: [],
        rawRow: [],
        ...overrides,
    };
}

describe("RoleManagementPage sidebar", () => {
    beforeEach(() => {
        useQueryMock.mockReset();
        useMutationMock.mockReset();
        useQueryClientMock.mockReset();
        useSessionMock.mockReset();
        useDialogMock.mockReset();
        usePageHeaderMock.mockReset();
        usePageSidebarMock.mockReset();
        useDefaultPageSidebarMock.mockReset();
        usePermissionMock.mockReset();
        useGuildSettingsDataMock.mockReset();
        useGuildSettingDialogsMock.mockReset();

        useQueryClientMock.mockReturnValue({ fetchQuery: vi.fn() });
        useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
        useSessionMock.mockReturnValue({ session: { guild: "guild-1" } });
        useDialogMock.mockReturnValue({ showDialog: vi.fn() });
        useDefaultPageSidebarMock.mockReturnValue({
            items: [{ id: "app-nav", label: "Server", to: "/settings" }],
        });
        usePermissionMock.mockReturnValue({ permission: { success: true }, error: null });
        useGuildSettingDialogsMock.mockReturnValue({
            openEditDialog: vi.fn(),
            openHelpDialog: vi.fn(),
        });
        useGuildSettingsDataMock.mockReturnValue({
            hasGuild: true,
            listQuery: {
                isLoading: false,
                isFetching: false,
                error: null,
            },
            normalized: {
                rows: [
                    createSettingRow("AUTONICK"),
                    createSettingRow("AUTOROLE_ALLIANCES", {
                        flags: {
                            invalid: false,
                            isChannelType: false,
                            isAllowed: false,
                            availabilityReason: "Root guild only",
                        },
                    }),
                ],
                schemaErrors: [],
                rowParseErrors: [],
                unsupportedInputRows: [],
            },
            refetchAll: vi.fn(),
            refreshSingleSetting: vi.fn(() => Promise.resolve(null)),
            viewTableTo: "/view_table?type=GuildSetting",
        });
        const queryResults = [
            {
                isLoading: false,
                isFetching: false,
                error: null,
                data: {
                    data: {
                        mappings: {},
                        invalid_role_ordinals: [],
                        discord_role_names: {},
                    },
                },
                refetch: vi.fn(),
            },
            {
                isLoading: false,
                isFetching: false,
                error: null,
                data: {
                    data: {
                        alliance_roles: [],
                        city_roles: [],
                        tax_roles: [],
                    },
                },
                refetch: vi.fn(),
            },
            {
                isLoading: false,
                isFetching: false,
                error: null,
                data: undefined,
                refetch: vi.fn(),
            },
        ];

        let queryCallIndex = 0;
        useQueryMock.mockImplementation(() => {
            const result = queryResults[queryCallIndex % queryResults.length];
            queryCallIndex += 1;
            return result;
        });
    });

    it("registers a local roles sidebar with visible AUTO_ROLE settings only", () => {
        render(
            <MemoryRouter initialEntries={["/server/roles"]}>
                <RoleManagementPage />
            </MemoryRouter>,
        );

        const lastSidebarCall = usePageSidebarMock.mock.calls[usePageSidebarMock.mock.calls.length - 1];
        const config = lastSidebarCall?.[0] as SidebarNavConfig;
        expect(config).toBeTruthy();
        expect(config.layout).toBe("tree");

        const labels = config.items.map((item) => item.label);
        expect(labels).toContain("Role aliases");
        expect(labels).toContain("Autorole");
        expect(labels).toContain("Alliance, city, and tax roles");
        expect(labels).toContain("AUTO_ROLE settings");
        expect(labels).toContain("Single member");
        expect(labels).toContain("Whole guild");
        expect(labels).toContain("Alliance roles");
        expect(labels).toContain("City roles");
        expect(labels).toContain("Tax roles");
        expect(labels).toContain("AUTONICK");
        expect(labels).toContain("AUTOROLE_ALLIANCES");
        expect(labels).not.toContain("AUTOROLE_TOP_X");

        const settingsSection = config.items.find((item) => item.label === "AUTO_ROLE settings");
        const visibleSettingItem = config.items.find((item) => item.label === "AUTOROLE_ALLIANCES");
        expect(settingsSection?.level).toBe(0);
        expect(visibleSettingItem?.level).toBe(1);
        expect(visibleSettingItem?.status).toBe("disabled");
    });

    it("renders role alias descriptions as secondary text", () => {
        render(
            <MemoryRouter initialEntries={["/server/roles"]}>
                <RoleManagementPage />
            </MemoryRouter>,
        );

        expect(screen.getByText(LOCUTUS_ROLE_DESCRIPTIONS[0])).not.toBeNull();
    });
});

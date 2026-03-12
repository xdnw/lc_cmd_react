import type { GuildSettingCategory, GuildSettingSubgroup } from "@/lib/apitypes";
import { hasVisibleSettingsSubgroup, type SettingRow as SettingRowModel } from "../settingsDomain";
import SettingRow from "./SettingRow";
import { getCategoryTone, getSubgroupTone } from "./settingsVisuals";

export function SettingsCategoryHeader({
    category,
    settingCount,
    showSeparator = false,
}: {
    category: GuildSettingCategory;
    settingCount: number;
    showSeparator?: boolean;
}) {
    const categoryTone = getCategoryTone(category);

    return (
        <div className="px-1 pb-2 pt-7 first:pt-0">
            {showSeparator && <div className="mb-3 border-t border-border/85" />}
            <div className="flex items-center gap-3 px-1 pt-1">
                <div className="h-5 w-px rounded-full" style={categoryTone.railStyle} />
                <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold tracking-tight text-foreground">{category}</div>
                </div>
                <div className="shrink-0 text-[11px] text-muted-foreground">
                    {settingCount} setting{settingCount === 1 ? "" : "s"}
                </div>
            </div>
        </div>
    );
}

export function SettingsSubgroupHeader({
    category: _category,
    subgroup,
    settingCount,
}: {
    category: GuildSettingCategory;
    subgroup: GuildSettingSubgroup;
    settingCount: number;
}) {
    if (!hasVisibleSettingsSubgroup(subgroup)) {
        return null;
    }

    const subgroupTone = getSubgroupTone(subgroup);

    return (
        <div className="px-1 pt-1.5 pb-1">
            <div className="ml-3 flex items-center gap-2 border-t border-border/45 px-1.5 pt-1.5">
                <div className="h-3.5 w-px rounded-full" style={subgroupTone.railStyle} />
                <div className="min-w-0 flex-1 text-[11px] font-medium text-muted-foreground/95">
                    <span className="truncate align-middle">{subgroup}</span>
                </div>
                <div className="shrink-0 text-[11px] text-muted-foreground">
                    {settingCount} setting{settingCount === 1 ? "" : "s"}
                </div>
            </div>
        </div>
    );
}

export default function SettingsCategorySection({
    row,
    subgroupPosition,
    isHighlighted = false,
    onEdit,
    onShowHelp,
    onRefreshSetting,
}: {
    row: SettingRowModel;
    subgroupPosition: "first" | "middle" | "last" | "only";
    isHighlighted?: boolean;
    onEdit: (row: SettingRowModel) => void;
    onShowHelp: (row: SettingRowModel) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const categoryTone = getCategoryTone(row.metadata.category);
    const subgroupVisible = hasVisibleSettingsSubgroup(row.metadata.subgroup);
    const subgroupTone = subgroupVisible ? getSubgroupTone(row.metadata.subgroup) : null;

    return (
        <div className="px-1">
            <div
                className={subgroupVisible ? "pl-6" : "pl-3"}
                style={{
                    borderLeft: subgroupVisible ? `1px solid ${subgroupTone?.borderColor ?? categoryTone.borderColor}` : undefined,
                }}
            >
                <SettingRow
                    row={row}
                    subgroupPosition={subgroupPosition}
                    isHighlighted={isHighlighted}
                    onEdit={onEdit}
                    onShowHelp={onShowHelp}
                    onRefreshSetting={onRefreshSetting}
                />
            </div>
        </div>
    );
}

import type { GuildSettingCategory, GuildSettingSubgroup } from "@/lib/apitypes";
import { hasVisibleSettingsSubgroup, type SettingRow as SettingRowModel } from "../settingsDomain";
import SettingRow from "./SettingRow";
import { getCategoryTone, getSubgroupTone } from "./settingsVisuals";

export function SettingsCategoryHeader({
    category,
    settingCount,
}: {
    category: GuildSettingCategory;
    settingCount: number;
}) {
    const categoryTone = getCategoryTone(category);

    return (
        <div className="px-1 pt-6 pb-2 first:pt-0">
            <div className="flex items-center gap-3 border-t border-border/75 px-1 pt-3.5">
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
        <div className="px-1 pt-2 pb-1.5">
            <div className="ml-4 flex items-center gap-3 border-t border-border/50 px-3 pt-2.5">
                <div className="h-4 w-px rounded-full" style={subgroupTone.railStyle} />
                <div className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/95">
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
    onEdit,
    onShowHelp,
    onRefreshSetting,
}: {
    row: SettingRowModel;
    subgroupPosition: "first" | "middle" | "last" | "only";
    onEdit: (row: SettingRowModel) => void;
    onShowHelp: (row: SettingRowModel) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    const categoryTone = getCategoryTone(row.metadata.category);
    const subgroupVisible = hasVisibleSettingsSubgroup(row.metadata.subgroup);
    const subgroupTone = subgroupVisible ? getSubgroupTone(row.metadata.subgroup) : null;

    return (
        <div className="px-1 pb-1">
            <div
                className={subgroupVisible ? "pl-4" : "pl-1"}
                style={{
                    borderLeft: subgroupVisible ? `1px solid ${subgroupTone?.borderColor ?? categoryTone.borderColor}` : undefined,
                }}
            >
                <SettingRow
                    row={row}
                    subgroupPosition={subgroupPosition}
                    onEdit={onEdit}
                    onShowHelp={onShowHelp}
                    onRefreshSetting={onRefreshSetting}
                />
            </div>
        </div>
    );
}

import type { GuildSettingCategory, GuildSettingSubgroup } from "@/lib/apitypes";
import type { SettingRow as SettingRowModel } from "../settingsDomain";
import SettingRow from "./SettingRow";
import { getCategoryTone, getSubgroupTone } from "./settingsVisuals";

export function SettingsCategoryHeader({
    category,
    stickySubgroup,
}: {
    category: GuildSettingCategory;
    stickySubgroup: GuildSettingSubgroup | null;
}) {
    const categoryTone = getCategoryTone(category);
    const subgroupTone = stickySubgroup ? getSubgroupTone(stickySubgroup) : null;

    return (
        <div className="border-b border-border/50 bg-background px-1 py-1">
            <div className="flex items-start gap-2">
                <div className="mt-0.5 w-1 self-stretch rounded-full" style={categoryTone.railStyle} />
                <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold tracking-tight text-foreground">{category}</div>
                    {stickySubgroup && subgroupTone && (
                        <div
                            className="mt-0.5 flex items-center gap-2 border-l pl-2 text-[11px] text-muted-foreground"
                            style={{ borderLeftColor: subgroupTone.borderColor }}
                        >
                            <div className="h-3.5 w-0.5 rounded-full" style={subgroupTone.railStyle} />
                            <span className="truncate">{stickySubgroup}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function SettingsSubgroupHeader({
    category,
    subgroup,
    settingCount,
}: {
    category: GuildSettingCategory;
    subgroup: GuildSettingSubgroup;
    settingCount: number;
}) {
    const categoryTone = getCategoryTone(category);
    const subgroupTone = getSubgroupTone(subgroup);

    return (
        <div className="ml-1 border-l pl-3" style={{ borderLeftColor: categoryTone.borderColor }}>
            <div className="py-1 pr-1">
                <div
                    className="flex items-center gap-2 border-l pl-2"
                    style={{ borderLeftColor: subgroupTone.borderColor }}
                >
                    <div className="h-4 w-0.5 rounded-full" style={subgroupTone.railStyle} />
                    <div className="min-w-0 flex-1 text-xs font-semibold tracking-[0.01em] text-foreground">
                        {subgroup}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        {settingCount} setting{settingCount === 1 ? "" : "s"}
                    </div>
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

    return (
        <div className="ml-1 border-l pl-3" style={{ borderLeftColor: categoryTone.borderColor }}>
            <SettingRow
                row={row}
                subgroupPosition={subgroupPosition}
                onEdit={onEdit}
                onShowHelp={onShowHelp}
                onRefreshSetting={onRefreshSetting}
            />
        </div>
    );
}

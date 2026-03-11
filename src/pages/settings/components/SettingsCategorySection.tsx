import type { FlattenedSettingsItem, SettingRow as SettingRowModel } from "../settingsDomain";
import SettingRow from "./SettingRow";

export default function SettingsCategorySection({
    item,
    onEdit,
    onRefreshSetting,
}: {
    item: FlattenedSettingsItem;
    onEdit: (row: SettingRowModel) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    if (item.kind === "category") {
        return (
            <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="text-lg font-semibold">{item.category}</div>
            </div>
        );
    }

    if (item.kind === "subgroup") {
        return (
            <div className="px-1 pt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {item.subgroup}
            </div>
        );
    }

    return (
        <SettingRow
            row={item.row}
            onEdit={onEdit}
            onRefreshSetting={onRefreshSetting}
        />
    );
}

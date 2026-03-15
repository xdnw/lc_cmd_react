import type { FlattenedSettingsItem, SettingRow } from "../settingsDomain";
import SettingsCategorySection, { SettingsCategoryHeader, SettingsSubgroupHeader } from "./SettingsCategorySection";

export default function SettingsFlattenedItem({
    item,
    showCategorySeparator,
    isHighlighted,
    onEdit,
    onShowHelp,
    onRefreshSetting,
}: {
    item: FlattenedSettingsItem;
    showCategorySeparator: boolean;
    isHighlighted: boolean;
    onEdit: (row: SettingRow) => void;
    onShowHelp: (row: SettingRow) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    return (
        <div data-settings-item-key={item.key}>
            {item.kind === "category"
                ? (
                    <SettingsCategoryHeader
                        category={item.category}
                        settingCount={item.settingCount}
                        showSeparator={showCategorySeparator}
                    />
                )
                : item.kind === "subgroup"
                ? (
                    <SettingsSubgroupHeader
                        category={item.category}
                        subgroup={item.subgroup}
                        settingCount={item.settingCount}
                    />
                )
                : (
                    <SettingsCategorySection
                        row={item.row}
                        subgroupPosition={item.subgroupPosition}
                        isHighlighted={isHighlighted}
                        onEdit={onEdit}
                        onShowHelp={onShowHelp}
                        onRefreshSetting={onRefreshSetting}
                    />
                )}
        </div>
    );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SettingsCategoryVM, SettingRow as SettingRowModel } from "../settingsDomain";
import SettingRow from "./SettingRow";

function SettingsSubgroupSection({
    subgroup,
    rows,
    onEdit,
    onRefreshSetting,
}: {
    subgroup: string;
    rows: SettingRowModel[];
    onEdit: (row: SettingRowModel) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{subgroup}</div>
            <div className="space-y-2">
                {rows.map((row) => (
                    <SettingRow
                        key={row.settingKey}
                        row={row}
                        onEdit={onEdit}
                        onRefreshSetting={onRefreshSetting}
                    />
                ))}
            </div>
        </div>
    );
}

export default function SettingsCategorySection({
    category,
    onEdit,
    onRefreshSetting,
}: {
    category: SettingsCategoryVM;
    onEdit: (row: SettingRowModel) => void;
    onRefreshSetting: (settingKey: string) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{category.category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {category.subgroups.map((subgroup) => (
                    <SettingsSubgroupSection
                        key={`${category.category}-${subgroup.subgroup}`}
                        subgroup={subgroup.subgroup}
                        rows={subgroup.rows}
                        onEdit={onEdit}
                        onRefreshSetting={onRefreshSetting}
                    />
                ))}
            </CardContent>
        </Card>
    );
}

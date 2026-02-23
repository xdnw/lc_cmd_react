import { COMMANDS } from '@/lib/commands';
import { registerLayoutTabs } from '@/lib/layouts/configurable';
import { TabDefault } from '@/lib/layouts/types';
import { conflictTab } from '@/lib/layouts/tabs/conflict';
import { dbAllianceTab } from '@/lib/layouts/tabs/dbAlliance';
import { dbNationTab } from '@/lib/layouts/tabs/dbNation';
import { resourceTypeTab } from '@/lib/layouts/tabs/resourceType';

export const DEFAULT_TABS: Partial<{ [K in keyof typeof COMMANDS.placeholders]: TabDefault }> = {
    DBAlliance: dbAllianceTab,
    ResourceType: resourceTypeTab,
    Conflict: conflictTab,
    DBNation: dbNationTab,
};

registerLayoutTabs(DEFAULT_TABS);

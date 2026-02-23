import { COMMANDS } from '@/lib/commands';
import { TabDefault } from '@/lib/layouts/types';
import { CM } from '@/utils/Command';

export const resourceTypeTab: TabDefault = {
    selections: {
        All: '*',
        Raws: 'raws',
        Manufactured: 'manu',
        ...Object.fromEntries(COMMANDS.options.ResourceType.options.map((type) => [type, type])),
    },
    columns: {
        Price: {
            value: CM.placeholders('ResourceType').array()
                .add({ cmd: 'getname', alias: 'Resource' })
                .add({ cmd: 'getlow', alias: 'Low' })
                .add({ cmd: 'gethigh', alias: 'High' })
                .add({ cmd: 'getmargin', alias: 'Margin' })
                .shorten().build2d(),
            sort: { idx: 0, dir: 'asc' },
        },
    },
};

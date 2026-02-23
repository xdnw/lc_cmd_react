import { TabDefault } from '@/lib/layouts/types';
import { CM } from '@/utils/Command';

export const conflictTab: TabDefault = {
    selections: {
        All: '*',
        Active: '*,#getActiveWars>0',
        Inactive: '*,#getActiveWars=0',
        Great: '*,#getCategory=GREAT',
        Major: '*,#getCategory=MAJOR',
        Skirmish: '*,#getCategory=SKIRMISH',
        Unverified: '*,#getCategory=UNVERIFIED',
        Generated: '*,#getCategory=GENERATED',
        Micro: '*,#getCategory=MICRO',
        'Non-Micro': '*,#getCategory=NON_MICRO',
    },
    columns: {
        General: {
            value: CM.placeholders('Conflict').array()
                .add({ cmd: 'getid', alias: 'ID' })
                .addRaw('[{name}]({url})', 'Name')
                .add({ cmd: 'getcategory', alias: 'Category' })
                .add({ cmd: 'getstartturn', alias: 'Start' })
                .add({ cmd: 'getendturn', alias: 'End' })
                .add({ cmd: 'getactivewars', alias: 'Active Wars' })
                .add({ cmd: 'getdamageconverted', args: { isPrimary: 'true' }, alias: 'c1_damage' })
                .add({ cmd: 'getdamageconverted', args: { isPrimary: 'false' }, alias: 'c2_damage' })
                .shorten().build2d(),
            sort: { idx: 0, dir: 'desc' },
        },
    },
};

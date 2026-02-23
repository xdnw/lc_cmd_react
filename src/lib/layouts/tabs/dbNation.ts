import { TabDefault } from '@/lib/layouts/types';
import { CM } from '@/utils/Command';

export const dbNationTab: TabDefault = {
    selections: {
        All: '*',
        'Alliance Nations': '%guild_alliances%',
        'Members (Non VM)': '%guild_alliances%,#ismember',
        'Active Applicant (1d)': '%guild_alliances%,#position=1,#vm_turns=0,#active_m<1440',
        'Inactive Member >5d': '%guild_alliances%,#ismember,#active_m>7200',
        'Inactive Member >1w': '%guild_alliances%,#ismember,#active_m>10080',
        Allies: '~allies,#ismember,#active_m<10800',
        'Allies (underutilized)': '~allies,#active_m<2880,#freeoffensiveslots>0,#tankpct>0.8,#aircraftpct>0.8,#RelativeStrength>1.3,#vm_turns=0,#isbeige=0',
        Enemies: '~enemies,#ismember,#active_m<10800',
        'Enemies (priority)': '~enemies,#cities>10,#active_m<2880,#def<3,#off>0,#vm_turns=0,#isbeige=0,#RelativeStrength>0.7,#fighting(~allies)',
        'Spyable Enemies': '~enemies,#ismember,#active_m<2880,#espionageFull=0',
        'Lacking Spies': '%guild_alliances%,#ismember,#getSpyCapLeft>0,#daysSinceLastSpyBuy>0',
        'Member Not Verified': '%guild_alliances%,#ismember,#verified=0',
        'Member Not in Guild': '%guild_alliances%,#ismember,#isInAllianceGuild=0',
        'Member Not in Milcom Guild': '%guild_alliances%,#ismember,#isInMilcomGuild=0',
        'Low Tier, Not Raiding': '%guild_alliances%,#cities<10,#ismember,#active_m<2880,#off<5,#color!=beige,#blockaded=0',
    },
    columns: {
        General: {
            value: CM.placeholders('DBNation').array()
                .add({ cmd: 'getmarkdownurl', alias: 'Nation' })
                .add({ cmd: 'getallianceurlmarkup', alias: 'AA' })
                .add({ cmd: 'getagedays', alias: 'Age' })
                .add({ cmd: 'getcolor', alias: 'Color' })
                .add({ cmd: 'getcities', alias: 'Cities' })
                .add({ cmd: 'getscore', alias: 'Score' })
                .shorten().build2d(),
            sort: [{ idx: 1, dir: 'desc' }, { idx: 5, dir: 'desc' }],
        },
        MMR: {
            value: CM.placeholders('DBNation').array()
                .add({ cmd: 'getmarkdownurl', alias: 'Nation' })
                .add({ cmd: 'getallianceurlmarkup', alias: 'AA' })
                .add({ cmd: 'getcities', alias: 'Cities' })
                .add({ cmd: 'getavg_infra', alias: 'Infra' })
                .add({ cmd: 'getscore', alias: 'NS' })
                .add({ cmd: 'getoff', alias: '🗡' })
                .add({ cmd: 'getdef', alias: '🛡' })
                .add({ cmd: 'getsoldiers', alias: '💂' })
                .add({ cmd: 'gettanks', alias: '⚙' })
                .add({ cmd: 'getaircraft', alias: '✈' })
                .add({ cmd: 'getships', alias: '⛵' })
                .add({ cmd: 'getspies', alias: '🔎' })
                .add({ cmd: 'dayssincelastspybuy', alias: '$🔎days' })
                .add({ cmd: 'getspycap', alias: '🔎cap' })
                .add({ cmd: 'getmmrbuildingdecimal', alias: 'MMR[build]' })
                .add({ cmd: 'dayssincelastsoldierbuy', alias: '$💂days' })
                .add({ cmd: 'dayssincelasttankbuy', alias: '$⚙days' })
                .add({ cmd: 'dayssincelastaircraftbuy', alias: '$✈days' })
                .add({ cmd: 'dayssincelastshipbuy', alias: '$⛵days' })
                .shorten().build2d(),
            sort: [{ idx: 1, dir: 'desc' }, { idx: 3, dir: 'desc' }],
        },
    },
};

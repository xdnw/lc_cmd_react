import { COMMANDS } from '@/lib/commands';
import { LAYOUT_PACK_SEPARATOR, LAYOUT_RENDERERS } from '@/lib/layoutRenderers';
import { defineConfigurableColumns, layoutVar } from '@/lib/layouts';
import type { LayoutColumnTemplateBuilder, LayoutRawTemplate, LayoutVarRef, TabDefault } from '@/lib/layouts';
import { CM } from '@/utils/Command';

type TierBand = (typeof tierBands)[number];

function createStartEndVariables(startDesc: string) {
    return {
        start: {
            defaultValue: '30d',
            label: 'Start',
            desc: startDesc,
        },
        end: {
            defaultValue: '0d',
            label: 'End',
            desc: 'Time end (default: 0d).',
        },
    } as const;
}

function createBaselineCurrentVariables(baselineDesc: string, currentDesc: string) {
    return {
        baseline: {
            defaultValue: '30d',
            label: 'Baseline',
            desc: baselineDesc,
        },
        current: {
            defaultValue: '0d',
            label: 'Current',
            desc: currentDesc,
        },
    } as const;
}

function getBandMax(band: TierBand): number | undefined {
    return 'max' in band ? band.max : undefined;
}

function startEndArgs() {
    return {
        start: layoutVar('start'),
        end: layoutVar('end'),
    } as const;
}

function baselineCurrentRefs(tpl: LayoutColumnTemplateBuilder<'DBAlliance', 'current' | 'baseline'>) {
    return {
        current: tpl.rawVar('current'),
        baseline: tpl.rawVar('baseline'),
    } as const;
}

function allianceTierCountRaw<V extends string>(
    tpl: LayoutColumnTemplateBuilder<'DBAlliance', V>,
    timestamp: string | LayoutVarRef<V>,
    minCities: number,
    maxCities?: number
) {
    const cityRange = maxCities == null
        ? `#cities>=${minCities}`
        : `#cities>=${minCities},#cities<=${maxCities}`;
    return tpl.rawSubCommand(
        'getnations',
        {
            filter: `#ismember,${cityRange}`,
            timestamp,
        },
        'countnations',
    );
}

function packTierValues<V extends string>(
    tpl: LayoutColumnTemplateBuilder<'DBAlliance', V>,
    currentValue: LayoutRawTemplate<V>,
    baselineValue: LayoutRawTemplate<V>
): LayoutRawTemplate<V> {
    return tpl.rawConcat(currentValue, LAYOUT_PACK_SEPARATOR, baselineValue);
}

const tierBands = [
    { label: 'c1-c9', min: 1, max: 9 },
    { label: 'c10-c19', min: 10, max: 19 },
    { label: 'c20-c29', min: 20, max: 29 },
    { label: 'c30-c39', min: 30, max: 39 },
    { label: 'c40-c49', min: 40, max: 49 },
    { label: 'c50+', min: 50 },
] as const;

export const dbAllianceTab: TabDefault = {
    selections: {
        All: '*',
        'All (>0 active member)': '*,#countNations("#ismember,#active_m<10080")>0',
        'Top 10': '*,#rank<=10',
        'Top 15': '*,#rank<=15',
        'Top 25': '*,#rank<=25',
        'Top 50': '*,#rank<=50',
        'Guild Alliances': '%guild_alliances%',
    },
    columns: {
        General: {
            value: CM.placeholders('DBAlliance').array()
                .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                .add({ cmd: 'getscore', alias: 'Score' })
                .add({ cmd: 'getcities', alias: 'Cities' })
                .add({ cmd: 'getcolor', alias: 'Color' })
                .add({ cmd: 'countnations', args: { filter: '#position>1' }, alias: 'Members' })
                .shorten().build2d(),
            sort: { idx: 2, dir: 'desc' },
        },
        Militarization: {
            value: CM.placeholders('DBAlliance').array()
                .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT' }, alias: 'Tank%' })
                .add({ cmd: 'getmetricat', args: { metric: 'AIRCRAFT_PCT' }, alias: 'Air%' })
                .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT', date: '1d' }, alias: '1d' })
                .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT', date: '2d' }, alias: '2d' })
                .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT', date: '5d' }, alias: '5d' })
                .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT', date: '10d' }, alias: '10d' })
                .add({ cmd: 'getmilitarizationgraph', args: { start: '60d' }, alias: 'Militarization' })
                .shorten().build2d(),
            sort: { idx: 3, dir: 'desc' },
        },
        Revenue: {
            value: CM.placeholders('DBAlliance').array()
                .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                .add({ cmd: 'getrevenueconverted', alias: 'Total' })
                .addMultipleRaw(COMMANDS.options.ResourceType.options.filter((f) => f !== 'CREDITS').map((type) => [`{revenue.${type}}`, type]))
                .shorten().build2d(),
            sort: { idx: 1, dir: 'desc' },
        },
        'City Growth (30d)': {
            ...defineConfigurableColumns('DBAlliance', 'City Growth (30d)', {
                variables: createStartEndVariables('Time start for all growth metrics (for example: 7d, 14d, 30d).'),
                sort: { idx: 17, dir: 'desc' },
            }, (tpl) => {
                const time = startEndArgs();
                return tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .add({ cmd: 'getcities', alias: 'Cities' })
                    .add({ cmd: 'getmembershipchangesbyreason', args: { reasons: 'recruited,joined', ...time }, alias: 'Joined' })
                    .add({ cmd: 'getmembershipchangesbyreason', args: { reasons: 'left', ...time }, alias: 'Left' })
                    .add({ cmd: 'getnetmembersacquired', args: time, alias: 'Net' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'joined', assets: 'cities', ...time }, alias: 'Poached City' })
                    .add({ cmd: 'getmembershipchangeassetvalue', args: { reasons: 'joined', assets: 'cities', ...time }, alias: 'Poached City $' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'recruited', assets: 'cities', ...time }, alias: 'Recruited City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'left', assets: 'cities', ...time }, alias: 'Left City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'vm_returned', assets: 'cities', ...time }, alias: 'VM Ended City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'vm_left', assets: 'cities', ...time }, alias: 'VM City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'deleted', assets: 'cities', ...time }, alias: 'Deleted City' })
                    .add({ cmd: 'getboughtassetcount', args: { assets: 'cities', ...time }, alias: 'City Buy' })
                    .add({ cmd: 'geteffectiveboughtassetcount', args: { assets: 'cities', ...time }, alias: 'City Buy (remain)' })
                    .add({ cmd: 'getspendingvalue', args: { assets: 'cities', ...time }, alias: 'City Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'cities', ...time }, alias: 'City Buy $ (remain)' })
                    .add({ cmd: 'getnetasset', args: { asset: 'cities', ...time }, alias: 'Net City' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'cities', ...time }, alias: 'Net City $' });
            }),
        },
        'Growth (30d)': {
            ...defineConfigurableColumns('DBAlliance', 'Growth (30d)', {
                variables: createStartEndVariables('Time start for alliance growth metrics.'),
                sort: { idx: 9, dir: 'desc' },
            }, (tpl) => {
                const time = startEndArgs();
                return tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .add({ cmd: 'getscore', alias: 'Score' })
                    .add({ cmd: 'getnetmembersacquired', args: time, alias: 'Net Member' })
                    .add({ cmd: 'getnetasset', args: { asset: 'cities', ...time }, alias: 'Net City' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'cities', ...time }, alias: 'Net City $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'projects', ...time }, alias: 'Net Project $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'land', ...time }, alias: 'Net Land $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'infra', ...time }, alias: 'Net Infra $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: '*', ...time }, alias: 'Net Asset $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'cities', ...time }, alias: 'City Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'projects', ...time }, alias: 'Project Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'land', ...time }, alias: 'Land Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'infra', ...time }, alias: 'Infra Buy-Loss $' })
                    .add({ cmd: 'getcumulativerevenuevalue', args: time, alias: 'Total Revenue' });
            }),
        },
        'Tier Delta (30d)': {
            ...defineConfigurableColumns('DBAlliance', 'Tier Delta (30d)', {
                variables: createBaselineCurrentVariables(
                    'Snapshot offset used as the comparison baseline (for example: 30d, 90d, 365d).',
                    'Snapshot offset used as the current comparison point (typically 0d).',
                ),
                sort: { idx: 12, dir: 'desc' },
            }, (tpl) => {
                const withSummary = tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' });

                const { current, baseline } = baselineCurrentRefs(withSummary);

                withSummary.addRaw(
                    packTierValues(
                        withSummary,
                        allianceTierCountRaw(withSummary, current, 0),
                        allianceTierCountRaw(withSummary, baseline, 0),
                    ),
                    'Members (+change)',
                    LAYOUT_RENDERERS.numberWithDeltaFromBaseline
                );

                for (const band of tierBands) {
                    const max = getBandMax(band);
                    const currentTier = allianceTierCountRaw(
                        withSummary,
                        current,
                        band.min,
                        max
                    );
                    const baselineTier = allianceTierCountRaw(
                        withSummary,
                        baseline,
                        band.min,
                        max
                    );

                    withSummary
                        .addRaw(currentTier, band.label)
                        .addRaw(
                            withSummary.rawConcat(currentTier, '-', baselineTier),
                            `${band.label} Delta`
                        );
                }

                return withSummary;
            }),
        },
        'Tier Bands (30d)': {
            ...defineConfigurableColumns('DBAlliance', 'Tier Bands (30d)', {
                variables: createBaselineCurrentVariables(
                    'Snapshot offset used as the comparison baseline.',
                    'Snapshot offset used as the current comparison point.',
                ),
                sort: { idx: 8, dir: 'desc' },
            }, (tpl) => {
                const withSummary = tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' });

                const { current, baseline } = baselineCurrentRefs(withSummary);

                withSummary.addRaw(
                    packTierValues(
                        withSummary,
                        allianceTierCountRaw(withSummary, current, 0),
                        allianceTierCountRaw(withSummary, baseline, 0),
                    ),
                    'Members (+change)',
                    LAYOUT_RENDERERS.numberWithDeltaFromBaseline
                );

                for (const band of tierBands) {
                    const max = getBandMax(band);
                    withSummary.addRaw(
                        packTierValues(
                            withSummary,
                            allianceTierCountRaw(
                                withSummary,
                                current,
                                band.min,
                                max
                            ),
                            allianceTierCountRaw(
                                withSummary,
                                baseline,
                                band.min,
                                max
                            )
                        ),
                        `${band.label} now (Delta)`,
                        LAYOUT_RENDERERS.numberWithDeltaFromBaseline
                    );
                }

                return withSummary;
            }),
        },
        'Normalized Growth (30d)': {
            ...defineConfigurableColumns('DBAlliance', 'Normalized Growth (30d)', {
                variables: createStartEndVariables('Time start for normalized growth calculations.'),
                sort: { idx: 2, dir: 'desc' },
            }, (tpl) => {
                const time = startEndArgs();
                return tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .addRaw(
                        tpl.rawConcat(
                            tpl.rawCommand('geteffectiveboughtassetcount', {
                                assets: 'cities',
                                ...time,
                            }),
                            '/{countmembers}'
                        ),
                        'Cities/Member'
                    )
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'cities,projects,land', ...time }, alias: 'Invest/Member' })
                    .addRaw(
                        tpl.rawConcat(
                            tpl.rawCommand('geteffectivespendingvalue', {
                                assets: 'cities,projects,land',
                                ...time,
                            }),
                            '/',
                            tpl.rawCommand('getcumulativerevenuevalue', time)
                        ),
                        'Invest/Revenue'
                    );
            }),
        },
        'Cumulative Revenue (30d)': {
            ...defineConfigurableColumns('DBAlliance', 'Cumulative Revenue (30d)', {
                variables: createStartEndVariables('Time start for cumulative revenue snapshots.'),
                sort: { idx: 1, dir: 'desc' },
            }, (tpl) => {
                const time = startEndArgs();
                const withValue = tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'getcumulativerevenuevalue', args: time, alias: 'Value' });

                const resourceColumns = COMMANDS.options.ResourceType.options.filter((f) => f !== 'CREDITS');
                for (const resourceType of resourceColumns) {
                    withValue.addRaw(
                        withValue.rawConcat(
                            '{getcumulativerevenue(',
                            withValue.rawVar('start'),
                            `).${resourceType}}`
                        ),
                        resourceType
                    );
                }
                return withValue;
            }),
        },
        'City Exponent': {
            value: CM.placeholders('DBAlliance').array()
                .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                .add({ cmd: 'countmembers', alias: 'Members' })
                .add({ cmd: 'getcities', alias: 'Cities' })
                .add({ cmd: 'getscore', alias: 'Score' })
                .add({ cmd: 'exponentialcitystrength', alias: 'city^3' })
                .add({ cmd: 'exponentialcitystrength', args: { power: '2.5' }, alias: 'city^2.5' })
                .shorten().build2d(),
            sort: { idx: 5, dir: 'desc' },
        },
    },
};

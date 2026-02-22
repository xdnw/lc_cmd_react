import { COMMANDS } from "./commands";
import { CM, placeholderMention } from "../utils/Command";
import { OrderIdx } from "@/pages/custom_table/DataTable";

interface Columns {
    value: (string | [string, string])[],
    sort: OrderIdx | OrderIdx[],
}

interface TabDefault {
    selections: { [key: string]: string },
    columns: { [key: string]: Columns },
}

export const DEFAULT_TABS: Partial<{ [K in keyof typeof COMMANDS.placeholders]: TabDefault }> = {
    DBAlliance: {
        selections: {
            "All": "*",
            "All (>0 active member)": "*,#countNations(\"#position>1,#vm_turns=0,#active_m<10080\")>0",
            "Top 10": "*,#rank<=10",
            "Top 15": "*,#rank<=15",
            "Top 25": "*,#rank<=25",
            "Top 50": "*,#rank<=50",
            "Guild Alliances": "%guild_alliances%",
        },
        columns: {
            "General": {
                // value: [
                //     ["{markdownUrl}", "Alliance"],
                //     "{score}",
                //     "{cities}",
                //     "{color}",
                //     ["{countNations(#position>1)}", "members"]
                // ],
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'getscore', alias: 'Score' })
                    .add({ cmd: 'getcities', alias: 'Cities' })
                    .add({ cmd: 'getcolor', alias: 'Color' })
                    .add({ cmd: 'countnations', args: { filter: '#position>1' }, alias: 'Members' })
                    .shorten().build2d(),
                sort: { idx: 2, dir: 'desc' }
            },
            "Militarization": {
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT' }, alias: 'Tank%' })
                    .add({ cmd: 'getmetricat', args: { metric: 'AIRCRAFT_PCT' }, alias: 'Air%' })
                    .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT' }, alias: '1d' })
                    .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT' }, alias: '2d' })
                    .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT' }, alias: '5d' })
                    .add({ cmd: 'getmetricat', args: { metric: 'TANK_PCT' }, alias: '10d' })
                    .add({ cmd: 'getmilitarizationgraph', args: { start: '60d' }, alias: 'Militarization' })
                    .shorten().build2d(),
                sort: { idx: 3, dir: 'desc' }
            },
            "Revenue": {
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'getrevenueconverted', alias: 'Total' })
                    .addMultipleRaw(COMMANDS.options.ResourceType.options.filter(f => f !== "CREDITS").map((type) => [`{revenue.${type}}`, type]))
                    .shorten().build2d(),
                sort: { idx: 1, dir: 'desc' }
            },
            "City Growth (30d)": {
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .add({ cmd: 'getcities', alias: 'Cities' })
                    .add({
                        cmd: 'getmembershipchangesbyreason',
                        args: { reasons: 'recruited,joined', start: '30d', end: '0d' },
                        alias: 'Joined'
                    })
                    .add({
                        cmd: 'getmembershipchangesbyreason',
                        args: { reasons: 'left', start: '30d', end: '0d' },
                        alias: 'Left'
                    })
                    .add({ cmd: 'getnetmembersacquired', args: { start: '30d', end: '0d' }, alias: 'Net' })
                    .add({
                        cmd: 'getmembershipchangeassetcount',
                        args: { reasons: 'joined', assets: 'cities', start: '30d', end: '0d' },
                        alias: 'Poached City'
                    })
                    .add({
                        cmd: 'getmembershipchangeassetvalue',
                        args: { reasons: 'joined', assets: 'cities', start: '30d', end: '0d' },
                        alias: 'Poached City $'
                    })
                    .add({
                        cmd: 'getmembershipchangeassetcount',
                        args: { reasons: 'recruited', assets: 'cities', start: '30d', end: '0d' },
                        alias: 'Recruited City'
                    })
                    .add({
                        cmd: 'getmembershipchangeassetcount',
                        args: { reasons: 'left', assets: 'cities', start: '30d', end: '0d' },
                        alias: 'Left City'
                    })
                    .add({
                        cmd: 'getmembershipchangeassetcount',
                        args: { reasons: 'vm_returned', assets: 'cities', start: '30d', end: '0d' },
                        alias: 'VM Ended City'
                    })
                    .add({
                        cmd: 'getmembershipchangeassetcount',
                        args: { reasons: 'vm_left', assets: 'cities', start: '30d', end: '0d' },
                        alias: 'VM City'
                    })
                    .add({
                        cmd: 'getmembershipchangeassetcount',
                        args: { reasons: 'deleted', assets: 'cities', start: '30d', end: '0d' },
                        alias: 'Deleted City'
                    })
                    .add({
                        cmd: 'getboughtassetcount',
                        args: { assets: 'cities', start: '30d', end: '0d' },
                        alias: 'City Buy'
                    })
                    .add({
                        cmd: 'geteffectiveboughtassetcount',
                        args: { assets: 'cities', start: '30d', end: '0d' },
                        alias: 'City Buy (remain)'
                    })
                    .add({
                        cmd: 'getspendingvalue',
                        args: { assets: 'cities', start: '30d', end: '0d' },
                        alias: 'City Buy $'
                    })
                    .add({
                        cmd: 'geteffectivespendingvalue',
                        args: { assets: 'cities', start: '30d', end: '0d' },
                        alias: 'City Buy $ (remain)'
                    })
                    .add({ cmd: 'getnetasset', args: { asset: 'cities', start: '30d', end: '0d' }, alias: 'Net City' })
                    .add({
                        cmd: 'getnetassetvalue',
                        args: { asset: 'cities', start: '30d', end: '0d' },
                        alias: 'Net City $'
                    })
                    .shorten().build2d(),
                sort: { idx: 17, dir: 'desc' }
            },
            "Growth (30d)": {
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .add({ cmd: 'getscore', alias: 'Score' })
                    .add({ cmd: 'getnetmembersacquired', args: { start: '30d', end: '0d' }, alias: 'Net Member' })
                    .add({ cmd: 'getnetasset', args: { asset: 'cities', start: '30d', end: '0d' }, alias: 'Net City' })
                    .add({
                        cmd: 'getnetassetvalue',
                        args: { asset: 'cities', start: '30d', end: '0d' },
                        alias: 'Net City $'
                    })
                    .add({
                        cmd: 'getnetassetvalue',
                        args: { asset: 'projects', start: '30d', end: '0d' },
                        alias: 'Net Project $'
                    })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'land', start: '30d', end: '0d' }, alias: 'Net Land $' })
                    .add({
                        cmd: 'getnetassetvalue',
                        args: { asset: 'infra', start: '30d', end: '0d' },
                        alias: 'Net Infra $'
                    })
                    .add({ cmd: 'getnetassetvalue', args: { asset: '*', start: '30d', end: '0d' }, alias: 'Net Asset $' })
                    .add({
                        cmd: 'geteffectivespendingvalue',
                        args: { assets: 'cities', start: '30d', end: '0d' },
                        alias: 'City Buy $'
                    })
                    .add({
                        cmd: 'geteffectivespendingvalue',
                        args: { assets: 'projects', start: '30d', end: '0d' },
                        alias: 'Project Buy $'
                    })
                    .add({
                        cmd: 'geteffectivespendingvalue',
                        args: { assets: 'land', start: '30d', end: '0d' },
                        alias: 'Land Buy $'
                    })
                    .add({
                        cmd: 'geteffectivespendingvalue',
                        args: { assets: 'infra', start: '30d', end: '0d' },
                        alias: 'Infra Buy-Loss $'
                    })
                    .add({ cmd: 'getcumulativerevenuevalue', args: { start: '30d', end: '0d' }, alias: 'Total Revenue' })
                    .shorten().build2d(),
                sort: { idx: 9, dir: 'desc' }
            },
            "Normalized Growth (30d)": {
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .addRaw(placeholderMention({ type: 'DBAlliance', command: ['geteffectiveboughtassetcount'], args: { assets: 'cities', start: '30d', end: '0d' } }) + "/{countmembers}", 'Cities/Member')
                    .add({
                        cmd: 'geteffectivespendingvalue',
                        args: { assets: 'cities,projects,land', start: '30d', end: '0d' },
                        alias: 'Invest/Member'
                    })
                    .addRaw(
                        placeholderMention({ type: 'DBAlliance', command: ['geteffectivespendingvalue'], args: { assets: 'cities,projects,land', start: '30d', end: '0d' } }) +
                        "/" +
                        placeholderMention({ type: 'DBAlliance', command: ['getcumulativerevenuevalue'], args: { start: '30d', end: '0d' } }),
                        'Invest/Revenue'
                    )
                    .shorten().build2d(),
                sort: { idx: 2, dir: 'desc' }
            },
            "Cumulative Revenue (30d)": {
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'getcumulativerevenuevalue', args: { start: '30d', end: '0d' }, alias: 'Value' })
                    .addMultipleRaw(COMMANDS.options.ResourceType.options.filter(f => f !== "CREDITS").map((type) => [`{getcumulativerevenue(30d).${type}}`, type]))
                    .shorten().build2d(),
                sort: { idx: 1, dir: 'desc' }
            },
            "City Exponent": {
                value: CM.placeholders('DBAlliance').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .add({ cmd: 'getcities', alias: 'Cities' })
                    .add({ cmd: 'getscore', alias: 'Score' })
                    .add({ cmd: 'exponentialcitystrength', alias: 'city^3' })
                    .add({ cmd: 'exponentialcitystrength', args: { power: '2.5' }, alias: 'city^2.5' })
                    .shorten().build2d(),
                sort: { idx: 5, dir: 'desc' }
            }
        }
    },
    ResourceType: {
        selections: {
            "All": "*",
            "Raws": "raws",
            "Manufactured": "manu",
            ...Object.fromEntries((COMMANDS.options.ResourceType.options).map((type) => [type, type]))
        },
        columns: {
            "Price": {
                value: CM.placeholders('ResourceType').array()
                    .add({ cmd: 'getname', alias: 'Resource' })
                    .add({ cmd: 'getlow', alias: 'Low' })
                    .add({ cmd: 'gethigh', alias: 'High' })
                    .add({ cmd: 'getmargin', alias: 'Margin' })
                    .shorten().build2d(),
                sort: { idx: 0, dir: 'asc' }
            },
        }
    },
    Conflict: {
        selections: {
            "All": "*",
            "Active": "*,#getActiveWars>0",
            "Inactive": "*,#getActiveWars=0",
            "Great": "*,#getCategory=GREAT",
            "Major": "*,#getCategory=MAJOR",
            "Skirmish": "*,#getCategory=SKIRMISH",
            "Unverified": "*,#getCategory=UNVERIFIED",
            "Generated": "*,#getCategory=GENERATED",
            "Micro": "*,#getCategory=MICRO",
            "Non-Micro": "*,#getCategory=NON_MICRO",
        },
        columns: {
            "General": {
                value: CM.placeholders('Conflict').array()
                    .add({ cmd: 'getid', alias: 'ID' })
                    .addRaw("[{name}]({url})", "Name")
                    .add({ cmd: 'getcategory', alias: 'Category' })
                    .add({ cmd: 'getstartturn', alias: 'Start' })
                    .add({ cmd: 'getendturn', alias: 'End' })
                    .add({ cmd: 'getactivewars', alias: 'Active Wars' })
                    .add({ cmd: 'getdamageconverted', args: { 'isPrimary': 'true' }, alias: 'c1_damage' })
                    .add({ cmd: 'getdamageconverted', args: { 'isPrimary': 'false' }, alias: 'c2_damage' })
                    .shorten().build2d(),
                sort: { idx: 0, dir: 'desc' }
            },
        }
    },
    DBNation: {
        selections: {
            "All": "*",
            "Alliance Nations": "%guild_alliances%",
            "Members (Non VM)": "%guild_alliances%,#position>1,#vm_turns=0",
            "Active Applicant (1d)": "%guild_alliances%,#position=1,#vm_turns=0,#active_m<1440",
            "Inactive Member >5d": "%guild_alliances%,#position>1,#vm_turns=0,#active_m>7200",
            "Inactive Member >1w": "%guild_alliances%,#position>1,#vm_turns=0,#active_m>10080",
            "Allies": "~allies,#position>1,#vm_turns=0,#active_m<10800",
            "Allies (underutilized)": "~allies,#active_m<2880,#freeoffensiveslots>0,#tankpct>0.8,#aircraftpct>0.8,#RelativeStrength>1.3,#vm_turns=0,#isbeige=0",
            "Enemies": "~enemies,#position>1,#vm_turns=0,#active_m<10800",
            "Enemies (priority)": "~enemies,#cities>10,#active_m<2880,#def<3,#off>0,#vm_turns=0,#isbeige=0,#RelativeStrength>0.7,#fighting(~allies)",
            "Spyable Enemies": "~enemies,#position>1,#vm_turns=0,#active_m<2880,#espionageFull=0",
            "Lacking Spies": "%guild_alliances%,#position>1,#vm_turns=0,#getSpyCapLeft>0,#daysSinceLastSpyBuy>0",
            "Member Not Verified": "%guild_alliances%,#position>1,#vm_turns=0,#verified=0",
            "Member Not in Guild": "%guild_alliances%,#position>1,#vm_turns=0,#isInAllianceGuild=0",
            "Member Not in Milcom Guild": "%guild_alliances%,#position>1,#vm_turns=0,#isInMilcomGuild=0",
            "Low Tier, Not Raiding": "%guild_alliances%,#cities<10,#position>1,#vm_turns=0,#active_m<2880,#off<5,#color!=beige,#blockaded=0",
        },
        columns: {
            "General": {
                value: CM.placeholders('DBNation').array()
                    .add({ cmd: 'getmarkdownurl', alias: 'Nation' })
                    .add({ cmd: 'getallianceurlmarkup', alias: 'AA' })
                    .add({ cmd: 'getagedays', alias: 'Age' })
                    .add({ cmd: 'getcolor', alias: 'Color' })
                    .add({ cmd: 'getcities', alias: 'Cities' })
                    .add({ cmd: 'getscore', alias: 'Score' })
                    .shorten().build2d(),
                sort: [{ idx: 1, dir: 'desc' }, { idx: 5, dir: 'desc' }]
            },
            "MMR": {
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
                sort: [{ idx: 1, dir: 'desc' }, { idx: 3, dir: 'desc' }]
            },
            // "Revenue": [],
            // "Usernames": [],
            // "Activity": [],
            // "Projects": [],
            // "War Slots": [],
            // "Utilization": [],
            // "Stockpile": [],
            // "Deposits": [],
            // "Warchest": [],
            // "Escrow": [],
            // "Audits": [],
            // "DayChange": [],
            // "Espionage": [],
            // "War Range": [],
            // "Timers": [],
        }
    },
    // Building: undefined,
    // DBCity: undefined,
    // Continent: undefined,
    // GuildDB: undefined,
    // GuildSetting: undefined,
    // UserWrapper: undefined,
    // DBWar: undefined
    // AttackType: undefined,
    // IAttack: undefined,
    // MilitaryUnit: undefined,
    // NationColor: undefined,
    // NationList: undefined,
    // NationOrAlliance: undefined,
    // Project: undefined,
    // TaxBracket: undefined,
    // TextChannelWrapper: undefined,
    // DBTreasure: undefined,

    // AuditType: undefined,
    // DBBan: undefined,
    // DBBounty: undefined,
    // TaxDeposit: undefined,
    // DBTrade: undefined,
    // Transaction2: undefined,
    // Treaty: undefined,
    // TreatyType: undefined,
}
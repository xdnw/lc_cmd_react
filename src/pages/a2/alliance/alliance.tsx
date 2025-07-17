import { ALLIANCESTATS, COMPARETIERSTATS, METRIC_COMPARE_BY_TURN, TABLE } from "../../../lib/endpoints";
import { Link, useParams } from "react-router-dom";
import { CM } from "../../../utils/Command";
import { getPwUrl } from "../../../lib/pwutil";
import { Button } from "@/components/ui/button";
import Color from "../../../components/renderer/Color";
import { commafy } from "../../../utils/StringUtil";
import Timestamp from "../../../components/ui/timestamp";
import { StaticViewGraph } from "../../graphs/view_graph";
import { ViewCommand } from "../../command/view_command";
import { CopyToClipboardTextArea } from "../../../components/ui/copytoclipboard";
import { numericMap } from "../../../components/ui/renderers";
import EndpointWrapper from "@/components/api/bulkwrapper";
import LazyIcon from "@/components/ui/LazyIcon";
import { JSX, ReactNode, useState } from "react";
import LazyExpander from "@/components/ui/LazyExpander";
import ExpandableTableRow from "@/components/ui/ExpandableTableRow";
import React from "react";
import { WebTable } from "@/lib/apitypes";

/*
# Alliance extends NationList extends Alliances
Basic stats
MMR
Link to wars

Treaties
// Activity button?

- Customize button (customize saves to local storage)
- color links to color bloc pages (TODO color bloc component does this - from the formatter)
  Graphs for alliances, show current value with graph on hover?

  /alliance stats allianceMetricAB
  /alliance stats metricsByTurn
  /alliance stats ranking
  /alliance stats rankingTime


  /sheets_ia ActivitySheet
  /sheets_ia activity_date
  /sheets_ia daychange
  /sheets_ia declares_date
  /sheets_ia deposits_date

Link to guild, or link to add guild

- Member list

/alliance edit

If server is offshore server, and this is an account

- /deposits add
- /deposits check

If meets requirements of being an offshore
/offshore markAsOffshore
 */

const builder = CM.placeholders('DBAlliance')
    .aliased()
    .add({ cmd: 'getname', alias: 'name' })
    .add({ cmd: 'getid', alias: 'id' })
    .add({ cmd: 'getrank', alias: 'rank' })
    .add({ cmd: 'getacronym', alias: 'acronym' })
    .add({ cmd: 'getflag', alias: 'flag' })
    .add({ cmd: 'getforum_link', alias: 'forumLink' })
    .add({ cmd: 'getdiscord_link', alias: 'discordLink' })
    .add({ cmd: 'getwiki_link', alias: 'wikiLink' })
    .add({ cmd: 'getdatecreated', alias: 'dateCreated' })
    .add({ cmd: 'getcolor', alias: 'color' })
    .add({ cmd: 'getscore', alias: 'score' })
    .add({ cmd: 'getestimatedstockpilevalue', alias: 'stockpileValue' })
    .add({ cmd: 'getestimatedstockpile', alias: 'stockpile' })
    .add({ cmd: 'getlootvalue', args: { 'score': '1' }, alias: 'lootValue' })
    .add({ cmd: 'getrevenueconverted', alias: 'revenue' })
    .add({ cmd: 'getcostconverted', alias: 'cost' })
    .add({ cmd: 'countmembers', alias: 'memberCount' })
    .add({ cmd: 'countnations', args: { "filter": "#position=1" }, alias: 'applicantCount' })
    .add({ cmd: 'countnations', args: { "filter": "#isTaxable" }, alias: 'taxableCount' })
    .add({ cmd: 'getnumtreasures', alias: 'treasures' })
    .add({ cmd: 'countnations', args: { "filter": "#color=gray,#vm_turns=0" }, alias: 'grayCount' })
    .add({ cmd: 'countnations', args: { "filter": "#color=gray,#vm_turns=0,#active_m<7200" }, alias: 'activeGrayCount' })
    .add({ cmd: 'countnations', args: { "filter": "#cities<10,#FreeOffensiveSlots>0,(#color!=beige|#isblockaded=0)" }, alias: 'c10WithoutRaids' })
    .add({ cmd: 'getcities', alias: 'cities' })
    .add({ cmd: 'getaverage', args: { "attribute": "avgland", 'filter': "#position>1,#vm_turns=0" }, alias: 'land_avg' })
    .add({ cmd: 'getaverage', args: { "attribute": "avg_infra", 'filter': "#position>1,#vm_turns=0" }, alias: 'infra_avg' })
    .add({ cmd: 'gettotal', args: { "attribute": "cityvalue", 'filter': "#position>1,#vm_turns=0" }, alias: 'cityValue' });

// Type for the row adapter created from the column data
type RowAdapter = ReturnType<typeof builder.createRowAdapter>;

// Type definition for button configuration
interface ButtonConfig {
    text: ((row: RowAdapter) => string);
    path: ((row: RowAdapter) => string);
    condition?: (row: RowAdapter) => boolean;
}

// Type definition for table row configuration
interface TableRowConfig {
    label: string | null;
    value?: (row: RowAdapter) => ReactNode;
    expandable?: boolean;
    expandedContent?: (row: RowAdapter) => ReactNode;
    buttons?: ButtonConfig[];
    condition?: (row: RowAdapter) => boolean;
}

// Define the alliance data table configuration
const allianceTableConfig: TableRowConfig[] = [
    {
        label: null,
        value: (row) => <div className="flex items-center space-x-2">
            {row.flag && (
                <img
                    src={row.flag as string}
                    alt="Alliance flag"
                    className="w-16 h-10"
                />
            )}
            <Link
                className="text-2xl font-bolt flex items-center"
                to={getPwUrl(`alliance/id=${row.id as number}`)}
            >
                {row.name as string} <LazyIcon name="ExternalLink" />
            </Link>
            {row.acronym && (
                <span className="text-sm text-gray-500">
                    ({row.acronym as string})
                </span>
            )}
        </div>
    },
    {
        label: null,
        buttons: [
            {
                text: () => "Forum",
                path: (row) => row.forumLink as string,
                condition: (row) => !!row.forumLink
            },
            {
                text: () => "Discord",
                path: (row) => row.discordLink as string,
                condition: (row) => !!row.discordLink
            },
            {
                text: () => "Wiki",
                path: (row) => row.wikiLink as string,
                condition: (row) => !!row.wikiLink
            },
            {
                text: (row) => `${row.memberCount as number} Members`,
                path: (row) => `${process.env.BASE_PATH}nations/AA:${row.id as number},#position>1`,
                condition: (row) => (row.memberCount as number) > 0
            },
            {
                text: (row) => `${row.taxableCount as number} Taxable`,
                path: (row) => `${process.env.BASE_PATH}nations/AA:${row.id as number},#isTaxable`,
                condition: (row) => (row.taxableCount as number) > 0
            },
            {
                text: (row) => `${row.applicantCount as number} Applicants`,
                path: (row) => `${process.env.BASE_PATH}nations/AA:${row.id as number},#position=1`,
                condition: (row) => (row.applicantCount as number) > 0
            }
        ]
    },
    {
        label: 'Created',
        value: (row) => <Timestamp millis={row.dateCreated as number} />
    },
    {
        label: 'Color',
        value: (row) => (
            <div className="flex items-center">
                <Color colorId={row.color as string} />
                <span>{row.color as string}</span>
            </div>
        )
    },
    {
        label: 'Rank',
        value: (row) => <>#{commafy(row.rank as number)}</>,
    },
    {
        label: 'Score',
        value: (row) => <>{commafy(row.score as number)}ns</>,
        expandable: true,
        expandedContent: (row) => (
            <><ViewCommand command={["alliance", "stats", "attribute_ranking"]} args={{ attribute: "{score}", num_results: "5", highlight: row.id + "" }} />
                <StaticViewGraph endpoint={METRIC_COMPARE_BY_TURN} args={{
                    metric: 'score',
                    alliances: "aa:" + (row.id as number),
                    start: 'timestamp:' + (row.dateCreated as number),
                }} />
            </>
        )
    },
    {
        label: 'Stockpile Value (Est.)',
        value: (row) => <>${commafy(row.stockpileValue as number)}</>,
        expandable: true,
        expandedContent: (row) => (
            <>
                <ViewCommand command={["alliance", "stats", "attribute_ranking"]} args={{ attribute: "{getestimatedstockpilevalue}", num_results: "5", highlight: row.id + "" }} />
                <CopyToClipboardTextArea text={numericMap(row.stockpileValue as string)} />
            </>
        )
    },
    {
        label: 'Loot Per Score',
        value: (row) => <>${commafy(row.lootValue as number)}</>,
        expandable: true,
        expandedContent: (row) => (
            <>
                <ViewCommand command={["alliance", "stats", "loot_ranking"]} args={{ time: "30d", num_results: "5", highlight: "AA:" + (row.id as number) }} />
                <hr />
                Alliance Loot Losses:
                <ViewCommand command={["stats_war", "warcostranking"]} args={{ timeStart: "30d", type: "ATTACKER_LOSSES", allowedAttacks: "A_LOOT", groupByAlliance: "true", num_results: "5", highlight: "AA:" + (row.id as number) }} />
            </>
        )
    },
    {
        label: 'Revenue Converted',
        value: (row) => <>${commafy(row.revenue as number)}</>,
        expandable: true,
        expandedContent: (row) => (
            <>
                <ViewCommand command={["trade", "findproducer"]} args={{ resources: "*", includeNegative: "true", num_results: "5", highlight: row.id as number + "" }} />
                <StaticViewGraph endpoint={ALLIANCESTATS} args={{
                    metrics: 'revenue',
                    coalition: "aa:" + row.id,
                    start: 'timestamp:' + row.dateCreated,
                    end: "0"
                }} />
                <ViewCommand command={["alliance", "revenue"]} args={{ nations: "AA:" + (row.id as number) }} />
            </>
        )
    },
    {
        label: 'Alliance Value',
        value: (row) => <>${commafy(row.cost as number)}</>,
        expandable: true,
        expandedContent: (row) => (
            <>
                <ViewCommand command={["alliance", "cost"]} args={{ nations: "AA:" + row.id }} />
            </>
        )
    },
    {
        label: 'Gray (non VM)',
        buttons: [
            {
                text: (row) => `${row.grayCount as number} All`,
                path: (row) => `${process.env.BASE_PATH}nations/AA:${row.id as number},#color=gray,#vm_turns=0`
            },
            {
                text: (row) => `${row.activeGrayCount as number} Active (5d)`,
                path: (row) => `${process.env.BASE_PATH}nations/AA:${row.id as number},#color=gray,#vm_turns=0,#active_m<7200`
            }
        ]
    },
    {
        label: '&#91;C10 without raids',
        buttons: [
            {
                text: (row) => `${row.c10WithoutRaids as number} Nations`,
                path: (row) => `${process.env.BASE_PATH}nations/AA:${row.id as number},#cities<10,#FreeOffensiveSlots>0,(#color!=beige|#isblockaded=0)`
            }
        ]
    },
    {
        label: 'Treasures',
        value: (row) => <>{commafy(row.treasures as number)} ({Math.sqrt((row.treasures as number) * 4).toFixed(2)}%)</>,
        expandable: true,
        expandedContent: (row) => (
            <>
                <ViewCommand command={["alliance", "stats", "attribute_ranking"]} args={{ attribute: "{numtreasures}", num_results: "5", highlight: row.id as number + "" }} />
                <StaticViewGraph endpoint={METRIC_COMPARE_BY_TURN} args={{
                    metric: 'treasure',
                    alliances: "aa:" + row.id,
                    start: 'timestamp:' + row.dateCreated,
                }} />
            </>
        ),
        buttons: [
            {
                text: () => "View",
                path: (row) => `${process.env.BASE_PATH}treasures/AA:${row.id},#treasure`,
                condition: (row) => (row.treasures as number) >= 0
            }
        ]
    },
    {
        label: 'Cities',
        value: (row) => <>{commafy(row.cities as number)} (${commafy(row.cities as number * 4)})</>,
        expandable: true,
        expandedContent: (row) => (
            <>
                <ViewCommand command={["alliance", "stats", "attribute_ranking"]} args={{ attribute: "{getcities}", num_results: "5", highlight: row.id as number + "" }} />
                <StaticViewGraph endpoint={METRIC_COMPARE_BY_TURN} args={{
                    metric: 'city',
                    alliances: "aa:" + row.id,
                    start: 'timestamp:' + row.dateCreated,
                }} />
            </>
        ),
        buttons: [
            {
                text: () => "View",
                path: (row) => `${process.env.BASE_PATH}cities/AA:${row.id},#cities`,
                condition: (row) => (row.cities as number) >= 0
            }
        ]
    },
    {
        label: 'Infra Avg.',
        value: (row) => commafy(row.infra_avg as number),
        expandable: true,
        expandedContent: (row) => (<>
            <StaticViewGraph endpoint={COMPARETIERSTATS} args={{
                metric: 'avg_infra',
                groupBy: 'cities',
                coalition1: "aa:" + (row.id as number),
            }} />
            <StaticViewGraph endpoint={METRIC_COMPARE_BY_TURN} args={{
                metric: 'infra_avg',
                alliances: "aa:" + (row.id as number),
                start: 'timestamp:' + (row.dateCreated as number),
            }} />
        </>),
    },
    {
        label: 'Land Avg.',
        value: (row) => commafy(row.land_avg as number),
        expandable: true,
        expandedContent: (row) => (<>
            <StaticViewGraph endpoint={COMPARETIERSTATS} args={{
                metric: 'avg_land',
                groupBy: 'cities',
                coalition1: "aa:" + (row.id as number),
            }} />
            <StaticViewGraph endpoint={METRIC_COMPARE_BY_TURN} args={{
                metric: 'avg_land',
                alliances: "aa:" + (row.id as number),
                start: 'timestamp:' + (row.dateCreated as number),
            }} />
        </>),
    },
    { label: 'MMR', value: () => "TODO (non tooltip) unit= | build=\nTODO MMR over time + MMR tier graph" },
    { label: 'Soldier %', value: () => "TODO unit tier graph, unit over time" },
    { label: 'Tank %', value: () => "TODO unit tier graph, unit over time" },
    { label: 'Aircraft %', value: () => "TODO unit tier graph, unit over time" },
    { label: 'Ships %', value: () => "TODO unit tier graph, unit over time" },
    { label: 'Missiles', value: () => "TODO num missiles (... avg)\nTODO MLP tier graph\nTODO missiles over time\nTODO ranking" },
    { label: 'Nukes', value: () => "TODO num nukes (... avg)\nTODO nuke tier graph\nTODO NRF tier graph\nTODO nuke over time\nTODO ranking" },
    { label: 'Spies', value: () => "TODO Spy tier graph\nTODO avg spies over time" },
    { label: 'Active Wars', value: () => "TODO Off: 5, Def: 5 (10 Total)\nTODO Wars by tier\nTODO strength tier graph" }
];

const AllianceData = React.memo(({ data }: { data: WebTable }) => {
    if (data.cells.length != 2) {
        return <>{JSON.stringify(data)}</>;
    }

    const row = builder.createRowAdapter(data.cells[1] as (string | number)[]);

    const tableRows = allianceTableConfig.map((config, i) => {
        if (config.condition && !config.condition(row)) {
            return null;
        }

        const renderedButtons = config.buttons ? (
            <>
                {config.buttons.map((button, buttonIndex) => {
                    if (button.condition && !button.condition(row)) {
                        return null;
                    }
                    const buttonText = typeof button.text === 'function' ? button.text(row) : button.text;
                    return (
                        <Button
                            key={buttonIndex}
                            className={buttonIndex > 0 ? "ms-1" : ""}
                            variant="outline"
                            size="sm"
                            asChild
                        >
                            <Link to={button.path(row)}>{buttonText}</Link>
                        </Button>
                    );
                })}
            </>
        ) : null;

        return (
            <ExpandableTableRow
                key={"row-" + i}
                id={i}
                label={config.label}
                value={config.value ? config.value(row) : null}
                expandedContent={config.expandable && config.expandedContent ? config.expandedContent(row) : undefined}
                buttons={renderedButtons}
                isEven={i % 2 === 0}
            />
        );
    });

    return (
        <div className="rounded-lg border border-primary/20 shadow-sm">
            <table className="display text-xs compact font-mono w-full bg-accent">
                <colgroup>
                    <col className="w-auto" /> {/* Label column - just enough width for content */}
                    <col className="w-full" /> {/* Content column - takes all remaining space */}
                </colgroup>
                <tbody className="divide-y divide-primary/5">
                    {tableRows}
                </tbody>
            </table>
        </div>
    );
});
export default function Alliance() {
    const type = "Alliance";
    const { alliance } = useParams<{ alliance: string }>();

    return (
        <EndpointWrapper
            endpoint={TABLE}
            args={{
                type: type,
                selection_str: alliance,
                columns: builder.array(),
            }}
        >
            {({ data }) => <AllianceData data={data} />}
        </EndpointWrapper>
    );
}
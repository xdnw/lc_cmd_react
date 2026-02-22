import { COMMANDS } from "./commands";
import { CM, placeholderMention } from "../utils/Command";
import { OrderIdx } from "@/pages/custom_table/DataTable";

interface Columns {
    value: (string | [string, string])[],
    sort: OrderIdx | OrderIdx[],
    config?: LayoutConfigSchema,
}

interface TabDefault {
    selections: { [key: string]: string },
    columns: { [key: string]: Columns },
}

type PlaceholderTypeName = keyof typeof COMMANDS.placeholders;

type PlaceholderCommandName<T extends PlaceholderTypeName> = Extract<keyof typeof COMMANDS.placeholders[T]["commands"], string>;

type PlaceholderCommandArgs<
    T extends PlaceholderTypeName,
    C extends PlaceholderCommandName<T>
> = typeof COMMANDS.placeholders[T]["commands"][C] extends { arguments: infer A }
    ? { [K in keyof A]?: string }
    : never;

export type LayoutVarRef<V extends string = string> = {
    kind: "layout-var";
    name: V;
};

export function layoutVar<V extends string>(name: V): LayoutVarRef<V> {
    return { kind: "layout-var", name };
}

function isLayoutVarRef(value: string | LayoutVarRef): value is LayoutVarRef {
    return typeof value === "object" && value != null && value.kind === "layout-var";
}

export interface LayoutVariableDefinition {
    defaultValue: string;
    label?: string;
    desc?: string;
}

export interface LayoutVariableInputSchema {
    argType: string;
    min?: number;
    max?: number;
    desc?: string;
    choices?: string[];
}

export interface LayoutConfigSchema {
    variables: Record<string, LayoutVariableDefinition>;
    variableInputs: Record<string, LayoutVariableInputSchema>;
}

type LayoutArgValue = string | LayoutVarRef;

type PlaceholderCommandArgsWithVars<
    T extends PlaceholderTypeName,
    C extends PlaceholderCommandName<T>,
    V extends string
> = PlaceholderCommandArgs<T, C> extends never
    ? never
    : {
        [K in keyof PlaceholderCommandArgs<T, C>]?: string | LayoutVarRef<V>;
    };

type ConfigurableColumnCommandSpec<T extends PlaceholderTypeName> = {
    kind: "command";
    cmd: PlaceholderCommandName<T>;
    args?: Record<string, LayoutArgValue>;
    alias?: string;
};

type ConfigurableColumnRawSpec<V extends string> = {
    kind: "raw";
    placeholder: string | ((resolvedVars: Record<V, string>) => string);
    alias?: string;
};

type ConfigurableColumnSpec<T extends PlaceholderTypeName, V extends string> = {
    variables: Record<V, LayoutVariableDefinition>;
    entries: Array<ConfigurableColumnCommandSpec<T> | ConfigurableColumnRawSpec<V>>;
    sort: OrderIdx | OrderIdx[];
    shorten?: boolean;
};

export class LayoutColumnTemplateBuilder<T extends PlaceholderTypeName, V extends string> {
    private readonly entries: Array<ConfigurableColumnCommandSpec<T> | ConfigurableColumnRawSpec<V>> = [];

    add<C extends PlaceholderCommandName<T>>(
        command: {
            cmd: C;
            args?: PlaceholderCommandArgsWithVars<T, C, V>;
            alias?: string;
        }
    ): this {
        this.entries.push({
            kind: "command",
            cmd: command.cmd,
            args: command.args as Record<string, LayoutArgValue> | undefined,
            alias: command.alias,
        });
        return this;
    }

    addRaw(placeholder: string | ((resolvedVars: Record<V, string>) => string), alias?: string): this {
        this.entries.push({
            kind: "raw",
            placeholder,
            alias,
        });
        return this;
    }

    getEntries(): Array<ConfigurableColumnCommandSpec<T> | ConfigurableColumnRawSpec<V>> {
        return [...this.entries];
    }
}

export function defineConfigurableColumns<
    T extends PlaceholderTypeName,
    V extends string
>(
    type: T,
    templateName: string,
    spec: {
        variables: Record<V, LayoutVariableDefinition>;
        sort: OrderIdx | OrderIdx[];
        shorten?: boolean;
    },
    configure: (builder: LayoutColumnTemplateBuilder<T, V>) => LayoutColumnTemplateBuilder<T, V>
): Columns {
    const builder = new LayoutColumnTemplateBuilder<T, V>();
    const finalBuilder = configure(builder);
    return createConfigurableColumns(type, templateName, {
        variables: spec.variables,
        entries: finalBuilder.getEntries(),
        sort: spec.sort,
        shorten: spec.shorten,
    });
}

type VariableUsage = {
    variable: string;
    command: string;
    argName: string;
    argType: string;
};

const configResolverByTypeAndTemplate = new Map<string, (values?: Record<string, string>) => (string | [string, string])[]>();

function getConfigResolverKey(type: PlaceholderTypeName, templateName: string): string {
    return `${type}::${templateName}`;
}

function normalizeLayoutValues(
    variables: Record<string, LayoutVariableDefinition>,
    values?: Record<string, string>
): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, def] of Object.entries(variables)) {
        const provided = values?.[key];
        resolved[key] = provided != null && provided !== "" ? provided : def.defaultValue;
    }
    return resolved;
}

function collectVariableInputs<T extends PlaceholderTypeName>(
    type: T,
    spec: ConfigurableColumnSpec<T, string>
): LayoutConfigSchema {
    const variableInputs: Record<string, LayoutVariableInputSchema> = {};
    const seen: Record<string, VariableUsage> = {};

    for (const commandSpec of spec.entries) {
        if (commandSpec.kind !== "command") continue;
        if (!commandSpec.args) continue;
        const command = CM.placeholders(type).get([commandSpec.cmd] as never);
        const argumentsByName = Object.fromEntries(command.getArguments().map((arg) => [arg.name, arg]));

        for (const [argName, argValue] of Object.entries(commandSpec.args)) {
            if (!isLayoutVarRef(argValue)) continue;

            const argument = argumentsByName[argName];
            if (!argument) {
                throw new Error(
                    `Layout config error for ${type}:${commandSpec.cmd} - argument "${argName}" does not exist.`
                );
            }

            const usage: VariableUsage = {
                variable: argValue.name,
                command: String(commandSpec.cmd),
                argName,
                argType: argument.arg.type,
            };

            const existing = seen[argValue.name];
            if (!existing) {
                seen[argValue.name] = usage;
                variableInputs[argValue.name] = {
                    argType: argument.arg.type,
                    min: argument.arg.min,
                    max: argument.arg.max,
                    desc: argument.arg.desc,
                    choices: argument.arg.choices,
                };
                continue;
            }

            if (existing.argType !== usage.argType) {
                throw new Error(
                    `Layout config variable "${argValue.name}" has conflicting argument types: ` +
                    `${existing.command}.${existing.argName} (${existing.argType}) vs ${usage.command}.${usage.argName} (${usage.argType}).`
                );
            }
        }
    }

    for (const variableName of Object.keys(spec.variables)) {
        if (!variableInputs[variableName]) {
            throw new Error(`Layout config variable "${variableName}" is declared but never used.`);
        }
    }

    return {
        variables: spec.variables,
        variableInputs,
    };
}

function createConfigurableColumns<T extends PlaceholderTypeName>(
    type: T,
    templateName: string,
    spec: ConfigurableColumnSpec<T, string>
): Columns {
    const config = collectVariableInputs(type, spec);
    const resolver = (values?: Record<string, string>) => {
        const resolvedVars = normalizeLayoutValues(spec.variables, values);
        const builder = CM.placeholders(type).array();

        for (const entry of spec.entries) {
            if (entry.kind === "raw") {
                const resolvedRaw = typeof entry.placeholder === "function"
                    ? entry.placeholder(resolvedVars)
                    : entry.placeholder;
                builder.addRaw(resolvedRaw, entry.alias);
                continue;
            }

            let resolvedArgs: Record<string, string> | undefined = undefined;
            if (entry.args) {
                resolvedArgs = Object.fromEntries(
                    Object.entries(entry.args).map(([argName, argValue]) => {
                        if (isLayoutVarRef(argValue)) {
                            const value = resolvedVars[argValue.name];
                            if (value == null) {
                                throw new Error(
                                    `Layout config variable "${argValue.name}" is missing while resolving ${type}:${templateName}.`
                                );
                            }
                            return [argName, value];
                        }
                        return [argName, argValue];
                    })
                );
            }

            if (!resolvedArgs || Object.keys(resolvedArgs).length === 0) {
                builder.addRaw(`{${entry.cmd}}`, entry.alias);
                continue;
            }

            const argPairs = Object.entries(resolvedArgs)
                .map(([argName, argValue]) => `${argName}: ${argValue}`)
                .join(" ");
            const mention = argPairs.length > 0
                ? `{${entry.cmd}(${argPairs})}`
                : `{${entry.cmd}}`;
            builder.addRaw(mention, entry.alias);
        }

        if (spec.shorten !== false) {
            builder.shorten();
        }

        return builder.build2d();
    };

    configResolverByTypeAndTemplate.set(getConfigResolverKey(type, templateName), resolver);

    return {
        value: resolver(),
        sort: spec.sort,
        config,
    };
}

export function getLayoutColumnConfig(type: PlaceholderTypeName, templateName: string): LayoutConfigSchema | undefined {
    return DEFAULT_TABS[type]?.columns[templateName]?.config;
}

export function resolveLayoutColumnTemplate(
    type: PlaceholderTypeName,
    templateName: string,
    values?: Record<string, string>
): Columns | undefined {
    const original = DEFAULT_TABS[type]?.columns[templateName];
    if (!original) return undefined;
    const resolver = configResolverByTypeAndTemplate.get(getConfigResolverKey(type, templateName));
    if (!resolver) return original;
    return {
        ...original,
        value: resolver(values),
    };
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
                ...defineConfigurableColumns('DBAlliance', 'City Growth (30d)', {
                    variables: {
                        window: {
                            defaultValue: '30d',
                            label: 'Window',
                            desc: 'Relative time window used in all growth metrics (for example: 7d, 14d, 30d).',
                        },
                        end: {
                            defaultValue: '0d',
                            label: 'End',
                            desc: 'Relative end offset for the selected window (typically 0d for now).',
                        },
                    },
                    sort: { idx: 17, dir: 'desc' },
                }, (tpl) => tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .add({ cmd: 'getcities', alias: 'Cities' })
                    .add({ cmd: 'getmembershipchangesbyreason', args: { reasons: 'recruited,joined', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Joined' })
                    .add({ cmd: 'getmembershipchangesbyreason', args: { reasons: 'left', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Left' })
                    .add({ cmd: 'getnetmembersacquired', args: { start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'joined', assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Poached City' })
                    .add({ cmd: 'getmembershipchangeassetvalue', args: { reasons: 'joined', assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Poached City $' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'recruited', assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Recruited City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'left', assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Left City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'vm_returned', assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'VM Ended City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'vm_left', assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'VM City' })
                    .add({ cmd: 'getmembershipchangeassetcount', args: { reasons: 'deleted', assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Deleted City' })
                    .add({ cmd: 'getboughtassetcount', args: { assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'City Buy' })
                    .add({ cmd: 'geteffectiveboughtassetcount', args: { assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'City Buy (remain)' })
                    .add({ cmd: 'getspendingvalue', args: { assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'City Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'City Buy $ (remain)' })
                    .add({ cmd: 'getnetasset', args: { asset: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net City' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net City $' })
                )
            },
            "Growth (30d)": {
                ...defineConfigurableColumns('DBAlliance', 'Growth (30d)', {
                    variables: {
                        window: {
                            defaultValue: '30d',
                            label: 'Window',
                            desc: 'Relative time window for alliance growth metrics.',
                        },
                        end: {
                            defaultValue: '0d',
                            label: 'End',
                            desc: 'Relative end offset for the selected window (typically 0d for now).',
                        },
                    },
                    sort: { idx: 9, dir: 'desc' },
                }, (tpl) => tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .add({ cmd: 'getscore', alias: 'Score' })
                    .add({ cmd: 'getnetmembersacquired', args: { start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net Member' })
                    .add({ cmd: 'getnetasset', args: { asset: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net City' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net City $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'projects', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net Project $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'land', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net Land $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: 'infra', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net Infra $' })
                    .add({ cmd: 'getnetassetvalue', args: { asset: '*', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Net Asset $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'cities', start: layoutVar('window'), end: layoutVar('end') }, alias: 'City Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'projects', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Project Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'land', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Land Buy $' })
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'infra', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Infra Buy-Loss $' })
                    .add({ cmd: 'getcumulativerevenuevalue', args: { start: layoutVar('window'), end: layoutVar('end') }, alias: 'Total Revenue' })
                )
            },
            "Normalized Growth (30d)": {
                ...defineConfigurableColumns('DBAlliance', 'Normalized Growth (30d)', {
                    variables: {
                        window: {
                            defaultValue: '30d',
                            label: 'Window',
                            desc: 'Relative time window for normalized growth calculations.',
                        },
                        end: {
                            defaultValue: '0d',
                            label: 'End',
                            desc: 'Relative end offset for the selected window (typically 0d for now).',
                        },
                    },
                    sort: { idx: 2, dir: 'desc' },
                }, (tpl) => tpl
                    .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                    .add({ cmd: 'countmembers', alias: 'Members' })
                    .addRaw(
                        (vars) => placeholderMention({
                            type: 'DBAlliance',
                            command: ['geteffectiveboughtassetcount'],
                            args: { assets: 'cities', start: vars.window, end: vars.end },
                        }) + '/{countmembers}',
                        'Cities/Member'
                    )
                    .add({ cmd: 'geteffectivespendingvalue', args: { assets: 'cities,projects,land', start: layoutVar('window'), end: layoutVar('end') }, alias: 'Invest/Member' })
                    .addRaw(
                        (vars) =>
                            placeholderMention({
                                type: 'DBAlliance',
                                command: ['geteffectivespendingvalue'],
                                args: { assets: 'cities,projects,land', start: vars.window, end: vars.end },
                            }) +
                            '/' +
                            placeholderMention({
                                type: 'DBAlliance',
                                command: ['getcumulativerevenuevalue'],
                                args: { start: vars.window, end: vars.end },
                            }),
                        'Invest/Revenue'
                    )
                )
            },
            "Cumulative Revenue (30d)": {
                ...defineConfigurableColumns('DBAlliance', 'Cumulative Revenue (30d)', {
                    variables: {
                        window: {
                            defaultValue: '30d',
                            label: 'Window',
                            desc: 'Relative time window for cumulative revenue snapshots.',
                        },
                        end: {
                            defaultValue: '0d',
                            label: 'End',
                            desc: 'Relative end offset for the selected window (typically 0d for now).',
                        },
                    },
                    sort: { idx: 1, dir: 'desc' },
                }, (tpl) => {
                    const withValue = tpl
                        .add({ cmd: 'getmarkdownurl', alias: 'Alliance' })
                        .add({ cmd: 'getcumulativerevenuevalue', args: { start: layoutVar('window'), end: layoutVar('end') }, alias: 'Value' });

                    const resourceColumns = COMMANDS.options.ResourceType.options.filter((f) => f !== 'CREDITS');
                    for (const resourceType of resourceColumns) {
                        withValue.addRaw((vars) => `{getcumulativerevenue(${vars.window}).${resourceType}}`, resourceType);
                    }
                    return withValue;
                })
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
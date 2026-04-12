import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import EndpointWrapper from "@/components/api/bulkwrapper";
import { DefinedEndpointArgValues, EndpointArgValues, normalizeEndpointArgValues } from "@/components/api/endpointArgValues";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CommonEndpoint } from "@/lib/BulkQuery";
import { bulkQueryOptions } from "@/lib/queries";
import { useNavigate, useParams } from "react-router-dom";
import { commafy, formatDuration, formatSi } from "@/utils/StringUtil.ts";
import { COMMANDS } from "@/lib/commands.ts";
import { WebTarget, WebTargets } from "@/lib/apitypes";
import { RAID, UNPROTECTED } from "../../lib/endpoints";
import QueryComponent from "../../components/cmd/QueryComponent";
import { useSyncedState } from "../../utils/StateUtil";
import Color from "../../components/renderer/Color";
import { useSession } from "@/components/api/SessionContext";
import { cn } from "@/lib/utils";

type RaidEndpoint = typeof RAID | typeof UNPROTECTED;
type EndpointDefaultValuesOf<TEndpoint> = TEndpoint extends CommonEndpoint<unknown, EndpointArgValues, infer B extends EndpointArgValues> ? B : never;
type RaidQueryArgs = DefinedEndpointArgValues;

type RaidOption<TEndpoint extends RaidEndpoint = RaidEndpoint> = {
    endpoint: TEndpoint;
    label: string;
    description: string;
    defaultValues: EndpointDefaultValuesOf<TEndpoint>;
};

const RAID_OPTIONS = {
    app_7d: {
        endpoint: RAID,
        label: "Applicants 7d",
        defaultValues: {
            nations: "*,#position<=1",
            num_results: "25",
        },
        description: "Attackable applicants and nones inactive for 7d"
    },
    members: {
        endpoint: RAID,
        label: "Members",
        defaultValues: {
            nations: "*",
            num_results: "25"
        },
        description: "All attackable nations inactive for 7d"
    },
    beige: {
        endpoint: RAID,
        label: "Beige",
        defaultValues: {
            nations: "*",
            num_results: "25",
            beige_turns: "24"
        },
        description: "All nations inactive for 7d, including on beige"
    },
    ground: {
        endpoint: RAID,
        label: "Weak Ground",
        defaultValues: {
            nations: "#tankpct<0.2,#soldierpct<0.4,*",
            num_results: "25",
            time_inactive: "0d",
            weak_ground: "true"
        },
        description: "Nations with weak ground, including active nations"
    },
    ground_2d: {
        endpoint: RAID,
        label: "Weak Ground 2d",
        defaultValues: {
            nations: "#tankpct<0.2,#soldierpct<0.4,*",
            num_results: "25",
            time_inactive: "2d",
            weak_ground: "true"
        },
        description: "Nations with weak ground, inactive for 2d"
    },
    losing: {
        endpoint: RAID,
        label: "Losing Wars",
        defaultValues: {
            nations: "#def>0,#RelativeStrength<1,*",
            num_results: "25",
            time_inactive: "0d",
            weak_ground: "true"
        },
        description: "Nations losing wars"
    },
    unprotected: {
        endpoint: UNPROTECTED,
        label: "Unprotected",
        defaultValues: {
            nations: "*",
            num_results: "25",
            ignoreODP: "true",
            includeAllies: "true",
            maxRelativeCounterStrength: "90"
        },
        description: "Nations least likely to defend or have counters"
    }
} satisfies Record<string, RaidOption>;

type RaidOptionKey = keyof typeof RAID_OPTIONS;

const RAID_OPTION_KEYS = Object.keys(RAID_OPTIONS) as RaidOptionKey[];
const DEFAULT_RAID_OPTION = RAID_OPTION_KEYS[0];

function buildRaidQueryArgs(option: RaidOption, nation: string): RaidQueryArgs {
    return normalizeEndpointArgValues(option.endpoint, {
        ...option.defaultValues,
        nation,
    });
}

export default function RaidSection() {

    const { nation: nationParam } = useParams<{ nation: string }>();
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [nation, setNation] = useSyncedState<string | undefined>(nationParam ?? session?.nation_name);
    const [isNationPickerOpen, setIsNationPickerOpen] = useState(false);
    const [selectedOptionKey, setSelectedOptionKey] = useState<RaidOptionKey>(DEFAULT_RAID_OPTION);

    const navigate = useNavigate();

    const selectedOption = RAID_OPTIONS[selectedOptionKey];
    const raidQueryArgsByKey = useMemo(() => {
        if (!nation) {
            return null;
        }

        return Object.fromEntries(
            RAID_OPTION_KEYS.map((key) => [key, buildRaidQueryArgs(RAID_OPTIONS[key], nation)])
        ) as Record<RaidOptionKey, RaidQueryArgs>;
    }, [nation]);

    useEffect(() => {
        if (nationParam) {
            setNation(f => f !== nationParam ? nationParam : f);
        }
    }, [nationParam, setNation]);

    // set nation from session
    useEffect(() => {
        if (session?.nation_name && !nationParam) {
            setNation(f => f !== session.nation_name ? session.nation_name : f);
        }
    }, [session, nationParam, setNation]);

    useEffect(() => {
        if (!nation) {
            setIsNationPickerOpen(true);
        }
    }, [nation]);

    const updateNation = useCallback((newNation: string) => {
        setNation(newNation);
        setIsNationPickerOpen(false);
        navigate(`/raid/${newNation}`);
    }, [navigate, setNation]);

    const openNationPicker = useCallback(() => {
        setIsNationPickerOpen(true);
    }, []);

    const closeNationPicker = useCallback(() => {
        setIsNationPickerOpen(false);
    }, []);

    const handleSelectedOptionChange = useCallback((value: string) => {
        if (value in RAID_OPTIONS) {
            setSelectedOptionKey(value as RaidOptionKey);
        }
    }, []);

    useEffect(() => {
        if (!raidQueryArgsByKey) {
            return;
        }

        // Warm every tab from the same normalized query map used by the renderer.
        void Promise.allSettled(
            RAID_OPTION_KEYS.map((key) => {
                const option = RAID_OPTIONS[key];
                return queryClient.prefetchQuery(
                    bulkQueryOptions(option.endpoint.endpoint, raidQueryArgsByKey[key])
                );
            })
        );
    }, [queryClient, raidQueryArgsByKey]);

    return (
        <div className="mt-2 rounded-sm border border-light/10 bg-light/10 p-2">
            <div>
                <h1 className="text-2xl font-bold">War / Raiding</h1>
            </div>

            <div className="mt-2 space-y-2">
                <div className={cn(
                    "rounded-sm border px-2 py-1 text-sm",
                    nation
                        ? "border-secondary bg-accent text-primary/90"
                        : "border-red-500/25 bg-accent text-red-500"
                )}>
                    {nation ? (
                        <div className="flex items-center justify-between gap-2">
                            <span>Nation: <span className="font-semibold">{nation}</span></span>
                            <Button variant="ghost" size="sm" onClick={openNationPicker}>
                                Change
                            </Button>
                        </div>
                    ) : (
                        <span>You must select a nation to use this tool, add one to the URL, or log in.</span>
                    )}
                </div>

                {(isNationPickerOpen || !nation) && (
                    <PickNation
                        pickedNation={nation}
                        updateNation={updateNation}
                        closeNationPicker={nation ? closeNationPicker : undefined}
                    />
                )}

                <section>
                    {nation && raidQueryArgsByKey ? (
                        <Tabs
                            value={selectedOptionKey}
                            onValueChange={handleSelectedOptionChange}
                            preloadStrategy="none"
                        >
                            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                                {RAID_OPTION_KEYS.map((key) => {
                                    const option = RAID_OPTIONS[key];

                                    return (
                                        <TabsTrigger
                                            key={key}
                                            value={key}
                                            className="border border-primary/20 bg-black/10 text-primary/80 data-[state=active]:border-primary/40 data-[state=active]:bg-background data-[state=active]:text-foreground"
                                        >
                                            {option.label}
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>

                            <div className="mt-2 rounded-sm border border-primary/15 bg-primary/5 px-2 py-1 text-sm text-primary/90">
                                {selectedOption.description}
                            </div>

                            {RAID_OPTION_KEYS.map((key) => {
                                const option = RAID_OPTIONS[key];

                                return (
                                    <TabsContent key={key} value={key} className="mt-2">
                                        <EndpointWrapper<WebTargets, RaidQueryArgs, RaidQueryArgs>
                                            endpoint={option.endpoint}
                                            args={raidQueryArgsByKey[key]}
                                        >
                                            {({ data }) => <RaidOutput output={data} />}
                                        </EndpointWrapper>
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    ) : (
                        <div className="rounded-sm border border-dashed border-light/20 px-2 py-1 text-sm text-muted-foreground">
                            Select a nation first to enable raid searches.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export function PickNation({
    pickedNation,
    updateNation,
    closeNationPicker
}: {
    pickedNation?: string,
    updateNation: (nation: string) => void,
    closeNationPicker?: () => void
}) {
    const setOutputValue = useCallback((_name: string, val: string) => {
        updateNation(val);
    }, [updateNation]);

    return (
        <div className="rounded-sm border border-light/10 bg-black/10 p-2">
            <div className="mb-2 flex items-center justify-end">
                {closeNationPicker && (
                    <Button variant="ghost" size="sm" onClick={closeNationPicker}>
                        Cancel
                    </Button>
                )}
            </div>
            <QueryComponent element={"DBNation"} multi={false} argName={"nation"} initialValue={pickedNation ?? ""} setOutputValue={setOutputValue} />
        </div>
    );
}

const ranks: string[] = ((COMMANDS.options.Rank.options)).map((o) => o === "REMOVE" ? "" : o);

export function RaidOutput({ output }: { output: WebTargets }) {
    const targets = output;
    const rows = [targets.self, ...targets.targets];
    const now = Date.now();

    return (
        <div className="rounded-sm border border-light/10 bg-black/10 p-2">
            <div className="overflow-x-auto">
                <table className="w-full min-w-225 table-auto text-sm">
                    <thead className="text-left">
                        <tr>
                            <th>Name</th>
                            <th>Alliance</th>
                            <th></th>
                            {targets.include_strength && <th>Strength</th>}
                            <th>Loot</th>
                            <th>Rank</th>
                            <th>Active</th>
                            <th>💂</th>
                            <th>⚙</th>
                            <th>✈</th>
                            <th>🚢</th>
                            <th>🔎</th>
                            <th>🚀</th>
                            <th>☢</th>
                            <th>Score</th>
                            <th>Infra</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((target) => (
                            <WebTargetRow
                                key={target.id}
                                includeStrength={targets.include_strength}
                                now={now}
                                self={targets.self}
                                target={target}
                                classes={cn(
                                    "even:bg-black/10 dark:even:bg-white/5",
                                    target.id === targets.self.id && "border border-2 border-blue-500/50 bg-blue-500/20"
                                )}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function WebTargetRow({ includeStrength, self, target, classes, now }: { includeStrength: boolean, self: WebTarget, target: WebTarget, classes: string, now: number }) {
    const isSelf = target.id === self.id;
    const loot = !isSelf
        ? `$${target.expected !== 0 && target.expected !== target.actual ? `${formatSi(target.expected)}-` : ""}${formatSi(target.actual)}`
        : "";

    return (
        <tr className={classes}>
            <td className="border border-gray-500/25 p-1">
                {isSelf ? (
                    "Your Nation"
                ) : (
                    <a
                        className="text-blue-600 underline hover:text-blue-800"
                        href={`https://politicsandwar.com/nation/id=${target.id}`}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {target.nation}
                    </a>
                )}
            </td>
            <td className="border border-gray-500/25 p-1">
                {isSelf ? "" : target.alliance_id === 0 ? "None" : (
                    <a
                        className="text-blue-600 underline hover:text-blue-800"
                        href={`https://politicsandwar.com/alliance/id=${target.alliance_id}`}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {target.alliance}
                    </a>
                )}
            </td>
            <td className="border border-gray-500/25">
                <div className="flex justify-center items-center text-center">
                    <Color colorId={target.color_id} beigeTurns={target.beige_turns} />
                </div>
            </td>
            {includeStrength &&
                <td className="border border-gray-500/25 p-1">{!isSelf ? `${formatSi(target.strength)}%` : ""}</td>}
            <td className="border border-gray-500/25 p-1">{loot}</td>
            <td className="border border-gray-500/25 p-1">{ranks[target.position] ?? ""}</td>
            <td className="border border-gray-500/25 p-1">{formatDuration(Math.round((now - target.active_ms) / 1000), 2)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.soldier)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.tank)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.aircraft)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.ship)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.spies)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.missile)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.nuke)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(target.score)}</td>
            <td className="border border-gray-500/25 p-1">{commafy(Math.round(target.avg_infra))}</td>
        </tr>
    );
}
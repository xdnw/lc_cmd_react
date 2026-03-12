import React, { useState, useEffect, useCallback } from "react";
import { useDialog } from "../../components/layout/DialogContext";
import { Button } from "@/components/ui/button.tsx";
import { useNavigate, useParams } from "react-router-dom";
import { commafy, formatDuration, formatSi } from "@/utils/StringUtil.ts";
import { COMMANDS } from "@/lib/commands.ts";
import { WebTarget, WebTargets } from "@/lib/apitypes";
import { RAID, UNPROTECTED } from "../../lib/endpoints";
import QueryComponent from "../../components/cmd/QueryComponent";
import { useSyncedState } from "../../utils/StateUtil";
import Color from "../../components/renderer/Color";
import { useSession } from "@/components/api/SessionContext";
import { ApiFormInputs } from "@/components/api/apiform";
import { cn } from "@/lib/utils";

type RaidOption = {
    endpoint: typeof RAID | typeof UNPROTECTED;
    description: string;
    default_values: { [key: string]: string | undefined };
};

type RaidOptions = { [key: string]: RaidOption };
type RaidOutputState = WebTargets | null;

const RAID_OPTIONS: RaidOptions = {
    app_7d: {
        endpoint: RAID,
        default_values: {
            nations: "*,#position<=1",
            num_results: "25",
        },
        description: "Attackable applicants and nones inactive for 7d"
    },
    members: {
        endpoint: RAID,
        default_values: {
            nations: "*",
            num_results: "25"
        },
        description: "All attackable nations inactive for 7d"
    },
    beige: {
        endpoint: RAID,
        default_values: {
            nations: "*",
            num_results: "25",
            beige_turns: "24"
        },
        description: "All nations inactive for 7d, including on beige"
    },
    ground: {
        endpoint: RAID,
        default_values: {
            nations: "#tankpct<0.2,#soldierpct<0.4,*",
            num_results: "25",
            time_inactive: "0d",
            weak_ground: "true"
        },
        description: "Nations with weak ground, including active nations"
    },
    ground_2d: {
        endpoint: RAID,
        default_values: {
            nations: "#tankpct<0.2,#soldierpct<0.4,*",
            num_results: "25",
            time_inactive: "2d",
            weak_ground: "true"
        },
        description: "Nations with weak ground, inactive for 2d"
    },
    losing: {
        endpoint: RAID,
        default_values: {
            nations: "#def>0,#RelativeStrength<1,*",
            num_results: "25",
            time_inactive: "0d",
            weak_ground: "true"
        },
        description: "Nations losing wars"
    },
    unprotected: {
        endpoint: UNPROTECTED,
        default_values: {
            nations: "*",
            num_results: "25",
            ignoreODP: "true",
            includeAllies: "true",
            maxRelativeCounterStrength: "90"
        },
        description: "Nations least likely to defend or have counters"
    }
};

export default function RaidSection() {

    const { nation: nationParam } = useParams<{ nation: string }>();
    const { session } = useSession();
    const [nation, setNation] = useSyncedState<string | undefined>(nationParam ?? session?.nation_name);
    const [isNationPickerOpen, setIsNationPickerOpen] = useState(false);
    const [raidOutput, setRaidOutput] = useState<RaidOutputState>(null);
    const [desc, setDesc] = useState<string | null>(null);

    const navigate = useNavigate();

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

    const dismiss = useCallback(() => {
        setRaidOutput(null);
        setDesc(null);
    }, [setRaidOutput, setDesc]);

    const openNationPicker = useCallback(() => {
        setIsNationPickerOpen(true);
    }, []);

    const closeNationPicker = useCallback(() => {
        setIsNationPickerOpen(false);
    }, []);

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
                    {nation ? (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(RAID_OPTIONS).map(([key, option]) => (
                                <RaidButton
                                    key={key}
                                    label={key}
                                    option={option}
                                    endpoint={option.endpoint}
                                    setDesc={setDesc}
                                    setRaidOutput={setRaidOutput}
                                    nation={nation}
                                    loading={false}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-sm border border-dashed border-light/20 px-2 py-1 text-sm text-muted-foreground">
                            Select a nation first to enable raid searches.
                        </div>
                    )}
                </section>

                {desc && (
                    <div className="rounded-sm border border-primary/15 bg-primary/5 px-2 py-1 text-sm text-primary/90">
                        {desc}
                    </div>
                )}

                <RaidOutput output={raidOutput} dismiss={dismiss} />
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

export function RaidButton({ option, label, endpoint, setRaidOutput, loading, setDesc, nation }: {
    option: RaidOption,
    label: string,
    endpoint: typeof RAID | typeof UNPROTECTED,
    setRaidOutput: (value: RaidOutputState) => void,
    loading: boolean,
    setDesc: (value: string) => void,
    nation: string
}) {
    const { showDialog } = useDialog();
    const optionData = { ...option.default_values as { [key: string]: string }, nation };

    const handleResponse = useCallback(({ data }: { data: WebTargets }) => {
        setDesc(option.description);
        setRaidOutput(data);
    }, [option, setDesc, setRaidOutput]);

    const handleError = useCallback((error: Error) => {
        setRaidOutput(null);
        showDialog("Error", error.message, true);
    }, [setRaidOutput, showDialog]);

    const classes = cn("border-primary/20 capitalize", { "cursor-wait disabled text-muted": loading });

    return <ApiFormInputs
        endpoint={endpoint}
        default_values={optionData}
        label={label}
        handle_response={handleResponse}
        handle_error={handleError}
        classes={classes}
    />
}

const ranks: string[] = ((COMMANDS.options.Rank.options)).map((o) => o === "REMOVE" ? "" : o);

export function RaidOutput({ output, dismiss }: { output: RaidOutputState, dismiss: () => void }) {
    if (!output) return <></>

    const targets = output;
    const rows = [targets.self, ...targets.targets];
    const now = Date.now();

    return (
        <div className="rounded-sm border border-light/10 bg-black/10 p-2">
            <div className="mb-2 flex items-center justify-end">
                <Button onClick={dismiss} variant="outline" size="sm">Dismiss</Button>
            </div>

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
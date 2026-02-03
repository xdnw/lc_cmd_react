import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useDialog } from "../../components/layout/DialogContext";
import { Button } from "@/components/ui/button.tsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import { commafy, formatDuration, formatSi } from "@/utils/StringUtil.ts";
import Loading from "@/components/ui/loading.tsx";
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

export default function RaidSection() {

    const { nation: nationParam } = useParams<{ nation: string }>();
    const { session, error, setSession, refetchSession } = useSession();
    const [nation, setNation] = useSyncedState<string | undefined>(nationParam ?? session?.nation_name);

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

    const updateNation = useCallback((newNation: string) => {
        setNation(newNation);
        navigate(`/raid/${newNation}`);
    }, [navigate, setNation]);

    const [raidOutput, setRaidOutput] = useState<WebTargets | boolean | string | null>(null);
    const [desc, setDesc] = useState<string | null>(null);


    const raiding: RaidOptions = useMemo<RaidOptions>(() => ({
        app_7d: {
            endpoint: RAID,
            default_values: {
                nations: "*,#position<=1",
                num_results: "25",
            } as { [key: string]: string },
            description: "Attackable applicants and nones inactive for 7d"
        },
        members: {
            endpoint: RAID,
            default_values: {
                nations: "*",
                num_results: "25"
            } as { [key: string]: string },
            description: "All attackable nations inactive for 7d"
        },
        beige: {
            endpoint: RAID,
            default_values: {
                nations: "*",
                num_results: "25",
                beige_turns: "24"
            } as { [key: string]: string },
            description: "All nations inactive for 7d, including on beige"
        },
        ground: {
            endpoint: RAID,
            default_values: {
                nations: "#tankpct<0.2,#soldierpct<0.4,*",
                num_results: "25",
                time_inactive: "0d",
                weak_ground: "true"
            } as { [key: string]: string },
            description: "Nations with weak ground, including active nations"
        },
        ground_2d: {
            endpoint: RAID,
            default_values: {
                nations: "#tankpct<0.2,#soldierpct<0.4,*",
                num_results: "25",
                time_inactive: "2d",
                weak_ground: "true"
            } as { [key: string]: string },
            description: "Nations with weak ground, inactive for 2d"
        },
        losing: {
            endpoint: RAID,
            default_values: {
                nations: "#def>0,#RelativeStrength<1,*",
                num_results: "25",
                time_inactive: "0d",
                weak_ground: "true"
            } as { [key: string]: string },
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
            } as { [key: string]: string },
            description: "Nations least likely to defend or have counters"
        }
    }), []);

    const nationPicker = useMemo(() => {
        return <PickNation pickedNation={nation} updateNation={updateNation} />
    }, [nation, updateNation]);

    const raidButtons = useMemo(() => {
        return Object.keys(raiding).map((key, index) => (
            <span key={index}>
                <RaidButton
                    label={key}
                    option={raiding[key]}
                    endpoint={raiding[key].endpoint}
                    setDesc={setDesc}
                    setRaidOutput={setRaidOutput}
                    nation={nation ?? ""}
                    loading={false} />
            </span>
        ));
    }, [nation, raiding]);

    const descSection = useMemo(() => {
        return desc && <div className="p-1 bg-primary/10">{desc}</div>;
    }, [desc]);

    const dismiss = useCallback(() => {
        setRaidOutput(null);
        setDesc("");
    }, [setRaidOutput, setDesc]);

    const output = useMemo(() => {
        return <RaidOutput output={raidOutput} dismiss={dismiss} />
    }, [raidOutput, dismiss]);

    return (
        <div className="bg-light/10 border border-light/10 p-2 rounded mt-2">
            <h1 className="text-2xl mt-2 font-bold">War / Raiding</h1>
            {((!session || !session.nation) && !nation) && nationPicker}
            <div className="p-2 my-1 relative">
                Raiding: {nation && raidButtons}
                <br />
                {descSection}
                {output}
            </div>
        </div>
    );
}

export function PickNation({ pickedNation, updateNation }: { pickedNation?: string, updateNation: (nation: string) => void }) {
    const setOutputValue = useCallback((name: string, val: string) => {
        updateNation(val);
    }, [updateNation]);
    return (
        <>
            <div className={`${pickedNation ? 'text-primary/80 border-secondary' : 'text-red-500 border-red-500/25'} border w-full mb-1 p-1 relative bg-accent rounded`}>
                {pickedNation ? (
                    <>Currently selected: {pickedNation}</>
                ) : (
                    <>You MUST Select a Nation to use this tool or add it to the url or login.</>
                )}
            </div>
            <QueryComponent element={"DBNation"} multi={false} argName={"nation"} initialValue={pickedNation ?? ""} setOutputValue={setOutputValue} />
        </>
    );
}

export function RaidButton({ option, label, endpoint, setRaidOutput, loading, setDesc, nation }: {
    option: RaidOption,
    label: string,
    endpoint: typeof RAID | typeof UNPROTECTED,
    setRaidOutput: (value: WebTargets | boolean | string | null) => void,
    loading: boolean,
    setDesc: (value: string) => void,
    nation: string
}) {
    const { showDialog } = useDialog();
    const optionData = useMemo(() => {
        return { ...option.default_values as { [key: string]: string }, nation: nation };
    }, [option, nation]);

    const handleResponse = useCallback(({ data }: { data: WebTargets }) => {
        setDesc(option.description);
        setRaidOutput(true);
        setRaidOutput(data);
    }, [option, setDesc, setRaidOutput]);

    const handleError = useCallback((error: Error) => {
        setRaidOutput(null);
        showDialog("Error", error.message, true);
    }, [setRaidOutput, showDialog]);

    const myclasses = useMemo(() => {
        return cn("mb-1 border-primary/20", { "cursor-wait disabled text-muted": loading });
    }, [loading]);

    return <ApiFormInputs
        endpoint={endpoint}
        default_values={optionData}
        label={label}
        handle_response={handleResponse}
        handle_error={handleError}
        classes={myclasses}
    />
}

export function UnprotectedButton({ options, setRaidOutput, loading, desc, setDesc }: { options: { [key: string]: string }, setRaidOutput: (value: WebTargets | boolean | string | null) => void, loading: boolean, desc: string, setDesc: (value: string) => void }) {
    const { showDialog } = useDialog();
    const handleResponse = useCallback(({ data }: { data: WebTargets }) => {
        setDesc("Unprotected Nations");
        setRaidOutput(true);
        setRaidOutput(data);
    }, [setDesc, setRaidOutput]);

    const handleError = useCallback((error: Error) => {
        setRaidOutput(null);
        showDialog("Error", error.message, true);
    }, [setRaidOutput, showDialog]);

    const classes = useMemo(() => {
        return cn("mb-1 border-primary/20", { "cursor-wait disabled text-muted": loading });
    }, [loading]);

    return <ApiFormInputs
        endpoint={UNPROTECTED}
        default_values={options}
        label="unprotected"
        handle_response={handleResponse}
        handle_error={handleError}
        classes={classes}
    />
}

const ranks: string[] = ((COMMANDS.options.Rank.options)).map((o) => o === "REMOVE" ? "" : o);

export function RaidOutput({ output, dismiss }: { output: WebTargets | boolean | string | null, dismiss: () => void }) {
    if (!output) return <></>
    if (output === true) return (<Loading variant="ripple" />);

    // This gets calculated on every render but could be memoized
    const targets = output as WebTargets;

    // Memoize the table header based on include_strength
    const tableHeader = useMemo(() => (
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
    ), [targets.include_strength]);

    // Memoize the row generation
    const tableRows = useMemo(() => (
        [targets.self, ...targets.targets].map((target, index) => (
            <WebTargetRow
                key={index}
                includeStrength={targets.include_strength}
                now={Date.now()}
                self={targets.self}
                target={target}
                classes={`even:bg-black/10 dark:even:bg-white/5 ${target.id === targets.self.id ? "border border-2 border-blue-500/50 bg-blue-500/20" : ""
                    }`}
            />
        ))
    ), [targets]);

    return (
        <div className="w-full">
            <table className="w-full text-sm table-auto">
                <thead className="text-left">
                    {tableHeader}
                </thead>
                <tbody>
                    {tableRows}
                </tbody>
            </table>
            <Button onClick={dismiss} variant="outline" size="sm" className="w-full">Dismiss</Button>
        </div>
    );
}

export function WebTargetRow({ includeStrength, self, target, classes, now }: { includeStrength: boolean, self: WebTarget, target: WebTarget, classes: string, now: number }) {
    return (
        <tr className={classes}>
            <td className="border border-gray-500/25 p-1">{target.id == self.id ? "Your Nation" : <Link className="text-blue-600 hover:text-blue-800 underline"
                to={`https://politicsandwar.com/nation/id=${target.id}`}>{target.nation}</Link>}</td>
            <td className="border border-gray-500/25 p-1">{target.id == self.id ? "" : target.alliance_id === 0 ? "None" :
                <Link className="text-blue-600 hover:text-blue-800 underline"
                    to={`https://politicsandwar.com/alliance/id=${target.alliance_id}`}>{target.alliance}</Link>}</td>
            <td className="border border-gray-500/25">
                <div className="flex justify-center items-center text-center">
                    <Color colorId={target.color_id} beigeTurns={target.beige_turns} />
                </div>
            </td>
            {includeStrength &&
                <td className="border-0.5border border-gray-500/25 p-1">{target.id != self.id ? `${formatSi(target.strength)}%` : ""}</td>}
            <td className="border border-gray-500/25 p-1">{target.id == self.id ? "" : `$${target.expected != 0 && target.expected != target.actual ? formatSi(target.expected) + "-" : ""}${formatSi(target.actual)}`}</td>
            <td className="border border-gray-500/25 p-1">{ranks[target.position]}</td>
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
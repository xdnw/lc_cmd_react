import { MULTI_V2} from "../../../lib/endpoints";
import {getQueryParams} from "../../../lib/utils";
import {Link, useParams} from "react-router-dom";
import {TableWith2DData} from "../../custom_table";
import React from "react";
import { Button } from "@/components/ui/button";
import {renderLink} from "./multi";
import {ChevronDown, ChevronUp} from "lucide-react";
import EndpointWrapper from "@/components/api/bulkwrapper";

export default function MultiV2() {
    const { nation } = useParams<{ nation: string }>();
    const [collapse, setCollapse] = React.useState(true);
    return <>
        <div className="bg-light/10 border border-light/10 mb-2 rounded">
        <Button variant="ghost" size="md"
                className="text-2xl w-full border-b border-secondary px-2 bg-primary/10 justify-start"
                onClick={() => setCollapse(f => !f)}>
            Column descriptions {collapse ? <ChevronDown/> : <ChevronUp/>}
        </Button>
        <div className={`transition-all duration-200 ease-in-out ${collapse ? 'max-h-0 opacity-0 overflow-hidden' : 'p-2 opacity-100'}`}>
            <ul className="p-2">
                <li><strong>Nation</strong>: The name of the nation.</li>
                <li><strong>Alliance</strong>: The name of the alliance the nation belongs to.</li>
                <li><strong>Age</strong>: The age of the nation in days.</li>
                <li><strong>Cities</strong>: The number of cities in the nation.</li>
                <li><strong>Shared IPs</strong>: The number of shared IP addresses between the two nations.</li>
                <li><strong>Shared IP %</strong>: Percent of nations in both multi reports that are the same (weighted by IP).</li>
                <li><strong>Shared Nation %</strong>: Percent of nations in both multi reports that are the same.</li>
                <li><strong>Same IP</strong>: Last login used the same IP address.</li>
                <li><strong>Banned</strong>: Indicates if the nation is banned.</li>
                <li><strong>Login Diff</strong>: The time difference between their last logins.</li>
                <li><strong>Same Activity %</strong>: The percentage turns both are active within the past 2 weeks.</li>
                <li><strong>% Online</strong>: The percentage of turns the nation is active in general within the past 2w.</li>
                <li><strong>Discord</strong>: The Discord handle of the nation (may be blank even if they have verified in the past)</li>
                <li><strong>Discord Linked</strong>: Indicates if the Discord account is linked with this bot.</li>
                <li><strong>IRL Verified</strong>: Indicates if the nation is verified their IRL identity.</li>
                <li><strong>Customization</strong>: The amount of basic customization done to the nation (such as flag).</li>
            </ul>
            <p className="p-2 bg-primary/20">
                If the shared % says N/A, it means the nation has not been checked for shared IPs. You can try loading the multi page for that nation, then refreshing this page.
            </p>
        </div>
        </div>
        <EndpointWrapper endpoint={MULTI_V2} args={{nation: nation, forceUpdate: getQueryParams().get("update") ?? 'false'}}>
            {({data}) => {
                const selfColumns: string[] = ["Nation", "Alliance", "Age", "Cities", "Last Active", "% Online", "Discord", "Discord Linked", "IRL Verified", "Customization", "Updated"];
                const selfData = [[
                    renderLink(data.nationId, data.nation, 'nation', data.banned ? "BANNED" : undefined, undefined),
                    renderLink(data.allianceId, data.alliance, 'alliance', undefined, undefined),
                    data.age,
                    data.cities,
                    data.lastActive,
                    data.percentOnline,
                    data.discord,
                    data.discord_linked,
                    data.irl_verified,
                    data.customization,
                    data.dateFetched]];
                const selfRenderers = ["normal", "normal", 'duration_day', 'comma', 'diff_ms', 'percent', "normal", "normal", "normal", 'percent_100', 'diff_ms'];

                const networkColumns = ["Nation", "Alliance", "Age", "Cities", "Shared IPs", "Shared IP %", "Shared Nation %", "Same IP", "Banned", "Login Diff", "Same Activity %", "% Online", "Discord", "Discord Linked", "IRL Verified", "Customization"];
                const networkData = data.rows.map(row => [
                    renderLink(row.id, row.Nation, 'nation', row.banned ? "BANNED" : undefined, "multi_v2"),
                    renderLink(row.alliance_id, row.alliance, 'alliance', undefined, undefined),
                    row.age,
                    row.cities,
                    row.shared_ips,
                    row.shared_percent,
                    row.shared_nation_percent,
                    row.same_ip,
                    row.banned ? "true" : "",
                    row.login_diff,
                    row.same_activity_percent,
                    row.percentOnline,
                    row.discord,
                    row.discord_linked,
                    row.irl_verified,
                    row.customization
                ]);
                const networkRenderers = ["normal", "normal", 'duration_day', 'comma', 'comma', 'percent', 'percent', "normal", "normal", 'duration_ms', 'percent', 'percent', "normal", "normal", "normal", 'percent_100'];
                return (
                    <>
                        <div className='bg-light/10 border border-light/10 p-2'>
                            <TableWith2DData columns={selfColumns} data={selfData} renderers={selfRenderers}/>
                            <hr className="my-1"/>
                            {data.dateFetched < Date.now() - 1000 * 60 * 60 * 24 && <Button variant="outline" size="sm" className='border-red-800/70' asChild><Link to={`?update=true`}>Update</Link></Button>}
                        </div>
                        <hr className="my-2"/>
                        <div className="bg-light/10 border border-light/10 rounded-t">
                            <h2 className="text-2xl w-full border-b border-secondary px-2 bg-primary/10">Shared Networks (Unique IDs)</h2>
                            <div className="p-2">
                                <TableWith2DData columns={networkColumns} data={networkData} renderers={networkRenderers} sort={{idx: 5, dir: "desc"}}/>
                            </div>
                        </div>
                    </>
                );
            }
        }
        </EndpointWrapper>
    </>
}
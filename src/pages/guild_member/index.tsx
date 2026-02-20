import { useCallback, useRef, useState } from "react";
import MarkupRenderer from "@/components/ui/MarkupRenderer.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
    BANK_ACCESS,
    MARK_ALL_READ,
    MY_AUDITS, MY_WARS,
    UNREAD_COUNT,
} from "@/lib/endpoints";
import { Link } from "react-router-dom";
import { formatDuration, formatSi } from "@/utils/StringUtil.ts";
import { COMMANDS } from "@/lib/commands.ts";
import * as ApiTypes from "@/lib/apitypes";
import { clamp } from "@/lib/utils.ts";
import { WebAudits, WebBankAccess } from "@/lib/apitypes";
import { useDialog } from "../../components/layout/DialogContext";
import RaidSection from "../raid";
import EndpointWrapper from "@/components/api/bulkwrapper";
import { ApiFormInputs } from "@/components/api/apiform";
import LazyIcon from "@/components/ui/LazyIcon";

export default function GuildMember() {
    return (
        <>
            <AnnouncementSection />
            <AuditSection />
            <BankSection />
            <MyWarsSection />
            <RaidSection />
            <GrantSection />
        </>
    );
}

export function AuditSection() {
    return <EndpointWrapper endpoint={MY_AUDITS} args={{}}>
        {({ data }) => {
            return (<AuditComponent audits={data} />);
        }}
    </EndpointWrapper>;
}

export function AuditComponent({ audits }: { audits: WebAudits }) {
    const [showDescription, setShowDescription] = useState<boolean>(false);

    if (Object.keys(audits.values).length === 0) {
        return <div className="text-green-500 mb-1 p-1 border-green-500/25 bg-accent relative rounded-sm">You have passed all audits...</div>;
    }

    const getSeverityColor = (severity: number) => {
        switch (severity) {
            case 0:
                return "bg-yellow-600/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-100 rounded-sm";
            case 1:
                return "bg-orange-600/20 border-orange-500/50 text-orange-600 dark:text-orange-100 rounded-sm";
            case 2:
                return "bg-red-600/20 border-red-500/50 text-red-600 dark:text-red-100 rounded-sm";
            default:
                return "";
        }
    };

    const toggleDesc = useCallback(() => {
        setShowDescription(f => !f);
    }, [setShowDescription]);

    return (
        <div className="bg-light/10 border border-light/10 p-2 mt-2 rounded">
            <div className="relative">
                <h1 className="text-2xl font-bold">Audits</h1>
                <Button
                    variant="outline" size="sm"
                    className="absolute border-primary/20 top-1 right-1"
                    onClick={toggleDesc}
                >
                    {showDescription ? "Show Less" : "Show More"}
                </Button>
            </div>
            <div className="p-1 relative rounded">
                {audits.values.map((audit, key) => (
                    <div key={key} className={`p-0.5 mb-0.5 border ${getSeverityColor(audit.severity)} break-all`}>
                        <div className="flex justify-between items-center">
                            <span className="font-bold">{audit.audit}: {audit.value}</span>
                        </div>
                        <div className={`transition-all duration-100 ease-in-out ${showDescription ? 'p-1 max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                            <MarkupRenderer content={audit.description} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AnnouncementSection() {
    const countRef = useRef(-1);
    const [rerender, setRerender] = useState(false);

    const setUnreadCount = useCallback((value: number) => {
        countRef.current = value;
        setRerender(!rerender); // Trigger rerender
    }, [rerender]);

    return <EndpointWrapper endpoint={UNREAD_COUNT} args={{}}>
        {({ data }) => {
            if (countRef.current === -1) {
                countRef.current = data.value;
            }
            return (
                <div className={`${countRef.current === 0 ? "text-primary/80 border-secondary" : "text-red-500 border-red-500/25"} border w-full mb-1 p-1 relative bg-accent rounded`}>
                    <Button variant="outline" size="sm" className="mr-1 border-primary/20" asChild>
                        <Link to={`${process.env.BASE_PATH}announcements`}>View</Link>
                    </Button>
                    {countRef.current === 0 ? "No new announcements" : `You have ${countRef.current} unread announcements...`}
                    {countRef.current !== 0 && <DismissAnnouncements setUnreadCount={setUnreadCount} />}
                </div>
            );
        }}
    </EndpointWrapper>;
}

export function DismissAnnouncements({ setUnreadCount }: { setUnreadCount: (value: number) => void }) {
    const { showDialog } = useDialog();

    const handleResponse = useCallback(() => {
        setUnreadCount(0);
        showDialog("Dismissed All", <>Marked all announcements as read</>);
    }, [setUnreadCount, showDialog]);

    return <ApiFormInputs
        endpoint={MARK_ALL_READ}
        label="Dismiss All"
        handle_response={handleResponse}
        classes="absolute top-1 right-1"
    />
}

export function BankSection() {
    return <div className="bg-light/10 border border-light/10 p-2 rounded mt-2">
        <h1 className="text-2xl font-bold">Banking</h1>
        <EndpointWrapper endpoint={BANK_ACCESS} args={{}}>
            {({ data }) => {
                return <BankAccess access={data} />;
            }}
        </EndpointWrapper>
    </div>;
}

export function BankAccess({ access }: { access: WebBankAccess }) {
    const canWithdraw = Object.keys(access).length > 0;
    const hasEcon = Object.values(access).some((value) => value > 0);
    const sections: { [key: string]: string[][] } = {};
    sections["Balance"] = [["Self", "balance/self"]];
    // sections["Records"] = [["Self", "balance_history_self"]];
    if (canWithdraw) {
        // sections["Transfer"] = [];
        // sections["Transfer"].push(["Self", "withdraw/self"]);
        // sections["Transfer"].push(["Nation", "withdraw/nation"]);
        // sections["Transfer"].push(["Alliance", "withdraw/alliance"]);
    }
    if (hasEcon) {
        // sections["Balance"].push(["Manage", "manage_bank"]);
        // sections["Transfer"].push(["From Offshore", "withdraw/alliance"]);
        // sections["Records"].push(["Nation", "balance_history/self"]);
        // sections["Records"].push(["Offshore", "balance_history/offshore"]);
    }
    return (
        <div className="p-1 mb-1 relative bg-accent rounded">
            {Object.keys(sections).map((section, key) => (
                <div key={key}>
                    <h1 className="font-bold">{section}</h1>
                    {sections[section].map((action, key) => (
                        <Button
                            key={key}
                            variant="outline" size="sm"
                            className="border-primary/20 mr-1"
                            asChild
                        >
                            <Link to={`${process.env.BASE_PATH}${action[1]}`}>{action[0]}</Link>
                        </Button>
                    ))}
                </div>
            ))}
        </div>
    );
}

export function GrantSection() {
    return <div className="p-2 my-1 bg-accent">No grants are available at this time</div>;
}

export function MyWarsSection() {
    return <EndpointWrapper endpoint={MY_WARS} args={{}}>
        {({ data }) => {
            return (<WarsComponent wars={data} />)
        }}
    </EndpointWrapper>;
}

export function WarsComponent({ wars }: { wars: ApiTypes.WebMyWars }) {
    const [showMore, setShowMore] = useState<boolean>(false);
    if (wars.offensives.length === 0 && wars.defensives.length === 0) {
        return (
            <div className="bg-accent rounded p-1">
                <h2>You currently have no wars</h2>
            </div>
        );
    }

    const toggleMore = useCallback(() => {
        setShowMore(f => !f);
    }, [setShowMore]);

    return (
        <div className="bg-light/10 border border-light/10 p-2 rounded mt-2">
            <div className="w-full">
                <a href="https://politicsandwar.com/nation/war/"
                    className="text-2xl mt-2 font-bold underline hover:no-underline">
                    {wars.offensives.length + wars.defensives.length}&nbsp;Active Wars<LazyIcon name="ExternalLink"
                        className="inline h-5" /></a>
            </div>
            <div className="mt-1 text-sm relative w-full">
                <Button variant="secondary" size="sm" className='border-slate-600 w-full text-center'
                    onClick={toggleMore}>{showMore ? "Collapse Wars" : "Show Wars"}</Button>
                <div
                    className={`transition-all duration-200 ease-in-out ${showMore ? 'p-1 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    {wars.isFightingActives && (
                        <>
                            <BuyUnits me={wars.me} mywars={wars} />
                            <div className="bg-teal-500/50 p-1 mt-1">
                                It is recommended to repurchase lost units after each attack
                            </div>
                        </>
                    )}
                    {!wars.isFightingActives && (
                        <><Button variant="outline" size="sm" className="w-full" asChild>
                            <Link to="https://politicsandwar.com/nation/military/">
                                Buy military <LazyIcon name="ExternalLink" className="h-4" />
                            </Link>
                        </Button>
                        </>
                    )}
                    {wars.offensives.length > 0 && (
                        <>
                            <h4 className="text-lg">Offensives</h4>
                            {wars.offensives.map((war, index) => (
                                <WarComponent key={index} me={wars.me} war={war} isAttacker={true} />
                            ))}
                        </>
                    )}
                    {wars.defensives.length > 0 && (
                        <>
                            <h4>Defensives</h4>
                            {wars.defensives.map((war, index) => (
                                <WarComponent key={index} me={wars.me} war={war} isAttacker={false} />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function BuyUnits({ me, mywars }: { me: ApiTypes.WebTarget, mywars: ApiTypes.WebMyWars }) {
    const unitLinks = [
        {
            type: "soldiers",
            cap: mywars.soldier_cap,
            current: me.soldier,
            url: "https://politicsandwar.com/nation/military/soldiers/"
        },
        {
            type: "tanks",
            cap: mywars.tank_cap,
            current: me.tank,
            url: "https://politicsandwar.com/nation/military/tanks/"
        },
        {
            type: "aircraft",
            cap: mywars.aircraft_cap,
            current: me.aircraft,
            url: "https://politicsandwar.com/nation/military/aircraft/"
        },
        {
            type: "navy",
            cap: mywars.ship_cap,
            current: me.ship,
            url: "https://politicsandwar.com/nation/military/navy/"
        },
        { type: "spies", cap: mywars.spy_cap, current: me.spies, url: "https://politicsandwar.com/nation/military/spies/" },
        {
            type: "missiles",
            cap: 1,
            current: me.missile,
            url: "https://politicsandwar.com/nation/military/missiles/"
        },
        { type: "nukes", cap: 1, current: me.nuke, url: "https://politicsandwar.com/nation/military/missiles/" },
    ];

    return (
        <>
            Buy: {unitLinks.map((unit, index) => (
                <Button key={unit.type} variant="outline" size="sm" className="inline" asChild>
                    <Link
                        key={index}
                        to={unit.url}
                        className={`${unit.current * 1.05 < unit.cap ? "bg-card" : "bg-card/40"}`}
                    >{unit.type}
                    </Link>
                </Button>
            ))}
        </>
    )
}

const allBeigeReasons: string[] = COMMANDS.options.BeigeReason.options;

export function WarComponent({ me, war, isAttacker }: { me: ApiTypes.WebTarget, war: ApiTypes.WebMyWar, isAttacker: boolean }) {
    const now_ms = Date.now();
    const showBeigeReasons = false;
    return (
        <div className="border-2 border-red-200 dark:border-red-900 bg-slate-500/50 mb-5 rounded-md">
            <table className="table-auto w-full">
                <thead className="bg-red-200 dark:bg-red-900">
                    <tr>
                        <th scope="col">Nation</th>
                        <th scope="col">Alliance</th>
                        <th scope="col">&#127961;&#65039;</th>
                        <th scope="col">&#128130;</th>
                        <th scope="col">&#9881;&#65039;</th>
                        <th scope="col">&#9992;&#65039;</th>
                        <th scope="col">&#128674;</th>
                        <th scope="col">&#128640;/&#9762;&#65039;</th>
                        <th scope="col">Off/Def</th>
                        <th scope="col">MAP</th>
                        <th scope="col">Resist</th>
                    </tr>
                </thead>
                <tbody className="divide-solid">
                    <tr>
                        <td className="border border-gray-500/25 p-1"><a className="text-blue-500 hover:text-blue-600 active:text-blue-400 underline" href={`https://politicsandwar.com/nation/id=${war.target.id}`}>{war.target.nation}</a>
                            {war.target.active_ms > 2440 * 1000 * 60 && <span
                                className="badge bg-secondary ms-1">inactive {formatDuration(Math.round((now_ms - war.target.active_ms) / 1000), 2)}</span>}
                            {(isAttacker ? war.def_fortified : war.att_fortified) && <span className="badge bg-secondary ms-1" title="Fortified"><LazyIcon name="Shield" className="h-4 inline" /></span>}
                            {(war.blockade == 1) && <span className="badge bg-secondary ms-1" title="Blockaded"><LazyIcon name="Sailboat" className="h-4 inline" /></span>}
                            {(war.ac == -1) && <span className="badge bg-secondary ms-1" title="Air Control"><LazyIcon name="Plane" className="h-4 inline" /></span>}
                            {(war.gc == -1) && <span className="badge bg-secondary ms-1" title="Ground Control"><LazyIcon name="Settings" className="h-4 inline" /></span>}
                            {war.iron_dome && <span className="badge bg-secondary ms-1" title="Iron Dome (30% chance to block missile)">ID</span>}
                            {war.vds && <span className="badge bg-secondary ms-1" title="Vital Defense System (25% chance to thwart nukes)">VDS</span>}
                        </td>
                        <td className="border border-gray-500/25 p-1"><a className="text-blue-500 hover:text-blue-600 active:text-blue-400 underline" href={`https://politicsandwar.com/nation/id=${war.target.alliance_id}`}>{war.target.alliance}</a></td>
                        <td className="border border-gray-500/25 p-1">{war.target.cities}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(${Math.min(255, Math.max(0, 255 * war.ground_str / (4 * me.strength)))}, 0, 0)` }}>{war.target.soldier}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(${Math.min(255, Math.max(0, 255 * war.ground_str / (4 * me.strength)))}, 0, 0)` }}>{war.target.tank}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(${Math.min(255, Math.max(0, 255 * war.target.aircraft / (5 * me.aircraft)))}, 0, 0)` }}>{war.target.aircraft}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(${Math.min(255, Math.max(0, 255 * war.target.ship / (5 * me.ship)))}, 0, 0)` }}>{war.target.ship}</td>
                        <td className="border border-gray-500/25 p-1">{war.target.missile}/{war.target.nuke}</td>
                        <td className="border border-gray-500/25 p-1">{war.target.off}/{war.target.def}</td>
                        <td className="border border-gray-500/25 p-1">
                            <div className="px-1 text-secondary font-bold text-center"
                                style={{
                                    width: `${Math.max(10, (isAttacker ? war.def_map : war.att_map) / 0.12)}%`,
                                    backgroundColor: `rgb(${clamp(255 - (isAttacker ? war.def_map : war.att_map) * 255 / 0.12, 0, 255)}, ${clamp((isAttacker ? war.def_map : war.att_map) * 255 / 0.12, 0, 255)}, 0)`
                                }}>
                                {isAttacker ? war.def_map : war.att_map}
                            </div>
                        </td>
                        <td className="border border-gray-500/25 p-1">
                            <div className="px-1 text-secondary font-bold text-center"
                                aria-valuenow={(isAttacker ? war.def_res : war.att_res)}
                                aria-valuemin={0} aria-valuemax={100}
                                style={{
                                    width: `${Math.max(10, (isAttacker ? war.def_res : war.att_res))}%`,
                                    backgroundColor: `rgb(${clamp(255 - (isAttacker ? war.def_res : war.att_res) * 255 / 100, 0, 255)}, ${clamp((isAttacker ? war.def_res : war.att_res) * 255 / 100, 0, 255)}, 0)`
                                }}>
                                {(isAttacker ? war.def_res : war.att_res)}</div>
                        </td>
                    </tr>
                    <tr className="border-t border border-secondary">
                        <td className="border border-gray-500/25 p-1"><a className="text-blue-500 hover:text-blue-600 active:text-blue-400 underline" href={`https://www.politicsandwar.com/nation/id=${me.id}`}>{me.nation}</a>
                            {(!isAttacker ? war.def_fortified : war.att_fortified) && <span className="badge bg-secondary ms-1" title="Fortified"><LazyIcon name="Shield" className="h-4 inline" /></span>}
                            {(war.blockade == -1) && <span className="badge bg-secondary ms-1" title="Blockaded"><LazyIcon name="Sailboat" className="h-4 inline" /></span>}
                            {(war.ac == 1) && <span className="badge bg-secondary ms-1" title="Air Control"><LazyIcon name="Plane" className="h-4 inline" /></span>}
                            {(war.gc == 1) && <span className="badge bg-secondary ms-1" title="Ground Control"><LazyIcon name="Settings" className="h-4 inline" /></span>}
                        </td>
                        <td className="border border-gray-500/25 p-1"><a className="text-blue-500 hover:text-blue-600 active:text-blue-400 underline" href={`https://www.politicsandwar.com/alliance/id=${me.alliance_id}`}>{me.alliance}</a></td>
                        <td className="border border-gray-500/25 p-1">{me.cities}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(0, ${Math.min(255, Math.max(0, 255 * me.strength / (4 * war.ground_str)))}, 0)` }}>{me.soldier}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(0, ${Math.min(255, Math.max(0, 255 * me.strength / (4 * war.ground_str)))}, 0)` }}>{me.tank}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(0, ${Math.min(255, Math.max(0, 255 * me.aircraft / (5 * war.target.aircraft)))}, 0)` }}>{me.aircraft}</td>
                        <td className="border border-gray-500/25 p-1" style={{ color: `rgb(0, ${Math.min(255, Math.max(0, 255 * me.ship / (5 * war.target.ship)))}, 0)` }}>{me.ship}</td>
                        <td className="border border-gray-500/25 p-1">{me.missile}/{me.nuke}</td>
                        <td className="border border-gray-500/25 p-1">{me.off}/{me.def}</td>
                        <td className="border border-gray-500/25 p-1">
                            <div className="px-1 text-secondary font-bold text-center"
                                style={{ width: `${Math.max(10, (!isAttacker ? war.def_map : war.att_map) / 0.12)}%`, backgroundColor: `rgb(${clamp(255 - (!isAttacker ? war.def_map : war.att_map) * 255 / 0.12, 0, 255)}, ${clamp((!isAttacker ? war.def_map : war.att_map) * 255 / 0.12, 0, 255)}, 0)` }}>
                                {!isAttacker ? war.def_map : war.att_map}
                            </div>
                        </td>
                        <td className="border border-gray-500/25 p-1">
                            <div className="px-1 text-secondary font-bold text-center"
                                aria-valuenow={(!isAttacker ? war.def_res : war.att_res)}
                                aria-valuemin={0} aria-valuemax={100}
                                style={{ width: `${Math.max(10, (!isAttacker ? war.def_res : war.att_res))}%`, backgroundColor: `rgb(${clamp(255 - (!isAttacker ? war.def_res : war.att_res) * 255 / 100, 0, 255)}, ${clamp((!isAttacker ? war.def_res : war.att_res) * 255 / 100, 0, 255)}, 0)` }}>
                                {(!isAttacker ? war.def_res : war.att_res)}</div>
                        </td>
                    </tr>
                    <tr className="border-t border border-secondary">
                        <td colSpan={3}>
                            <Button variant="secondary" size="sm" className="w-full" asChild>
                                <Link to={`https://politicsandwar.com/nation/war/timeline/war=${war.id}`}>War Link</Link>
                            </Button>
                        </td>
                        <td colSpan={2}>
                            <Button variant="secondary" size="sm" className="w-full" asChild>
                                <Link to={`https://politicsandwar.com/nation/war/groundbattle/war=${war.id}`}>&#128130; ground
                                    attack</Link>
                            </Button>
                        </td>
                        <td>
                            <Button variant="secondary" size="sm" className="w-full" asChild>
                                <Link
                                    to={`https://politicsandwar.com/nation/war/airstrike/war=${war.id}`}>&#9992;&#65039; airstrike</Link>
                            </Button>
                        </td>
                        <td>
                            <Button variant="secondary" size="sm" className="w-full" asChild>
                                <Link
                                    to={`https://politicsandwar.com/nation/war/navalbattle/war=${war.id}`}>&#128674; naval</Link>
                            </Button>
                        </td>
                        <td className="d-flex justify-content-center">
                            <div className="w-full">
                                <div className="w-1/2 p-0 inline-block">
                                    <Button variant="secondary" size="sm" asChild className="w-full me-0.5">
                                        <Link to={`https://politicsandwar.com/nation/war/missile/war=${war.id}`}>&#128640;</Link>
                                    </Button>
                                </div>
                                <div className="w-1/2 p-0 inline-block">
                                    <Button variant="secondary" size="sm" asChild className="w-full ms-0.5">
                                        <Link to={`https://politicsandwar.com/nation/war/nuke/war=${war.id}`}>&#9762;&#65039;</Link>
                                    </Button>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr className="border-b border border-secondary mb-2">
                        <td colSpan={100}>
                            <ShowOddsComponent me={me} war={war} />
                            {war.beigeReasons != null && isAttacker && showBeigeReasons && <>
                                <div
                                    className={`alert ${Object.keys(war.beigeReasons).length == 0 ? "alert-danger" : "alert-success"}`}>
                                    <p className="lead">This is an enemy nation</p>
                                    {Object.keys(war.beigeReasons).length === 0 ? <>
                                        <p><b>Please avoid defeating this enemy. None of the following allowed beige reasons
                                            are met</b>
                                        </p>
                                        <table>
                                            {allBeigeReasons.map((reason, index) => (
                                                <tr key={index}>
                                                    <td className="border border-gray-500/25 p-1"><u>{reason}</u></td>
                                                    <td className="border border-gray-500/25 p-1">TODO</td>
                                                </tr>
                                            ))}
                                        </table>
                                    </> :
                                        <>
                                            <p><b>You can defeat this enemy for the following reasons</b></p>
                                            <ul>
                                                {Object.entries(war.beigeReasons).map(([key, value], index) => (
                                                    <li key={index}><u>{key}</u><br />{value}</li>
                                                ))}
                                            </ul>
                                        </>
                                    }
                                    <div className="accordion" id={`beigeAccordion${war.id}`}>
                                        <div className="accordion-item bg-test">
                                            <h2 className="accordion-header" id={`headingBeige${war.id}`}>
                                                <button
                                                    className="accordion-button collapsed p-1 text-white btn-sm bg-test"
                                                    type="button" data-bs-toggle="collapse"
                                                    data-bs-target={`#collapseBeige${war.id}`} aria-expanded="false"
                                                    aria-controls={`collapseBeige${war.id}`}>
                                                    Beige Cycling Info
                                                </button>
                                            </h2>
                                            <div id={`collapseBeige${war.id}`} className="accordion-collapse collapse"
                                                aria-labelledby={`headingBeige${war.id}`}
                                                data-bs-parent={`#beigeAccordion${war.id}`}>
                                                <div className="accordion-body bg-light">
                                                    <h5>What is beige?</h5>
                                                    <p>A nation defeated gets 2 more days of being on the beige color. Beige
                                                        protects from new war declarations. We want to have active enemies
                                                        always in
                                                        war, so they don&apos;t have the opportunity to build back up.</p>
                                                    <h5>Tips for avoiding unnecessary attacks:</h5>
                                                    <ol>
                                                        <li>Don&apos;t open with navals if they have units which are a threat.
                                                            Ships
                                                            can&apos;t attack planes, tanks or soldiers.
                                                        </li>
                                                        <li>Dont naval if you already have them blockaded</li>
                                                        <li>Never airstrike infra, cash, or small amounts of units - wait for
                                                            them
                                                            to build more units
                                                        </li>
                                                        <li>If they just have some soldiers and can&apos;t get a victory against
                                                            you, don&apos;t spam ground attacks.
                                                        </li>
                                                        <li>If the enemy only has soldiers (no tanks) and you have max planes.
                                                            Airstriking soldiers kills more soldiers than a ground attack will.
                                                        </li>
                                                        <li>Missiles/Nukes do NOT kill any units</li>
                                                    </ol>
                                                    <p>note: You can do some unnecessary attacks if the war is going to expire,
                                                        or
                                                        you need to beige them as part of a beige cycle</p>

                                                    <h5>What is beige cycling?</h5>
                                                    <p>Beige cycling is when we have a weakened enemy, and 3 strong nations
                                                        declared
                                                        on that enemy - then 1 nation defeats them, whilst the other two sit on
                                                        them
                                                        whilst they are on beige. <br />
                                                        When their 2 days of beige from the defeat ends, another nation declares
                                                        on
                                                        the enemies free slot and the next nation defeats the war.target.</p>
                                                    <h5>Beige cycling checklist:</h5>
                                                    <ol>
                                                        <li>Is the enemy military mostly weakened/gone?</li>
                                                        <li>Is the enemy not currently on beige?</li>
                                                        <li>Do they have 3 defensive wars, with the other two attackers having
                                                            enough military?
                                                        </li>
                                                        <li>Are you the first person to have declared?</li>
                                                    </ol>
                                                    <p>Tip: Save your MAP. Avoid going below 40 resistance until you are GO for
                                                        beiging them</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export function OddsComponent({ title, attStr, defStr }: { title: string, attStr: number, defStr: number }) {
    return (
        <div>
            <h5>Odds {title}: {formatSi(attStr)} vs {formatSi(defStr)}</h5>
            <div className="flex w-full h-4 text-xs">
                {(() => {
                    const calculatedOdds = [0, 1, 2, 3].map(success => ({
                        success,
                        odds: odds(attStr, defStr, success) * 100
                    })).filter(({ odds }) => odds > 0);

                    if (calculatedOdds.length === 0) {
                        return <OddsSuccess odds={100} success={0} />
                    }

                    return calculatedOdds.map(({ success, odds }) => (
                        <OddsSuccess key={success} odds={odds} success={success} />
                    ));
                })()}
            </div>
        </div>
    );
}

export function OddsSuccess({ odds, success }: { odds: number, success: number }) {
    if (odds <= 0) return null;

    const successClasses = [
        'bg-red-600',
        'bg-yellow-600',
        'bg-blue-600',
        'bg-green-600'
    ];

    return (
        <div
            className={`grow ${successClasses[success]}`}
            style={{ width: `${odds}%` }}
            aria-valuenow={odds}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div className="whitespace-nowrap break-keep overflow-hidden">
                {Math.round(odds)}% {['Utter Failure', 'Pyrrhic Victory', 'Moderate Success', 'Immense Triumph'][success]}
            </div>
        </div>
    );
}

export function ShowOddsComponent({ me, war }: { me: ApiTypes.WebTarget, war: ApiTypes.WebMyWar }) {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = useCallback(() => setIsOpen(f => !f), [setIsOpen]);

    return (<div className={`bg-card/50 rounded`}>
        <button
            className={`w-full btn-sm ${isOpen ? '' : 'collapsed'}`}
            type="button"
            onClick={toggleOpen}
            aria-expanded={isOpen}
            aria-controls={`collapseodds${war.id}`}
        >
            {isOpen ? <><LazyIcon name="ChevronUp" className="inline" />Hide</> : <><LazyIcon name="ChevronDown"
                className="inline" />Show</>} odds
        </button>
        <div
            id={`collapseodds${war.id}`}
            aria-labelledby={`headingodds${war.id}`}
            className={`transition-all duration-200 ease-in-out ${isOpen ? 'p-1 max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
        >
            <div className="text-sm">
                <div>
                    <div
                        className="bg-red-600 align-middle inline-block me-1 border-2 border-black"
                        style={{ width: "1em", height: "1em" }}
                    ></div>
                    Utter Failure
                </div>
                <div>
                    <div
                        className="bg-yellow-600 align-middle inline-block me-1 border-2 border-black"
                        style={{ width: "1em", height: "1em" }}
                    ></div>
                    Pyrrhic Victory
                </div>
                <div>
                    <div
                        className="bg-blue-600 align-middle inline-block me-1 border-2 border-black"
                        style={{ width: "1em", height: "1em" }}
                    ></div>
                    Moderate Success
                </div>
                <div>
                    <div
                        className="bg-green-600 align-middle inline-block me-1 border-2 border-black"
                        style={{ width: "1em", height: "1em" }}
                    ></div>
                    Immense Triumph
                </div>
                {me.soldier > war.ground_str * 0.3 &&
                    <OddsComponent title="Soldiers (unarmed) v Enemy" attStr={me.soldier}
                        defStr={war.ground_str} />}
                {me.soldier * 1.75 > war.ground_str * 0.3 &&
                    <OddsComponent title="Soldiers (munitions) v Enemy"
                        attStr={me.soldier * 1.75} defStr={war.ground_str} />}
                {me.strength > 0 &&
                    <OddsComponent title="Ground" attStr={me.strength}
                        defStr={war.ground_str} />}
                {me.aircraft > 0 &&
                    <OddsComponent title="Airstrike" attStr={me.aircraft}
                        defStr={war.target.aircraft} />}
                {me.ship > 0 &&
                    <OddsComponent title="Naval" attStr={me.ship} defStr={war.target.ship} />}
            </div>
        </div>
    </div>);
}

function odds(attStrength: number, defStrength: number, success: number): number {
    attStrength = Math.pow(attStrength, 0.75);
    defStrength = Math.pow(defStrength, 0.75);

    const a1 = attStrength * 0.4;
    const a2 = attStrength;
    const b1 = defStrength * 0.4;
    const b2 = defStrength;

    // Skip formula for common cases (for performance)
    if (attStrength <= 0) return 0;
    if (defStrength * 2.5 <= attStrength) return success === 3 ? 1 : 0;
    if (a2 <= b1 || b2 <= a1) return 0;

    const sampleSpace = (a2 - a1) * (b2 - b1);
    const overlap = Math.min(a2, b2) - Math.max(a1, b1);
    let p = (overlap * overlap * 0.5) / sampleSpace;
    if (attStrength > defStrength) p = 1 - p;

    if (p <= 0) return 0;
    if (p >= 1) return 1;

    const k = success;
    const n = 3;

    const odds = Math.pow(p, k) * Math.pow(1 - p, n - k);
    const npr = factorial(n) / (factorial(k) * factorial(n - k));
    return odds * npr;
}

function factorial(n: number): number {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
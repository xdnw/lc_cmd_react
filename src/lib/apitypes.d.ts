/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 3.2.1263 on 2026-02-21 21:27:51.

export interface WebError {
    error: string;
}

export interface CoalitionGraph {
    name: string;
    alliances: { [index: string]: number };
    overall?: WebGraph;
    by_alliance: { [index: string]: WebGraph };
}

export interface CoalitionGraphs {
    spheres: CoalitionGraph[];
}

export interface DiscordRole {
    name: string;
    color: number;
}

export interface NationTaxInfo {
    name: string;
    id: number;
    cities: number;
    off: number;
    def: number;
    vm_turns: number;
    active_m: number;
    color: NationColor;
    city_turns: number;
    project_turns: number;
    num_projects: number;
    project_slots: number;
    mmr_unit: number[];
    mmr_build: number[];
    avg_infra: number;
    avg_land: number;
}

export interface SetGuild {
    id: string;
    name: string;
    icon: string;
}

export interface TaxExpenseBracket {
    transactionsByNation: { [index: string]: WebTransaction[] };
    bracket: WebTaxBracket;
    bracketToNationDepositCount: { [index: string]: number };
    income: number[];
    nations: NationTaxInfo[];
    incomeByNation: { [index: string]: number[] };
    expense: number[];
    expensesByNation: { [index: string]: number[] };
}

export interface TradePriceByDayJson {
    x: string;
    y: string;
    labels: string[];
    timestamps: number[];
    prices: number[][];
}

export interface WebAnnouncement {
    id: number;
    type: number;
    active: boolean;
    title: string;
    content: string;
}

export interface WebAnnouncements {
    values: WebAnnouncement[];
}

export interface WebAudit {
    audit: string;
    severity: number;
    value: string;
    description: string;
}

export interface WebAudits {
    values: WebAudit[];
}

export interface WebBalance {
    id: number;
    is_aa: boolean;
    total: number[];
    include_grants: boolean;
    access: { [index: string]: number };
    breakdown: { [index: string]: number[] };
    no_access_msg?: string;
}

export interface WebBankAccess {
    access: { [index: string]: number };
}

export interface WebBulkQuery {
    results: any[];
}

export interface WebGraph {
    time_format?: TimeFormat;
    number_format?: TableNumberFormat;
    type?: GraphType;
    origin?: number;
    title: string;
    x: string;
    y: string;
    labels: string[];
    data: any[][];
}

export interface WebInt {
    value: number;
}

export interface WebMyEnemies {
    alliance_ids: number[];
    alliances: string[];
    commands: WebWarFinder[];
}

export interface WebMyWar {
    id: number;
    target: WebTarget;
    beigeReasons: { [index: string]: string };
    peace: number;
    blockade: number;
    ac: number;
    gc: number;
    ground_str: number;
    att_res: number;
    def_res: number;
    att_map: number;
    def_map: number;
    iron_dome: boolean;
    vds: boolean;
    att_fortified: boolean;
    def_fortified: boolean;
}

export interface WebMyWars {
    offensives: WebMyWar[];
    defensives: WebMyWar[];
    me: WebTarget;
    isFightingActives: boolean;
    soldier_cap: number;
    tank_cap: number;
    aircraft_cap: number;
    ship_cap: number;
    spy_cap: number;
}

export interface WebOptions {
    key_numeric?: number[];
    key_string?: string[];
    icon?: string[];
    text?: string[];
    subtext?: string[];
    color?: string[];
}

export interface WebSession {
    user?: string;
    user_name?: string;
    user_icon?: string;
    user_valid?: boolean;
    nation?: number;
    nation_name?: string;
    alliance?: number;
    alliance_name?: string;
    nation_valid?: boolean;
    expires: number;
    guild?: string;
    guild_name?: string;
    guild_icon?: string;
    registered?: boolean;
    registered_nation?: number;
}

export interface WebSuccess {
    success: boolean;
    message?: string;
}

export interface WebTable {
    errors?: WebTableError[];
    cells: any[][];
    renderers?: string[];
}

export interface WebTableError {
    col?: number;
    row?: number;
    msg: string;
}

export interface WebTarget {
    id: number;
    nation: string;
    alliance_id: number;
    alliance: string;
    avg_infra: number;
    cities: number;
    soldier: number;
    tank: number;
    aircraft: number;
    ship: number;
    missile: number;
    nuke: number;
    spies: number;
    position: number;
    active_ms: number;
    color_id: number;
    beige_turns: number;
    off: number;
    def: number;
    score: number;
    expected: number;
    actual: number;
    strength: number;
}

export interface WebViewCommand {
    uid: number;
    data: { [index: string]: any }[];
}

export interface WebTargets {
    targets: WebTarget[];
    include_strength: boolean;
    self: WebTarget;
}

export interface WebTransaction {
    tx_id: number;
    tx_datetime: number;
    sender_id: number;
    sender_type: number;
    receiver_id: number;
    receiver_type: number;
    banker_nation: number;
    note: string;
    resources: number[];
}

export interface WebTransferResult {
    status: string;
    status_msg: string;
    status_success: boolean;
    receiver_id: number;
    receiver_is_aa: boolean;
    receiver_name: string;
    messages: string[];
    amount: number[];
    note: string;
}

export interface WebUrl {
    url: string;
}

export interface WebValue {
    value: string;
}

export interface WebWarFinder {
}

export interface TaxExpenses {
    brackets: TaxExpenseBracket[];
    alliances: number[];
    requireGrant: boolean;
    requireExpiry: boolean;
    requireTagged: boolean;
}

export interface WebPermission {
    message: string;
    success: boolean;
}

export interface MultiResult {
    network: { [index: string]: NetworkRow };
    trade: SameNetworkTrade[];
    nationId: number;
    dateFetched: number;
    bans: { [index: string]: string };
    nationNames: { [index: string]: string };
    allianceNames: { [index: string]: string };
}

export interface NetworkRow {
    id: number;
    lastAccessFromSharedIP: number;
    numberOfSharedIPs: number;
    lastActiveMs: number;
    allianceId: number;
    dateCreated: number;
}

export interface SameNetworkTrade {
    sellingNation: number;
    buyingNation: number;
    dateOffered: number;
    resource: ResourceType;
    amount: number;
    ppu: number;
}

export interface AdvMultiReport {
    nationId: number;
    nation: string;
    allianceId: number;
    alliance: string;
    age: number;
    cities: number;
    discord: string;
    discord_linked: boolean;
    irl_verified: boolean;
    customization: number;
    banned: boolean;
    lastActive: number;
    percentOnline: number;
    dateFetched: number;
    rows: AdvMultiRow[];
}

export interface AdvMultiRow {
    id: number;
    Nation: string;
    alliance_id: number;
    alliance: string;
    age: number;
    cities: number;
    shared_ips: number;
    shared_percent: number;
    shared_nation_percent: number;
    same_ip: boolean;
    banned: boolean;
    login_diff: number;
    same_activity_percent: number;
    percentOnline: number;
    discord: string;
    discord_linked: boolean;
    irl_verified: boolean;
    customization: number;
}

export interface RunHistorySnapshot {
    startTimesMs: number[];
    durationsMs: number[];
    outcomeCodes: any;
}

export interface TaskSummary {
    id: number;
    name: string;
    createdAtMs: number;
    intervalMs: number;
    running: boolean;
    currentRunStartMs: number;
    lastRunStartMs: number;
    lastRunEndMs: number;
    lastRunDurationMs: number;
    lastOutcome: number;
    totalRuns: number;
    totalSuccess: number;
    totalErrors: number;
    totalInterrupts: number;
    consecutiveFailures: number;
    lastSuccessAtMs: number;
    lastFailureAtMs: number;
    lastErrorClass: string;
    lastErrorMessage: string;
}

export interface ErrorSample {
    fingerprint: number;
    throwableClass: string;
    message: string;
    stackTrace: string;
    firstSeenAtMs: number;
    lastSeenAtMs: number;
    count: number;
}

export interface TaskList {
    values: TaskSummary[];
}

export interface TaskDetails {
    found: boolean;
    summary: TaskSummary;
    errors: ErrorSample[];
    sinceMs: number;
    history: RunHistorySnapshot;
}

export interface ConflictAlliances {
    alliance_names: { [index: string]: string };
    conflict_alliances: { [index: string]: number[][] };
}

export interface WebVirtualConflict {
    id: string;
    name: string;
    category: string;
    date: number;
    end: number;
    wiki: string;
    cb: string;
    status: string;
    alliances: ConflictAlliances;
    posts: { [index: string]: any[][] };
}

export interface WebTaxBracket {
    taxId: number;
    dateFetched: number;
    allianceId: number;
    name: string;
    moneyRate: number;
    rssRate: number;
}

export type CacheType = "None" | "Cookie" | "LocalStorage" | "SessionStorage" | "Memory";

export type GraphType = "STACKED_BAR" | "SIDE_BY_SIDE_BAR" | "HORIZONTAL_BAR" | "LINE" | "STACKED_LINE" | "FILLED_LINE" | "SCATTER";

export type NationColor = "AQUA" | "BEIGE" | "BLACK" | "BLUE" | "BROWN" | "GRAY" | "GREEN" | "LIME" | "MAROON" | "OLIVE" | "ORANGE" | "PINK" | "PURPLE" | "RED" | "WHITE" | "YELLOW" | "MINT" | "LAVENDER" | "TURQUOISE" | "GOLD";

export type TimeFormat = "NUMERIC" | "DECIMAL_ROUNDED" | "SI_UNIT" | "TURN_TO_DATE" | "DAYS_TO_DATE" | "MILLIS_TO_DATE" | "SECONDS_TO_DATE";

export type TableNumberFormat = "SI_UNIT" | "PERCENTAGE_ONE" | "PERCENTAGE_100" | "DECIMAL_ROUNDED";

export type ResourceType = "MONEY" | "CREDITS" | "FOOD" | "COAL" | "OIL" | "URANIUM" | "LEAD" | "IRON" | "BAUXITE" | "GASOLINE" | "MUNITIONS" | "STEEL" | "ALUMINUM";

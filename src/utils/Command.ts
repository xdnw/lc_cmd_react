import { useQuery } from '@tanstack/react-query';
import { WebPermission } from './../lib/apitypes.d';
import {
    getCharFrequency,
    split
} from "./StringUtil";
import { COMMANDS } from "@/lib/commands.ts";
import type { CommandBehavior, JSONValue } from "@/lib/internaltypes";

export type IArgument = {
    name: string;
    optional?: boolean;
    flag?: string;
    desc?: string;
    group?: number;
    type: string;
    def?: string;
    choices?: string[];
    min?: number;
    max?: number;
    filter?: string;
}


export type ICommand = {
    help: string;
    desc: string;
    viewable?: boolean;
    groups?: string[];
    group_descs?: string[];
    annotations?: { [key: string]: (object | number | boolean | string) };
    arguments?: { [name: string]: IArgument };
    return_type?: string;
}

export type ICommandGroup = {
    [name: string]: ICommandGroup | ICommand;
}

export type IKeyData = {
    desc: string;
    examples?: string[] | null;
}

export type IOptionData = {
    options?: string[] | null;
    query?: boolean | null;
    completions?: boolean | null;
    guild?: boolean | null;
    nation?: boolean | null;
    user?: boolean | null;
    composite?: string[];
}

export type ISelector = (string | null)[];

export type IPlaceholder = {
    commands: ICommandGroup;
    selectors: ISelector[];
    columns?: string[];
    create?: ICommand;
}

export type ICommandMap = {
    commands: ICommandGroup;
    placeholders: { [name: string]: IPlaceholder };
    keys: { [name: string]: IKeyData };
    options: { [name: string]: IOptionData | string };
}

export type CommandPath<T> = T extends ICommandGroup
    ? { [K in keyof T]: [K] | [K, ...CommandPath<T[K]>] }[keyof T]
    : [];

export type AnyCommandPath = CommandPath<typeof COMMANDS.commands>;
export type AnyPlaceholderPath<T extends keyof typeof COMMANDS.placeholders> = CommandPath<typeof COMMANDS.placeholders[T]['commands']>;

export type CommandArguments<T, P extends string[]> = P extends [infer K, ...infer Rest]
    ? K extends keyof T
    ? Rest extends []
    ? T[K] extends ICommand
    ? { [key in keyof T[K]['arguments']]?: string }
    : never
    : CommandArguments<T[K], Extract<Rest, string[]>>
    : never
    : never;

export type CommandType<T, P extends string[]> = P extends [infer K, ...infer Rest]
    ? K extends keyof T
    ? Rest extends [] // Is it the last part of the path?
    ? T[K] extends ICommand // Is the item at the path an ICommand?
    ? T[K] // Yes, return the ICommand type
    : never // No, it's not an ICommand (might be another group), return never
    : CommandType<T[K], Extract<Rest, string[]>> // Not the last part, recurse into the subgroup
    : never // Key K not found in T
    : never; // Path P is empty

export class Argument {
    name: string;
    arg: IArgument;
    breakdown: TypeBreakdown | null = null;

    constructor(name: string, arg: IArgument) {
        this.name = name;
        this.arg = arg;
    }

    clone(): Argument {
        const clonedArg = Object.assign(Object.create(Object.getPrototypeOf(this.arg)), this.arg);
        return new Argument(this.name, clonedArg);
    }

    getKeyData(): IKeyData {
        return CM.data.keys[this.arg.type] ?? { desc: "", examples: null };
    }

    getTypeDesc(): string {
        return this.getKeyData().desc;
    }

    getExamples(): string[] {
        return this.getKeyData().examples || [];
    }

    getOptionData(): OptionData {
        const breakdown = this.getTypeBreakdown();
        let options: IOptionData | null = null;
        let multi = false;
        if ((breakdown.element === "Set" || breakdown.element === "TypedFunction" || breakdown.element === "Predicate") && breakdown.child !== null) {
            options = breakdown.child[0].getOptionData();
            multi = true;
        } else {
            options = breakdown.getOptionData();
        }
        if (options != null) {
            return new OptionData(CM, options, multi);
        }
        return new OptionData(CM, { options: null, query: false, completions: false, guild: false, nation: false, user: false }, false);
    }

    getTypeBreakdown(): TypeBreakdown {
        if (this.breakdown != null) return this.breakdown;
        return this.breakdown = getTypeBreakdown(CM, this.arg.type);
    }
}

class OptionData {
    options: string[] | undefined;
    query: boolean;
    completions: boolean;
    guild: boolean;
    nation: boolean;
    user: boolean;
    multi: boolean;
    map: CommandMap;
    composite: string[];

    constructor(map: CommandMap, data: IOptionData, multi: boolean) {
        this.map = map;
        this.options = data.options || undefined;
        this.query = data.query || false;
        this.completions = data.completions || false;
        this.guild = data.guild || false;
        this.nation = data.nation || false;
        this.user = data.user || false;
        this.multi = multi;
        this.composite = data.composite || [];
    }
}

export function getTypeBreakdown(ref: CommandMap, type: string): TypeBreakdown {
    let annotations: string | null = null;
    if (type.endsWith(']')) {
        const annotationStart = type.indexOf('[');
        annotations = type.substring(annotationStart + 1, type.length - 1);
        type = type.substring(0, annotationStart);
    }
    if (type.endsWith('>')) {
        const openBracket = type.indexOf('<');
        const childStr = split(type.substring(openBracket + 1, type.length - 1), ",");
        const element = type.substring(0, openBracket).trim();
        const child = childStr.map((childType) => getTypeBreakdown(ref, childType.trim()));
        return new TypeBreakdown(ref, element, annotations, child);
    } else {
        return new TypeBreakdown(ref, type, annotations, null);
    }
}

export class BaseCommand {
    command: ICommand;
    name: string;
    path: string[];
    arguments: Argument[] | null = null;
    charFreq: { [key: string]: number } | null = null;
    descWordFreq: Set<string> | null = null;
    descShort: string | null = null;
    pathStr: string | null = null;

    constructor(path: string[], commandData: ICommand) {
        this.command = commandData;
        this.name = path[path.length - 1];
        this.path = path;
    }

    hasRequiredArgument(): boolean {
        if (this.command.arguments) {
            for (const arg of Object.values(this.command.arguments)) {
                if (arg.optional !== true) return true;
            }
        }
        return false;
    }

    getDescShort(): string {
        if (this.descShort == null) {
            this.descShort = this.command.desc?.split("\n")[0] ?? ""; // Handle potentially undefined desc
        }
        return this.descShort;
    }

    getCharFrequency(): { [key: string]: number } {
        if (this.charFreq == null) this.charFreq = getCharFrequency(this.name);
        return this.charFreq;
    }

    getWordFrequency(): Set<string> {
        if (this.descWordFreq == null) {
            this.descWordFreq = new Set();
            if (this.command.desc) { // Handle potentially undefined desc
                this.command.desc.split(" ").forEach((word) => {
                    this.descWordFreq!.add(word.toLowerCase());
                });
            }
            for (const arg of this.getArguments()) {
                for (const child of arg.getTypeBreakdown().getAllChildren()) {
                    this.descWordFreq.add(child.toLowerCase());
                }
                if (arg.arg.desc) {
                    arg.arg.desc.split(/[\s_]+/).forEach((word) => {
                        this.descWordFreq!.add(word.toLowerCase());
                    });
                }
                this.descWordFreq.add(arg.name.toLowerCase());
            }
        }
        return this.descWordFreq;
    }

    getFullText(): string {
        return `${this.name} ${this.command.desc ?? ''}`; // Handle potentially undefined desc
    }

    getArguments(): Argument[] {
        if (this.arguments == null) {
            if (this.command.arguments) {
                this.arguments = Object.entries(this.command.arguments).map(([name, arg]) => new Argument(name, arg));
            } else {
                this.arguments = [];
            }
        }
        return this.arguments;
    }
    getPathString(): string {
        if (!this.pathStr) {
            this.pathStr = this.path.join(" ");
        }
        return this.pathStr;
    }
}

export class Command<P extends CommandPath<typeof COMMANDS.commands>> extends BaseCommand {
    path: P;
    data: Partial<CommandType<typeof COMMANDS.commands, P>>;

    constructor(path: P, data: Partial<CommandType<typeof COMMANDS.commands, P>>) {
        const commandData = data as ICommand; // Assume data is a valid ICommand structure
        super(path, commandData);
        this.path = path;
        this.data = data;
    }

    fullPath() {
        return this.path.join(" ");
    }
}
export class Placeholder<T extends keyof typeof COMMANDS.placeholders, P extends CommandPath<typeof COMMANDS.placeholders[T]['commands']>> extends BaseCommand {
    type: T;
    path: P;
    data: Partial<CommandType<typeof COMMANDS.placeholders, P>>;

    constructor(type: T, path: P, data: Partial<CommandType<typeof COMMANDS.placeholders[T]['commands'], P>>) {
        const commandData = data as ICommand;
        super(path, commandData);
        this.path = path;
        this.data = data;
        this.type = type;
    }
}

export type Completion = {
    placeholder_type: string,
    command?: ICommand,
    argument?: IArgument,
    options: {
        name: string,
        value: string
    }[]
}

export function commandMention<
    P extends CommandPath<typeof COMMANDS.commands>
>(
    { command, args }: {
        command: P,
        args: Partial<CommandArguments<typeof COMMANDS.commands, P>>
    }
): string {
    const cmdName = command.join(" ");
    let mention = `/${cmdName}`;
    for (const [argName, value] of Object.entries(args)) {
        if (value != null) {
            mention += ` ${argName}: ${value}`;
        }
    }
    return mention;
}

export function placeholderMention<
    T extends keyof typeof COMMANDS.placeholders,
    P extends CommandPath<typeof COMMANDS.placeholders[T]['commands']>
>(
    { type, command, args }: {
        type: T,
        command: P,
        args?: Partial<CommandArguments<typeof COMMANDS.placeholders[T]['commands'], P>>
    }
): string {
    const cmdName = command.join(" ");
    let mention = `{${cmdName}`;
    const entries = args ? Object.entries(args).filter(([, v]) => v != null) : [];
    if (entries.length > 0) {
        mention += "(" + entries.map(([argName, value]) => `${argName}: ${value as string}`).join(" ") + ")";
    }
    mention += "}";
    return mention;
}

export const STRIP_PREFIXES = ["get", "is", "can", "has"];

export class PlaceholderMap<T extends keyof typeof COMMANDS.placeholders> {
    name: T;
    data: typeof COMMANDS.placeholders[T];
    create: BaseCommand | undefined;
    ph_cache: Map<string, Placeholder<T, AnyPlaceholderPath<T>>> = new Map();

    constructor(name: T) {
        this.name = name;
        this.data = COMMANDS.placeholders[this.name];
    }

    get<P extends CommandPath<typeof this.data['commands']>>(path: P): Placeholder<T, P> {
        const pathFull = path.join(" ");
        const cached = this.ph_cache.get(pathFull);
        if (cached) return cached as Placeholder<T, P>;

        let current: ICommandGroup | ICommand = this.data['commands'];
        const pathAsStrArr = [...path] as string[];
        while (pathAsStrArr.length > 0) {
            current = (current as ICommandGroup)[pathAsStrArr[0]];
            pathAsStrArr.shift();
        }
        const cmd = current as Partial<CommandType<typeof this.data['commands'], P>>;
        const result = new Placeholder(this.name, path, cmd);
        this.ph_cache.set(pathFull, result);
        return result;
    }

    getCommands(): Placeholder<T, AnyPlaceholderPath<T>>[] {
        return this.getPlaceholderPaths().map(path => this.get(path));
    }


    getPlaceholderPaths(): CommandPath<typeof this.data['commands']>[] {
        const paths: CommandPath<typeof this.data['commands']>[] = [];
        const recurse = (group: ICommandGroup, prefix: string[]) => {
            Object.keys(group).forEach(key => {
                const value = group[key];
                // Cast the new prefix to the specific placeholder command path type
                const newPrefix = [...prefix, key] as CommandPath<typeof this.data['commands']>;
                if (isCommand(value)) {
                    paths.push(newPrefix);
                } else if (typeof value === 'object' && value !== null) { // Check if it's a nested group
                    recurse(value, newPrefix);
                }
            });
        };
        recurse(this.data['commands'], []);
        return paths;
    }

    searchPlaceholders(functionString: string) {
        const commands: ICommandGroup = this.data['commands'];
        const startsWith: { [key: string]: ICommand } = {};
        const completeMatch: { [key: string]: ICommand } = {};
        const funcStrLower = functionString.toLowerCase();
        for (const [key, value] of Object.entries(commands)) {
            if (key === funcStrLower) {
                completeMatch[key] = value as ICommand;
            } else if (key.startsWith(funcStrLower)) {
                startsWith[key] = value as ICommand;
            } else {
                for (const prefix of STRIP_PREFIXES) {
                    const prefixed = prefix + funcStrLower;
                    if (key === prefixed) {
                        completeMatch[key] = value as ICommand;
                    } else if (key.startsWith(prefixed)) {
                        startsWith[key] = value as ICommand;
                    }
                }
            }
        }
        return {
            completeMatch,
            startsWith
        };
    }

    getCommandsData(): typeof this.data['commands'] {
        return this.data['commands'];
    }

    getCreate(): BaseCommand | undefined {
        if (!this.create) {
            const create = (this.data as IPlaceholder).create;
            if (create) {
                this.create = new BaseCommand([this.name], create);
            }
        }
        return this.create;
    }

    array(): PlaceholderArrayBuilder<T> {
        return new PlaceholderArrayBuilder(this.name);
    }

    aliased(): PlaceholderObjectBuilder<T> {
        return new PlaceholderObjectBuilder(this.name);
    }
}

export class PlaceholderObjectBuilder<
    T extends keyof typeof COMMANDS.placeholders,
    R extends Record<string, JSONValue> = {}
> {
    private readonly type: T;
    private readonly placeholders: string[] = [];
    private readonly indexes: Map<string, number> = new Map();
    private readonly indexToAlias: Map<number, string> = new Map();

    constructor(type: T) {
        this.type = type;
    }

    addRaw<A extends string>(
        placeholder: string,
        alias: A
    ): PlaceholderObjectBuilder<T, R & Record<A, JSONValue>> {
        this.indexes.set(alias, this.placeholders.length);
        this.indexToAlias.set(this.placeholders.length, alias);
        this.placeholders.push(placeholder);
        return this as unknown as PlaceholderObjectBuilder<T, R & Record<A, JSONValue>>;
    }

    add<
        C extends keyof typeof COMMANDS.placeholders[T]['commands'],
        A extends string
    >(
        { cmd, args, alias }: {
            cmd: C,
            args?: typeof COMMANDS.placeholders[T]['commands'][C] extends { arguments: infer Args }
            ? { [key in keyof Args]?: string }
            : never,
            alias: A
        }
    ): PlaceholderObjectBuilder<T, R & Record<A, JSONValue>> {
        let str;
        if (args) {
            str = ("{" + (cmd as string) + "(" + Object.entries(args).map(([key, value]) => key + ": " + (value as string)).join(" ") + ")}");
        } else {
            str = ("{" + (cmd as string) + "}");
        }
        this.indexes.set(alias, this.placeholders.length);
        this.indexToAlias.set(this.placeholders.length, alias);
        this.placeholders.push(str);
        return this as unknown as PlaceholderObjectBuilder<T, R & Record<A, JSONValue>>;
    }

    shorten(): PlaceholderObjectBuilder<T, R> {
        for (let i = 0; i < this.placeholders.length; i++) {
            const value = this.placeholders[i];
            const newValue = value.replace(/^\{(get|is|can|has)/, "{");
            this.placeholders[i] = newValue;
            this.indexes.delete(value);
            this.indexes.set(newValue, i);
            this.indexToAlias.set(i, newValue);
        }
        return this;
    }

    array(): string[] {
        return [...this.placeholders];
    }

    aliasedArray(): (string | [string, string])[] {
        // Use the reverse mapping for direct lookups
        return this.placeholders.map((placeholder, index) => {
            const alias = this.indexToAlias.get(index);
            return alias ? [placeholder, alias] : placeholder;
        });
    }

    // Create a typed wrapper for the row data
    createRowAdapter<V = any>(row: V[]): R {
        const handler: ProxyHandler<object> = {
            get: (target: object, prop: string | symbol, receiver: any) => {
                if (typeof prop === 'string') {
                    const index = this.indexes.get(prop);
                    if (index !== undefined) {
                        return row[index];
                    }
                }
                return undefined;
            }
        };

        return new Proxy({}, handler) as R;
    }
}

export class PlaceholderArrayBuilder<T extends keyof typeof COMMANDS.placeholders> {
    private readonly type: T;
    private data: (string | [string, string])[];

    constructor(type: T) {
        this.type = type;
        this.data = [];
    }

    addRaw(placeholder: string, alias?: string) {
        if (alias) {
            this.data.push([placeholder, alias]);
        } else {
            this.data.push(placeholder);
        }
        return this;
    }
    addMultipleRaw(data: (string | [string, string])[]) {
        this.data.push(...data);
        return this;
    }

    // iterate over a provided object and add according to the function
    add<C extends keyof typeof COMMANDS.placeholders[T]['commands']>(
        { cmd, args, alias }: {
            cmd: C,
            args?: typeof COMMANDS.placeholders[T]['commands'][C] extends { arguments: infer A }
            ? { [key in keyof A]?: string }
            : never, alias?: string
        }
    ): this {
        let str;
        if (args) {
            str = ("{" + (cmd as string) + "(" + Object.entries(args).map(([key, value]) => key + ": " + (value as string)).join(" ") + ")}");
        } else {
            str = ("{" + (cmd as string) + "}");
        }
        if (alias) {
            this.data.push([str, alias]);
        } else {
            this.data.push(str);
        }
        return this;
    }

    shorten() {
        // STRIP_PREFIXES
        for (let i = 0; i < this.data.length; i++) {
            const item = this.data[i];
            if (Array.isArray(item)) continue;
            this.data[i] = item.replace(/^\{(get|is|can|has)/, "");
        }
        return this;
    }

    build2d() {
        return this.data;
    }

    build(): string[] {
        return this.data.map((item) => Array.isArray(item) ? item.join(";") : item);
    }
}

export class CommandMap {
    data: ICommandMap;
    cmd_paths: CommandPath<typeof COMMANDS.commands>[] = [];

    cmd_cache: Map<string, Command<AnyCommandPath>> = new Map();
    ph_cache: Map<string, PlaceholderMap<keyof typeof COMMANDS.placeholders>> = new Map();

    constructor(commands: ICommandMap) {
        this.data = commands;
    }

    placeholders<G extends keyof typeof COMMANDS.placeholders>(type: G): PlaceholderMap<G> {
        const cached = this.ph_cache.get(type);
        if (cached) return cached as unknown as PlaceholderMap<G>; // Cast to unknown first
        const phMap = new PlaceholderMap(type);
        this.ph_cache.set(type, phMap as unknown as PlaceholderMap<keyof typeof COMMANDS.placeholders>);
        return phMap;
    }

    get<P extends CommandPath<typeof COMMANDS.commands>>(path: P): Command<P> {
        const pathFull = path.join(" ");
        const cached = this.cmd_cache.get(pathFull);
        if (cached) return cached as Command<P>;

        let current: ICommandGroup | ICommand = this.data.commands;
        const pathAsStrArr = [...path] as string[];
        while (pathAsStrArr.length > 0) {
            current = (current as ICommandGroup)[pathAsStrArr[0]];
            pathAsStrArr.shift();
        }
        const cmd = current as Partial<CommandType<typeof COMMANDS.commands, P>>;
        const result = new Command(path, cmd);
        this.cmd_cache.set(pathFull, result);
        return result;
    }

    // getPlaceholderCommands(placeholder_type: keyof typeof COMMANDS.placeholders): { [key: string]: Command<AnyCommandPath> } {
    //     if (this.ph_flat[placeholder_type] == null && this.data.placeholders[placeholder_type]) {
    //         this.ph_flat[placeholder_type] = this.flattenCommands(this.data.placeholders[placeholder_type].commands);
    //     }
    //     return this.ph_flat[placeholder_type];
    // }

    getCommandPaths(): CommandPath<typeof COMMANDS.commands>[] {
        if (this.cmd_paths.length > 0) return this.cmd_paths;
        const recurse = (group: ICommandGroup, prefix: string[]) => {
            Object.keys(group).forEach(key => {
                const value = group[key];
                const newPrefix = [...prefix, key] as CommandPath<typeof COMMANDS.commands>;
                if (isCommand(value)) {
                    this.cmd_paths.push(newPrefix);
                } else {
                    recurse(value, newPrefix);
                }
            });
        };
        recurse(this.data.commands, []);
        return this.cmd_paths;
    }

    getCommands(): Command<AnyCommandPath>[] {
        return this.getCommandPaths().map(path => this.get(path));
    }

    getPlaceholderTypes(toSimpleName: boolean): Array<keyof typeof COMMANDS.placeholders> {
        const result = Object.keys(this.data.placeholders);
        if (toSimpleName) {
            return result.map((type) => toPlaceholderName(type)) as Array<keyof typeof COMMANDS.placeholders>;
        }
        return result as Array<keyof typeof COMMANDS.placeholders>;
    }

    builder(name: string): CommandBuilder {
        return new CommandBuilder(name, this);
    }

    buildTest(): BaseCommand {
        const allArgs: { [key: string]: IArgument } = {};
        for (const path of this.getCommandPaths()) {
            const command = this.get(path);
            if (command.command.arguments) {
                Object.values(command.command.arguments).forEach((arg) => {
                    if (!allArgs[arg.type]) {
                        allArgs[arg.type] = arg;
                    }
                });
            }
        }

        const builder = this.builder("test");
        builder.help("This is a test command")
            .desc("This is a test description");

        // add all the arguments to the command
        Object.entries(allArgs).forEach(([key, arg]) => {
            builder.argument(key, arg.optional == null ? false : arg.optional, arg.desc ?? "", arg.type, arg.def, arg.choices, arg.filter);
        });
        return builder.build();

    }
}

export class CommandBuilder {
    command: ICommand;
    name: string;
    parent: CommandMap;

    constructor(name: string, map: CommandMap) {
        this.command = {
            help: "",
            desc: "",
            groups: [],
            group_descs: [],
            annotations: {},
            arguments: {}
        };
        this.name = name;
        this.parent = map;
    }

    help(help: string): CommandBuilder {
        this.command.help = help;
        return this;
    }

    desc(desc: string): CommandBuilder {
        this.command.desc = desc;
        return this;
    }

    argument(name: string, optional: boolean = false, desc: string, type: string, def?: string, choices?: string[], filter?: string): CommandBuilder {
        const arg: IArgument = {
            name,
            optional,
            flag: undefined,
            desc,
            group: undefined,
            type,
            def: def,
            choices,
            min: undefined,
            max: undefined,
            filter
        };
        if (!this.command.arguments) this.command.arguments = {};
        this.command.arguments[name] = arg;
        return this;
    }

    build(): BaseCommand {
        console.log("Building command:", this.name, this.command);
        return new BaseCommand([this.name], this.command)
    }
}

function isCommand(obj: ICommandGroup | ICommand): obj is ICommand {
    return (obj as ICommand).help !== undefined && (obj as ICommand).desc !== undefined;
}

export class TypeBreakdown {
    map: CommandMap;
    element: string;
    annotations: string | null;
    child: TypeBreakdown[] | null;

    constructor(map: CommandMap, element: string, annotations: string | null, child: TypeBreakdown[] | null) {
        this.map = map;
        this.element = element;
        this.annotations = annotations;
        this.child = child;
    }

    getAllChildren(): string[] {
        if (this.child == null) return [this.element];
        return this.child.flatMap((child) => child.getAllChildren());
    }

    getPlaceholderTypeName(): string {
        if (this.child != null && this.child.length == 1) {
            return this.child[0].getPlaceholderTypeName();
        }
        return toPlaceholderName(this.element);
    }

    toJSON() {
        return {
            element: this.element,
            annotations: this.annotations,
            child: this.child,
        };
    }

    getPlaceholder(): IPlaceholder | null {
        if (this.child == null || this.element === "Map") return null;
        // const phName = this.getPlaceholderTypeName();
        // console.log("phName" + phName);
        return this.map.data.placeholders[this.child[0].element];
    }

    getOptionData(): OptionData {
        let options: IOptionData | null = null;
        let multi = false;
        if ((this.element === "Set" || this.element === "TypedFunction" || this.element === "Predicate") && this.child !== null) {
            options = resolveOptionData(this.child[0].element);
            multi = true;
        } else {
            options = resolveOptionData(this.element);
        }
        if (options) {
            return new OptionData(this.map, options, multi);
        }
        return new OptionData(this.map, { options: null, query: false, completions: false, guild: false, nation: false, user: false }, false);
    }
}

function resolveOptionData(type: string) {
    const options = CM.data.options[type];
    if (typeof options === "string") {
        return resolveOptionData(options);
    }
    return options;
}

export function toPlaceholderName(type: string): string {
    return type.replace("DB", "").replace("Wrapper", "").replace(/[0-9]/g, "");
}

// Constants
export const CM = new CommandMap(COMMANDS as unknown as ICommandMap);

export const COMMAND_BEHAVIOR: { [key: string]: CommandBehavior } = {
    "": "DELETE_MESSAGE",
    "~": "UNPRESS",
    "_": "DELETE_BUTTONS",
    ".": "DELETE_PRESSED_BUTTON",
    "=": "EPHEMERAL",
}

export function getCommandAndBehavior(cmd: string): { behavior: CommandBehavior, command: string, args: { [key: string]: string } } {
    let char0 = cmd.charAt(0);
    if (char0 === "{") char0 = "";
    const commandAndArgs: { [key: string]: string } = JSON.parse(cmd.substring(char0.length)) as { [key: string]: string };
    const command: string = commandAndArgs[""];
    // args is everything else, except the "" key
    const args = commandAndArgs;
    delete args[""];
    return { behavior: COMMAND_BEHAVIOR[char0], command, args };
}
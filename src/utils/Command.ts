import { commandCompletions } from "./CompletionUtil";
import { CommandWeights, Sentence } from "./Embedding";
import {
    findMatchingBracket,
    findMatchingQuoteOrBracket,
    getCharFrequency,
    isQuoteOrBracket,
    split, splitCustom
} from "./StringUtil";

export type IArgument = {
    name: string;
    optional: boolean | null;
    flag: string | null;
    desc: string;
    group: number | null;
    type: string;
    default: string | null;
    choices: string[] | null;
    min: number | null;
    max: number | null;
    filter: string | null;
}
  
export type ICommand = {
    help: string;
    desc: string;
    groups: string[];
    group_descs: string[];
    annotations: { [key: string]: object };
    arguments: { [name: string]: IArgument };
    return_type?: string;
}

export type ICommandGroup = {
    [name: string]: ICommandGroup | ICommand;
}

export type IKeyData = {
    desc: string;
    examples: string[] | null;
}
  
export type IOptionData = {
    options: string[] | null;
    query: boolean | null;
    completions: boolean | null;
    guild: boolean | null;
    nation: boolean | null;
    user: boolean | null;
}

export type ISelector = [string, string, string];

export type IPlaceholder = {
    commands: ICommandGroup;
    selectors: ISelector[];
    columns?: string[];
}
  
export type ICommandMap = {
    commands: ICommandGroup;
    placeholders: { [name: string]: IPlaceholder };
    keys: { [name: string]: IKeyData };
    options: { [name: string]: IOptionData };
}

export class Argument {
    name: string;
    arg: IArgument;
    command: Command;
    breakdown: TypeBreakdown | null = null;
    
    constructor(name: string, arg: IArgument, command: Command) {
        this.name = name;
        this.arg = arg;
        this.command = command;
    }

    getMap(): CommandMap {
        return this.command.ref;
    }

    clone(): Argument {
        const clonedArg = Object.assign(Object.create(Object.getPrototypeOf(this.arg)), this.arg);
        return new Argument(this.name, clonedArg, this.command);
    }

    getKeyData(): IKeyData {
        const result = this.command.ref.data.keys[this.arg.type];
        if (result == null) {
            return {desc: "", examples: null};
        }
        return result;
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
            return new OptionData(this.command.ref, options, multi);
        }
        return new OptionData(this.command.ref, {options: null, query: false, completions: false, guild: false, nation: false, user: false}, false);
    }

    getTypeBreakdown(): TypeBreakdown {
        if (this.breakdown != null) return this.breakdown;
        return this.breakdown = getTypeBreakdown(this.command.ref, this.arg.type);
    }
}

class OptionData {
    options: string[] | null;
    query: boolean;
    completions: boolean;
    guild: boolean;
    nation: boolean;
    user: boolean;
    multi: boolean;
    map: CommandMap;

    constructor(map: CommandMap, data: IOptionData, multi: boolean) {
        this.map = map;
        this.options = data.options;
        this.query = data.query || false;
        this.completions = data.completions || false;
        this.guild = data.guild || false;
        this.nation = data.nation || false;
        this.user = data.user || false;
        this.multi = multi;
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

export class Command {
    command: ICommand;
    name: string;
    ref: CommandMap;
    arguments: Argument[] | null = null;
    charFreq: { [key: string]: number } | null = null;
    descWordFreq: Set<string> | null = null;
    descShort: string | null = null;

    getDescShort(): string {
        if (this.descShort == null) {
            this.descShort = this.command.desc.split("\n")[0];
        }
        return this.descShort;
    }
    
    constructor(name: string, command: ICommand, ref: CommandMap) {
        this.command = command;
        this.name = name;
        this.ref = ref;
    }

    getCharFrequency(): { [key: string]: number } {
        if (this.charFreq == null) this.charFreq = getCharFrequency(this.name);
        return this.charFreq;
    }

    getWordFrequency(): Set<string> {
        if (this.descWordFreq == null) {
            this.descWordFreq = new Set();
            this.command.desc.split(" ").forEach((word) => {
                this.descWordFreq!.add(word.toLowerCase());
            });
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
        return `${this.name} ${this.command.desc}`;
    }

    toSentence(weights: CommandWeights): Sentence {
        const weight = weights[this.name];
        return weight && {
            text: this.getFullText(),
            vector: weight.vector
        };
    }

    getArguments(): Argument[] {
        if (this.arguments == null) {
            if (this.command.arguments) {
                this.arguments = Object.entries(this.command.arguments).map(([name, arg]) => new Argument(name, arg, this));
            } else {
                this.arguments = [];
            }
        }
        return this.arguments;
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

export const STRIP_PREFIXES = ["get", "is", "can", "has"];

export class CommandMap {
    data: ICommandMap;
    flat: { [key: string]: Command } | null = null;
    ph_flat: {[key: string]: {[key: string]: Command}} = {};

    constructor(commands: ICommandMap) {
        this.data = commands;
    }

    private flattenCommands(group: ICommandGroup) {
        const result: { [key: string]: Command } = {};
        const recurse = (sub: ICommandGroup, prefix: string) => {
            Object.keys(sub).forEach(key => {
                const value = sub[key];
                const newKey: string = prefix ? `${prefix} ${key}` : key;
                if (isCommand(value)) {
                    result[newKey] = new Command(newKey, value as ICommand, this);
                } else {
                    recurse(value, newKey);
                }
            });
        };
        recurse(group, "");
        return result;
    }

    getPlaceholderCommands(placeholder_type: string): {[key: string]: Command} {
        if (this.ph_flat[placeholder_type] == null && this.data.placeholders[placeholder_type]) {
            this.ph_flat[placeholder_type] = this.flattenCommands(this.data.placeholders[placeholder_type]);
        }
        return this.ph_flat[placeholder_type];
    }

    getCommands(): {[key: string]: Command} {
        if (this.flat == null) this.flat = this.flattenCommands(this.data.commands);
        return this.flat;
    }

    getPlaceholderTypes(toSimpleName: boolean): string[] {
        const result = Object.keys(this.data.placeholders);
        if (toSimpleName) {
            return result.map((type) => toPlaceholderName(type));
        }
        return result;
    }

    get(text: string): Command {
        const commands = this.getCommands();
        return commands[text];
    }

    builder(name: string): CommandBuilder {
        return new CommandBuilder(name, this);
    }

    buildTest(): Command {
        const allArgs: {[key: string]: IArgument} = {};
        Object.values(this.getCommands()).forEach((cmd) => {
            if (!cmd.command.arguments) {
                return;
            }
            Object.values(cmd.command.arguments).forEach((arg) => {
                if (!allArgs[arg.type]) {
                    allArgs[arg.type] = arg;
                }
            });
        });

        const builder = this.builder("test");
        builder.help("This is a test command")
            .desc("This is a test description");

        // add all the arguments to the command
        Object.entries(allArgs).forEach(([key, arg]) => {
            builder.argument(key, arg.optional == null ? false : arg.optional, arg.desc, arg.type, arg.default, arg.choices, arg.filter);
        });
        return builder.build();
    }

    searchPlaceholders(placeholder_type: string, functionString: string) {
        const commands: ICommandGroup = this.data.placeholders[placeholder_type];
        const startsWith: {[key: string]: ICommand} = {};
        const completeMatch: {[key: string]: ICommand} = {};
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

    getPlaceholderCommand(placeholder_type: string, functionString: string) {
        const result = this.searchPlaceholders(placeholder_type, functionString);
        return Object.keys(result.completeMatch).length > 0 ? result.completeMatch[Object.keys(result.completeMatch)[0]] : undefined;
    }

    getCurrentlyTypingCommand(parent: Command | null, content: string, token: string, caretPosition: number, placeholder_type: string): Completion {
        // find the index of the first non valid function character
        let endOfFunction = content.search(/[^a-zA-Z0-9_$]/);
        if (endOfFunction == -1) endOfFunction = content.length;
        let endOfFunctionAndArgs = endOfFunction;
        const functionString = content.substring(0, endOfFunction);
        // check if the next character is a bracket
        const nextChar = content.charAt(endOfFunction);
        let functionContent = "";
        let hasFuncContent = false;

        if (nextChar === "(") {
            hasFuncContent = true;
            // get the bracket end using the bracket matching function StringUtils.findMatchingBracket
            const bracketEnd = findMatchingBracket(content, endOfFunction);
            // if its not -1
            if (bracketEnd !== -1) {
                console.log("Bracket end " + bracketEnd);
                functionContent = content.substring(endOfFunction + 1, bracketEnd);
                endOfFunctionAndArgs = bracketEnd + 1;
            } else {
                // suggest arguments
                console.log("No matching bracket found")
            }
        }
        const search = this.searchPlaceholders(placeholder_type, functionString);
        const command = Object.keys(search.completeMatch).length > 0 ? search.completeMatch[Object.keys(search.completeMatch)[0]] : undefined;

        console.log("F: " + functionString + " | C:" + functionContent);

        if (caretPosition > endOfFunctionAndArgs) {
            const endChar = content.charAt(endOfFunctionAndArgs)
            if (command && endChar == ".") {
                if (command) {
                    const type = command.return_type as string;
                    const breakdown = getTypeBreakdown(this, type);
                    if (breakdown.element === "Map") {
                        // options
                        return {
                            placeholder_type: placeholder_type,
                            options: [{
                                name: "HANDLE MAP " + command.return_type,
                                value: "HELLO WORLD"
                            }]
                        };
                    }
                    return {
                        placeholder_type: placeholder_type,
                        options: [{
                            name: "HANDLE SUBCOMMAND " + command.return_type + " | " + breakdown.child[0].element,
                            value: "HELLO WORLD"
                        }]
                    };
                }
            }
            console.log("Caret past function " + caretPosition + " " + endOfFunctionAndArgs)
            return {
                placeholder_type: placeholder_type,
                options: [{
                    name: "CARET PAST FUNCTION",
                    value: "HELLO WORLD"
                }]
            };
        }

        // if caret position is the bracket, suggest the arguments
        if (hasFuncContent) {
            if (caretPosition === endOfFunctionAndArgs) {
                return {
                    placeholder_type: placeholder_type,
                    options: [{
                        name: "END-BRACKET",
                        value: "HELLO WORLD"
                    }]
                };
                // is end bracket
            } else if (caretPosition > endOfFunction) {
                // get command
                if (command) {
                    return getCurrentlyTypingArg(command, functionContent, caretPosition - endOfFunction - 1, placeholder_type);
                } else {
                    return {
                        command: command,
                        placeholder_type: placeholder_type,
                        options: [{
                            name: "ARGS, UNKNOWN COMMAND " + functionString,
                            value: "HELLO WORLD"
                        }]
                    };
                }
            } else if (caretPosition === endOfFunction) {
                return {
                    command: command,
                    placeholder_type: placeholder_type,
                    options: [{
                        name: "START-BRACKET",
                        value: "HELLO WORLD"
                    }]
                };
            } else {
                // is function part
                return {
                    command: command,
                    placeholder_type: placeholder_type,
                    options: [{
                        name: "MID-FUNC-HAS-ARGS",
                        value: "HELLO WORLD"
                    }]
                };
            }
        } else if (caretPosition == endOfFunction) {
            if (command) {
                return {
                    placeholder_type: placeholder_type,
                    command: command,
                    options: [{
                        name: "COMPLETE-MATCH",
                        value: "HELLO WORLD"
                    }]
                };
            } else if (Object.keys(search.startsWith).length > 0) {
                let valPrefix = "#";
                // if token contains # then prefix is all the characters up to and including the LAST #
                if (token.indexOf("#") !== -1) {
                    valPrefix = token.substring(0, token.lastIndexOf("#") + 1);
                }
                return {
                    placeholder_type: placeholder_type,
                    options: commandCompletions(search.startsWith, valPrefix)
                };
            } else {
                return {
                    placeholder_type: placeholder_type,
                    options: [{
                        name: "END-FUNC-NO-ARGS-NO-MATCH",
                        value: "HELLO WORLD"
                    }]
                };
            }
        } else {
            if (caretPosition <= endOfFunction) {
                return {
                    placeholder_type: placeholder_type,
                    command: command,
                    options: [{
                        name: "MID-FUNC-NO_ARGS",
                        value: "HELLO WORLD"
                    }]
                };
            } else {
                return {
                    placeholder_type: placeholder_type,
                    command: command,
                    options: [{
                        name: "AFTER-FUNC-NO-ARGS",
                        value: "HELLO WORLD"
                    }]
                };
            }
        }
    }
    
    getCurrentlyTypingFunction(content: string, token: string, caretPosition: number, placeholder_type: string): Completion {
        if (isQuoteOrBracket(content.charAt(0)) && findMatchingQuoteOrBracket(content, 0) == content.length - 1) {
            console.log("Content is quote or bracket");
            return this.getCurrentlyTypingFunction(content.substring(1, content.length - 1), token, caretPosition - 1, placeholder_type);
        }
        const components = splitCustom(content, (f, i) => {
            console.log("Find " + content.substring(i))
            if (f.startsWith(",", i)) return 1;
            if (f.startsWith("||", i)) return 2;
            if (f.startsWith("&&", i)) return 2;
            if (f.startsWith("|", i)) return 1;
            if (f.startsWith("&", i)) return 1;
            if (f.startsWith(">=", i)) return 2;
            if (f.startsWith("<=", i)) return 2;
            if (f.startsWith("!=", i)) return 2;
            if (f.startsWith("=", i)) return 1;
            if (f.startsWith(">", i)) return 1;
            if (f.startsWith("<", i)) return 1;
            return -1;
        }, Number.MAX_SAFE_INTEGER);

        let lastIndex = 0;
        for (const item of components) {
            let substring = item.content.trim();
            if (!substring) continue;

            let start = content.indexOf(substring, lastIndex + item.offset + item.delimiter.length);
            if (start == -1) {
                throw new Error("Could not find component in content `" + item.content + "` `" + content + "` | " + lastIndex + " | " + item.offset + " | " + item.delimiter);
            }
            lastIndex = start + substring.length + item.offset;
            const end = start + substring.length + item.offset;

            console.log("Substring " + substring + " | " + start + " | " + end + " | " + caretPosition);
            if (isQuoteOrBracket(substring.charAt(0)) && findMatchingQuoteOrBracket(substring, 0) == substring.length - 1) {
                console.log("Substring is quote or bracket");
                return this.getCurrentlyTypingFunction(substring.substring(1, substring.length - 1), token, caretPosition - start - 1, placeholder_type);
            }
            if (substring.startsWith("#")) {
                substring = substring.substring(1);
                start++;
            }
            if (start > caretPosition) {
                return {
                    placeholder_type: placeholder_type,
                    options: [{
                        name: "NO-RESULT (2)",
                        value: "HELLO WORLD"
                    }]
                };
            }

            if (caretPosition > end) {
                continue;
            }
            console.log("Find at " + substring + " | " + (caretPosition - start) + " | " + caretPosition + " | " + start)
            const completion = this.getCurrentlyTypingCommand(null, substring, token, caretPosition - start, placeholder_type);
            if (completion != null) return completion;
            return {
                placeholder_type: placeholder_type,
                options: [{
                    name: "NO-RESULT (3)",
                    value: "HELLO WORLD"
                }]
            };        }
        return {
            placeholder_type: placeholder_type,
            options: [{
                name: "NO-RESULT",
                value: "HELLO WORLD"
            }]
        };
    }
}

function getCurrentlyTypingArg(command: ICommand, functionContent: string, caretPosition: number, placeholder_type: string): Completion {
    // 1: typing an argument name
    // 2: typing an argument value
    // 3: space or comma (and optional space) and about to type an argument name
    const entries = command.arguments ? Object.entries(command.arguments) : [];
    let argCommaI = 0;
    let lastNamedArgI = 0;
    let lastUnnamedArgI = 0;
    let lastArg: IArgument | null = null;

    for (let j = 0; j < functionContent.length; j++) {
        const char = functionContent.charAt(j);
        if (isQuoteOrBracket(char)) {
            const jEnd = findMatchingQuoteOrBracket(functionContent, j);
            if (jEnd != -1) {
                if (jEnd > caretPosition) {
                    // todo return
                } else if (jEnd == caretPosition) {
                    // todo return
                }
                j = jEnd;
                continue;
            }
        }
        switch (char) {
            case ":": {
                for (const [key, value] of Object.entries(command.arguments)) {
                    if (functionContent.endsWith(key, j)) {
                        if (j >= caretPosition) {
                            if (j - key.length - 1 <= caretPosition) {
                                return {
                                    placeholder_type: placeholder_type,
                                    argument: command.arguments[key],
                                    options: [{
                                        name: "ARG KEY " + key + " | " + j + " | " + caretPosition,
                                        value: "HELLO WORLD"
                                    }]
                                };
                            } else {
                                const argContent = functionContent.substring(lastNamedArgI, j - key.length - 1);
                                if (lastArg) {
                                    return {
                                        placeholder_type: placeholder_type,
                                        argument: command.arguments[key],
                                        options: [{
                                            name: "Arg value, new arg specified " + lastArg.name + " | " + argContent,
                                            value: "HELLO WORLD"
                                        }]
                                    };
                                } else {
                                    return {
                                        placeholder_type: placeholder_type,
                                        argument: command.arguments[key],
                                        options: [{
                                            name: "Arg value, new arg specified, previous arg invalid " + " | " + argContent,
                                            value: "HELLO WORLD"
                                        }]
                                    };
                                }
                            }
                        } else if (j + 1 == caretPosition) {
                            return {
                                placeholder_type: placeholder_type,
                                argument: command.arguments[key],
                                options: [{
                                    name: "Arg key end colon " + key + " | " + lastArg,
                                    value: "HELLO WORLD"
                                }]
                            };
                        }
                        lastArg = value;
                        lastNamedArgI = j + 1;
                    }
                }
                break;
            }
            case ",": {
                if (!lastArg && entries.length > 1) {
                    if (j >= caretPosition) {
                        const argContent = functionContent.substring(lastUnnamedArgI, j - 1);
                        // chec kif argCommaI is greater than number of args?
                        if (argCommaI >= entries.length) {
                            return {
                                placeholder_type: placeholder_type,
                                options: [{
                                    name: "NO MORE AVAILABLE ARGS " + argContent,
                                    value: "HELLO WORLD"
                                }]
                            };
                        }
                        const arg = entries[argCommaI][1];
                        return {
                            placeholder_type: placeholder_type,
                            argument: arg,
                            options: [{
                                name: "ARG value, comma " + arg.name + " | " + argContent,
                                value: "HELLO WORLD"
                            }]
                        };

                    }
                    argCommaI++;
                    lastUnnamedArgI = j + 1;
                }
                break;
            }
        }
    }
    if (lastArg) {
        const argContent = functionContent.substring(lastNamedArgI);
        return {
            placeholder_type: placeholder_type,
            argument: lastArg,
            options: [{
                name: "Arg value/end bracket " + lastArg.name + " | " + argContent,
                value: "HELLO WORLD"
            }]
        };
    }
    const argContent = functionContent.substring(lastUnnamedArgI, functionContent.length);
    if (argCommaI < entries.length) {
        const arg = entries[argCommaI][1];
        return {
            placeholder_type: placeholder_type,
            argument: arg,
            options: [{
                name: "Arg value/end bracket unnamed " + argContent,
                value: "HELLO WORLD"
            }]
        };
    }
    return {
        placeholder_type: placeholder_type,
        options: [{
            name: "NO RESULTS?? " + functionContent,
            value: "HELLO WORLD"
        }]
    };
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

    argument(name: string, optional: boolean = false, desc: string, type: string, def: string | null, choices: string[] | null, filter: string | null): CommandBuilder {
        const arg: IArgument = {
            name,
            optional,
            flag: null,
            desc,
            group: null,
            type,
            default: def,
            choices,
            min: null,
            max: null,
            filter
        };
        this.command.arguments[name] = arg;
        return this;
    }

    build(): Command {
        return new Command(this.name, this.command, this.parent)
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

    getPlaceholder(): ICommandGroup | null {
        if (this.child == null || this.element === "Map") return null;
        // const phName = this.getPlaceholderTypeName();
        // console.log("phName" + phName);
        return this.map.data.placeholders[this.child[0].element];
    }

    getOptionData(): OptionData {
        let options: IOptionData | null = null;
        let multi = false;
        if ((this.element === "Set" || this.element === "TypedFunction" || this.element === "Predicate") && this.child !== null) {
            options = this.map.data.options[this.child[0].element];
            multi = true;
        } else {
            options = this.map.data.options[this.element];
        }
        if (options != null) {
            return new OptionData(this.map, options, multi);
        }
        return new OptionData(this.map, {options: null, query: false, completions: false, guild: false, nation: false, user: false}, false);
    }
}

function toPlaceholderName(type: string): string {
    return type.replace("DB", "").replace("Wrapper", "").replace(/[0-9]/g, "");
}
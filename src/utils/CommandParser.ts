import { Argument, BaseCommand } from "./Command";

export type CommandParseResult = {
    values: { [key: string]: string } | null;
    error?: string;
    errorCode?: "unknown-args" | "no-arguments";
    unknownArgs?: string[];
    matchedCommandReference?: string;
};

function matchesCommandReference(text: string, reference: string): boolean {
    if (text.length < reference.length) {
        return false;
    }

    if (text.slice(0, reference.length).toLowerCase() !== reference.toLowerCase()) {
        return false;
    }

    return text.length === reference.length || /\s/.test(text.charAt(reference.length));
}

function getMatchedCommandReference(command: BaseCommand, input: string): string | null {
    const text = input.trim();
    if (!text) {
        return null;
    }

    const cmdName = command.name;
    const cmdPath = command.getPathString();
    const references = [
        `/${cmdPath}`,
        cmdPath,
        `/${cmdName}`,
        cmdName,
    ];

    for (const reference of references) {
        if (matchesCommandReference(text, reference)) {
            return reference;
        }
    }

    return null;
}

export function parseCommandString(
    command: BaseCommand,
    input: string
): { [key: string]: string } | null {
    return parseCommandStringDetailed(command, input).values;
}

export function parseCommandStringDetailed(
    command: BaseCommand,
    input: string,
): CommandParseResult {
    let text = input.trim();
    if (!text) {
        return {
            values: null,
        };
    }

    const matchedCommandReference = getMatchedCommandReference(command, text);
    if (!matchedCommandReference) {
        return {
            values: null,
        };
    }

    text = text.slice(matchedCommandReference.length).trim();

    const args = command.getArguments();
    const result: { [key: string]: string } = {};
    const unknownNamedArgs = new Set<string>();

    // Regex to match `key:value`, `key=value`, `key: "value"`, `key: value`, `"value"`, `value`
    const tokenRegex = /(?:([a-zA-Z0-9_]+)\s*[:=]\s*)?(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;

    let match;
    let positionalIndex = 0;
    let parsedCount = 0;
    let hasNamedArgs = false;

    while ((match = tokenRegex.exec(text)) !== null) {
        const key = match[1];
        const value = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : match[4]);

        if (value === undefined) continue;

        if (key) {
            // Named argument
            const arg = args.find(a => a.name.toLowerCase() === key.toLowerCase());
            if (arg) {
                result[arg.name] = value;
                parsedCount++;
                hasNamedArgs = true;
            } else {
                hasNamedArgs = true;
                unknownNamedArgs.add(key);
            }
        } else {
            // Positional argument
            if (positionalIndex < args.length) {
                const arg = args[positionalIndex];
                result[arg.name] = value;
                positionalIndex++;
                parsedCount++;
            }
        }
    }

    if (parsedCount > 0) {
        if (unknownNamedArgs.size > 0) {
            const unknownArgs = Array.from(unknownNamedArgs);
            return {
                values: null,
                error: unknownArgs.length === 1
                    ? `Unknown argument: ${unknownArgs[0]}.`
                    : `Unknown arguments: ${unknownArgs.join(", ")}.`,
                errorCode: "unknown-args",
                unknownArgs,
                matchedCommandReference: matchedCommandReference ?? undefined,
            };
        }
        return {
            values: result,
            matchedCommandReference: matchedCommandReference ?? undefined,
        };
    }

    if (unknownNamedArgs.size > 0) {
        const unknownArgs = Array.from(unknownNamedArgs);
        return {
            values: null,
            error: unknownArgs.length === 1
                ? `Unknown argument: ${unknownArgs[0]}.`
                : `Unknown arguments: ${unknownArgs.join(", ")}.`,
            errorCode: "unknown-args",
            unknownArgs,
            matchedCommandReference: matchedCommandReference ?? undefined,
        };
    }

    return {
        values: null,
        error: `No argument values were found after ${matchedCommandReference}.`,
        errorCode: "no-arguments",
        matchedCommandReference: matchedCommandReference ?? undefined,
    };
}

export function formatCommandString(name: string, output: Record<string, string | string[]>): string {
    let result = `/${name}`;
    for (const [key, value] of Object.entries(output)) {
        if (value === undefined || value === null || value === "") continue;

        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            // For arrays, we might want to format them differently depending on the command,
            // but for now we'll just join them or use the first value.
            // Usually commands take comma-separated lists or multiple arguments.
            // Let's just use the first value or join them.
            const valStr = value.join(',');
            if (valStr.includes(' ')) {
                result += ` ${key}:"${valStr}"`;
            } else {
                result += ` ${key}:${valStr}`;
            }
        } else {
            if (value.includes(' ')) {
                result += ` ${key}:"${value}"`;
            } else {
                result += ` ${key}:${value}`;
            }
        }
    }
    return result;
}

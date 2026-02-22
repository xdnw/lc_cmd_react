import { Argument, BaseCommand } from "./Command";

export function parseCommandString(
    command: BaseCommand,
    input: string
): { [key: string]: string } | null {
    let text = input.trim();

    // Check if it starts with the command name (with or without slash)
    const cmdName = command.name;
    const cmdPath = command.getPathString();

    // Try to strip prefix like `/cmdName ` or `cmdName ` or `/cmdPath ` or `cmdPath `
    const prefixes = [
        `/${cmdPath} `,
        `${cmdPath} `,
        `/${cmdName} `,
        `${cmdName} `
    ];

    let matchedPrefix = false;
    for (const prefix of prefixes) {
        if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
            text = text.substring(prefix.length).trim();
            matchedPrefix = true;
            break;
        }
    }

    const args = command.getArguments();
    const result: { [key: string]: string } = {};

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

    // Only return parsed result if it matched the command prefix,
    // or if it has named arguments.
    // Otherwise, it's likely just a single value pasted into an input.
    if (parsedCount > 0 && (matchedPrefix || hasNamedArgs)) {
        return result;
    }

    return null;
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

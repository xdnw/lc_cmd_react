import { CM, type BaseCommand } from "@/utils/Command";
import { parseCommandStringDetailed } from "@/utils/CommandParser";

export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    if (target.closest("[contenteditable='true'], [contenteditable='plaintext-only'], [role='textbox']")) {
        return true;
    }

    const input = target.closest("input, textarea, select");
    if (!input) {
        return false;
    }

    if (!(input instanceof HTMLInputElement)) {
        return true;
    }

    return ![
        "button",
        "checkbox",
        "color",
        "file",
        "image",
        "radio",
        "range",
        "reset",
        "submit",
    ].includes(input.type);
}

export function trimLeadingSlash(input: string): string {
    return input.trim().replace(/^\/+/, "").trimStart();
}

export function isExactCommandReference(command: BaseCommand, input: string): boolean {
    const normalized = trimLeadingSlash(input).toLowerCase();
    return normalized === command.getPathString().toLowerCase() || normalized === command.name.toLowerCase();
}

export function buildCommandRouteSearchParams(output: Record<string, string | string[]>): URLSearchParams {
    const searchParams = new URLSearchParams();

    Object.entries(output).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.filter(Boolean).forEach((entry) => searchParams.append(key, entry));
            return;
        }

        if (value) {
            searchParams.set(key, value);
        }
    });

    return searchParams;
}

export function resolveLaunchableCommand(
    input: string,
    commandsByPath: Map<string, BaseCommand> = new Map(CM.getCommands().map((command) => [command.getPathString(), command])),
): { command: BaseCommand; initialValues: Record<string, string> } | null {
    const normalized = trimLeadingSlash(input).toLowerCase();
    if (!normalized) {
        return null;
    }

    const orderedPaths = Array.from(commandsByPath.keys()).sort((left, right) => {
        const lengthDelta = right.split(" ").length - left.split(" ").length;
        return lengthDelta !== 0 ? lengthDelta : left.localeCompare(right);
    });

    for (const path of orderedPaths) {
        const lowerPath = path.toLowerCase();
        if (normalized !== lowerPath && !normalized.startsWith(`${lowerPath} `)) {
            continue;
        }

        const command = commandsByPath.get(path);
        if (!command) {
            continue;
        }

        if (isExactCommandReference(command, input)) {
            return { command, initialValues: {} };
        }

        const parsed = parseCommandStringDetailed(command, input);
        if (!parsed.values) {
            return null;
        }

        return {
            command,
            initialValues: parsed.values,
        };
    }

    return null;
}

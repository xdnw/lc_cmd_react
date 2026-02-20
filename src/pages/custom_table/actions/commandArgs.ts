import type { AnyCommandPath, CommandArguments } from "@/utils/Command";
import { CM } from "@/utils/Command";
import type { COMMANDS } from "@/lib/commands";

type TypedCommandArgs<P extends AnyCommandPath> = Partial<CommandArguments<typeof COMMANDS.commands, P>>;

export function withKnownCommandArgs<P extends AnyCommandPath>(
    commandPath: P,
    base: TypedCommandArgs<P>,
    prefillCandidates: Partial<Record<keyof TypedCommandArgs<P>, string | undefined | null>>,
): TypedCommandArgs<P> {
    const command = CM.get(commandPath);
    const knownArgs = new Set(command.getArguments().map((arg) => arg.name));
    const args: Record<string, string> = { ...(base as Record<string, string>) };

    Object.entries(prefillCandidates as Record<string, string | undefined | null>).forEach(([key, value]) => {
        if (!value) return;
        if (knownArgs.has(key)) {
            args[key] = value;
        }
    });

    return args as TypedCommandArgs<P>;
}

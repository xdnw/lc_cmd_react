import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CommandArgSearchMatch, CommandComponentHandle } from "@/components/cmd/CommandComponent";
import { getCommandJumpConfirmLabel } from "@/components/cmd/commandKeyboard";

function createEmptyMatchState(): CommandArgSearchMatch {
    return {
        matches: [],
        bestMatch: null,
        exactMatch: null,
    };
}

export function useCommandArgumentJump({
    neutralQuery,
    clearShellState,
    enabled = true,
}: {
    neutralQuery: string;
    clearShellState: () => void;
    enabled?: boolean;
}) {
    const commandRef = useRef<CommandComponentHandle | null>(null);
    const [matchState, setMatchState] = useState<CommandArgSearchMatch>(() => createEmptyMatchState());

    const clearMatchState = useCallback(() => {
        setMatchState(createEmptyMatchState());
    }, []);

    const focusArg = useCallback((argName: string | null | undefined) => {
        if (!enabled || !argName) {
            return false;
        }

        const focused = commandRef.current?.focusArg(argName) ?? false;
        if (focused) {
            clearShellState();
            clearMatchState();
        }
        return focused;
    }, [clearMatchState, clearShellState, enabled]);

    useEffect(() => {
        if (!enabled || !neutralQuery) {
            clearMatchState();
            return;
        }

        const nextMatchState = commandRef.current?.searchArgs(neutralQuery) ?? createEmptyMatchState();
        setMatchState(nextMatchState);
    }, [clearMatchState, enabled, neutralQuery]);

    const jumpHint = useMemo(() => {
        if (!enabled || !neutralQuery) {
            return null;
        }
        if (matchState.matches.length === 0) {
            return `No argument matches "${neutralQuery}"`;
        }
        if (matchState.exactMatch) {
            return `Press ${getCommandJumpConfirmLabel()} to jump to ${matchState.exactMatch}`;
        }
        const activeLabel = matchState.bestMatch ?? matchState.matches[0];
        const suffix = matchState.matches.length === 1 ? "match" : "matches";
        return `Jump to ${activeLabel} (${matchState.matches.length} ${suffix})`;
    }, [enabled, matchState.bestMatch, matchState.exactMatch, matchState.matches, neutralQuery]);

    const commitJump = useCallback(() => {
        return focusArg(matchState.exactMatch ?? matchState.bestMatch ?? matchState.matches[0] ?? null);
    }, [focusArg, matchState.bestMatch, matchState.exactMatch, matchState.matches]);

    return {
        commandRef,
        jumpMatches: matchState.matches,
        jumpActiveArgName: matchState.exactMatch ?? matchState.bestMatch,
        jumpHint,
        commitJump,
        clearMatchState,
    };
}

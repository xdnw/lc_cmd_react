export type CommandInputDisplayMode = "card" | "focus-pane";

export function isCompactMode(mode?: CommandInputDisplayMode): boolean {
    return mode === "focus-pane";
}

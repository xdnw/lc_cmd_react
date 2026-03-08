export function getPastedText(event: { clipboardData?: { getData: (kind: string) => string } | null }): string {
    const clipboard = event.clipboardData;
    if (!clipboard) return "";
    return clipboard.getData("text/plain") || clipboard.getData("text") || "";
}